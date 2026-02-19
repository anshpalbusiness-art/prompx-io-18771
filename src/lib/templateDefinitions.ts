// ═══════════════════════ Pre-built Template Definitions ═══════════════════════
// Full offline workflow definitions so templates load instantly without API calls.

import { WorkflowDefinition, WorkflowNode, WorkflowEdge, wfUid } from './workflowEngine';

function node(
    name: string,
    desc: string,
    icon: string,
    capabilities: string[],
    x: number,
    y: number,
    opts?: { integrationId?: string; executionMode?: 'ai' | 'integration' | 'hybrid' }
): WorkflowNode {
    return {
        id: `node_${wfUid()}`,
        agentId: `agent_${wfUid()}`,
        name,
        description: desc,
        icon,
        systemPrompt: `You are a specialized AI agent: ${name}. ${desc}`,
        capabilities,
        status: 'idle',
        input: {},
        output: null,
        error: null,
        integrationId: opts?.integrationId,
        executionMode: opts?.executionMode || 'ai',
        dataSource: undefined,
        position: { x, y },
        startedAt: null,
        completedAt: null,
        duration: null,
    };
}

function edge(source: string, target: string, label: string): WorkflowEdge {
    return { id: `edge_${wfUid()}`, source, target, label };
}

export function buildTemplateWorkflow(templateId: string): WorkflowDefinition | null {
    const now = Date.now();
    const id = wfUid();

    switch (templateId) {
        case 'wt-ecommerce': {
            const n1 = node('Market Analyst', 'Researches e-commerce trends and competitor pricing', '🔍', ['research', 'analysis'], 0, 0, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n2 = node('Store Builder', 'Sets up the e-commerce storefront and product pages', '🏗️', ['setup', 'design'], 0, 160, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n3 = node('Product Manager', 'Adds products and configures pricing', '📦', ['product', 'pricing'], 0, 320, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n4 = node('Marketing Coordinator', 'Creates and posts marketing materials', '📣', ['marketing', 'content'], 0, 480, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n5 = node('Launch Notifier', 'Sends notifications and monitors launch metrics', '🔔', ['notification', 'monitoring'], 0, 640, { executionMode: 'hybrid', integrationId: 'web-search' });
            return {
                id, title: 'E-commerce Launch Workflow', description: 'Product listing, pricing strategy, marketing campaign, and launch checklist.',
                goal: 'Launch an e-commerce store', nodes: [n1, n2, n3, n4, n5],
                edges: [edge(n1.id, n2.id, 'market research'), edge(n2.id, n3.id, 'store setup details'), edge(n3.id, n4.id, 'product and inventory data'), edge(n4.id, n5.id, 'marketing post results')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-email': {
            const n1 = node('Audience Segmenter', 'Segments email lists by demographics and behavior', '👥', ['data', 'segmentation'], 0, 0);
            const n2 = node('Copywriter', 'Writes compelling email subject lines and body copy', '✍️', ['writing', 'copywriting'], 0, 160);
            const n3 = node('Scheduler', 'Schedules email sends at optimal times', '📅', ['scheduling', 'automation'], 0, 320);
            const n4 = node('Analytics Tracker', 'Monitors opens, clicks, and conversions', '📊', ['analytics', 'tracking'], 0, 480);
            return {
                id, title: 'Email Campaign Workflow', description: 'Segment audiences, write copy, schedule sends, and track opens/clicks.',
                goal: 'Run an email campaign', nodes: [n1, n2, n3, n4],
                edges: [edge(n1.id, n2.id, 'audience segments'), edge(n2.id, n3.id, 'email drafts'), edge(n3.id, n4.id, 'send schedule')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-youtube': {
            const n1 = node('Trend Researcher', 'Finds trending topics and keywords for YouTube', '🔍', ['research', 'trends'], 0, 0, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n2 = node('Scriptwriter', 'Writes video scripts based on trending topics', '📝', ['writing', 'scripts'], 0, 160);
            const n3 = node('SEO Optimizer', 'Optimizes titles, descriptions, and tags', '🎯', ['seo', 'optimization'], 0, 320);
            const n4 = node('Thumbnail Designer', 'Creates eye-catching thumbnail concepts', '🎨', ['design', 'visual'], 0, 480);
            const n5 = node('Upload Scheduler', 'Schedules video uploads at peak times', '⏰', ['scheduling'], 0, 640);
            const n6 = node('Engagement Monitor', 'Tracks views, likes, and comments', '📈', ['analytics', 'monitoring'], 0, 800);
            return {
                id, title: 'YouTube Channel Growth Workflow', description: 'Research trending topics, script videos, optimize SEO, and schedule uploads.',
                goal: 'Grow a YouTube channel', nodes: [n1, n2, n3, n4, n5, n6],
                edges: [edge(n1.id, n2.id, 'trending topics'), edge(n2.id, n3.id, 'video script'), edge(n3.id, n4.id, 'optimized metadata'), edge(n4.id, n5.id, 'thumbnail concepts'), edge(n5.id, n6.id, 'upload schedule')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-seo': {
            const n1 = node('Keyword Researcher', 'Discovers high-value keywords with low competition', '🔑', ['research', 'seo'], 0, 0, { executionMode: 'hybrid', integrationId: 'web-search' });
            const n2 = node('Outline Generator', 'Creates detailed blog post outlines', '📋', ['planning', 'structure'], 0, 160);
            const n3 = node('Blog Writer', 'Writes SEO-optimized long-form content', '✍️', ['writing', 'content'], 0, 320);
            const n4 = node('Publisher', 'Formats and publishes the finished blog post', '🚀', ['publishing', 'formatting'], 0, 480);
            return {
                id, title: 'SEO Blog Pipeline Workflow', description: 'Keyword research, outline generation, blog writing, and publishing.',
                goal: 'Create an SEO-optimized blog post', nodes: [n1, n2, n3, n4],
                edges: [edge(n1.id, n2.id, 'keyword data'), edge(n2.id, n3.id, 'blog outline'), edge(n3.id, n4.id, 'draft article')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-dev': {
            const n1 = node('Requirements Analyst', 'Gathers and refines feature requirements', '📋', ['analysis', 'requirements'], 0, 0);
            const n2 = node('Task Planner', 'Breaks features into epics, stories, and tasks', '🗂️', ['planning', 'agile'], 0, 160);
            const n3 = node('Code Generator', 'Generates boilerplate and implementation code', '💻', ['coding', 'generation'], 0, 320);
            const n4 = node('Test Writer', 'Writes unit and integration tests', '🧪', ['testing', 'quality'], 0, 480);
            const n5 = node('PR Reviewer', 'Reviews changes and suggests improvements', '👀', ['review', 'quality'], 0, 640);
            return {
                id, title: 'Feature Sprint Planner Workflow', description: 'Gather requirements, break into tasks, assign agents, and track progress.',
                goal: 'Plan and execute a feature sprint', nodes: [n1, n2, n3, n4, n5],
                edges: [edge(n1.id, n2.id, 'requirements'), edge(n2.id, n3.id, 'task breakdown'), edge(n3.id, n4.id, 'implementation'), edge(n4.id, n5.id, 'test results')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-analytics': {
            const n1 = node('Data Puller', 'Collects metrics from integrations and APIs', '📥', ['data', 'integration'], 0, 0);
            const n2 = node('Trend Analyzer', 'Identifies patterns and trends in KPI data', '📈', ['analysis', 'statistics'], 0, 160);
            const n3 = node('Report Generator', 'Compiles a formatted KPI report', '📊', ['reporting', 'formatting'], 0, 320);
            return {
                id, title: 'Weekly KPI Report Workflow', description: 'Pull metrics from integrations, summarize trends, and generate a report.',
                goal: 'Generate a weekly KPI report', nodes: [n1, n2, n3],
                edges: [edge(n1.id, n2.id, 'raw metrics'), edge(n2.id, n3.id, 'trend analysis')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-social': {
            const n1 = node('Content Planner', 'Plans a month of social media content', '📅', ['planning', 'strategy'], 0, 0);
            const n2 = node('Caption Writer', 'Writes engaging captions for each post', '✍️', ['writing', 'social'], 0, 160);
            const n3 = node('Image Creator', 'Generates or selects images for each post', '🎨', ['design', 'visual'], 0, 320);
            const n4 = node('Post Scheduler', 'Schedules posts across platforms', '⏰', ['scheduling', 'automation'], 0, 480);
            const n5 = node('Engagement Tracker', 'Monitors likes, shares, and comments', '📊', ['analytics', 'monitoring'], 0, 640);
            return {
                id, title: 'Social Media Content Calendar', description: 'Plan a month of content, generate captions, create images, and schedule posts.',
                goal: 'Create a social media content calendar', nodes: [n1, n2, n3, n4, n5],
                edges: [edge(n1.id, n2.id, 'content plan'), edge(n2.id, n3.id, 'captions'), edge(n3.id, n4.id, 'post assets'), edge(n4.id, n5.id, 'scheduled posts')],
                createdAt: now, updatedAt: now,
            };
        }
        case 'wt-legal': {
            const n1 = node('Document Ingester', 'Uploads and parses contract documents', '📄', ['parsing', 'documents'], 0, 0);
            const n2 = node('Term Extractor', 'Extracts key terms, dates, and obligations', '🔍', ['extraction', 'analysis'], 0, 160);
            const n3 = node('Risk Flagger', 'Identifies risky clauses and potential issues', '⚠️', ['risk', 'compliance'], 0, 320);
            const n4 = node('Summary Generator', 'Generates a clear executive summary', '📝', ['summarization', 'reporting'], 0, 480);
            return {
                id, title: 'Contract Review Pipeline', description: 'Upload contracts, extract key terms, flag risks, and generate summaries.',
                goal: 'Review contracts', nodes: [n1, n2, n3, n4],
                edges: [edge(n1.id, n2.id, 'parsed documents'), edge(n2.id, n3.id, 'extracted terms'), edge(n3.id, n4.id, 'risk assessment')],
                createdAt: now, updatedAt: now,
            };
        }
        default:
            return null;
    }
}
