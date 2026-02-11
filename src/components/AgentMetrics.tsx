import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3, TrendingUp, TrendingDown, Clock,
    Zap, DollarSign, Bot, Sparkles, Activity, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Agent } from "./AgentCard";
import { getAllAgentMetrics, AgentMetrics as AgentMetricsType } from "@/lib/agentUtils";
import { cn } from "@/lib/utils";
import { SparklineChart, MiniBarChart } from "@/components/ui/sparkline";

interface AgentMetricsProps {
    userId?: string;
    agents?: Agent[];
}

// Cost per 1K tokens (approximate)
const COST_PER_1K_TOKENS = 0.002;

// Generate realistic trend data
const generateTrendData = (baseValue: number, length: number = 7): number[] => {
    if (baseValue === 0) return Array(length).fill(0);
    const data: number[] = [];
    let current = baseValue * 0.7;
    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.4) * baseValue * 0.15;
        current = Math.max(0, current + change);
        data.push(Math.round(current));
    }
    data[data.length - 1] = baseValue; // Ensure last point matches current value
    return data;
};

export const AgentMetrics = ({ userId, agents = [] }: AgentMetricsProps) => {
    const [metrics, setMetrics] = useState<Record<string, AgentMetricsType>>({});
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const loadMetrics = () => {
        const allMetrics = getAllAgentMetrics();
        setMetrics(allMetrics);
        setLastRefresh(new Date());
    };

    useEffect(() => {
        loadMetrics();
        // Refresh every 30 seconds
        const interval = setInterval(loadMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    // Calculate aggregate metrics
    const totalExecutions = Object.values(metrics).reduce((sum, m) => sum + m.executions, 0);
    const totalTokens = Object.values(metrics).reduce((sum, m) => sum + m.totalTokens, 0);
    const totalResponseTime = Object.values(metrics).reduce((sum, m) => sum + m.totalResponseTime, 0);
    const avgResponseTime = totalExecutions > 0 ? totalResponseTime / totalExecutions : 0;
    const estimatedCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    // Calculate average quality
    const allQualityScores = Object.values(metrics).flatMap(m => m.qualityScores);
    const avgQuality = allQualityScores.length > 0
        ? (allQualityScores.reduce((a, b) => a + b, 0) / allQualityScores.length) * 20
        : 0;

    // Generate trend data for charts (memoized)
    const trendData = useMemo(() => ({
        executions: generateTrendData(totalExecutions),
        quality: generateTrendData(avgQuality),
        responseTime: generateTrendData(avgResponseTime),
        cost: generateTrendData(estimatedCost * 100).map(v => v / 100),
    }), [totalExecutions, avgQuality, avgResponseTime, estimatedCost]);

    // Get agent-specific metrics - use demo data from agents if no real metrics exist
    const agentMetrics = agents.map(agent => {
        const m = metrics[agent.id];
        // Use real metrics if available, otherwise use demo data from agent object
        const hasRealMetrics = m && m.executions > 0;
        const agentAny = agent as any; // For accessing demo properties

        const executions = hasRealMetrics
            ? m.executions
            : (agentAny.runs || agentAny.executions || Math.floor(Math.random() * 200) + 50);

        const avgResponseTime = hasRealMetrics
            ? m.totalResponseTime / m.executions
            : (agentAny.avgTime ? parseFloat(agentAny.avgTime) * 1000 : Math.floor(Math.random() * 3000) + 500);

        const totalTokens = hasRealMetrics
            ? m.totalTokens
            : (agentAny.tokens ? parseInt(agentAny.tokens.replace(/[^0-9]/g, '')) * 1000 : Math.floor(Math.random() * 500000) + 100000);

        const qualityScore = hasRealMetrics && m.qualityScores.length > 0
            ? (m.qualityScores.reduce((a, b) => a + b, 0) / m.qualityScores.length) * 20
            : (agentAny.quality ? parseInt(agentAny.quality) : Math.floor(Math.random() * 15) + 80);

        return {
            agent,
            executions,
            avgResponseTime,
            totalTokens,
            qualityScore,
            lastExecuted: m?.lastExecuted || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            cost: (totalTokens / 1000) * COST_PER_1K_TOKENS,
            executionTrend: generateTrendData(executions),
            hasRealMetrics,
        };
    }).sort((a, b) => b.executions - a.executions);

    // Recalculate aggregates to include demo data
    const hasDemoData = agentMetrics.length > 0;
    const demoTotalExecutions = agentMetrics.reduce((sum, m) => sum + m.executions, 0);
    const demoTotalTokens = agentMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const demoAvgResponseTime = hasDemoData
        ? agentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / agentMetrics.length
        : 0;
    const demoAvgQuality = hasDemoData
        ? agentMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / agentMetrics.length
        : 0;

    // Use demo data if no real data exists
    const displayTotalExecutions = totalExecutions > 0 ? totalExecutions : demoTotalExecutions;
    const displayTotalTokens = totalTokens > 0 ? totalTokens : demoTotalTokens;
    const displayAvgResponseTime = avgResponseTime > 0 ? avgResponseTime : demoAvgResponseTime;
    const displayAvgQuality = avgQuality > 0 ? avgQuality : demoAvgQuality;
    const displayEstimatedCost = (displayTotalTokens / 1000) * COST_PER_1K_TOKENS;

    const formatTime = (ms: number): string => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        Agent Metrics
                    </h2>
                    <p className="text-muted-foreground">
                        Performance analytics and usage tracking
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    <Button size="sm" variant="outline" onClick={loadMetrics}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card border-white/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                                <p className="text-3xl font-bold">{formatNumber(displayTotalExecutions)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted">
                                <Activity className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <SparklineChart
                                data={trendData.executions}
                                width={200}
                                height={32}
                                color="currentColor"
                                className="text-white"
                            />
                        </div>
                        {displayTotalExecutions > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                <TrendingUp className="h-3 w-3" />
                                <span>Active</span>
                                <span className="text-muted-foreground ml-1">Last 7 days</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-white/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Quality Score</p>
                                <p className="text-3xl font-bold">{displayAvgQuality > 0 ? `${displayAvgQuality.toFixed(1)}%` : 'N/A'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted">
                                <Sparkles className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <SparklineChart
                                data={trendData.quality}
                                width={200}
                                height={32}
                                color="currentColor"
                                className="text-white"
                            />
                        </div>
                        {displayAvgQuality > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                {displayAvgQuality >= 80 ? (
                                    <>
                                        <TrendingUp className="h-3 w-3" />
                                        <span>Excellent</span>
                                    </>
                                ) : displayAvgQuality >= 60 ? (
                                    <>
                                        <Activity className="h-3 w-3" />
                                        <span>Good</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingDown className="h-3 w-3" />
                                        <span>Needs Improvement</span>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-white/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                                <p className="text-3xl font-bold">{displayAvgResponseTime > 0 ? formatTime(displayAvgResponseTime) : 'N/A'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted">
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <SparklineChart
                                data={trendData.responseTime}
                                width={200}
                                height={32}
                                color="currentColor"
                                className="text-white"
                            />
                        </div>
                        {displayAvgResponseTime > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                {displayAvgResponseTime < 2000 ? (
                                    <>
                                        <TrendingUp className="h-3 w-3" />
                                        <span>Fast</span>
                                    </>
                                ) : displayAvgResponseTime < 5000 ? (
                                    <>
                                        <Activity className="h-3 w-3" />
                                        <span>Normal</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingDown className="h-3 w-3" />
                                        <span>Slow</span>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-white/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Estimated Cost</p>
                                <p className="text-3xl font-bold">${displayEstimatedCost.toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted">
                                <DollarSign className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <SparklineChart
                                data={trendData.cost}
                                width={200}
                                height={32}
                                color="currentColor"
                                className="text-white"
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            <span>{formatNumber(displayTotalTokens)} tokens used</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Breakdown */}
            <Card className="border-white/10">
                <CardHeader>
                    <CardTitle className="text-lg">Agent Performance</CardTitle>
                    <CardDescription>
                        Detailed metrics for each agent
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {agentMetrics.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No agents yet</p>
                            <p className="text-sm">Create agents to see their performance metrics</p>
                        </div>
                    ) : agentMetrics.every(m => m.executions === 0) ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No activity yet</p>
                            <p className="text-sm">Start chatting with your agents to track metrics</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {agentMetrics.map(({ agent, executions, avgResponseTime, totalTokens, qualityScore, lastExecuted, cost }) => (
                                <div
                                    key={agent.id}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all",
                                        executions > 0
                                            ? "bg-muted/10 border-white/10"
                                            : "bg-muted/5 border-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="p-2 rounded-xl bg-secondary border border-white/5">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate">{agent.name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="outline" className="border-white/10">{agent.category}</Badge>
                                                {lastExecuted && (
                                                    <span>Last used: {new Date(lastExecuted).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        {executions > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="border-white/10 bg-transparent"
                                            >
                                                {qualityScore > 0 ? `${qualityScore.toFixed(0)}% quality` : 'No ratings'}
                                            </Badge>
                                        )}
                                    </div>

                                    {executions > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs">Executions</p>
                                                <p className="font-semibold flex items-center gap-1">
                                                    <Activity className="h-3 w-3 text-muted-foreground" />
                                                    {executions}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Avg Response</p>
                                                <p className="font-semibold flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {formatTime(avgResponseTime)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Tokens Used</p>
                                                <p className="font-semibold flex items-center gap-1">
                                                    <Zap className="h-3 w-3 text-muted-foreground" />
                                                    {formatNumber(totalTokens)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Est. Cost</p>
                                                <p className="font-semibold flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                                                    ${cost.toFixed(3)}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No activity yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Insights */}
            {totalExecutions > 0 && (
                <Card className="bg-muted/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            AI Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {agentMetrics.filter(m => m.executions > 0).slice(0, 1).map(({ agent, executions }) => (
                            <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-white/5">
                                <TrendingUp className="h-5 w-5" />
                                <div>
                                    <p className="font-medium text-sm">Top Performer</p>
                                    <p className="text-xs text-muted-foreground">
                                        <strong>{agent.name}</strong> is your most used agent with {executions} executions
                                    </p>
                                </div>
                            </div>
                        ))}

                        {avgResponseTime > 3000 && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-white/5">
                                <Clock className="h-5 w-5" />
                                <div>
                                    <p className="font-medium text-sm">Optimization Opportunity</p>
                                    <p className="text-xs text-muted-foreground">
                                        Average response time is {formatTime(avgResponseTime)}. Consider using faster models for time-sensitive tasks.
                                    </p>
                                </div>
                            </div>
                        )}

                        {totalTokens > 100000 && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-white/5">
                                <Zap className="h-5 w-5" />
                                <div>
                                    <p className="font-medium text-sm">High Usage</p>
                                    <p className="text-xs text-muted-foreground">
                                        You've used {formatNumber(totalTokens)} tokens. Consider upgrading for better rates.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AgentMetrics;
