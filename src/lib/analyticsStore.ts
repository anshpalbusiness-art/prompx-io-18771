// ═══════════════════════ Workflow Analytics — Data Layer ═══════════════════════
// localStorage-backed store for workflow execution metrics.

export interface WorkflowRunRecord {
    id: string;
    workflowId: string;
    workflowTitle: string;
    status: 'completed' | 'failed';
    startedAt: number;
    completedAt: number;
    durationMs: number;
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    steps: StepRecord[];
}

export interface StepRecord {
    nodeId: string;
    agentName: string;
    status: 'completed' | 'failed' | 'skipped';
    durationMs: number;
    dataSource?: string;
}

const ANALYTICS_KEY = 'promptx_workflow_analytics';

// ─── Read / Write ───

export function loadAnalytics(): WorkflowRunRecord[] {
    try {
        const raw = localStorage.getItem(ANALYTICS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveAnalytics(records: WorkflowRunRecord[]): void {
    try {
        // Keep only last 200 records to avoid storage bloat
        const trimmed = records.slice(-200);
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('Failed to save analytics:', e);
    }
}

// ─── Log a completed workflow run ───

export function logWorkflowRun(record: WorkflowRunRecord): void {
    const records = loadAnalytics();
    records.push(record);
    saveAnalytics(records);
}

// ─── Aggregation Helpers ───

export function getKPIs(records: WorkflowRunRecord[]) {
    const total = records.length;
    const succeeded = records.filter(r => r.status === 'completed').length;
    const failed = total - succeeded;
    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
    const avgDuration = total > 0
        ? Math.round(records.reduce((s, r) => s + r.durationMs, 0) / total)
        : 0;
    const totalAgents = records.reduce((s, r) => s + r.totalNodes, 0);
    return { total, succeeded, failed, successRate, avgDuration, totalAgents };
}

export function getDailyActivity(records: WorkflowRunRecord[], days = 14) {
    const now = Date.now();
    const cutoff = now - days * 86_400_000;
    const filtered = records.filter(r => r.startedAt >= cutoff);

    const buckets: Record<string, { date: string; runs: number; success: number; failed: number }> = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(now - (days - 1 - i) * 86_400_000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets[key] = { date: label, runs: 0, success: 0, failed: 0 };
    }

    for (const r of filtered) {
        const key = new Date(r.startedAt).toISOString().slice(0, 10);
        if (buckets[key]) {
            buckets[key].runs++;
            if (r.status === 'completed') buckets[key].success++;
            else buckets[key].failed++;
        }
    }
    return Object.values(buckets);
}

export function getAgentPerformance(records: WorkflowRunRecord[]) {
    const map: Record<string, { name: string; totalMs: number; count: number; failures: number }> = {};
    for (const r of records) {
        for (const s of r.steps) {
            if (!map[s.agentName]) map[s.agentName] = { name: s.agentName, totalMs: 0, count: 0, failures: 0 };
            map[s.agentName].totalMs += s.durationMs;
            map[s.agentName].count++;
            if (s.status === 'failed') map[s.agentName].failures++;
        }
    }
    return Object.values(map)
        .map(a => ({
            name: a.name.length > 14 ? a.name.slice(0, 12) + '…' : a.name,
            avgMs: Math.round(a.totalMs / a.count),
            runs: a.count,
            failRate: Math.round((a.failures / a.count) * 100),
        }))
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 10);
}

export function getStatusDistribution(records: WorkflowRunRecord[]) {
    const succeeded = records.filter(r => r.status === 'completed').length;
    const failed = records.length - succeeded;
    return [
        { name: 'Success', value: succeeded, fill: '#22c55e' },
        { name: 'Failed', value: failed, fill: '#ef4444' },
    ];
}
