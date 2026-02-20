import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, Globe, Lock, Download } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ShareModalProps {
    open: boolean;
    onClose: () => void;
    workflowId: string;
    workflowTitle: string;
}

export function ShareModal({ open, onClose, workflowId, workflowTitle }: ShareModalProps) {
    const [isPublic, setIsPublic] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);

    const shareUrl = `${window.location.origin}/workflow?shared=${workflowId}`;

    const handleTogglePublic = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/workflows/${workflowId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !isPublic }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setIsPublic(data.isPublic);
            toast.success(data.isPublic ? 'Workflow is now public!' : 'Workflow is now private');
        } catch (err: any) {
            toast.error('Failed to update sharing: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = async () => {
        try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error('Please log in to import'); return; }

            // Fetch the shared workflow and clone it for the current user
            const res = await fetch(`${API_BASE}/api/workflows/shared/${workflowId}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const wf = data.workflow;
            const { saveWorkflowToCloud } = await import('@/lib/workflowEngine');
            const cloudId = await saveWorkflowToCloud(user.id, {
                id: '',
                title: wf.name + ' (imported)',
                description: wf.description || '',
                goal: '',
                nodes: wf.steps?.nodes || [],
                edges: wf.steps?.edges || [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            if (cloudId) {
                toast.success('Workflow imported to your account!');
            } else {
                toast.error('Import failed');
            }
        } catch (err: any) {
            toast.error('Import failed: ' + err.message);
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
                                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <Link2 className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">Share Workflow</h3>
                                    <p className="text-xs text-zinc-500 truncate max-w-[220px]">{workflowTitle}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Public / Private Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isPublic ? (
                                        <Globe className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Lock className="w-5 h-5 text-zinc-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">
                                            {isPublic ? 'Public' : 'Private'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {isPublic
                                                ? 'Anyone with the link can view'
                                                : 'Only you can access'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleTogglePublic}
                                    disabled={saving}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-emerald-500' : 'bg-zinc-700'
                                        } ${saving ? 'opacity-50' : ''}`}
                                >
                                    <div
                                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Share Link + Import */}
                            {isPublic && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3"
                                >
                                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Share Link</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-xs text-zinc-300 truncate font-mono">
                                            {shareUrl}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${copied
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                                                }`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Import to My Workflows */}
                                    <button
                                        onClick={handleImport}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Import to My Workflows
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/60">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
