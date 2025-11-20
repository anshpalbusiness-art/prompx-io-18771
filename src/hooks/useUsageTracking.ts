import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface UsageData {
  prompts_used: number;
  api_calls_used: number;
  workflows_created: number;
}

interface PlanLimits {
  prompts_per_month: number;
  api_calls: number;
  workflows: number;
  team_members: number;
}

interface UserPlan {
  plan_type: string;
  limits: PlanLimits;
  features: Record<string, boolean>;
}

export function useUsageTracking(user: User | null) {
  const [usage, setUsage] = useState<UsageData>({
    prompts_used: 0,
    api_calls_used: 0,
    workflows_created: 0
  });
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadUserPlanAndUsage();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserPlanAndUsage = async () => {
    if (!user) return;

    try {
      // Get user's current plan and limits
      const { data: planData, error: planError } = await supabase
        .rpc('get_user_plan', { user_uuid: user.id });

      if (planError) throw planError;

      if (planData && planData.length > 0) {
        setUserPlan(planData[0]);
      }

      // Get current month usage
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('prompts_used, api_calls_used, workflows_created')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      if (usageData) {
        setUsage(usageData);
      }
    } catch (error: any) {
      console.error('Error loading usage data:', error);
      toast({
        title: "Error loading usage data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trackUsage = async (usageType: 'prompt' | 'api_call' | 'workflow', amount: number = 1) => {
    if (!user || !userPlan) return false;

    try {
      // Check limits before tracking
      const canUse = checkUsageLimit(usageType, amount);
      if (!canUse) {
        toast({
          title: "Usage limit reached",
          description: `You've reached your ${usageType} limit for this month. Upgrade your plan to continue.`,
          variant: "destructive",
        });
        return false;
      }

      // Track the usage
      const { error } = await supabase
        .rpc('track_usage', { 
          user_uuid: user.id, 
          usage_type: usageType, 
          amount 
        });

      if (error) throw error;

      // Update local usage state
      setUsage(prev => ({
        ...prev,
        [`${usageType}s_used`]: prev[`${usageType}s_used` as keyof UsageData] + amount
      }));

      return true;
    } catch (error: any) {
      console.error('Error tracking usage:', error);
      toast({
        title: "Error tracking usage",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const checkUsageLimit = (usageType: 'prompt' | 'api_call' | 'workflow', amount: number = 1): boolean => {
    if (!userPlan) return false;

    const limits = userPlan.limits;
    const currentUsage = usage;

    switch (usageType) {
      case 'prompt':
        if (limits.prompts_per_month === -1) return true; // Unlimited
        return (currentUsage.prompts_used + amount) <= limits.prompts_per_month;
      
      case 'api_call':
        if (limits.api_calls === -1) return true; // Unlimited
        return (currentUsage.api_calls_used + amount) <= limits.api_calls;
      
      case 'workflow':
        if (limits.workflows === -1) return true; // Unlimited
        return (currentUsage.workflows_created + amount) <= limits.workflows;
      
      default:
        return false;
    }
  };

  const getUsagePercentage = (usageType: 'prompt' | 'api_call' | 'workflow'): number => {
    if (!userPlan) return 0;

    const limits = userPlan.limits;
    const currentUsage = usage;

    switch (usageType) {
      case 'prompt':
        if (limits.prompts_per_month === -1) return 0; // Unlimited
        return Math.min((currentUsage.prompts_used / limits.prompts_per_month) * 100, 100);
      
      case 'api_call':
        if (limits.api_calls === -1) return 0; // Unlimited
        return Math.min((currentUsage.api_calls_used / limits.api_calls) * 100, 100);
      
      case 'workflow':
        if (limits.workflows === -1) return 0; // Unlimited
        return Math.min((currentUsage.workflows_created / limits.workflows) * 100, 100);
      
      default:
        return 0;
    }
  };

  const getRemainingUsage = (usageType: 'prompt' | 'api_call' | 'workflow'): number | 'unlimited' => {
    if (!userPlan) return 0;

    const limits = userPlan.limits;
    const currentUsage = usage;

    switch (usageType) {
      case 'prompt':
        if (limits.prompts_per_month === -1) return 'unlimited';
        return Math.max(limits.prompts_per_month - currentUsage.prompts_used, 0);
      
      case 'api_call':
        if (limits.api_calls === -1) return 'unlimited';
        return Math.max(limits.api_calls - currentUsage.api_calls_used, 0);
      
      case 'workflow':
        if (limits.workflows === -1) return 'unlimited';
        return Math.max(limits.workflows - currentUsage.workflows_created, 0);
      
      default:
        return 0;
    }
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!userPlan) return false;
    return userPlan.features[feature] === true;
  };

  return {
    usage,
    userPlan,
    loading,
    trackUsage,
    checkUsageLimit,
    getUsagePercentage,
    getRemainingUsage,
    hasFeatureAccess,
    refreshUsage: loadUserPlanAndUsage
  };
}
