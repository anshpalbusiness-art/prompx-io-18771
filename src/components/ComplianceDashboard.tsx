import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, FileCheck } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ComplianceDashboardProps {
  user: User;
}

interface ComplianceCheck {
  id: string;
  prompt_text: string;
  check_results: any;
  compliance_score: number;
  checked_at: string;
}

export default function ComplianceDashboard({ user }: ComplianceDashboardProps) {
  const [recentChecks, setRecentChecks] = useState<ComplianceCheck[]>([]);
  const [stats, setStats] = useState({
    totalChecks: 0,
    passedChecks: 0,
    avgScore: 0,
    criticalViolations: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchComplianceData();
  }, [user]);

  const fetchComplianceData = async () => {
    try {
      const { data, error } = await supabase
        .from("prompt_compliance_checks")
        .select("*")
        .eq("user_id", user.id)
        .order("checked_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        setRecentChecks(data);

        const totalChecks = data.length;
        const passedChecks = data.filter((check) => {
          const results = check.check_results as any;
          return results?.passed === true;
        }).length;
        const avgScore = data.reduce((sum, check) => sum + (check.compliance_score || 0), 0) / totalChecks;
        const criticalViolations = data.reduce(
          (sum, check) => {
            const results = check.check_results as any;
            const violations = results?.violations || [];
            return sum + violations.filter((v: any) => v.severity === "critical").length;
          },
          0
        );

        setStats({ totalChecks, passedChecks, avgScore: Math.round(avgScore), criticalViolations });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching compliance data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor bias detection and compliance checks</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Lock className="mr-1 h-3 w-3" />
          SOC2 • GDPR • HIPAA Ready
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <FileCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChecks}</div>
            <p className="text-xs text-muted-foreground">Prompts analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalChecks > 0 ? Math.round((stats.passedChecks / stats.totalChecks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{stats.passedChecks} passed checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}/100</div>
            <Progress value={stats.avgScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalViolations}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Compliance Checks</CardTitle>
          <CardDescription>History of bias detection and compliance scans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentChecks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No compliance checks yet</p>
              <p className="text-sm">Generate prompts with compliance checking enabled</p>
            </div>
          ) : (
            recentChecks.map((check) => (
              <div key={check.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {check.prompt_text}
                    </p>
                    <div className="flex items-center gap-2">
                      {check.check_results?.passed ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Score: {check.compliance_score}/100
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(check.checked_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Violations */}
                {check.check_results?.violations?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Violations:</p>
                    {check.check_results.violations.map((violation: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Badge variant={getSeverityColor(violation.severity)} className="text-xs">
                          {violation.severity}
                        </Badge>
                        <span className="flex-1">{violation.description || violation.rule}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {check.check_results?.warnings?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Warnings:</p>
                    {check.check_results.warnings.map((warning: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <span className="flex-1">{warning.description || warning.filter}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
