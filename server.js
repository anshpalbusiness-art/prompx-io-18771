/**
 * Local development proxy server for the chat completion API.
 * Forwards requests to the xAI API using the XAI_API_KEY from .env.
 * 
 * Usage: node server.js
 * Runs on the port specified by PROXY_PORT in .env (default 3002).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── Supabase admin client (service role — bypasses RLS) ───
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

// ─── Presence: Heartbeat (write) ───
app.post('/api/presence/heartbeat', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    try {
        const { userId, email, color, activeWorkflowId, presenceId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const presenceData = {
            email: email || 'User',
            color: color || '#888',
            cursor: null,
            selectedNodeId: activeWorkflowId || null,
            onlineAt: new Date().toISOString(),
            page: 'workflow',
        };

        if (presenceId) {
            // Update existing row
            const { error } = await supabaseAdmin
                .from('user_activity')
                .update({
                    created_at: new Date().toISOString(),
                    metadata: presenceData,
                })
                .eq('id', presenceId);

            if (error) {
                console.error('[Presence] Update failed:', error.message);
                return res.json({ presenceId: null }); // signal to re-insert
            }
            return res.json({ presenceId });
        } else {
            // Insert new row
            const { data, error } = await supabaseAdmin
                .from('user_activity')
                .insert({
                    user_id: userId,
                    activity_type: 'workflow_presence',
                    metadata: presenceData,
                })
                .select('id')
                .single();

            if (error) {
                console.error('[Presence] Insert failed:', error.message);
                return res.status(500).json({ error: error.message });
            }
            return res.json({ presenceId: data.id });
        }
    } catch (err) {
        console.error('[Presence] Heartbeat error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Presence: Get Peers (read ALL users — bypasses RLS) ───
app.get('/api/presence/peers', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    try {
        const { excludeUserId } = req.query;
        const cutoff = new Date(Date.now() - 15000).toISOString(); // 15s TTL

        const { data, error } = await supabaseAdmin
            .from('user_activity')
            .select('user_id, metadata, created_at')
            .eq('activity_type', 'workflow_presence')
            .gte('created_at', cutoff);

        if (error) {
            console.error('[Presence] Peers query failed:', error.message);
            return res.status(500).json({ error: error.message });
        }

        // Filter out the requesting user
        const peers = (data || [])
            .filter(row => row.user_id !== excludeUserId)
            .map(row => {
                const meta = row.metadata || {};
                return {
                    userId: row.user_id,
                    email: meta.email || 'User',
                    color: meta.color || '#888',
                    cursor: meta.cursor || null,
                    selectedNodeId: meta.selectedNodeId || null,
                    onlineAt: meta.onlineAt || row.created_at,
                };
            });

        res.json({ peers, total: (data || []).length });
    } catch (err) {
        console.error('[Presence] Peers error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Presence: Cleanup (delete row on disconnect) ───
app.post('/api/presence/cleanup', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    try {
        const { presenceId, userId } = req.body;
        if (presenceId) {
            await supabaseAdmin.from('user_activity').delete().eq('id', presenceId);
        } else if (userId) {
            await supabaseAdmin.from('user_activity').delete()
                .eq('user_id', userId)
                .eq('activity_type', 'workflow_presence');
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════ WORKFLOW CRUD ═══════════════════════

// List user's workflows
app.get('/api/workflows', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const { data, error } = await supabaseAdmin
            .from('saved_workflows')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ workflows: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save / upsert a workflow
app.post('/api/workflows', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { id, userId, name, description, nodes, edges, tags, isPublic } = req.body;
        if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

        const workflowData = {
            user_id: userId,
            name,
            description: description || '',
            steps: { nodes, edges },
            tags: tags || [],
            is_public: isPublic || false,
        };

        if (id) {
            // Update existing
            const { data, error } = await supabaseAdmin
                .from('saved_workflows')
                .update(workflowData)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });
            res.json({ workflow: data });
        } else {
            // Insert new
            const { data, error } = await supabaseAdmin
                .from('saved_workflows')
                .insert(workflowData)
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });
            res.json({ workflow: data });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a workflow
app.delete('/api/workflows/:id', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { userId } = req.query;
        const { error } = await supabaseAdmin
            .from('saved_workflows')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Share: toggle public + get shareable link
app.post('/api/workflows/:id/share', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { isPublic } = req.body;
        const { data, error } = await supabaseAdmin
            .from('saved_workflows')
            .update({ is_public: isPublic !== false })
            .eq('id', req.params.id)
            .select('id, is_public')
            .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ id: data.id, isPublic: data.is_public });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get shared workflow (public)
app.get('/api/workflows/shared/:id', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabaseAdmin
            .from('saved_workflows')
            .select('*')
            .eq('id', req.params.id)
            .eq('is_public', true)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Workflow not found or not public' });
        res.json({ workflow: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════ TEMPLATES ═══════════════════════

// List public templates
app.get('/api/templates', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabaseAdmin
            .from('workflow_templates')
            .select('*')
            .eq('is_public', true)
            .order('use_count', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ templates: data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clone a template into user's workflows
app.post('/api/templates/use/:id', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        // Fetch template
        const { data: template, error: fetchErr } = await supabaseAdmin
            .from('workflow_templates')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !template) return res.status(404).json({ error: 'Template not found' });

        // Clone to saved_workflows
        const { data: saved, error: saveErr } = await supabaseAdmin
            .from('saved_workflows')
            .insert({
                user_id: userId,
                name: template.title,
                description: template.description || '',
                steps: { nodes: template.nodes, edges: template.edges },
                tags: template.tags || [],
            })
            .select()
            .single();

        if (saveErr) return res.status(500).json({ error: saveErr.message });

        // Increment use_count
        await supabaseAdmin
            .from('workflow_templates')
            .update({ use_count: (template.use_count || 0) + 1 })
            .eq('id', req.params.id);

        res.json({ workflow: saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════ SCHEDULES ═══════════════════════

// Save a schedule
app.post('/api/schedules', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { userId, workflowId, workflowTitle, interval, nextRun } = req.body;

        const { data, error } = await supabaseAdmin
            .from('workflow_schedules')
            .insert({
                user_id: userId,
                workflow_id: workflowId,
                workflow_title: workflowTitle,
                interval,
                next_run: nextRun,
                enabled: true,
            })
            .select('id')
            .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ scheduleId: data.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List user's schedules
app.get('/api/schedules', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { userId } = req.query;
        const { data, error } = await supabaseAdmin
            .from('workflow_schedules')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const schedules = (data || []).map(row => ({
            id: row.id,
            workflowId: row.workflow_id,
            workflowTitle: row.workflow_title,
            interval: row.interval,
            nextRun: row.next_run,
            lastRun: row.last_run,
            lastStatus: row.last_status,
            enabled: row.enabled,
            createdAt: row.created_at,
        }));
        res.json({ schedules });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle enable/disable a schedule
app.patch('/api/schedules/:id', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { enabled } = req.body;
        const { error } = await supabaseAdmin
            .from('workflow_schedules')
            .update({ enabled, updated_at: new Date().toISOString() })
            .eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a schedule
app.delete('/api/schedules/:id', async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        await supabaseAdmin.from('workflow_schedules').delete().eq('id', req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════ IN-PROCESS SCHEDULER (every 60s) ═══════════════════════

const INTERVAL_MS = {
    'every-hour': 3600000,
    'every-6h': 21600000,
    'daily': 86400000,
    'weekly': 604800000,
    'monthly': 2592000000,
};

async function runSchedulerTick() {
    if (!supabaseAdmin) return;
    try {
        const now = Date.now();
        // Find all enabled schedules that are due
        const { data: dueSchedules, error } = await supabaseAdmin
            .from('workflow_schedules')
            .select('*')
            .eq('enabled', true)
            .lte('next_run', now);

        if (error || !dueSchedules || dueSchedules.length === 0) return;

        for (const schedule of dueSchedules) {
            console.log(`[Scheduler] Running workflow "${schedule.workflow_title}" (schedule ${schedule.id})`);

            // Mark as running
            await supabaseAdmin
                .from('workflow_schedules')
                .update({ last_status: 'running', updated_at: new Date().toISOString() })
                .eq('id', schedule.id);

            try {
                // Log the scheduled run (simple — actual AI execution would happen client-side)
                await supabaseAdmin
                    .from('user_activity')
                    .insert({
                        user_id: schedule.user_id,
                        activity_type: 'scheduled_workflow_run',
                        metadata: {
                            workflowId: schedule.workflow_id,
                            workflowTitle: schedule.workflow_title,
                            scheduledAt: schedule.next_run,
                            executedAt: now,
                        },
                    });

                // Calculate next run based on interval
                const intervalMs = INTERVAL_MS[schedule.interval] || INTERVAL_MS['daily'];
                const nextRun = now + intervalMs;

                await supabaseAdmin
                    .from('workflow_schedules')
                    .update({
                        last_run: now,
                        last_status: 'completed',
                        next_run: nextRun,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', schedule.id);

                console.log(`[Scheduler] ✅ Completed "${schedule.workflow_title}", next run: ${new Date(nextRun).toISOString()}`);
            } catch (execErr) {
                console.error(`[Scheduler] ❌ Failed "${schedule.workflow_title}":`, execErr.message);
                await supabaseAdmin
                    .from('workflow_schedules')
                    .update({ last_run: now, last_status: 'failed', updated_at: new Date().toISOString() })
                    .eq('id', schedule.id);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Tick error:', err.message);
    }
}

// Start scheduler loop (every 60 seconds)
setInterval(runSchedulerTick, 60000);

// ═══════════════════════ SEED TEMPLATES ═══════════════════════

async function seedTemplates() {
    if (!supabaseAdmin) return;
    const { count } = await supabaseAdmin
        .from('workflow_templates')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true);

    if (count && count > 0) return; // Already seeded

    const templates = [
        {
            title: 'Social Media Content Pipeline',
            description: 'Research trending topics, create posts, optimize for engagement, and schedule across platforms.',
            category: 'marketing',
            tags: ['social-media', 'content', 'marketing'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-researcher', name: 'Trend Researcher', description: 'Finds trending topics and hashtags', icon: '🔍', systemPrompt: 'Research current trending topics in the given niche.', capabilities: ['trend analysis', 'hashtag research'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-writer', name: 'Content Writer', description: 'Creates engaging social media posts', icon: '✍️', systemPrompt: 'Write engaging social media posts based on trending topics.', capabilities: ['copywriting', 'social media'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-optimizer', name: 'SEO Optimizer', description: 'Optimizes content for reach and engagement', icon: '📈', systemPrompt: 'Optimize social media posts for maximum reach.', capabilities: ['SEO', 'optimization'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n4', agentId: 'agent-scheduler', name: 'Post Scheduler', description: 'Plans optimal posting times', icon: '📅', systemPrompt: 'Create an optimal posting schedule.', capabilities: ['scheduling', 'timing'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'trending topics' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'draft posts' },
                { id: 'e3', source: 'n3', target: 'n4', label: 'optimized content' },
            ],
        },
        {
            title: 'E-commerce Product Launch',
            description: 'Market analysis, product listing, pricing strategy, and launch marketing.',
            category: 'e-commerce',
            tags: ['e-commerce', 'product', 'launch'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-analyst', name: 'Market Analyst', description: 'Researches market and competitors', icon: '📊', systemPrompt: 'Analyze market trends and competitors.', capabilities: ['market research', 'analysis'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-pricer', name: 'Pricing Strategist', description: 'Determines optimal pricing', icon: '💰', systemPrompt: 'Create a competitive pricing strategy.', capabilities: ['pricing', 'strategy'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-copywriter', name: 'Product Copywriter', description: 'Writes product descriptions', icon: '📝', systemPrompt: 'Write compelling product descriptions.', capabilities: ['copywriting', 'product'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n4', agentId: 'agent-marketer', name: 'Launch Marketer', description: 'Creates launch campaign', icon: '🚀', systemPrompt: 'Plan a product launch marketing campaign.', capabilities: ['marketing', 'campaigns'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'market data' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'pricing info' },
                { id: 'e3', source: 'n3', target: 'n4', label: 'product listing' },
            ],
        },
        {
            title: 'Customer Support Automation',
            description: 'Triage tickets, generate responses, escalate issues, and track satisfaction.',
            category: 'support',
            tags: ['support', 'customer', 'automation'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-triage', name: 'Ticket Triager', description: 'Categorizes and prioritizes tickets', icon: '🏷️', systemPrompt: 'Categorize support tickets by priority and type.', capabilities: ['classification', 'prioritization'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-responder', name: 'Response Generator', description: 'Drafts helpful responses', icon: '💬', systemPrompt: 'Generate helpful support responses.', capabilities: ['response generation', 'empathy'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-escalation', name: 'Escalation Manager', description: 'Handles complex issues', icon: '⚡', systemPrompt: 'Identify issues needing escalation.', capabilities: ['escalation', 'decision'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'categorized ticket' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'drafted response' },
            ],
        },
        {
            title: 'Blog Post Generator',
            description: 'Research, outline, write, and optimize blog posts with SEO.',
            category: 'content',
            tags: ['blog', 'content', 'SEO', 'writing'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-researcher', name: 'Topic Researcher', description: 'Researches keywords and topics', icon: '🔬', systemPrompt: 'Research keywords and top-performing content.', capabilities: ['keyword research', 'content analysis'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-outliner', name: 'Outline Creator', description: 'Creates structured blog outlines', icon: '📋', systemPrompt: 'Create a detailed blog post outline.', capabilities: ['outlining', 'structure'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-writer', name: 'Blog Writer', description: 'Writes the full blog post', icon: '✍️', systemPrompt: 'Write a comprehensive blog post from the outline.', capabilities: ['long-form writing', 'storytelling'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n4', agentId: 'agent-seo', name: 'SEO Editor', description: 'Optimizes for search engines', icon: '🔍', systemPrompt: 'Optimize the blog post for SEO.', capabilities: ['SEO', 'meta tags', 'readability'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'research data' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'blog outline' },
                { id: 'e3', source: 'n3', target: 'n4', label: 'draft post' },
            ],
        },
        {
            title: 'Email Marketing Campaign',
            description: 'Segment audience, write email sequences, A/B test subject lines, and track metrics.',
            category: 'marketing',
            tags: ['email', 'marketing', 'campaign'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-segmenter', name: 'Audience Segmenter', description: 'Segments audience by behavior', icon: '👥', systemPrompt: 'Segment the audience into targeted groups.', capabilities: ['segmentation', 'audience analysis'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-emailwriter', name: 'Email Copywriter', description: 'Writes email sequences', icon: '✉️', systemPrompt: 'Write a compelling email marketing sequence.', capabilities: ['email writing', 'persuasion'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-abtest', name: 'A/B Test Designer', description: 'Designs subject line tests', icon: '🧪', systemPrompt: 'Design A/B tests for email subject lines.', capabilities: ['A/B testing', 'optimization'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'audience segments' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'email drafts' },
            ],
        },
        {
            title: 'Competitor Analysis Report',
            description: 'Analyze competitors, compare features, identify gaps, and recommend strategies.',
            category: 'operations',
            tags: ['competitor', 'analysis', 'strategy'],
            is_public: true,
            nodes: [
                { id: 'n1', agentId: 'agent-scanner', name: 'Competitor Scanner', description: 'Identifies key competitors', icon: '🎯', systemPrompt: 'Identify and profile key competitors.', capabilities: ['research', 'profiling'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n2', agentId: 'agent-comparer', name: 'Feature Comparer', description: 'Compares product features', icon: '⚖️', systemPrompt: 'Create a feature comparison matrix.', capabilities: ['comparison', 'analysis'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
                { id: 'n3', agentId: 'agent-strategist', name: 'Strategy Advisor', description: 'Recommends competitive strategies', icon: '🧠', systemPrompt: 'Recommend strategies based on competitive analysis.', capabilities: ['strategy', 'recommendations'], status: 'idle', input: {}, output: null, error: null, executionMode: 'ai', position: { x: 0, y: 0 }, startedAt: null, completedAt: null, duration: null },
            ],
            edges: [
                { id: 'e1', source: 'n1', target: 'n2', label: 'competitor profiles' },
                { id: 'e2', source: 'n2', target: 'n3', label: 'comparison matrix' },
            ],
        },
    ];

    try {
        const { error } = await supabaseAdmin.from('workflow_templates').insert(templates);
        if (error) {
            console.error('Template seeding failed:', error.message);
        } else {
            console.log(`✅ Seeded ${templates.length} workflow templates`);
        }
    } catch (err) {
        console.error('Template seeding error:', err.message);
    }
}

app.post('/api/chat-completion', async (req, res) => {
    try {
        const { messages, model = 'grok-beta', stream = false } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request: messages array required' });
        }

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            console.error('XAI_API_KEY not configured in .env');
            return res.status(500).json({ error: 'API key not configured' });
        }

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({ model, messages, stream }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('xAI API error:', errorData);
            return res.status(response.status).json({ error: errorData.error || 'API request failed' });
        }

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.body.pipeTo(new WritableStream({
                write(chunk) { res.write(chunk); },
                close() { res.end(); },
            }));
        } else {
            const data = await response.json();
            res.json(data);
        }
    } catch (error) {
        console.error('Chat completion error:', error.message);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// ─── Helper: Extract JSON from messy AI responses ───
function extractJSON(text) {
    // Strategy 1: Direct parse
    try { return JSON.parse(text.trim()); } catch { }

    // Strategy 2: Strip markdown fences
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
    try { return JSON.parse(stripped); } catch { }

    // Strategy 3: Find the first { and last } (greedy JSON extraction)
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { }
    }

    return null;
}

// ─── Workflow Planning (generates a multi-agent workflow from a goal) ───
app.post('/api/workflow-plan', async (req, res) => {
    try {
        const { goal } = req.body;
        if (!goal) {
            return res.status(400).json({ error: 'Goal is required' });
        }

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const systemPrompt = `You are a workflow architect. Given a user goal, design a multi-agent workflow.
Return ONLY valid JSON with this exact structure:
{
  "workflow": {
    "id": "<unique-id>",
    "name": "<workflow name>",
    "description": "<brief description>",
    "nodes": [
      {
        "id": "node-1",
        "agentId": "agent-<role>",
        "name": "<Agent Name>",
        "description": "<what this agent does>",
        "icon": "<single emoji>",
        "systemPrompt": "<detailed instructions for this agent>",
        "capabilities": ["<capability1>", "<capability2>"],
        "status": "idle",
        "input": {},
        "output": null,
        "error": null,
        "executionMode": "ai",
        "position": { "x": 0, "y": 0 },
        "startedAt": null,
        "completedAt": null,
        "duration": null
      }
    ],
    "edges": [
      { "id": "edge-1", "source": "node-1", "target": "node-2", "label": "<data passed>" }
    ]
  }
}

Rules:
- Create 3-6 agents that logically break down the goal
- Each agent should have a specific, focused role
- Edges connect agents in a logical execution order
- Use descriptive agent names and clear system prompts
- Keep descriptions concise but informative`;

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Design a workflow for: ${goal}` },
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('xAI API error (workflow-plan):', errorData);
            return res.status(response.status).json({ error: errorData.error?.message || 'Planning failed' });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        const parsed = extractJSON(content);
        if (!parsed) {
            console.error('Failed to parse workflow JSON. Raw content length:', content.length);
            console.error('First 500 chars:', content.substring(0, 500));
            return res.status(500).json({ error: 'Failed to parse workflow plan' });
        }

        res.json(parsed);
    } catch (error) {
        console.error('Workflow planning error:', error.message);
        res.status(500).json({ error: error.message || 'Planning failed' });
    }
});

// ─── Agent Execution (runs a single agent step) ───
app.post('/api/agent-execute', async (req, res) => {
    try {
        const { agentId, agentName, systemPrompt, capabilities, input } = req.body;

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const agentSystemPrompt = `You are ${agentName}, a specialized AI agent.
${systemPrompt || ''}
Your capabilities: ${(capabilities || []).join(', ')}

IMPORTANT: Respond ONLY with valid JSON (no markdown) with this structure:
{
  "output": { <key-value pairs of your results> },
  "summary": "<1-2 sentence summary of what you did>"
}`;

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: [
                    { role: 'system', content: agentSystemPrompt },
                    { role: 'user', content: `Execute your task with this input data:\n${JSON.stringify(input, null, 2)}` },
                ],
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`xAI API error (agent ${agentName}):`, errorData);
            return res.status(response.status).json({ error: errorData.error?.message || 'Agent execution failed' });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        let parsed;
        try {
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(jsonStr);
        } catch (parseErr) {
            // If parsing fails, wrap the raw content as output
            parsed = {
                output: { result: content },
                summary: `${agentName} completed its task.`,
            };
        }

        res.json(parsed);
    } catch (error) {
        console.error('Agent execution error:', error.message);
        res.status(500).json({ error: error.message || 'Agent execution failed' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ API proxy server running on http://localhost:${PORT}`);
    seedTemplates();
});
