// ═══════════════════════ Web Search Integration ═══════════════════════
// Uses DuckDuckGo for real-time web search results. No API key needed.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export class WebSearchAdapter implements IntegrationAdapter {
    id = 'web-search';
    name = 'Web Search';
    icon = '🔍';
    description = 'Search the web for real-time information, research, and data';
    category = 'search' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected'; // Always available

    matchKeywords = [
        'search', 'research', 'find', 'lookup', 'discover',
        'market research', 'competitor', 'trending', 'news',
        'information', 'web', 'google', 'query',
    ];

    isConnected(): boolean {
        return true; // No auth needed
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const query = input.query || input.searchQuery || input.keyword || input.topic || '';

        if (!query) {
            return {
                success: false,
                data: {},
                source: 'web-search',
                error: 'No search query provided. Pass a "query" field.',
            };
        }

        try {
            const response = await fetch(`${API_BASE}/api/integration/web-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Search failed' }));
                throw new Error(err.error || `Search failed (${response.status})`);
            }

            const data = await response.json();

            return {
                success: true,
                data: data.results,
                source: 'duckduckgo',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                data: {},
                source: 'web-search',
                error: err.message,
            };
        }
    }
}
