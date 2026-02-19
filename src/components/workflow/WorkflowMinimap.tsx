import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map } from 'lucide-react';
import type { WorkflowDefinition } from '@/lib/workflowEngine';

interface WorkflowMinimapProps {
    workflow: WorkflowDefinition;
    viewBox: { x: number; y: number; w: number; h: number };
    onNavigate: (x: number, y: number) => void;
    isVisible: boolean;
    onToggle: () => void;
}

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const PADDING = 40;

export const WorkflowMinimap: React.FC<WorkflowMinimapProps> = ({
    workflow,
    viewBox,
    onNavigate,
    isVisible,
    onToggle,
}) => {
    // Calculate bounding box of all nodes
    const bounds = useMemo(() => {
        if (workflow.nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
        const xs = workflow.nodes.map(n => n.position.x);
        const ys = workflow.nodes.map(n => n.position.y);
        return {
            minX: Math.min(...xs) - PADDING * 3,
            minY: Math.min(...ys) - PADDING * 3,
            maxX: Math.max(...xs) + PADDING * 3,
            maxY: Math.max(...ys) + PADDING * 3,
        };
    }, [workflow.nodes]);

    const worldW = bounds.maxX - bounds.minX || 1;
    const worldH = bounds.maxY - bounds.minY || 1;
    const scaleX = MINIMAP_W / worldW;
    const scaleY = MINIMAP_H / worldH;
    const scale = Math.min(scaleX, scaleY);

    // Convert world coord to minimap pixel
    const toMini = useCallback(
        (wx: number, wy: number) => ({
            x: (wx - bounds.minX) * scale,
            y: (wy - bounds.minY) * scale,
        }),
        [bounds, scale]
    );

    // Click on minimap to navigate canvas
    const handleClick = useCallback(
        (e: React.MouseEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const worldX = mx / scale + bounds.minX;
            const worldY = my / scale + bounds.minY;
            onNavigate(worldX - viewBox.w / 2, worldY - viewBox.h / 2);
        },
        [scale, bounds, viewBox, onNavigate]
    );

    const vpRect = toMini(viewBox.x, viewBox.y);
    const vpW = viewBox.w * scale;
    const vpH = viewBox.h * scale;

    return (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
            {/* Toggle button */}
            <button
                onClick={onToggle}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors backdrop-blur-xl ${isVisible
                        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                        : 'bg-zinc-900/70 text-zinc-400 border border-zinc-800/50 hover:text-zinc-200'
                    }`}
                title={isVisible ? 'Hide minimap' : 'Show minimap'}
            >
                <Map className="w-3.5 h-3.5" />
            </button>

            {/* Minimap panel */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden"
                        style={{ width: MINIMAP_W + 16, padding: 8 }}
                    >
                        <svg
                            width={MINIMAP_W}
                            height={MINIMAP_H}
                            onClick={handleClick}
                            style={{ cursor: 'crosshair', display: 'block', borderRadius: 8 }}
                        >
                            {/* Background */}
                            <rect width={MINIMAP_W} height={MINIMAP_H} fill="rgba(24,24,27,0.6)" rx={4} />

                            {/* Edges */}
                            {workflow.edges.map(edge => {
                                const src = workflow.nodes.find(n => n.id === edge.source);
                                const tgt = workflow.nodes.find(n => n.id === edge.target);
                                if (!src || !tgt) return null;
                                const p1 = toMini(src.position.x, src.position.y);
                                const p2 = toMini(tgt.position.x, tgt.position.y);
                                return (
                                    <line
                                        key={edge.id}
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke="rgba(139,92,246,0.3)"
                                        strokeWidth={1}
                                    />
                                );
                            })}

                            {/* Nodes as dots */}
                            {workflow.nodes.map(node => {
                                const p = toMini(node.position.x, node.position.y);
                                const isRunning = node.status === 'running';
                                const isCompleted = node.status === 'completed';
                                const isFailed = node.status === 'failed';
                                const fill = isRunning
                                    ? '#60a5fa'
                                    : isCompleted
                                        ? '#4ade80'
                                        : isFailed
                                            ? '#f87171'
                                            : '#a1a1aa';
                                return (
                                    <circle
                                        key={node.id}
                                        cx={p.x}
                                        cy={p.y}
                                        r={4}
                                        fill={fill}
                                        stroke="rgba(24,24,27,0.8)"
                                        strokeWidth={1}
                                    />
                                );
                            })}

                            {/* Viewport rectangle */}
                            <rect
                                x={Math.max(0, vpRect.x)}
                                y={Math.max(0, vpRect.y)}
                                width={Math.min(vpW, MINIMAP_W)}
                                height={Math.min(vpH, MINIMAP_H)}
                                fill="rgba(139,92,246,0.08)"
                                stroke="rgba(139,92,246,0.5)"
                                strokeWidth={1}
                                rx={2}
                            />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
