/**
 * Category Detector — weighted keyword scoring for prompt categorization.
 * Ported from Chrome Extension content.js logic.
 */

type Category = 'coding' | 'writing' | 'image' | 'business' | 'general';

interface CategoryScore {
    category: Category;
    score: number;
    keywords: string[];
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
    coding: [
        'code', 'function', 'class', 'api', 'bug', 'error', 'debug', 'deploy',
        'react', 'python', 'javascript', 'typescript', 'html', 'css', 'database',
        'sql', 'git', 'docker', 'server', 'frontend', 'backend', 'algorithm',
        'component', 'import', 'export', 'npm', 'package', 'test', 'build',
        'compile', 'variable', 'array', 'object', 'string', 'number', 'boolean',
        'interface', 'type', 'async', 'await', 'promise', 'fetch', 'endpoint',
        'route', 'middleware', 'hook', 'state', 'prop', 'render', 'app',
        'kotlin', 'swift', 'java', 'rust', 'go', 'ruby', 'php', 'node',
    ],
    writing: [
        'write', 'essay', 'article', 'blog', 'story', 'poem', 'script',
        'content', 'caption', 'tweet', 'post', 'paragraph', 'outline',
        'draft', 'edit', 'proofread', 'summarize', 'translate', 'rewrite',
        'tone', 'voice', 'narrative', 'dialogue', 'character', 'creative',
        'fiction', 'nonfiction', 'copywriting', 'headline', 'email',
        'letter', 'resume', 'cover letter', 'proposal',
    ],
    image: [
        'image', 'photo', 'picture', 'draw', 'design', 'logo', 'icon',
        'illustration', 'art', 'painting', 'sketch', 'render', 'visual',
        'graphic', 'banner', 'poster', 'wallpaper', 'avatar', 'thumbnail',
        'mockup', 'ui design', 'ux', 'wireframe', 'prototype', '3d',
        'animation', 'portrait', 'landscape', 'abstract', 'realistic',
        'generate image', 'create image', 'dalle', 'midjourney', 'stable diffusion',
    ],
    business: [
        'business', 'strategy', 'marketing', 'sales', 'revenue', 'profit',
        'startup', 'pitch', 'investor', 'market', 'competitor', 'analysis',
        'report', 'presentation', 'budget', 'forecast', 'kpi', 'metric',
        'growth', 'customer', 'product', 'launch', 'campaign', 'brand',
        'seo', 'conversion', 'funnel', 'engagement', 'roi', 'b2b', 'b2c',
        'enterprise', 'saas', 'crm', 'pipeline', 'lead', 'deal', 'contract',
    ],
    general: [],
};

export function detectCategory(text: string): CategoryScore {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const scores: CategoryScore[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (category === 'general') continue;

        const matched = keywords.filter(kw =>
            kw.includes(' ') ? lower.includes(kw) : words.includes(kw),
        );

        scores.push({
            category: category as Category,
            score: matched.length,
            keywords: matched,
        });
    }

    scores.sort((a, b) => b.score - a.score);

    if (scores[0] && scores[0].score >= 2) {
        return scores[0];
    }

    return { category: 'general', score: 0, keywords: [] };
}

export function getCategoryColor(category: Category): string {
    const colors: Record<Category, string> = {
        coding: '#818CF8',
        writing: '#34D399',
        image: '#F472B6',
        business: '#FBBF24',
        general: '#60A5FA',
    };
    return colors[category] || colors.general;
}

export function getCategoryEmoji(category: Category): string {
    const emojis: Record<Category, string> = {
        coding: '💻',
        writing: '✍️',
        image: '🎨',
        business: '📊',
        general: '✨',
    };
    return emojis[category] || emojis.general;
}
