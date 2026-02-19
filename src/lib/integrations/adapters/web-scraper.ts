// ═══════════════════════ Web Scraper Integration ═══════════════════════
// Extracts text content from any URL. No API key needed.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export class WebScraperAdapter implements IntegrationAdapter {
    id = 'web-scraper';
    name = 'Web Scraper';
    icon = '🕸️';
    description = 'Extract text content from web pages, articles, and documentation';
    category = 'scraping' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'scrape', 'extract', 'crawl', 'parse', 'fetch',
        'website', 'page', 'article', 'blog', 'url',
        'content extraction', 'web page', 'read page',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const url = input.url || input.link || input.website || input.pageUrl || '';

        if (!url) {
            return {
                success: false,
                data: {},
                source: 'web-scraper',
                error: 'No URL provided. Pass a "url" field.',
            };
        }

        try {
            const response = await fetch(`${API_BASE}/api/integration/web-scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Scraping failed' }));
                throw new Error(err.error || `Scraping failed (${response.status})`);
            }

            const data = await response.json();

            return {
                success: true,
                data: {
                    url: data.url,
                    title: data.title,
                    content: data.content,
                    wordCount: data.wordCount,
                    excerpt: data.excerpt,
                },
                source: 'web-scraper',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                data: {},
                source: 'web-scraper',
                error: err.message,
            };
        }
    }
}
