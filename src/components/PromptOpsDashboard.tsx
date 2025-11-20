import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, 
  Shield, 
  Activity, 
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PromptOpsStats {
  totalVersions: number;
  activeDeployments: number;
  criticalViolations: number;
  avgExecutionTime: number;
  successRate: number;
  totalCost: number;
}

interface PromptOpsDashboardProps {
  userId: string;
  teamId?: string;
}

export const PromptOpsDashboard = ({ userId, teamId }: PromptOpsDashboardProps) => {
  const [stats, setStats] = useState<PromptOpsStats>({
    totalVersions: 0,
    activeDeployments: 0,
    criticalViolations: 0,
    avgExecutionTime: 0,
    successRate: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId, teamId]);

  const fetchStats = async () => {
    try {
      const [
        versionsRes,
        deploymentsRes,
        violationsRes,
        metricsRes
      ] = await Promise.all([
        supabase.from('prompt_versions').select('*', { count: 'exact', head: true }).eq('created_by', userId),
        supabase.from('prompt_deployments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('compliance_violations').select('*', { count: 'exact', head: true }).eq('severity', 'critical').is('resolved_at', null),
        supabase.from('prompt_metrics').select('execution_time_ms, success, cost').eq('user_id', userId).limit(100)
      ]);

      const metrics = metricsRes.data || [];
      const avgTime = metrics.reduce((sum, m) => sum + (m.execution_time_ms || 0), 0) / metrics.length || 0;
      const successCount = metrics.filter(m => m.success).length;
      const successRate = metrics.length > 0 ? (successCount / metrics.length) * 100 : 0;
      const totalCost = metrics.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

      setStats({
        totalVersions: versionsRes.count || 0,
        activeDeployments: deploymentsRes.count || 0,
        criticalViolations: violationsRes.count || 0,
        avgExecutionTime: avgTime,
        successRate,
        totalCost,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">Loading PromptOps dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            PromptOps Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Enterprise-grade prompt operations, monitoring & compliance
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Versions</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVersions}</div>
            <p className="text-xs text-muted-foreground">Version controlled prompts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeployments}</div>
            <p className="text-xs text-muted-foreground">Production environments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Violations</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.criticalViolations > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.criticalViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.criticalViolations}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Performance
            </CardTitle>
            <CardDescription>Execution metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Avg Execution Time</span>
                <span className="text-sm font-bold">{stats.avgExecutionTime.toFixed(0)}ms</span>
              </div>
              <Progress value={Math.min((stats.avgExecutionTime / 5000) * 100, 100)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Cost</span>
                <span className="text-sm font-bold">${stats.totalCost.toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Compliance Status
            </CardTitle>
            <CardDescription>Brand safety & governance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Content Policy</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Compliant
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Privacy</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Compliant
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Brand Safety</span>
              {stats.criticalViolations > 0 ? (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {stats.criticalViolations} Issues
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Compliant
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Features Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Enterprise PromptOps Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Git-style Version Control</div>
                <div className="text-xs text-muted-foreground">Track, compare, and rollback prompt versions</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Multi-Environment Deployments</div>
                <div className="text-xs text-muted-foreground">Staging, production, and development pipelines</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Real-time Monitoring</div>
                <div className="text-xs text-muted-foreground">Track performance, costs, and usage metrics</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Compliance & Governance</div>
                <div className="text-xs text-muted-foreground">Automated brand safety and policy enforcement</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Audit Logs</div>
                <div className="text-xs text-muted-foreground">Complete activity tracking for security & compliance</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary mt-1" />
              <div>
                <div className="font-medium text-sm">Team Collaboration</div>
                <div className="text-xs text-muted-foreground">Secure prompt sharing and deployment workflows</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
