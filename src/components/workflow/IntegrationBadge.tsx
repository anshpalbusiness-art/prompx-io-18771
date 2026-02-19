// ═══════════════════════ Integration Badge ═══════════════════════
// Shows 🔌 LIVE or 🤖 AI badge on workflow nodes to indicate data source

import React from 'react';
import { motion } from 'framer-motion';

interface IntegrationBadgeProps {
    integrationId?: string | null;
    executionMode: 'ai' | 'integration' | 'hybrid';
    dataSource?: string;
    compact?: boolean; // Small mode for node cards
}

const INTEGRATION_META: Record<string, { name: string; icon: string; color: string }> = {
    // Built-in
    'web-search': { name: 'Web Search', icon: '🔍', color: '#22d3ee' },    // cyan
    'web-scraper': { name: 'Web Scraper', icon: '🕸️', color: '#a78bfa' },   // purple
    'file-system': { name: 'File System', icon: '📁', color: '#fbbf24' },   // amber
    'shell-command': { name: 'Shell', icon: '⚡', color: '#f97316' },       // orange

    // Phase 2: Core
    'email': { name: 'Email', icon: '✉️', color: '#3b82f6' },              // blue
    'crm': { name: 'CRM', icon: '📋', color: '#ec4899' },                  // pink
    'calendar': { name: 'Calendar', icon: '📅', color: '#10b981' },         // emerald
    'notification': { name: 'Notifications', icon: '🔔', color: '#f43f5e' }, // rose
    'database': { name: 'Database', icon: '🗄️', color: '#6366f1' },       // indigo

    // Phase 3: Commerce & Social
    'shopify': { name: 'Shopify', icon: '🛍️', color: '#95bf47' },         // shopify green
    'twitter': { name: 'Twitter', icon: '🐦', color: '#1d9bf0' },          // twitter blue
    'linkedin': { name: 'LinkedIn', icon: '💼', color: '#0a66c2' },         // linkedin blue
};

export const IntegrationBadge: React.FC<IntegrationBadgeProps> = ({
    integrationId,
    executionMode,
    dataSource,
    compact = false,
}) => {
    const isLive = integrationId && executionMode !== 'ai';
    const meta = integrationId ? INTEGRATION_META[integrationId] : null;

    // Determine what to show based on execution state
    const hasRun = !!dataSource;
    const usedRealData = dataSource && dataSource !== 'ai-simulated';

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    background: isLive
                        ? `${meta?.color || '#22d3ee'}20`
                        : 'rgba(113, 113, 122, 0.2)',
                    color: isLive
                        ? meta?.color || '#22d3ee'
                        : '#a1a1aa',
                    border: `1px solid ${isLive
                        ? `${meta?.color || '#22d3ee'}40`
                        : 'rgba(113, 113, 122, 0.3)'}`,
                }}
            >
                <span style={{ fontSize: '8px' }}>
                    {hasRun
                        ? (usedRealData ? '🔌' : '🤖')
                        : (isLive ? '🔌' : '🤖')
                    }
                </span>
                <span>
                    {hasRun
                        ? (usedRealData ? 'LIVE' : 'AI')
                        : (isLive ? 'LIVE' : 'AI')
                    }
                </span>
            </motion.div>
        );
    }

    // Full badge for detail panel
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: isLive
                ? `${meta?.color || '#22d3ee'}10`
                : 'rgba(113, 113, 122, 0.1)',
            border: `1px solid ${isLive
                ? `${meta?.color || '#22d3ee'}30`
                : 'rgba(113, 113, 122, 0.2)'}`,
        }}>
            <span style={{ fontSize: '16px' }}>
                {isLive ? (meta?.icon || '🔌') : '🤖'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isLive ? meta?.color || '#22d3ee' : '#a1a1aa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                    {isLive ? `${meta?.name || 'Integration'} — Live Data` : 'AI Simulation'}
                </span>
                <span style={{ fontSize: '10px', color: '#71717a' }}>
                    {hasRun
                        ? `Source: ${dataSource}`
                        : (isLive
                            ? 'Will use real data when executed'
                            : 'Uses AI to generate realistic data')
                    }
                </span>
            </div>
        </div>
    );
};

export default IntegrationBadge;
