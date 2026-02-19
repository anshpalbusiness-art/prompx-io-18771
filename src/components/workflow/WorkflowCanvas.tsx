import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowNodeComponent } from './WorkflowNode';
import { WorkflowEdgeComponent } from './WorkflowEdge';
import { Plus, Sun, Moon } from 'lucide-react';
import { WorkflowMinimap } from './WorkflowMinimap';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import type { CanvasThemeColors } from '@/hooks/useCanvasTheme';
import type { WorkflowDefinition } from '@/lib/workflowEngine';

interface WorkflowCanvasProps {
    workflow: WorkflowDefinition | null;
    selectedNodeId: string | null;
    onNodeClick: (nodeId: string) => void;
    // Edit mode props
    isEditMode?: boolean;
    onNodeDrag?: (nodeId: string, position: { x: number; y: number }) => void;
    onRemoveNode?: (nodeId: string) => void;
    onAddNode?: (position?: { x: number; y: number }) => void;
    onAddEdge?: (sourceId: string, targetId: string) => void;
    onRemoveEdge?: (edgeId: string) => void;
    onDuplicateNode?: (nodeId: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
    workflow,
    selectedNodeId,
    onNodeClick,
    isEditMode = false,
    onNodeDrag,
    onRemoveNode,
    onAddNode,
    onAddEdge,
    onRemoveEdge,
    onDuplicateNode,
    onUndo,
    onRedo,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [viewBox, setViewBox] = useState({ x: -400, y: -80, w: 800, h: 500 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [showMinimap, setShowMinimap] = useState(true);
    const { theme, toggleTheme, themeColors } = useCanvasTheme();

    // Keyboard shortcuts: Cmd+Z to undo, Cmd+Shift+Z to redo
    useEffect(() => {
        if (!isEditMode) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo?.();
                } else {
                    onUndo?.();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isEditMode, onUndo, onRedo]);

    // Drag state
    const [dragNodeId, setDragNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Edge drawing state
    const [edgeDrawSource, setEdgeDrawSource] = useState<string | null>(null);
    const [edgeDrawPos, setEdgeDrawPos] = useState<{ x: number; y: number } | null>(null);

    // Convert screen coordinates to SVG coordinates
    const screenToSVG = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const svgPt = pt.matrixTransform(ctm.inverse());
        return { x: svgPt.x, y: svgPt.y };
    }, []);

    // Snap to 40px grid
    const snapToGrid = (val: number) => Math.round(val / 40) * 40;

    // Calculate viewBox from nodes
    useEffect(() => {
        if (!workflow || workflow.nodes.length === 0) return;

        const xs = workflow.nodes.map(n => n.position.x);
        const ys = workflow.nodes.map(n => n.position.y);
        const minX = Math.min(...xs) - 200;
        const maxX = Math.max(...xs) + 200;
        const minY = Math.min(...ys) - 100;
        const maxY = Math.max(...ys) + 150;

        setViewBox({
            x: minX,
            y: minY,
            w: Math.max(maxX - minX, 600),
            h: Math.max(maxY - minY, 400),
        });
    }, [workflow?.nodes.length]);

    // ─── Mouse Handlers ───

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (dragNodeId || edgeDrawSource) return; // Don't pan while dragging
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
    }, [dragNodeId, edgeDrawSource]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Dragging a node
        if (dragNodeId && isEditMode && onNodeDrag) {
            const svgPos = screenToSVG(e.clientX, e.clientY);
            const snappedX = snapToGrid(svgPos.x - dragOffset.x);
            const snappedY = snapToGrid(svgPos.y - dragOffset.y);
            onNodeDrag(dragNodeId, { x: snappedX, y: snappedY });
            return;
        }

        // Drawing an edge
        if (edgeDrawSource && isEditMode) {
            const svgPos = screenToSVG(e.clientX, e.clientY);
            setEdgeDrawPos(svgPos);
            return;
        }

        // Panning
        if (!isPanning) return;
        const dx = (e.clientX - panStart.x) * (viewBox.w / (svgRef.current?.clientWidth || 800));
        const dy = (e.clientY - panStart.y) * (viewBox.h / (svgRef.current?.clientHeight || 500));
        setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        setPanStart({ x: e.clientX, y: e.clientY });
    }, [isPanning, panStart, viewBox, dragNodeId, dragOffset, isEditMode, onNodeDrag, edgeDrawSource, screenToSVG]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        // Finish edge drawing
        if (edgeDrawSource && isEditMode && onAddEdge && workflow) {
            // Check if the mouse is over any node
            const svgPos = screenToSVG(e.clientX, e.clientY);
            const targetNode = workflow.nodes.find(n =>
                svgPos.x >= n.position.x - 120 && svgPos.x <= n.position.x + 120 &&
                svgPos.y >= n.position.y - 45 && svgPos.y <= n.position.y + 45 &&
                n.id !== edgeDrawSource
            );
            if (targetNode) {
                onAddEdge(edgeDrawSource, targetNode.id);
            }
            setEdgeDrawSource(null);
            setEdgeDrawPos(null);
        }

        setDragNodeId(null);
        setIsPanning(false);
    }, [edgeDrawSource, isEditMode, onAddEdge, workflow, screenToSVG]);

    // Node drag start handler
    const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.stopPropagation();
        const node = workflow?.nodes.find(n => n.id === nodeId);
        if (!node) return;
        const svgPos = screenToSVG(e.clientX, e.clientY);
        setDragOffset({ x: svgPos.x - node.position.x, y: svgPos.y - node.position.y });
        setDragNodeId(nodeId);
    }, [isEditMode, workflow, screenToSVG]);

    // Edge draw start handler
    const handleEdgeDrawStart = useCallback((nodeId: string, e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.stopPropagation();
        setEdgeDrawSource(nodeId);
        const svgPos = screenToSVG(e.clientX, e.clientY);
        setEdgeDrawPos(svgPos);
    }, [isEditMode, screenToSVG]);

    // Zoom handler
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
        const newScale = Math.max(0.3, Math.min(3, scale * zoomFactor));
        setScale(newScale);
        setViewBox(prev => {
            const cx = prev.x + prev.w / 2;
            const cy = prev.y + prev.h / 2;
            const newW = prev.w * zoomFactor;
            const newH = prev.h * zoomFactor;
            return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
        });
    }, [scale]);

    // Build node map for edge lookups
    const nodeMap = new Map(workflow?.nodes.map(n => [n.id, n]) || []);

    if (!workflow) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <div className="text-6xl">🧠</div>
                    <h3 className="text-xl font-semibold text-zinc-300">No Workflow Active</h3>
                    <p className="text-sm text-zinc-500 max-w-md">
                        Describe your goal below and the AI will create a workflow of specialized agents to achieve it.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full relative overflow-hidden" style={{ background: themeColors.canvasBg }}>
            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: themeColors.canvasGradient }} />
            {/* Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
            linear-gradient(${themeColors.gridDot} 1px, transparent 1px),
            linear-gradient(90deg, ${themeColors.gridDot} 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Edit Mode Indicator */}
            {isEditMode && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-violet-500/15 border border-violet-500/30 rounded-full backdrop-blur-xl"
                >
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-medium text-violet-300">
                        Edit Mode — Drag nodes · Draw edges · Click to edit
                    </span>
                </motion.div>
            )}

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { setIsPanning(false); setDragNodeId(null); setEdgeDrawSource(null); setEdgeDrawPos(null); }}
                onWheel={handleWheel}
                style={{
                    cursor: dragNodeId ? 'grabbing' : (isEditMode && edgeDrawSource) ? 'crosshair' : isPanning ? 'grabbing' : isEditMode ? 'default' : 'grab',
                }}
            >
                {/* Edges (render below nodes) */}
                <AnimatePresence>
                    {workflow.edges.map(edge => {
                        const source = nodeMap.get(edge.source);
                        const target = nodeMap.get(edge.target);
                        if (!source || !target) return null;
                        return (
                            <WorkflowEdgeComponent
                                key={edge.id}
                                edge={edge}
                                sourceNode={source}
                                targetNode={target}
                                isEditMode={isEditMode}
                                onRemove={onRemoveEdge}
                                themeColors={themeColors}
                            />
                        );
                    })}
                </AnimatePresence>

                {/* Pending edge while drawing */}
                {edgeDrawSource && edgeDrawPos && (() => {
                    const sourceNode = nodeMap.get(edgeDrawSource);
                    if (!sourceNode) return null;
                    return (
                        <line
                            x1={sourceNode.position.x}
                            y1={sourceNode.position.y + 45}
                            x2={edgeDrawPos.x}
                            y2={edgeDrawPos.y}
                            stroke="rgba(139, 92, 246, 0.5)"
                            strokeWidth={2}
                            strokeDasharray="8,4"
                            className="pointer-events-none"
                        />
                    );
                })()}

                {/* Nodes */}
                <AnimatePresence>
                    {workflow.nodes.map(node => (
                        <WorkflowNodeComponent
                            key={node.id}
                            node={node}
                            isSelected={node.id === selectedNodeId}
                            onClick={onNodeClick}
                            isEditMode={isEditMode}
                            isDragging={node.id === dragNodeId}
                            onDragStart={(e) => handleNodeDragStart(node.id, e)}
                            onRemove={() => onRemoveNode?.(node.id)}
                            onDuplicate={() => onDuplicateNode?.(node.id)}
                            onEdgeDrawStart={(e) => handleEdgeDrawStart(node.id, e)}
                            themeColors={themeColors}
                        />
                    ))}
                </AnimatePresence>
            </svg>

            {/* Workflow Title */}
            <div className="absolute top-4 left-4 z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="backdrop-blur-xl rounded-xl px-4 py-3"
                    style={{ background: themeColors.titleBg, border: `1px solid ${themeColors.panelBorder}` }}
                >
                    <h2 className="text-sm font-semibold" style={{ color: themeColors.nodeText }}>{workflow.title}</h2>
                    <p className="text-xs mt-0.5" style={{ color: themeColors.nodeSubtext }}>{workflow.nodes.length} agents · {workflow.edges.length} connections</p>
                </motion.div>
            </div>

            {/* Add Agent Button (edit mode only) */}
            <AnimatePresence>
                {isEditMode && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => onAddNode?.()}
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl text-violet-300 text-xs font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all backdrop-blur-xl shadow-lg shadow-violet-500/10"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Agent
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
                <button
                    onClick={() => handleWheel({ deltaY: -100, preventDefault: () => { } } as any)}
                    className="w-8 h-8 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors text-sm"
                >
                    +
                </button>
                <button
                    onClick={() => handleWheel({ deltaY: 100, preventDefault: () => { } } as any)}
                    className="w-8 h-8 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors text-sm"
                >
                    −
                </button>
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute bottom-4 left-4 z-10 w-8 h-8 backdrop-blur-xl rounded-lg flex items-center justify-center transition-colors text-sm"
                style={{
                    background: themeColors.titleBg,
                    border: `1px solid ${themeColors.panelBorder}`,
                    color: themeColors.nodeSubtext,
                }}
                title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Minimap */}
            {workflow && workflow.nodes.length > 0 && (
                <div className="absolute bottom-16 right-4 z-10">
                    <WorkflowMinimap
                        workflow={workflow}
                        viewBox={viewBox}
                        onNavigate={(x, y) => setViewBox(prev => ({ ...prev, x, y }))}
                        isVisible={showMinimap}
                        onToggle={() => setShowMinimap(v => !v)}
                    />
                </div>
            )}
        </div>
    );
};
