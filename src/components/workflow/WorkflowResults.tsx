import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    BarChart3,
    Copy,
    Check,
    FileText,
    X,
} from 'lucide-react';
import type { WorkflowDefinition, WorkflowExecution } from '@/lib/workflowEngine';
import { AGENT_STATUS_COLORS } from '@/lib/agents';

interface WorkflowResultsProps {
    workflow: WorkflowDefinition;
    execution: WorkflowExecution | null;
    onClose: () => void;
    onNodeClick: (nodeId: string) => void;
}

export const WorkflowResults: React.FC<WorkflowResultsProps> = ({
    workflow,
    execution,
    onClose,
    onNodeClick,
}) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const isCompleted = execution?.status === 'completed';
    const isFailed = execution?.status === 'failed';
    const isVisible = isCompleted || isFailed;

    // Stats
    const stats = useMemo(() => {
        const completed = workflow.nodes.filter(n => n.status === 'completed').length;
        const failed = workflow.nodes.filter(n => n.status === 'failed').length;
        const totalDuration = workflow.nodes
            .filter(n => n.duration)
            .reduce((sum, n) => sum + (n.duration || 0), 0);

        return { completed, failed, total: workflow.nodes.length, totalDuration };
    }, [workflow.nodes]);

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedNodes(new Set(workflow.nodes.map(n => n.id)));
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    const copyOutput = (nodeId: string, output: any) => {
        navigator.clipboard.writeText(JSON.stringify(output, null, 2));
        setCopiedId(nodeId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Render a single output value smartly
    const renderValue = (value: any, depth = 0): React.ReactNode => {
        if (value === null || value === undefined) return <span className="text-zinc-600">null</span>;
        if (typeof value === 'boolean') return <span className="text-amber-400">{value.toString()}</span>;
        if (typeof value === 'number') return <span className="text-blue-400">{value.toLocaleString()}</span>;
        if (typeof value === 'string') {
            if (value.length > 200) {
                return <span className="text-emerald-400/90">{value}</span>;
            }
            return <span className="text-emerald-400/90">"{value}"</span>;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-zinc-600">[]</span>;
            // Render arrays of objects as mini-table
            if (typeof value[0] === 'object' && value[0] !== null) {
                return (
                    <div className="space-y-1.5 mt-1">
                        {value.map((item, i) => (
                            <div key={i} className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-2.5">
                                <span className="text-[10px] text-zinc-600 font-medium mb-1 block">#{i + 1}</span>
                                {renderValue(item, depth + 1)}
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {value.map((item, i) => (
                        <span key={i} className="text-[11px] px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-800/30 rounded text-zinc-400">
                            {String(item)}
                        </span>
                    ))}
                </div>
            );
        }
        if (typeof value === 'object') {
            return (
                <div className={`space-y-1.5 ${depth > 0 ? '' : 'mt-1'}`}>
                    {Object.entries(value).map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                                {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                            </span>
                            <div className="text-[11px] text-zinc-300 leading-relaxed">
                                {renderValue(v, depth + 1)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="text-zinc-400">{String(value)}</span>;
    };

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="absolute inset-0 z-30 flex flex-col bg-zinc-950/98 backdrop-blur-2xl"
        >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-zinc-800/50">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isCompleted ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                            {isCompleted
                                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                : <XCircle className="w-5 h-5 text-red-400" />
                            }
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-100">
                                {isCompleted ? 'Workflow Completed' : 'Workflow Failed'}
                            </h2>
                            <p className="text-xs text-zinc-500 mt-0.5">{workflow.title}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quick Stats */}
                        <div className="flex items-center gap-4 mr-4">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs text-zinc-400">{stats.completed}/{stats.total} agents</span>
                            </div>
                            {stats.failed > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-xs text-red-400">{stats.failed} failed</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="text-xs text-zinc-400">{(stats.totalDuration / 1000).toFixed(1)}s total</span>
                            </div>
                        </div>

                        {/* Expand/Collapse */}
                        <div className="flex bg-zinc-900/60 border border-zinc-800/40 rounded-lg overflow-hidden">
                            <button
                                onClick={expandAll}
                                className="px-2.5 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                            >
                                Expand All
                            </button>
                            <div className="w-px bg-zinc-800/50" />
                            <button
                                onClick={collapseAll}
                                className="px-2.5 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                            >
                                Collapse
                            </button>
                        </div>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="max-w-4xl mx-auto space-y-3">
                    {workflow.nodes.map((node, index) => {
                        const isExpanded = expandedNodes.has(node.id);
                        const colors = AGENT_STATUS_COLORS[node.status] || AGENT_STATUS_COLORS.idle;
                        const hasOutput = node.output && Object.keys(node.output).length > 0;

                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-xl border overflow-hidden"
                                style={{
                                    borderColor: colors.border,
                                    background: colors.bg,
                                }}
                            >
                                {/* Node Header */}
                                <button
                                    onClick={() => hasOutput && toggleNode(node.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-lg flex-shrink-0">{node.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-zinc-200 truncate">{node.name}</span>
                                            {node.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                                            {node.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                                        </div>
                                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{node.description}</p>
                                    </div>
                                    {node.duration && (
                                        <span className="text-[10px] text-zinc-600 flex items-center gap-1 flex-shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {(node.duration / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                    {hasOutput && (
                                        <div className="flex-shrink-0 text-zinc-600">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    )}
                                </button>

                                {/* Expanded Output */}
                                <AnimatePresence>
                                    {isExpanded && hasOutput && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 border-t border-zinc-800/30">
                                                {/* Copy + View in Graph */}
                                                <div className="flex items-center justify-end gap-2 mt-2 mb-3">
                                                    <button
                                                        onClick={() => copyOutput(node.id, node.output)}
                                                        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/40"
                                                    >
                                                        {copiedId === node.id ? (
                                                            <><Check className="w-3 h-3 text-emerald-400" /> Copied!</>
                                                        ) : (
                                                            <><Copy className="w-3 h-3" /> Copy Output</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => onNodeClick(node.id)}
                                                        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-violet-400 transition-colors px-2 py-1 rounded-md hover:bg-violet-500/10"
                                                    >
                                                        <Zap className="w-3 h-3" /> View in Graph
                                                    </button>
                                                </div>

                                                {/* Rendered Output */}
                                                <div className="bg-zinc-900/50 border border-zinc-800/30 rounded-lg p-4 max-h-80 overflow-y-auto">
                                                    {renderValue(node.output)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Error display */}
                                {node.error && (
                                    <div className="px-4 pb-3 border-t border-red-500/10">
                                        <p className="text-[11px] text-red-400 mt-2">{node.error}</p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-zinc-800/50 px-6 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <p className="text-[11px] text-zinc-600">
                        Goal: "{workflow.goal}"
                    </p>
                    <button
                        onClick={onClose}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                        Back to Graph →
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
