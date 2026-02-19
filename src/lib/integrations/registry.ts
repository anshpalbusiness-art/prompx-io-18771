// ═══════════════════════ Integration Registry ═══════════════════════
// Central registry that maps integrationId → adapter.
// The workflow engine checks this before executing an agent.

import type { IntegrationAdapter, IntegrationInfo } from './types';
import { WebSearchAdapter } from './adapters/web-search';
import { WebScraperAdapter } from './adapters/web-scraper';
import { FileSystemAdapter } from './adapters/file-system';
import { ShellCommandAdapter } from './adapters/shell-command';
import { EmailAdapter } from './adapters/email';
import { CrmAdapter } from './adapters/crm';
import { CalendarAdapter } from './adapters/calendar';
import { NotificationAdapter } from './adapters/notification';
import { DatabaseAdapter } from './adapters/database';
import { ShopifyAdapter } from './adapters/shopify';
import { TwitterAdapter } from './adapters/twitter';
import { LinkedInAdapter } from './adapters/linkedin';

class IntegrationRegistry {
    private adapters: Map<string, IntegrationAdapter> = new Map();

    constructor() {
        // Register built-in adapters
        this.register(new WebSearchAdapter());
        this.register(new WebScraperAdapter());
        this.register(new FileSystemAdapter());
        this.register(new ShellCommandAdapter());
        // Phase 2: Core agent integrations
        this.register(new EmailAdapter());
        this.register(new CrmAdapter());
        this.register(new CalendarAdapter());
        this.register(new NotificationAdapter());
        this.register(new DatabaseAdapter());
        // Phase 3: E-commerce & Social integrations
        this.register(new ShopifyAdapter());
        this.register(new TwitterAdapter());
        this.register(new LinkedInAdapter());
    }

    register(adapter: IntegrationAdapter): void {
        this.adapters.set(adapter.id, adapter);
    }

    get(id: string): IntegrationAdapter | undefined {
        return this.adapters.get(id);
    }

    has(id: string): boolean {
        return this.adapters.has(id);
    }

    /** Get all registered integrations */
    getAll(): IntegrationAdapter[] {
        return Array.from(this.adapters.values());
    }

    /** Get summary info for UI display */
    getAllInfo(): IntegrationInfo[] {
        return this.getAll().map(a => ({
            id: a.id,
            name: a.name,
            icon: a.icon,
            description: a.description,
            category: a.category,
            status: a.status,
            requiresAuth: a.requiresAuth,
        }));
    }

    /** Find the best matching integration for an agent based on keywords */
    findMatch(agentName: string, agentDescription: string, capabilities: string[]): string | null {
        const searchText = `${agentName} ${agentDescription} ${capabilities.join(' ')}`.toLowerCase();

        let bestMatch: { id: string; score: number } | null = null;

        for (const adapter of this.adapters.values()) {
            let score = 0;
            for (const keyword of adapter.matchKeywords) {
                if (searchText.includes(keyword.toLowerCase())) {
                    score++;
                }
            }
            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { id: adapter.id, score };
            }
        }

        return bestMatch?.id || null;
    }

    /** Generate a summary of available integrations for the AI planner */
    getPlannerContext(): string {
        const lines = this.getAll().map(a =>
            `- "${a.id}": ${a.name} (${a.icon}) — ${a.description}. Keywords: [${a.matchKeywords.join(', ')}]. Status: ${a.status}`
        );
        return `AVAILABLE REAL INTEGRATIONS (use these integrationIds when an agent matches):\n${lines.join('\n')}`;
    }
}

// Singleton
export const integrationRegistry = new IntegrationRegistry();
