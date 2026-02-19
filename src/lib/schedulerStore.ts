// ═══════════════════════ Scheduler Store ═══════════════════════
// localStorage-backed schedule management for workflow automation.

export interface ScheduleRecord {
    id: string;
    workflowId: string;
    workflowTitle: string;
    interval: ScheduleInterval;
    cronLabel: string;
    enabled: boolean;
    createdAt: number;
    nextRun: number;
    lastRun: number | null;
    lastStatus: 'completed' | 'failed' | null;
}

export type ScheduleInterval = 'every-hour' | 'every-6h' | 'daily' | 'weekly' | 'monthly';

const SCHEDULES_KEY = 'promptx_schedules';

// ─── Interval helpers ───

const INTERVAL_MS: Record<ScheduleInterval, number> = {
    'every-hour': 3_600_000,
    'every-6h': 21_600_000,
    'daily': 86_400_000,
    'weekly': 604_800_000,
    'monthly': 2_592_000_000, // ~30 days
};

export const INTERVAL_LABELS: Record<ScheduleInterval, string> = {
    'every-hour': 'Every Hour',
    'every-6h': 'Every 6 Hours',
    'daily': 'Daily',
    'weekly': 'Weekly',
    'monthly': 'Monthly',
};

export function computeNextRun(interval: ScheduleInterval, from = Date.now()): number {
    return from + INTERVAL_MS[interval];
}

export function formatNextRun(ts: number): string {
    const diff = ts - Date.now();
    if (diff < 0) return 'Overdue';
    if (diff < 3_600_000) return `in ${Math.round(diff / 60_000)}m`;
    if (diff < 86_400_000) return `in ${Math.round(diff / 3_600_000)}h`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── CRUD ───

export function loadSchedules(): ScheduleRecord[] {
    try {
        const raw = localStorage.getItem(SCHEDULES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function save(records: ScheduleRecord[]) {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(records));
}

export function addSchedule(record: ScheduleRecord): void {
    const records = loadSchedules();
    // Remove any existing schedule for the same workflow
    const filtered = records.filter(r => r.workflowId !== record.workflowId);
    filtered.push(record);
    save(filtered);
}

export function removeSchedule(id: string): void {
    save(loadSchedules().filter(r => r.id !== id));
}

export function toggleSchedule(id: string): void {
    const records = loadSchedules().map(r =>
        r.id === id ? { ...r, enabled: !r.enabled, nextRun: computeNextRun(r.interval) } : r
    );
    save(records);
}

export function updateScheduleLastRun(id: string, status: 'completed' | 'failed'): void {
    const records = loadSchedules().map(r =>
        r.id === id ? { ...r, lastRun: Date.now(), lastStatus: status, nextRun: computeNextRun(r.interval) } : r
    );
    save(records);
}
