import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarClock, Trash2, ToggleLeft, ToggleRight, Clock, CheckCircle2,
    XCircle, Plus, Zap, Layers,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
    loadSchedules, removeSchedule, toggleSchedule, formatNextRun,
    type ScheduleRecord,
} from '@/lib/schedulerStore';
import { loadWorkflows } from '@/lib/workflowEngine';
import { ScheduleModal } from '@/components/workflow/ScheduleModal';

/* lightweight workflow summary for the "Add Schedule" picker */
interface WorkflowSummary {
    id: string;
    title: string;
    nodeCount: number;
}

const Schedules = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    /* workflow picker state */
    const [showPicker, setShowPicker] = useState(false);
    const [savedWorkflows, setSavedWorkflows] = useState<WorkflowSummary[]>([]);

    /* schedule-modal state */
    const [modalOpen, setModalOpen] = useState(false);
    const [modalWorkflowId, setModalWorkflowId] = useState('');
    const [modalWorkflowTitle, setModalWorkflowTitle] = useState('');

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null);
            if (!session) navigate('/auth');
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (!session) navigate('/auth');
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    useEffect(() => {
        setSchedules(loadSchedules());
    }, [refreshKey]);

    /* load saved workflows when picker is opened */
    useEffect(() => {
        if (showPicker) {
            const wfs = loadWorkflows();
            const list: WorkflowSummary[] = Object.values(wfs)
                .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
                .map((w: any) => ({
                    id: w.id,
                    title: w.title || 'Untitled Workflow',
                    nodeCount: w.nodes?.length ?? 0,
                }));
            setSavedWorkflows(list);
        }
    }, [showPicker]);

    const handleToggle = (id: string) => {
        toggleSchedule(id);
        setRefreshKey(k => k + 1);
    };

    const handleDelete = (id: string) => {
        removeSchedule(id);
        setRefreshKey(k => k + 1);
    };

    const openScheduleModal = (wfId: string, wfTitle: string) => {
        setModalWorkflowId(wfId);
        setModalWorkflowTitle(wfTitle);
        setShowPicker(false);
        setModalOpen(true);
    };

    const alreadyScheduledIds = new Set(schedules.map(s => s.workflowId));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <Layout user={user} showHeader={false}>
            <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
                <div className="container-responsive mx-auto max-w-5xl py-8 sm:py-12 md:py-16 lg:py-20">
                    {/* Header */}
                    <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                                    <CalendarClock className="w-5.5 h-5.5 text-violet-400" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                    Scheduled Workflows
                                </h1>
                            </div>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                                Automate your AI workflows to run on a recurring schedule
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPicker(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20"
                        >
                            <Plus className="w-4 h-4" /> Add Schedule
                        </button>
                    </div>

                    {/* ── Workflow Picker Overlay ─────────────────────── */}
                    <AnimatePresence>
                        {showPicker && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                onClick={() => setShowPicker(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                                    className="bg-zinc-900 border border-zinc-800/60 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Picker Header */}
                                    <div className="px-6 py-5 border-b border-zinc-800/50">
                                        <h2 className="text-lg font-semibold text-zinc-100">Choose a Workflow to Schedule</h2>
                                        <p className="text-xs text-zinc-500 mt-1">Select a saved workflow to set up recurring runs</p>
                                    </div>

                                    {/* Picker Body */}
                                    <div className="max-h-[360px] overflow-y-auto p-3 space-y-1.5">
                                        {savedWorkflows.length === 0 ? (
                                            <div className="text-center py-12 px-6">
                                                <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                                                <p className="text-sm text-zinc-400 font-medium mb-1">No Workflows Found</p>
                                                <p className="text-xs text-zinc-600 mb-4">Create a workflow first, then come back to schedule it.</p>
                                                <button
                                                    onClick={() => { setShowPicker(false); navigate('/workflow'); }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                                                >
                                                    <Zap className="w-3.5 h-3.5" /> Create Workflow
                                                </button>
                                            </div>
                                        ) : (
                                            savedWorkflows.map(wf => {
                                                const isScheduled = alreadyScheduledIds.has(wf.id);
                                                return (
                                                    <button
                                                        key={wf.id}
                                                        disabled={isScheduled}
                                                        onClick={() => openScheduleModal(wf.id, wf.title)}
                                                        className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${isScheduled
                                                                ? 'bg-zinc-800/20 opacity-50 cursor-not-allowed'
                                                                : 'bg-zinc-800/30 hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent cursor-pointer'
                                                            }`}
                                                    >
                                                        <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                                                            <Zap className="w-4 h-4 text-violet-400" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-zinc-200 truncate">{wf.title}</p>
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                                {wf.nodeCount} agent{wf.nodeCount !== 1 ? 's' : ''}
                                                                {isScheduled && ' · Already scheduled'}
                                                            </p>
                                                        </div>
                                                        {!isScheduled && (
                                                            <CalendarClock className="w-4 h-4 text-zinc-500 shrink-0" />
                                                        )}
                                                        {isScheduled && (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Picker Footer */}
                                    <div className="px-6 py-4 border-t border-zinc-800/50 flex justify-end">
                                        <button
                                            onClick={() => setShowPicker(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Schedule Modal ────────────────────────────── */}
                    <ScheduleModal
                        open={modalOpen}
                        onClose={() => { setModalOpen(false); setRefreshKey(k => k + 1); }}
                        workflowId={modalWorkflowId}
                        workflowTitle={modalWorkflowTitle}
                    />

                    {/* ── Schedules List ────────────────────────────── */}
                    {schedules.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20 px-6"
                        >
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-zinc-800/30 mb-5">
                                <CalendarClock className="w-7 h-7 text-zinc-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-200 mb-2">No Schedules Yet</h3>
                            <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
                                Click <strong>"Add Schedule"</strong> above to pick a saved workflow and set up a recurring schedule.
                            </p>
                            <button
                                onClick={() => setShowPicker(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20"
                            >
                                <Plus className="w-4 h-4" /> Add Schedule
                            </button>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {schedules.map((s, i) => (
                                    <motion.div
                                        key={s.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`relative rounded-2xl border p-5 sm:p-6 transition-all ${s.enabled
                                            ? 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/60'
                                            : 'bg-zinc-900/20 border-zinc-800/30 opacity-60'
                                            }`}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            {/* Info */}
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${s.enabled ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-zinc-800/40 border-zinc-800/30'
                                                    }`}>
                                                    <Zap className={`w-4.5 h-4.5 ${s.enabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-zinc-200 truncate">{s.workflowTitle}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {s.cronLabel}
                                                        </span>
                                                        <span className="text-xs text-zinc-600">•</span>
                                                        <span className="text-xs text-zinc-500">
                                                            Next: <span className="text-emerald-400 font-medium">{formatNextRun(s.nextRun)}</span>
                                                        </span>
                                                        {s.lastStatus && (
                                                            <>
                                                                <span className="text-xs text-zinc-600">•</span>
                                                                <span className={`text-xs flex items-center gap-0.5 ${s.lastStatus === 'completed' ? 'text-emerald-400' : 'text-red-400'
                                                                    }`}>
                                                                    {s.lastStatus === 'completed'
                                                                        ? <><CheckCircle2 className="w-3 h-3" /> Passed</>
                                                                        : <><XCircle className="w-3 h-3" /> Failed</>
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleToggle(s.id)}
                                                    className="p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
                                                    title={s.enabled ? 'Disable' : 'Enable'}
                                                >
                                                    {s.enabled
                                                        ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                                                        : <ToggleLeft className="w-6 h-6 text-zinc-500" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Delete schedule"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Schedules;
