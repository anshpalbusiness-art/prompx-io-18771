import React from 'react';
import { motion } from 'framer-motion';
import type { WorkflowEdge as WorkflowEdgeType, WorkflowNode } from '@/lib/workflowEngine';
import type { CanvasThemeColors } from '@/hooks/useCanvasTheme';

interface WorkflowEdgeProps {
    edge: WorkflowEdgeType;
    sourceNode: WorkflowNode;
    targetNode: WorkflowNode;
    isEditMode?: boolean;
    onRemove?: (edgeId: string) => void;
    themeColors?: CanvasThemeColors;
}

export const WorkflowEdgeComponent: React.FC<WorkflowEdgeProps> = ({
    edge, sourceNode, targetNode,
    isEditMode = false, onRemove, themeColors,
}) => {
    const sx = sourceNode.position.x;
    const sy = sourceNode.position.y + 45; // Bottom of source node
    const tx = targetNode.position.x;
    const ty = targetNode.position.y - 45; // Top of target node

    // Bezier control points for smooth curve
    const midY = (sy + ty) / 2;
    const d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

    const isActive = sourceNode.status === 'completed' || targetNode.status === 'running';
    const isCompleted = sourceNode.status === 'completed' && targetNode.status === 'completed';
    const isFailed = targetNode.status === 'failed';

    const strokeColor = isFailed
        ? 'rgba(239, 68, 68, 0.5)'
        : isCompleted
            ? 'rgba(34, 197, 94, 0.5)'
            : isActive
                ? 'rgba(59, 130, 246, 0.6)'
                : isEditMode
                    ? 'rgba(139, 92, 246, 0.35)'
                    : themeColors?.edgeStroke || 'rgba(113, 113, 122, 0.25)';

    const midX = (sx + tx) / 2;

    return (
        <g>
            {/* Background glow */}
            {isActive && !isCompleted && (
                <path
                    d={d}
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.15)"
                    strokeWidth={6}
                    strokeLinecap="round"
                />
            )}

            {/* Main path */}
            <motion.path
                d={d}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={isEditMode ? '6,4' : undefined}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
            />

            {/* Animated flow dots when active */}
            {isActive && !isCompleted && !isFailed && (
                <motion.circle
                    r={3}
                    fill="#60a5fa"
                    filter="drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))"
                >
                    <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
                </motion.circle>
            )}

            {/* Arrow at target */}
            <ArrowHead tx={tx} ty={ty} color={strokeColor} />

            {/* Edge label */}
            {edge.label && (
                <text
                    x={midX}
                    y={midY - 8}
                    textAnchor="middle"
                    fill={isEditMode ? '#a78bfa' : themeColors?.edgeLabel || '#71717a'}
                    fontSize={9}
                    fontFamily="Inter, system-ui, sans-serif"
                >
                    {edge.label}
                </text>
            )}

            {/* Delete button (edit mode) */}
            {isEditMode && onRemove && (
                <foreignObject
                    x={midX - 10}
                    y={midY - 10}
                    width={20}
                    height={20}
                    style={{ overflow: 'visible' }}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(edge.id);
                        }}
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.85)',
                            border: '2px solid rgba(24, 24, 27, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                            lineHeight: 1,
                            opacity: 0.7,
                            transition: 'opacity 0.2s, transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.opacity = '1';
                            (e.target as HTMLElement).style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.opacity = '0.7';
                            (e.target as HTMLElement).style.transform = 'scale(1)';
                        }}
                    >
                        ×
                    </div>
                </foreignObject>
            )}
        </g>
    );
};

// Small arrow head at the target end
const ArrowHead: React.FC<{ tx: number; ty: number; color: string }> = ({ tx, ty, color }) => (
    <polygon
        points={`${tx - 5},${ty - 8} ${tx + 5},${ty - 8} ${tx},${ty - 2}`}
        fill={color}
    />
);
