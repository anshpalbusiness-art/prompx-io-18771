import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CalendarClock, Check, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
    computeNextRun, formatNextRun,
    INTERVAL_LABELS, type ScheduleInterval,
} from '@/lib/schedulerStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    workflowId: string;
    workflowTitle: string;
}

interface ScheduleItem {
    id: string;
    workflowId: string;
    workflowTitle: string;
    interval: ScheduleInterval;
    nextRun: number;
    enabled: boolean;
    createdAt: string;
}

const intervals: ScheduleInterval[] = ['every-hour', 'every-6h', 'daily', 'weekly', 'monthly'];

export function ScheduleModal({ open, onClose, workflowId, workflowTitle }: ScheduleModalProps) {
    const [selected, setSelected] = useState<ScheduleInterval>('daily');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);

    // Load existing schedules when modal opens
    useEffect(() => {
        if (!open) return;
        loadSchedules();
    }, [open]);

    const loadSchedules = async () => {
        setLoadingSchedules(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const res = await fetch(`${API_BASE}/api/schedules?userId=${encodeURIComponent(user.id)}`);
            const data = await res.json();
            setSchedules(data.schedules || []);
        } catch (err) {
            console.error('Failed to load schedules:', err);
        } finally {
            setLoadingSchedules(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const res = await fetch(`${API_BASE}/api/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    workflowId,
                    workflowTitle,
                    interval: selected,
                    nextRun: computeNextRun(selected),
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSaved(true);
            toast.success('Schedule saved!');
            await loadSchedules();
            setTimeout(() => { setSaved(false); }, 1200);
        } catch (err: any) {
            toast.error('Failed to save schedule: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (scheduleId: string) => {
        try {
            await fetch(`${API_BASE}/api/schedules/${scheduleId}`, { method: 'DELETE' });
            setSchedules(prev => prev.filter(s => s.id !== scheduleId));
            toast.success('Schedule removed');
        } catch (err) {
            toast.error('Failed to delete schedule');
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl border border-zinc-800/60 bg-zinc-900/95 shadow-2xl backdrop-blur-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                    <CalendarClock className="w-4.5 h-4.5 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">Schedule Workflow</h3>
                                    <p className="text-xs text-zinc-500 truncate max-w-[220px]">{workflowTitle}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Interval Selection */}
                            <div className="space-y-3">
                                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Run Interval</p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {intervals.map(iv => (
                                        <button
                                            key={iv}
                                            onClick={() => setSelected(iv)}
                                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${selected === iv
                                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                                : 'bg-zinc-800/40 border-zinc-800/40 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-300'
                                                }`}
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                            {INTERVAL_LABELS[iv]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Next run preview */}
                            <div className="bg-zinc-800/30 rounded-xl px-4 py-3 flex items-center justify-between border border-zinc-800/30">
                                <span className="text-xs text-zinc-500">Next Run</span>
                                <span className="text-xs font-semibold text-emerald-400">
                                    {formatNextRun(computeNextRun(selected))}
                                </span>
                            </div>

                            {/* Active Schedules */}
                            {schedules.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active Schedules</p>
                                    <div className="space-y-2 max-h-48 overflow-auto">
                                        {schedules.map(schedule => (
                                            <div
                                                key={schedule.id}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-800/30 border border-zinc-800/30"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-zinc-300 truncate">{schedule.workflowTitle}</p>
                                                    <p className="text-[10px] text-zinc-500">
                                                        {INTERVAL_LABELS[schedule.interval]} · Next: {formatNextRun(schedule.nextRun)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(schedule.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors ml-2"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/60">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saved || saving}
                                className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all flex items-center gap-1.5 disabled:opacity-70"
                            >
                                {saved ? <><Check className="w-4 h-4" /> Scheduled!</> : saving ? 'Saving...' : 'Save Schedule'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
