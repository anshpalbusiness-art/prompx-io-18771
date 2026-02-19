import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Trash2, Clock, Pencil, Check, Undo2, Redo2, BookmarkPlus, Share2 } from 'lucide-react';
import type { WorkflowExecution, WorkflowDefinition } from '@/lib/workflowEngine';
import { toast } from 'sonner';

interface WorkflowToolbarProps {
    workflowId: string | null;
    execution: WorkflowExecution | null;
    nodeCount: number;
    onRun: () => void;
    onPause: () => void;
    onReset: () => void;
    onDelete: () => void;
    // Edit mode
    isEditMode?: boolean;
    onToggleEditMode?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    // Template / Share
    activeWorkflow?: WorkflowDefinition | null;
    // Collaboration
    collaboratorSlot?: ReactNode;
    // New Props for Schedule/Results
    onSchedule?: () => void;
    onViewResults?: () => void;
    showResultsButton?: boolean;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
    workflowId,
    execution,
    nodeCount,
    onRun,
    onPause,
    onReset,
    onDelete,
    isEditMode = false,
    onToggleEditMode,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    activeWorkflow,
    collaboratorSlot,
    onSchedule,
    onViewResults,
    showResultsButton = false,
}) => {
    const isExecuting = execution?.status === 'executing';
    const isCompleted = execution?.status === 'completed';
    const isFailed = execution?.status === 'failed';
    const isPaused = execution?.status === 'paused';

    const statusColor = isEditMode
        ? 'text-violet-400'
        : isExecuting
            ? 'text-blue-400'
            : isCompleted
                ? 'text-green-400'
                : isFailed
                    ? 'text-red-400'
                    : isPaused
                        ? 'text-amber-400'
                        : 'text-zinc-500';

    const statusText = isEditMode
        ? 'Editing'
        : isExecuting
            ? 'Executing...'
            : isCompleted
                ? 'Completed'
                : isFailed
                    ? 'Failed'
                    : isPaused
                        ? 'Paused'
                        : 'Ready';

    const completedCount = execution?.completedNodeIds?.length || 0;
    const elapsed = execution?.startedAt
        ? Math.round(((execution.completedAt || Date.now()) - execution.startedAt) / 1000)
        : 0;

    if (!workflowId) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 z-10 flex items-center gap-2"
        >
            {/* Status Badge */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEditMode ? 'animate-pulse bg-violet-400' : isExecuting ? 'animate-pulse bg-blue-400' : isCompleted ? 'bg-green-400' : isFailed ? 'bg-red-400' : 'bg-zinc-600'}`} />
                <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
                {isExecuting && (
                    <span className="text-xs text-zinc-500">
                        {completedCount}/{nodeCount}
                    </span>
                )}
                {elapsed > 0 && !isEditMode && (
                    <span className="text-xs text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {elapsed}s
                    </span>
                )}
                {isEditMode && (
                    <span className="text-xs text-zinc-500">
                        {nodeCount} agents
                    </span>
                )}
            </div>

            {/* Collaborator Avatars */}
            {collaboratorSlot}

            {/* Schedule Button */}
            {onSchedule && (
                <button
                    onClick={onSchedule}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors backdrop-blur-xl"
                >
                    <Clock className="w-3.5 h-3.5" />
                    Schedule
                </button>
            )}

            {/* Results Button */}
            {showResultsButton && onViewResults && (
                <button
                    onClick={onViewResults}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors backdrop-blur-xl"
                >
                    <Check className="w-3.5 h-3.5" />
                    Results
                </button>
            )}

            {/* Action Buttons */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl flex items-center overflow-hidden">
                {/* Edit / Done toggle */}
                <button
                    onClick={onToggleEditMode}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${isEditMode
                        ? 'text-violet-400 bg-violet-500/10 hover:bg-violet-500/20'
                        : 'text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10'
                        }`}
                    title={isEditMode ? 'Done editing' : 'Edit workflow'}
                    disabled={isExecuting}
                >
                    {isEditMode ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            Done
                        </>
                    ) : (
                        <>
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                        </>
                    )}
                </button>

                {/* Undo/Redo (edit mode only) */}
                {isEditMode && (
                    <>
                        <div className="w-px h-5 bg-zinc-800" />
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Undo (⌘Z)"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Redo (⌘⇧Z)"
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}

                <div className="w-px h-5 bg-zinc-800" />

                {/* Run / Pause */}
                {!isExecuting ? (
                    <button
                        onClick={onRun}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Run workflow"
                        disabled={isEditMode}
                    >
                        <Play className="w-3.5 h-3.5" />
                        Run
                    </button>
                ) : (
                    <button
                        onClick={onPause}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Pause workflow"
                    >
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                    </button>
                )}

                <div className="w-px h-5 bg-zinc-800" />

                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
                    title="Reset workflow"
                    disabled={isEditMode || isExecuting}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-5 bg-zinc-800" />

                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Delete workflow"
                    disabled={isEditMode || isExecuting}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Save / Share */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl flex items-center overflow-hidden">
                <button
                    onClick={() => {
                        if (!activeWorkflow) return;
                        const title = window.prompt('Template name:', activeWorkflow.title);
                        if (!title) return;
                        // Save to localStorage for now (DB in production)
                        const saved = JSON.parse(localStorage.getItem('workflow_templates') || '[]');
                        saved.push({
                            id: `custom-${Date.now()}`,
                            title,
                            description: activeWorkflow.description || '',
                            nodes: activeWorkflow.nodes,
                            edges: activeWorkflow.edges,
                            createdAt: new Date().toISOString(),
                        });
                        localStorage.setItem('workflow_templates', JSON.stringify(saved));
                        toast.success('Saved as template!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                    title="Save as template"
                    disabled={isEditMode || isExecuting}
                >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save
                </button>
                <div className="w-px h-5 bg-zinc-800" />
                <button
                    onClick={() => {
                        if (!activeWorkflow) return;
                        const json = JSON.stringify({
                            title: activeWorkflow.title,
                            nodes: activeWorkflow.nodes,
                            edges: activeWorkflow.edges,
                        }, null, 2);
                        navigator.clipboard.writeText(json);
                        toast.success('Workflow copied to clipboard!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                    title="Share workflow"
                    disabled={isEditMode || isExecuting}
                >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                </button>
            </div>
        </motion.div>
    );
};
