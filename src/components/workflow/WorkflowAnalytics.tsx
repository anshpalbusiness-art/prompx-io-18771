import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area,
} from 'recharts';
import {
    loadAnalytics, getKPIs, getDailyActivity, getAgentPerformance, getStatusDistribution,
    type WorkflowRunRecord,
} from '@/lib/analyticsStore';
import {
    TrendingUp, Activity, CheckCircle2, XCircle, Clock, Users, BarChart3, RefreshCcw,
} from 'lucide-react';

// ─── Seed demo data if empty (so the page isn't blank on first visit) ───
function ensureDemoData(): WorkflowRunRecord[] {
    let records = loadAnalytics();
    if (records.length > 0) return records;

    const now = Date.now();
    const DAY = 86_400_000;
    const agentNames = [
        'Market Analyst', 'Store Builder', 'Product Manager', 'Marketing Coordinator', 'Launch Notifier',
        'Copywriter', 'Scheduler', 'Analytics Tracker', 'Trend Researcher', 'Scriptwriter',
    ];

    for (let i = 0; i < 28; i++) {
        const d = now - (27 - i) * DAY + Math.random() * DAY * 0.5;
        const runsThisDay = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < runsThisDay; j++) {
            const nodeCount = 3 + Math.floor(Math.random() * 4);
            const isFailed = Math.random() < 0.15;
            const failAt = isFailed ? Math.floor(Math.random() * nodeCount) : -1;
            const steps = Array.from({ length: nodeCount }, (_, k) => ({
                nodeId: `node_${k}`,
                agentName: agentNames[k % agentNames.length],
                status: (k === failAt ? 'failed' : 'completed') as 'completed' | 'failed',
                durationMs: 800 + Math.floor(Math.random() * 4000),
                dataSource: Math.random() > 0.5 ? 'ai-simulated' : 'live',
            }));
            const durationMs = steps.reduce((s, st) => s + st.durationMs, 0);
            records.push({
                id: `demo_${i}_${j}`,
                workflowId: `wf_${i}_${j}`,
                workflowTitle: ['E-commerce Launch', 'Email Campaign', 'YouTube Growth', 'SEO Blog', 'Sprint Planner'][j % 5],
                status: isFailed ? 'failed' : 'completed',
                startedAt: d + j * 3600_000,
                completedAt: d + j * 3600_000 + durationMs,
                durationMs,
                totalNodes: nodeCount,
                completedNodes: isFailed ? failAt : nodeCount,
                failedNodes: isFailed ? 1 : 0,
                steps,
            });
        }
    }

    try { localStorage.setItem('promptx_workflow_analytics', JSON.stringify(records)); } catch { }
    return records;
}

// ─── Custom Tooltip ───
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-900/95 border border-zinc-700/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-lg">
            <p className="text-xs font-semibold text-zinc-300 mb-1.5">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-xs" style={{ color: p.color }}>
                    {p.name}: <span className="font-bold">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ─── KPI Card ───
function KpiCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br ${color} p-5 sm:p-6`}
        >
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/[0.03]" />
            <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-white/80" />
                </div>
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-white/40 mt-1">{sub}</p>}
        </motion.div>
    );
}

// ─── Main Component ───
export function WorkflowAnalytics() {
    const [refreshKey, setRefreshKey] = useState(0);

    const records = useMemo(() => ensureDemoData(), [refreshKey]);
    const kpis = useMemo(() => getKPIs(records), [records]);
    const daily = useMemo(() => getDailyActivity(records, 14), [records]);
    const agents = useMemo(() => getAgentPerformance(records), [records]);
    const statusDist = useMemo(() => getStatusDistribution(records), [records]);

    const fmtDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        const s = ms / 1000;
        return s < 60 ? `${s.toFixed(1)}s` : `${(s / 60).toFixed(1)}m`;
    };

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                        <BarChart3 className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Workflow Analytics</h2>
                        <p className="text-xs text-muted-foreground">Execution metrics from your AI agent workflows</p>
                    </div>
                </div>
                <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900/60 border border-zinc-800/50 rounded-lg hover:text-zinc-200 hover:border-zinc-700/50 transition-all"
                >
                    <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Activity} label="Total Runs" value={kpis.total} color="from-violet-500/20 to-indigo-500/20" />
                <KpiCard icon={CheckCircle2} label="Success Rate" value={`${kpis.successRate}%`} sub={`${kpis.succeeded} passed · ${kpis.failed} failed`} color="from-emerald-500/20 to-teal-500/20" />
                <KpiCard icon={Clock} label="Avg Duration" value={fmtDuration(kpis.avgDuration)} color="from-amber-500/20 to-orange-500/20" />
                <KpiCard icon={Users} label="Agents Triggered" value={kpis.totalAgents} color="from-cyan-500/20 to-sky-500/20" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Activity — Area Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5"
                >
                    <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-400" /> Daily Activity
                        <span className="text-[10px] text-zinc-500 ml-auto">Last 14 days</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={daily}>
                            <defs>
                                <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="success" name="Success" stroke="#22c55e" fill="url(#gradSuccess)" strokeWidth={2} />
                            <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="url(#gradFailed)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Status Distribution — Pie */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 flex flex-col"
                >
                    <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Status Breakdown
                    </h3>
                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={statusDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusDist.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
                                />
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Agent Performance — Bar Chart */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5"
            >
                <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" /> Agent Performance
                    <span className="text-[10px] text-zinc-500 ml-auto">Top 10 agents by usage</span>
                </h3>
                {agents.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={agents} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="avgMs" name="Avg ms" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-sm text-zinc-500 text-center py-10">No agent data yet. Run a workflow to start tracking.</p>
                )}
            </motion.div>
        </div>
    );
}
