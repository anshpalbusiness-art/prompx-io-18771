import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Shield, 
  FlaskConical, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface AutomationDashboardProps {
  user: User;
}

export function AutomationDashboard({ user }: AutomationDashboardProps) {
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(false);
  const [complianceScanEnabled, setComplianceScanEnabled] = useState(true);
  const [optimizationJobs, setOptimizationJobs] = useState<any[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAutomationData();
  }, [user]);

  const fetchAutomationData = async () => {
    setLoading(true);
    try {
      // Fetch optimization jobs
      const { data: jobs } = await supabase
        .from('auto_optimization_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setOptimizationJobs(jobs || []);

      // Fetch compliance issues
      const { data: compliance } = await supabase
        .from('compliance_monitoring')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'detected')
        .order('detected_at', { ascending: false });

      setComplianceIssues(compliance || []);

      // Fetch A/B experiments
      const { data: tests } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(5);

      setExperiments(tests || []);

      // Fetch alerts
      const { data: alertData } = await supabase
        .from('predictive_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setAlerts(alertData || []);

    } catch (error: any) {
      toast({
        title: "Error loading automation data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAutoOptimization = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-optimize-scheduler', {
        body: {
          userId: user.id,
          forceOptimize: true,
          performanceThreshold: 0.6
        }
      });

      if (error) throw error;

      toast({
        title: "Auto-Optimization Started",
        description: `Processing ${data.jobsCompleted} prompts for optimization.`,
      });

      fetchAutomationData();
    } catch (error: any) {
      toast({
        title: "Optimization failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await supabase
        .from('predictive_alerts')
        .update({ is_dismissed: true })
        .eq('id', alertId);

      setAlerts(alerts.filter(a => a.id !== alertId));
      
      toast({
        title: "Alert dismissed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'warning': return 'default';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Automation & Intelligence</h2>
        <p className="text-muted-foreground">Automated optimization, compliance monitoring, and intelligent testing</p>
      </div>

      {/* Automation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Auto-Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Switch 
                checked={autoOptimizeEnabled}
                onCheckedChange={setAutoOptimizeEnabled}
              />
              <Button 
                size="sm" 
                onClick={runAutoOptimization}
                disabled={loading}
              >
                Run Now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Automatically optimize underperforming prompts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Compliance Scanning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Switch 
                checked={complianceScanEnabled}
                onCheckedChange={setComplianceScanEnabled}
              />
              <Badge variant={complianceIssues.length > 0 ? "destructive" : "secondary"}>
                {complianceIssues.length} Issues
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Monitor for bias, privacy, and compliance violations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Active A/B Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {experiments.filter(e => e.status === 'active').length}
              </span>
              <Button size="sm" variant="outline">
                View All
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Running experiments with statistical tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Predictive Alerts
            </CardTitle>
            <CardDescription>AI-detected opportunities and risks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'text-red-600' : 
                  alert.severity === 'warning' ? 'text-orange-600' : 
                  'text-blue-600'
                }`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{alert.title}</h4>
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  {alert.confidence_score && (
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(alert.confidence_score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => dismissAlert(alert.id)}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="optimization" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="optimization">Optimization Jobs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="experiments">A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Optimization Jobs</CardTitle>
              <CardDescription>Automated prompt improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No optimization jobs yet. Enable auto-optimization to get started.
                  </p>
                ) : (
                  optimizationJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      {getStatusIcon(job.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm capitalize">{job.trigger_reason}</span>
                          <Badge variant="outline">{job.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {job.original_prompt}
                        </p>
                        {job.improvement_score && (
                          <div className="flex items-center gap-2 mt-2">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">
                              +{job.improvement_score.toFixed(1)}% improvement
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Issues</CardTitle>
              <CardDescription>Detected violations and risks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <p className="text-sm font-medium">No compliance issues detected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your prompts are compliant with current standards
                    </p>
                  </div>
                ) : (
                  complianceIssues.map((issue) => (
                    <div key={issue.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <span className="text-sm font-medium capitalize">
                            {issue.compliance_type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(issue.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {issue.issue_description}
                      </p>
                      {issue.remediation_suggestion && (
                        <div className="bg-muted/50 p-2 rounded text-xs">
                          <strong>Fix:</strong> {issue.remediation_suggestion}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Test Experiments</CardTitle>
              <CardDescription>Statistical testing with intelligent analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No A/B tests created yet. Start testing to optimize performance.
                  </p>
                ) : (
                  experiments.map((exp) => {
                    const controlRate = exp.sample_size > 0 
                      ? (exp.control_conversions / (exp.sample_size / 2) * 100).toFixed(1)
                      : '0.0';
                    const treatmentRate = exp.sample_size > 0
                      ? (exp.treatment_conversions / (exp.sample_size / 2) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <div key={exp.id} className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{exp.test_name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exp.description || 'No description'}
                            </p>
                          </div>
                          <Badge variant={exp.status === 'active' ? 'default' : 'secondary'}>
                            {exp.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Control</p>
                            <p className="text-lg font-bold">{controlRate}%</p>
                            <Progress value={parseFloat(controlRate)} className="h-2" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Treatment</p>
                            <p className="text-lg font-bold">{treatmentRate}%</p>
                            <Progress value={parseFloat(treatmentRate)} className="h-2" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Sample size: {exp.sample_size}</span>
                          {exp.winner && exp.winner !== 'inconclusive' && (
                            <span className="text-green-600 font-medium">
                              Winner: {exp.winner}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
