// ═══════════════════════ Twitter / X Integration Adapter ═══════════════════
import type { IntegrationAdapter, IntegrationResult } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const STORAGE_KEY = 'promptx_twitter_tweets';

// ── Seed demo timeline ──────────────────────────────────────────────────────
function seedTweets(): any[] {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing);

    const tweets = [
        {
            id: 'tw_1', text: '🚀 Just launched our new AI workflow engine! Automate everything.',
            author: 'PromptX', handle: '@promptx_ai',
            likes: 142, retweets: 38, replies: 12,
            created_at: '2026-02-15T10:00:00Z',
        },
        {
            id: 'tw_2', text: 'The future of business is AI-powered automation. Here\'s why 👇',
            author: 'PromptX', handle: '@promptx_ai',
            likes: 89, retweets: 25, replies: 7,
            created_at: '2026-02-14T14:30:00Z',
        },
        {
            id: 'tw_3', text: '5 ways to streamline your e-commerce workflow with AI agents. Thread 🧵',
            author: 'PromptX', handle: '@promptx_ai',
            likes: 214, retweets: 67, replies: 23,
            created_at: '2026-02-13T09:15:00Z',
        },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tweets));
    return tweets;
}

// ── Adapter ─────────────────────────────────────────────────────────────────
export class TwitterAdapter implements IntegrationAdapter {
    id = 'twitter';
    name = 'Twitter / X';
    icon = '🐦';
    description = 'Post tweets, search content, and manage your Twitter/X presence';
    category = 'social' as const;
    requiresAuth = true;
    status = 'connected' as const;

    matchKeywords = [
        'twitter', 'tweet', 'tweets', 'x.com', 'post', 'social media',
        'hashtag', 'trending', 'retweet', 'timeline', 'followers',
        'social', 'thread', 'engagement',
    ];

    isConnected(): boolean { return true; }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'search-tweets';

        try {
            switch (action) {
                case 'post-tweet': return this.postTweet(input);
                case 'search-tweets': return this.searchTweets(input);
                case 'get-timeline': return this.getTimeline();
                case 'get-user': return this.getUser(input);
                default:
                    return { success: false, data: {}, source: 'twitter', error: `Unknown action: ${action}` };
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'twitter', error: err.message };
        }
    }

    // ── Actions ─────────────────────────────────────────────────────────────

    private postTweet(input: Record<string, any>): IntegrationResult {
        const text = input.text || input.content || input.message;
        if (!text) return { success: false, data: {}, source: 'twitter', error: 'Tweet text is required' };
        if (text.length > 280) return { success: false, data: {}, source: 'twitter', error: 'Tweet exceeds 280 characters' };

        const tweets = seedTweets();
        const newTweet = {
            id: `tw_${Date.now()}`,
            text,
            author: 'PromptX', handle: '@promptx_ai',
            likes: 0, retweets: 0, replies: 0,
            created_at: new Date().toISOString(),
        };

        tweets.unshift(newTweet);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tweets));

        return {
            success: true, source: 'twitter',
            data: {
                tweet: newTweet, action: 'post-tweet',
                message: `Tweet posted successfully (${text.length}/280 chars)`,
            },
        };
    }

    private searchTweets(input: Record<string, any>): IntegrationResult {
        const query = (input.query || input.search || '').toLowerCase();
        const tweets = seedTweets();

        // Simulate search — match against local tweets + generate mock results
        const localMatches = tweets.filter((t: any) => t.text.toLowerCase().includes(query));

        const mockExternalResults = query ? [
            {
                id: `ext_${Date.now()}_1`, text: `Great insights on ${query}! The AI industry is evolving fast.`,
                author: 'TechDaily', handle: '@techdaily',
                likes: Math.floor(Math.random() * 500), retweets: Math.floor(Math.random() * 100),
                created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                id: `ext_${Date.now()}_2`, text: `Latest trends in ${query} — what you need to know in 2026.`,
                author: 'AIInsider', handle: '@ai_insider',
                likes: Math.floor(Math.random() * 300), retweets: Math.floor(Math.random() * 80),
                created_at: new Date(Date.now() - 7200000).toISOString(),
            },
        ] : [];

        const results = [...localMatches, ...mockExternalResults];

        return {
            success: true, source: 'twitter',
            data: {
                tweets: results, total: results.length,
                query, action: 'search-tweets',
            },
        };
    }

    private getTimeline(): IntegrationResult {
        const tweets = seedTweets();
        return {
            success: true, source: 'twitter',
            data: { tweets, total: tweets.length, action: 'get-timeline' },
        };
    }

    private getUser(input: Record<string, any>): IntegrationResult {
        const handle = input.handle || input.username || '@promptx_ai';
        return {
            success: true, source: 'twitter',
            data: {
                user: {
                    handle, name: 'PromptX AI',
                    bio: 'Advanced AI Prompt Engineering & Workflow Automation Platform',
                    followers: 12400, following: 350,
                    tweets_count: seedTweets().length,
                    verified: true, joined: '2025-06-01',
                },
                action: 'get-user',
            },
        };
    }
}
