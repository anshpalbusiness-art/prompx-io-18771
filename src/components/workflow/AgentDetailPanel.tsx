import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Pencil, Terminal, FileText } from 'lucide-react';
import type { WorkflowNode } from '@/lib/workflowEngine';
import { AGENT_STATUS_COLORS } from '@/lib/agents';
import { IntegrationBadge } from './IntegrationBadge';

const COMMON_EMOJIS = ['🤖', '🔍', '🕸️', '📊', '📝', '🧪', '⚡', '🔧', '💡', '📁', '🌐', '📈', '🛡️', '🎯', '📋', '🗃️', '🔬', '🧠', '📡', '🏗️'];

const INTEGRATION_OPTIONS = [
    { value: '', label: 'None (AI Only)' },
    { value: 'web-search', label: '🔍 Web Search' },
    { value: 'web-scraper', label: '🕸️ Web Scraper' },
    { value: 'file-system', label: '📁 File System' },
    { value: 'shell-command', label: '⚡ Shell Command' },
];

const EXECUTION_MODE_OPTIONS = [
    { value: 'ai', label: '🤖 AI Simulation' },
    { value: 'integration', label: '🔌 Integration Only' },
    { value: 'hybrid', label: '🔄 Hybrid (Integration + AI)' },
];

interface AgentDetailPanelProps {
    node: WorkflowNode | null;
    onClose: () => void;
    isEditMode?: boolean;
    onUpdateNode?: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
    node, onClose,
    isEditMode = false, onUpdateNode,
}) => {
    const [showOutput, setShowOutput] = useState(true);
    const [showInput, setShowInput] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    if (!node) return null;

    const colors = AGENT_STATUS_COLORS[node.status] || AGENT_STATUS_COLORS.idle;

    const handleUpdate = (updates: Partial<WorkflowNode>) => {
        onUpdateNode?.(node.id, updates);
    };

    return (
        <AnimatePresence>
            <motion.div
                key="detail-panel"
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-80 h-full bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800/50 flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Icon (editable) */}
                        <div className="relative flex-shrink-0">
                            <span
                                className={`text-xl ${isEditMode ? 'cursor-pointer hover:opacity-80' : ''}`}
                                onClick={() => isEditMode && setShowEmojiPicker(!showEmojiPicker)}
                            >
                                {node.icon}
                            </span>
                            {isEditMode && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full flex items-center justify-center">
                                    <Pencil className="w-2 h-2 text-white" />
                                </div>
                            )}
                            {/* Emoji Picker */}
                            {showEmojiPicker && isEditMode && (
                                <div className="absolute top-8 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl grid grid-cols-5 gap-1 w-48">
                                    {COMMON_EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                handleUpdate({ icon: emoji });
                                                setShowEmojiPicker(false);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors text-lg"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            {isEditMode ? (
                                <input
                                    type="text"
                                    value={node.name}
                                    onChange={(e) => handleUpdate({ name: e.target.value })}
                                    className="text-sm font-semibold text-zinc-200 bg-transparent border-b border-violet-500/40 focus:border-violet-500 outline-none w-full px-0 py-0.5 transition-colors"
                                    placeholder="Agent name..."
                                />
                            ) : (
                                <h3 className="text-sm font-semibold text-zinc-200 truncate">{node.name}</h3>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: colors.text }}
                                />
                                <span className="text-[10px] capitalize" style={{ color: colors.text }}>
                                    {node.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Description */}
                    <div>
                        {isEditMode ? (
                            <textarea
                                value={node.description}
                                onChange={(e) => handleUpdate({ description: e.target.value })}
                                rows={2}
                                className="w-full text-xs text-zinc-300 bg-zinc-900/60 border border-violet-500/20 focus:border-violet-500/50 rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors"
                                placeholder="Describe what this agent does..."
                            />
                        ) : (
                            <p className="text-xs text-zinc-400 leading-relaxed">{node.description}</p>
                        )}
                    </div>

                    {/* Integration Status */}
                    {!isEditMode && (
                        <IntegrationBadge
                            integrationId={node.integrationId}
                            executionMode={node.executionMode || 'ai'}
                            dataSource={node.dataSource}
                        />
                    )}

                    {/* Edit Mode: Integration & Execution Mode */}
                    {isEditMode && (
                        <div className="space-y-3 bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                            <p className="text-[10px] text-violet-400 uppercase tracking-wider font-medium">Integration Config</p>

                            {/* Integration dropdown */}
                            <div>
                                <label className="text-[10px] text-zinc-500 mb-1 block">Integration</label>
                                <select
                                    value={node.integrationId || ''}
                                    onChange={(e) => handleUpdate({
                                        integrationId: e.target.value || undefined,
                                        executionMode: e.target.value ? 'integration' : 'ai',
                                    })}
                                    className="w-full text-xs bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-zinc-300 outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                                >
                                    {INTEGRATION_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Execution mode dropdown */}
                            <div>
                                <label className="text-[10px] text-zinc-500 mb-1 block">Execution Mode</label>
                                <select
                                    value={node.executionMode || 'ai'}
                                    onChange={(e) => handleUpdate({ executionMode: e.target.value as any })}
                                    className="w-full text-xs bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-zinc-300 outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                                >
                                    {EXECUTION_MODE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* System Prompt (edit mode shows editable, view mode shows collapsible) */}
                    <div>
                        <button
                            onClick={() => setShowPrompt(!showPrompt)}
                            className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium hover:text-zinc-300 transition-colors w-full"
                        >
                            <Terminal className="w-3 h-3 text-violet-500" />
                            System Prompt
                            {showPrompt ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                        </button>
                        {showPrompt && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="overflow-hidden"
                            >
                                {isEditMode ? (
                                    <textarea
                                        value={node.systemPrompt}
                                        onChange={(e) => handleUpdate({ systemPrompt: e.target.value })}
                                        rows={5}
                                        className="w-full text-[10px] text-zinc-300 bg-zinc-900/60 border border-violet-500/20 focus:border-violet-500/50 rounded-lg px-3 py-2 outline-none resize-y font-mono leading-relaxed transition-colors"
                                        placeholder="System prompt for the AI agent..."
                                    />
                                ) : (
                                    <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3">
                                        <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-40 overflow-y-auto">
                                            {node.systemPrompt}
                                        </pre>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Capabilities */}
                    {node.capabilities.length > 0 && (
                        <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 font-medium">Capabilities</p>
                            <div className="flex flex-wrap gap-1">
                                {node.capabilities.map((cap, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 bg-zinc-900/80 border border-zinc-800/40 rounded-md text-zinc-400">
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timing */}
                    {node.startedAt && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            <span>
                                {node.duration
                                    ? `${(node.duration / 1000).toFixed(1)}s`
                                    : 'Running...'}
                            </span>
                        </div>
                    )}

                    {/* Error */}
                    {node.error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Error
                            </div>
                            <p className="text-[11px] text-red-300/80">{node.error}</p>
                        </div>
                    )}

                    {/* Output */}
                    {node.output && (
                        <div>
                            <button
                                onClick={() => setShowOutput(!showOutput)}
                                className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium hover:text-zinc-300 transition-colors w-full"
                            >
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Output
                                {showOutput ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                            </button>
                            {showOutput && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3 overflow-hidden"
                                >
                                    <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-60 overflow-y-auto">
                                        {JSON.stringify(node.output, null, 2)}
                                    </pre>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    {Object.keys(node.input).length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowInput(!showInput)}
                                className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium hover:text-zinc-300 transition-colors w-full"
                            >
                                <Zap className="w-3 h-3 text-blue-500" />
                                Input Data
                                {showInput ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                            </button>
                            {showInput && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="bg-zinc-900/60 border border-zinc-800/40 rounded-lg p-3 overflow-hidden"
                                >
                                    <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-40 overflow-y-auto">
                                        {JSON.stringify(
                                            Object.fromEntries(
                                                Object.entries(node.input).filter(([k]) => !k.startsWith('_'))
                                            ),
                                            null,
                                            2
                                        )}
                                    </pre>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
