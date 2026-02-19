import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AGENT_STATUS_COLORS } from '@/lib/agents';
import type { WorkflowNode as WorkflowNodeType } from '@/lib/workflowEngine';
import type { CanvasThemeColors } from '@/hooks/useCanvasTheme';
import { IntegrationBadge } from './IntegrationBadge';

interface WorkflowNodeProps {
    node: WorkflowNodeType;
    isSelected: boolean;
    onClick: (nodeId: string) => void;
    // Edit mode props
    isEditMode?: boolean;
    isDragging?: boolean;
    onDragStart?: (e: React.MouseEvent) => void;
    onRemove?: () => void;
    onDuplicate?: () => void;
    onEdgeDrawStart?: (e: React.MouseEvent) => void;
    themeColors?: CanvasThemeColors;
}

export const WorkflowNodeComponent: React.FC<WorkflowNodeProps> = ({
    node, isSelected, onClick,
    isEditMode = false, isDragging = false,
    onDragStart, onRemove, onDuplicate, onEdgeDrawStart, themeColors,
}) => {
    const colors = AGENT_STATUS_COLORS[node.status] || AGENT_STATUS_COLORS.idle;
    const tc = themeColors;

    const statusLabel = useMemo(() => {
        switch (node.status) {
            case 'running': return 'Running...';
            case 'completed': return `Done${node.duration ? ` · ${(node.duration / 1000).toFixed(1)}s` : ''}`;
            case 'failed': return 'Failed';
            case 'skipped': return 'Skipped';
            default: return 'Idle';
        }
    }, [node.status, node.duration]);

    return (
        <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
        >
            <foreignObject
                x={node.position.x - 120}
                y={node.position.y - 45}
                width={240}
                height={90}
                style={{ overflow: 'visible' }}
            >
                <motion.div
                    onMouseDown={(e) => {
                        if (isEditMode && onDragStart) {
                            onDragStart(e);
                        }
                    }}
                    onClick={(e) => {
                        if (!isDragging) {
                            onClick(node.id);
                        }
                    }}
                    className="select-none"
                    whileHover={!isDragging ? { scale: 1.03 } : undefined}
                    whileTap={!isDragging ? { scale: 0.98 } : undefined}
                    style={{
                        width: 240,
                        height: 90,
                        borderRadius: 16,
                        background: tc?.nodeBg || colors.bg,
                        border: isEditMode
                            ? `1.5px dashed ${isSelected ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.25)'}`
                            : `1.5px solid ${tc?.nodeBorder || colors.border}`,
                        boxShadow: isDragging
                            ? '0 8px 32px rgba(139, 92, 246, 0.3), 0 0 0 2px rgba(139, 92, 246, 0.4)'
                            : isSelected
                                ? `0 0 0 2px rgba(139, 92, 246, 0.5), ${colors.glow}`
                                : colors.glow,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 6,
                        backdropFilter: 'blur(12px)',
                        transition: isDragging ? 'none' : 'box-shadow 0.3s, border-color 0.3s',
                        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                        position: 'relative',
                        transform: isDragging ? 'scale(1.04)' : undefined,
                    }}
                >
                    {/* Delete button (edit mode) */}
                    {isEditMode && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove?.();
                            }}
                            style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.9)',
                                border: '2px solid rgba(24, 24, 27, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1,
                                zIndex: 10,
                            }}
                        >
                            ×
                        </div>
                    )}

                    {/* Duplicate button (edit mode) */}
                    {isEditMode && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate?.();
                            }}
                            style={{
                                position: 'absolute',
                                top: -8,
                                right: 18,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: 'rgba(139, 92, 246, 0.85)',
                                border: '2px solid rgba(24, 24, 27, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: 10,
                                color: '#fff',
                                lineHeight: 1,
                                zIndex: 10,
                            }}
                            title="Duplicate node"
                        >
                            📋
                        </div>
                    )}

                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{node.icon}</span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: tc?.nodeText || '#e4e4e7',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.2',
                        }}>
                            {node.name}
                        </span>
                        {node.status === 'running' && (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 14,
                                    height: 14,
                                    border: '2px solid rgba(59, 130, 246, 0.3)',
                                    borderTopColor: '#60a5fa',
                                    borderRadius: '50%',
                                }}
                            />
                        )}
                        {node.status === 'completed' && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{ color: '#4ade80', fontSize: 14, fontWeight: 700 }}
                            >
                                ✓
                            </motion.div>
                        )}
                        {node.status === 'failed' && (
                            <span style={{ color: '#f87171', fontSize: 14, fontWeight: 700 }}>✗</span>
                        )}
                    </div>

                    {/* Description + Status + Integration Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                            <span style={{
                                fontSize: 11,
                                color: tc?.nodeSubtext || '#a1a1aa',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 110,
                                lineHeight: '1.3',
                            }}>
                                {node.description}
                            </span>
                            <IntegrationBadge
                                integrationId={node.integrationId}
                                executionMode={node.executionMode || 'ai'}
                                dataSource={node.dataSource}
                                compact
                            />
                        </div>
                        <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: colors.text,
                            paddingLeft: 8,
                            whiteSpace: 'nowrap',
                        }}>
                            {statusLabel}
                        </span>
                    </div>

                    {/* Edge connection port (edit mode) */}
                    {isEditMode && (
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                onEdgeDrawStart?.(e);
                            }}
                            style={{
                                position: 'absolute',
                                bottom: -10,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: 'rgba(139, 92, 246, 0.6)',
                                border: '2px solid rgba(24, 24, 27, 1)',
                                cursor: 'crosshair',
                                zIndex: 10,
                                transition: 'background 0.2s, transform 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.9)';
                                (e.target as HTMLElement).style.transform = 'translateX(-50%) scale(1.3)';
                            }}
                            onMouseLeave={(e) => {
                                (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.6)';
                                (e.target as HTMLElement).style.transform = 'translateX(-50%) scale(1)';
                            }}
                            title="Drag to connect"
                        />
                    )}
                </motion.div>
            </foreignObject>
        </motion.g>
    );
};
