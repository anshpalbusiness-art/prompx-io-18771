import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, BarChart3, ShoppingBag, FileText, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useWorkflow } from '@/contexts/WorkflowContext';
import { autoLayout, type WorkflowNode, type WorkflowEdge, type WorkflowDefinition, wfUid } from '@/lib/workflowEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    marketing: { icon: <BarChart3 className="w-4 h-4" />, color: '#f472b6', label: 'Marketing' },
    'e-commerce': { icon: <ShoppingBag className="w-4 h-4" />, color: '#34d399', label: 'E-commerce' },
    content: { icon: <FileText className="w-4 h-4" />, color: '#60a5fa', label: 'Content' },
    support: { icon: <Users className="w-4 h-4" />, color: '#fbbf24', label: 'Support' },
    operations: { icon: <Zap className="w-4 h-4" />, color: '#a78bfa', label: 'Operations' },
};

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    nodes: any[];
    edges: any[];
    use_count: number;
}

export function WorkflowTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [using, setUsing] = useState<string | null>(null);
    const { loadTemplate, setActiveWorkflow } = useWorkflow();

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const res = await fetch(`${API_BASE}/api/templates`);
                const data = await res.json();
                setTemplates(data.templates || []);
            } catch (err) {
                console.error('Failed to load templates:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchTemplates();
    }, []);

    const handleUseTemplate = async (template: Template) => {
        setUsing(template.id);
        try {
            // Get user ID for cloud persistence
            const { data: { user } } = await supabase.auth.getUser();
            let savedId: string | null = null;

            // Call clone API to persist to cloud + increment use_count
            if (user) {
                try {
                    const res = await fetch(`${API_BASE}/api/templates/use/${template.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                    });
                    const data = await res.json();
                    if (data.workflow?.id) savedId = data.workflow.id;
                } catch (cloneErr) {
                    console.warn('Template clone API failed, loading locally:', cloneErr);
                }
            }

            // Create local WorkflowDefinition
            const nodes = autoLayout(template.nodes as WorkflowNode[], template.edges as WorkflowEdge[]);
            const definition: WorkflowDefinition = {
                id: savedId || (template.id + '-' + wfUid()),
                title: template.title,
                description: template.description,
                goal: template.description,
                nodes,
                edges: template.edges as WorkflowEdge[],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            loadTemplate(definition);
            setActiveWorkflow(definition.id);

            // Update the local use_count display
            setTemplates(prev => prev.map(t =>
                t.id === template.id ? { ...t, use_count: t.use_count + 1 } : t
            ));

            toast.success(`Template "${template.title}" loaded!`);
        } catch (err: any) {
            toast.error('Failed to use template: ' + err.message);
        } finally {
            setUsing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                <Sparkles className="w-10 h-10 text-zinc-600" />
                <p className="text-sm">No templates available yet</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full px-8 py-12 overflow-auto">
            <div className="w-full max-w-3xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Starter Templates</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-bold text-zinc-100"
                    >
                        Build faster with templates
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-zinc-500 max-w-lg mx-auto"
                    >
                        Start from a proven workflow or describe your own goal in the chat below.
                    </motion.p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template, idx) => {
                        const catMeta = CATEGORY_META[template.category] || CATEGORY_META.operations;
                        const isUsing = using === template.id;

                        return (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.05 }}
                                className="group relative rounded-2xl border border-zinc-800/50 bg-zinc-900/60 backdrop-blur-sm p-5 hover:border-zinc-700/60 hover:bg-zinc-900/80 transition-all cursor-pointer"
                                onClick={() => !isUsing && handleUseTemplate(template)}
                            >
                                {/* Category Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                        style={{
                                            background: `${catMeta.color}15`,
                                            color: catMeta.color,
                                            border: `1px solid ${catMeta.color}30`,
                                        }}
                                    >
                                        {catMeta.icon}
                                        {catMeta.label}
                                    </div>
                                    <span className="text-[10px] text-zinc-600">
                                        {template.use_count > 0 ? `${template.use_count} uses` : 'New'}
                                    </span>
                                </div>

                                {/* Content */}
                                <h3 className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-white transition-colors">
                                    {template.title}
                                </h3>
                                <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-2">
                                    {template.description}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        {template.nodes.slice(0, 4).map((node: any, i: number) => (
                                            <span
                                                key={i}
                                                className="w-6 h-6 rounded-md bg-zinc-800/80 flex items-center justify-center text-xs"
                                                title={node.name}
                                            >
                                                {node.icon}
                                            </span>
                                        ))}
                                        {template.nodes.length > 4 && (
                                            <span className="text-[10px] text-zinc-600 ml-1">
                                                +{template.nodes.length - 4}
                                            </span>
                                        )}
                                    </div>
                                    <motion.div
                                        className="flex items-center gap-1 text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {isUsing ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                Use template
                                                <ArrowRight className="w-3 h-3" />
                                            </>
                                        )}
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
