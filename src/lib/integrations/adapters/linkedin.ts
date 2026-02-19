// ═══════════════════════ LinkedIn Integration Adapter ═══════════════════════
import type { IntegrationAdapter, IntegrationResult } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const STORAGE_KEY = 'promptx_linkedin_posts';

// ── Seed demo data ──────────────────────────────────────────────────────────
function seedProfile(): any {
    return {
        id: 'li_usr_1',
        firstName: 'Ansh',
        lastName: 'Pal',
        headline: 'Founder & CEO at PromptX | AI Workflow Automation',
        summary: 'Building the future of AI-powered workflow automation. PromptX enables businesses to create intelligent agent pipelines that automate complex tasks.',
        industry: 'Artificial Intelligence',
        location: 'San Francisco, CA',
        connections: 2450,
        followers: 8200,
        profileUrl: 'https://linkedin.com/in/anshpal',
        company: {
            name: 'PromptX',
            size: '11-50 employees',
            industry: 'Technology, Information and Internet',
        },
    };
}

function seedPosts(): any[] {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing);

    const posts = [
        {
            id: 'li_post_1',
            text: '🚀 Excited to announce that PromptX now supports 12 integration adapters! From CRM to Shopify, our AI workflow engine can automate your entire business pipeline.\n\n#AI #Automation #SaaS',
            author: 'Ansh Pal',
            likes: 234, comments: 42, shares: 18,
            created_at: '2026-02-14T10:00:00Z',
        },
        {
            id: 'li_post_2',
            text: 'The three pillars of effective AI automation:\n\n1. Intelligent task decomposition\n2. Real-time integration with business tools\n3. Human-in-the-loop verification\n\nWhat would you add?\n\n#AIStrategy #WorkflowAutomation',
            author: 'Ansh Pal',
            likes: 567, comments: 89, shares: 45,
            created_at: '2026-02-10T15:30:00Z',
        },
        {
            id: 'li_post_3',
            text: 'Hiring! We\'re looking for talented engineers to join PromptX. If you\'re passionate about AI agents, workflow engines, and building amazing developer tools — let\'s talk! 💼\n\n#Hiring #AIJobs #Startup',
            author: 'Ansh Pal',
            likes: 892, comments: 156, shares: 78,
            created_at: '2026-02-08T09:00:00Z',
        },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return posts;
}

// ── Adapter ─────────────────────────────────────────────────────────────────
export class LinkedInAdapter implements IntegrationAdapter {
    id = 'linkedin';
    name = 'LinkedIn';
    icon = '💼';
    description = 'Share professional updates, manage your LinkedIn presence, and network';
    category = 'social' as const;
    requiresAuth = true;
    status = 'connected' as const;

    matchKeywords = [
        'linkedin', 'professional', 'network', 'career', 'job', 'hiring',
        'recruit', 'business update', 'professional post', 'share update',
        'company page', 'b2b', 'connections',
    ];

    isConnected(): boolean { return true; }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'get-profile';

        try {
            switch (action) {
                case 'post-share': return this.postShare(input);
                case 'get-profile': return this.getProfile();
                case 'get-posts': return this.getPosts();
                case 'get-analytics': return this.getAnalytics();
                default:
                    return { success: false, data: {}, source: 'linkedin', error: `Unknown action: ${action}` };
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'linkedin', error: err.message };
        }
    }

    // ── Actions ─────────────────────────────────────────────────────────────

    private postShare(input: Record<string, any>): IntegrationResult {
        const text = input.text || input.content || input.message;
        if (!text) return { success: false, data: {}, source: 'linkedin', error: 'Post text is required' };

        const posts = seedPosts();
        const newPost = {
            id: `li_post_${Date.now()}`,
            text,
            author: 'Ansh Pal',
            likes: 0, comments: 0, shares: 0,
            created_at: new Date().toISOString(),
        };

        posts.unshift(newPost);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));

        return {
            success: true, source: 'linkedin',
            data: {
                post: newPost, action: 'post-share',
                message: `LinkedIn post shared successfully (${text.length} chars)`,
                visibility: 'public',
            },
        };
    }

    private getProfile(): IntegrationResult {
        const profile = seedProfile();
        return {
            success: true, source: 'linkedin',
            data: { profile, action: 'get-profile' },
        };
    }

    private getPosts(): IntegrationResult {
        const posts = seedPosts();
        const totalEngagement = posts.reduce((sum: number, p: any) => sum + p.likes + p.comments + p.shares, 0);

        return {
            success: true, source: 'linkedin',
            data: {
                posts, total: posts.length,
                totalEngagement,
                averageEngagement: Math.round(totalEngagement / posts.length),
                action: 'get-posts',
            },
        };
    }

    private getAnalytics(): IntegrationResult {
        const posts = seedPosts();
        const profile = seedProfile();

        const totalLikes = posts.reduce((s: number, p: any) => s + p.likes, 0);
        const totalComments = posts.reduce((s: number, p: any) => s + p.comments, 0);
        const totalShares = posts.reduce((s: number, p: any) => s + p.shares, 0);

        return {
            success: true, source: 'linkedin',
            data: {
                analytics: {
                    followers: profile.followers,
                    connections: profile.connections,
                    postsCount: posts.length,
                    totalLikes, totalComments, totalShares,
                    engagementRate: ((totalLikes + totalComments + totalShares) / (profile.followers * posts.length) * 100).toFixed(2) + '%',
                    topPost: posts.sort((a: any, b: any) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))[0],
                },
                action: 'get-analytics',
            },
        };
    }
}
