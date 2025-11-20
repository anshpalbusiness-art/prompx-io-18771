import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, Zap, Shield, RefreshCw, CreditCard, Clock, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import type { User } from "@supabase/supabase-js";

interface UsageInfo {
  limit: number;
  used: number;
  remaining: number;
  has_access: boolean;
}

interface UsageDashboardProps {
  user: User | null;
}

export default function UsageDashboard({ user }: UsageDashboardProps) {
  const [promptUsage, setPromptUsage] = useState<UsageInfo | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const planAccess = usePlanAccess(user?.id);
  const promptLimit = useFeatureLimit('prompt_generation', user?.id);

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  const loadUsageData = async () => {
    try {
      // Load current subscription
      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (subError && subError.code !== "PGRST116") throw subError;

      if (subscription) {
        setCurrentPlan(subscription.subscription_plans);
      } else {
        // Load free plan as default
        const { data: freePlan, error: planError } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("plan_type", "free")
          .single();

        if (planError) throw planError;
        setCurrentPlan(freePlan);
      }

      // For free users, show daily usage. For paid users, show monthly usage
      if (planAccess.planType === 'free') {
        // Get today's usage for prompt generation
        const today = new Date().toISOString().split('T')[0];
        const { data: todayUsage, error: usageError } = await supabase
          .from('usage_tracking')
          .select('id')
          .eq('user_id', user?.id)
          .eq('feature', 'prompt_generation')
          .gte('timestamp', `${today}T00:00:00.000Z`)
          .lt('timestamp', `${today}T23:59:59.999Z`);

        if (usageError) throw usageError;

        const usedToday = todayUsage?.length || 0;
        setPromptUsage({
          limit: 1,
          used: usedToday,
          remaining: Math.max(0, 1 - usedToday),
          has_access: usedToday < 1
        });
      } else {
        // For paid users, set unlimited
        setPromptUsage({
          limit: -1,
          used: 0,
          remaining: -1,
          has_access: true
        });
      }
    } catch (error: any) {
      console.error("Error loading usage:", error);
      toast({
        title: "Error loading usage data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return "text-primary";
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-warning";
    return "text-primary";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    await promptLimit.checkUsage();
    setRefreshing(false);
    toast({
      title: "Updated",
      description: "Usage data refreshed successfully",
    });
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (loading) {
    return <div className="text-center py-8">Loading usage data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track your subscription and usage</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {currentPlan?.plan_type === 'free' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleUpgrade}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan?.plan_name || "Free"}</div>
            <p className="text-xs text-muted-foreground">
              ${currentPlan?.price_monthly || 0}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {planAccess.planType === 'free' ? 'Daily Prompts' : 'Prompts Used'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUsageColor(promptUsage?.used || 0, promptUsage?.limit || 0)}`}>
              {promptUsage?.used || 0}
              {promptUsage?.limit !== -1 && ` / ${promptUsage?.limit}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {promptUsage?.limit === -1 
                ? "Unlimited" 
                : planAccess.planType === 'free'
                  ? `${promptUsage?.remaining || 0} remaining today`
                  : `${promptUsage?.remaining || 0} remaining this month`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPlan?.limits?.workflows === -1
                ? "Unlimited"
                : currentPlan?.limits?.workflows || 0}
            </div>
            <p className="text-xs text-muted-foreground">Available workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPlan?.limits?.api_calls === -1
                ? "Unlimited"
                : currentPlan?.limits?.api_calls === 0
                ? "Not Available"
                : `${currentPlan?.limits?.api_calls || 0}/mo`}
            </div>
            <p className="text-xs text-muted-foreground">Monthly API limit</p>
          </CardContent>
        </Card>
      </div>

      {promptUsage && promptUsage.limit !== -1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {planAccess.planType === 'free' ? 'Daily Usage Limit' : 'Usage This Month'}
            </CardTitle>
            <CardDescription>
              {planAccess.planType === 'free' 
                ? 'Your daily prompt generation usage (resets every 24 hours)'
                : 'Your prompt optimization usage for the current billing period'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {planAccess.planType === 'free' ? 'Prompt Generations Today' : 'Prompt Optimizations'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {promptUsage.used} / {promptUsage.limit}
                </span>
              </div>
              <Progress value={calculatePercentage(promptUsage.used, promptUsage.limit)} />
              
              {planAccess.planType === 'free' && promptUsage.remaining === 0 && (
                <div className="flex flex-col gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Daily Limit Reached
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    You've used your 1 free prompt for today. Your limit will reset in 24 hours, or upgrade to Pro for unlimited prompts!
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleUpgrade}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              )}

              {planAccess.planType !== 'free' && promptUsage.remaining <= 5 && promptUsage.remaining > 0 && (
                <p className="text-sm text-warning">
                  You're running low on prompts. Consider upgrading your plan.
                </p>
              )}
              
              {planAccess.planType !== 'free' && promptUsage.remaining === 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Limit Reached</Badge>
                    <p className="text-sm text-destructive">
                      Upgrade your plan to continue optimizing prompts
                    </p>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleUpgrade}
                    className="w-fit"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    View Pricing Plans
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>
            {planAccess.planType === 'free' 
              ? 'Your free plan includes these trial features'
              : 'Your current plan includes these features'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {planAccess.planType === 'free' ? (
              <>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">✓</Badge>
                  <span className="text-sm">1 Prompt Generation per Day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">✓</Badge>
                  <span className="text-sm">1 AI Agent Creation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">✓</Badge>
                  <span className="text-sm">Basic Template Access</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">✓</Badge>
                  <span className="text-sm">Community Support</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">✗</Badge>
                  <span className="text-sm text-gray-500">Unlimited Prompts</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">✗</Badge>
                  <span className="text-sm text-gray-500">Advanced Workflows</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">✗</Badge>
                  <span className="text-sm text-gray-500">Priority Support</span>
                </li>
              </>
            ) : (
              <>
                {currentPlan?.features?.prompt_optimization && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Unlimited Prompt Generation</span>
                  </li>
                )}
                {currentPlan?.features?.advanced_workflows && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Advanced Workflows</span>
                  </li>
                )}
                {currentPlan?.features?.compliance_checks && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Compliance Checks</span>
                  </li>
                )}
                {currentPlan?.features?.team_collaboration && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Team Collaboration</span>
                  </li>
                )}
                {currentPlan?.features?.priority_support && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Priority Support</span>
                  </li>
                )}
                {currentPlan?.features?.dedicated_support && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Dedicated Support</span>
                  </li>
                )}
                {currentPlan?.features?.custom_templates && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">Custom Templates</span>
                  </li>
                )}
                {currentPlan?.features?.sso && (
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✓</Badge>
                    <span className="text-sm">SSO Authentication</span>
                  </li>
                )}
              </>
            )}
          </ul>
          
          {planAccess.planType === 'free' && (
            <div className="mt-4 pt-4 border-t border-zinc-800/40">
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-black text-white hover:bg-zinc-900 font-bold border border-zinc-800 hover:border-zinc-700 transition-all duration-300"
              >
                <Zap className="w-4 h-4 mr-2" strokeWidth={2.5} />
                Upgrade for Unlimited Access
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}