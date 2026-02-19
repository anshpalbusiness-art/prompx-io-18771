// ═══════════════════════ Universal Agent System ═══════════════════════
// Agents are created dynamically by the AI Planner.
// This file provides the base interface, registry, and executor.

export interface AgentInput {
    data: Record<string, any>;
    parentOutputs: Record<string, any>;
    workflowGoal: string;
}

export interface AgentOutput {
    data: Record<string, any>;
    summary: string;
    metrics?: Record<string, number | string>;
}

export interface AgentDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    capabilities: string[];
    systemPrompt: string;
    category?: string;
}

// ─── Agent Icon Mapping ───
// Used by the AI planner to assign icons to agents
export const AGENT_ICON_MAP: Record<string, string> = {
    // E-commerce
    'shopify': '🛒',
    'store': '🏪',
    'product': '📦',
    'order': '📋',
    'inventory': '📊',
    // Social Media
    'instagram': '📸',
    'tiktok': '🎵',
    'twitter': '🐦',
    'youtube': '▶️',
    'social': '📱',
    // Communication
    'email': '📧',
    'notification': '🔔',
    'message': '💬',
    'sms': '📲',
    // Business
    'crm': '🗂️',
    'lead': '🎯',
    'sales': '💰',
    'invoice': '🧾',
    'payment': '💳',
    // Analytics
    'analytics': '📈',
    'report': '📊',
    'dashboard': '📉',
    'metric': '🔢',
    // Content
    'content': '✍️',
    'blog': '📝',
    'seo': '🔍',
    'design': '🎨',
    'video': '🎬',
    // Development
    'code': '💻',
    'deploy': '🚀',
    'test': '🧪',
    'debug': '🐛',
    'database': '🗃️',
    // System
    'file': '📁',
    'system': '⚙️',
    'schedule': '📅',
    'automation': '🤖',
    // Generic
    'agent': '🧠',
    'planner': '📋',
    'monitor': '👁️',
    'processor': '⚡',
    'transformer': '🔄',
    'validator': '✅',
    'aggregator': '🔗',
};

// Find best matching icon for an agent name
export function getAgentIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(AGENT_ICON_MAP)) {
        if (lower.includes(key)) return icon;
    }
    return '🧠'; // Default
}

// ─── Agent Color Mapping by Status ───
export const AGENT_STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    idle: {
        bg: 'rgba(63, 63, 70, 0.5)',
        border: 'rgba(113, 113, 122, 0.4)',
        text: '#a1a1aa',
        glow: 'none',
    },
    running: {
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.6)',
        text: '#60a5fa',
        glow: '0 0 20px rgba(59, 130, 246, 0.3)',
    },
    completed: {
        bg: 'rgba(34, 197, 94, 0.15)',
        border: 'rgba(34, 197, 94, 0.6)',
        text: '#4ade80',
        glow: '0 0 15px rgba(34, 197, 94, 0.2)',
    },
    failed: {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.6)',
        text: '#f87171',
        glow: '0 0 15px rgba(239, 68, 68, 0.3)',
    },
    skipped: {
        bg: 'rgba(161, 161, 170, 0.1)',
        border: 'rgba(161, 161, 170, 0.3)',
        text: '#71717a',
        glow: 'none',
    },
};
