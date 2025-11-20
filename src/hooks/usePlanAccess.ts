import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PlanLimits {
  prompts_per_month: number;
  prompts_per_feature: number;
  workflows: number;
  api_calls: number;
  team_members: number;
}

interface PlanFeatures {
  basic_templates?: boolean;
  all_templates?: boolean;
  advanced_workflows?: boolean;
  compliance_checks?: boolean;
  team_collaboration?: boolean;
  priority_support?: boolean;
  custom_templates?: boolean;
  dedicated_support?: boolean;
  prompt_optimization?: boolean;
  sso?: boolean;
  sla?: boolean;
  custom_integrations?: boolean;
}

interface PlanAccess {
  planType: string;
  planName: string;
  limits: PlanLimits;
  features: PlanFeatures;
  isLoading: boolean;
  canAccessFeature: (feature: keyof PlanFeatures) => boolean;
  canAccessWorkflows: () => boolean;
  canAccessAgents: () => boolean;
  hasProPlan: () => boolean;
  canUseFeature: (featureName: string, userId: string) => Promise<boolean>;
  redirectToPricing: () => void;
  showUpgradeMessage: (featureName: string) => void;
}

export const usePlanAccess = (userId: string | undefined): PlanAccess => {
  const [planType, setPlanType] = useState<string>('free');
  const [planName, setPlanName] = useState<string>('Free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [limits, setLimits] = useState<PlanLimits>({
    prompts_per_month: 1,
    prompts_per_feature: 1,
    workflows: 0,
    api_calls: 0,
    team_members: 1,
  });
  const [features, setFeatures] = useState<PlanFeatures>({
    basic_templates: true,
    prompt_optimization: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadUserPlan();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const loadUserPlan = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      const userIsAdmin = !!adminRole;
      setIsAdmin(userIsAdmin);
      
      // If admin, grant unlimited access to everything
      if (userIsAdmin) {
        setPlanType('enterprise');
        setPlanName('Admin');
        setLimits({
          prompts_per_month: -1,
          prompts_per_feature: -1,
          workflows: -1,
          api_calls: -1,
          team_members: -1,
        });
        setFeatures({
          basic_templates: true,
          all_templates: true,
          advanced_workflows: true,
          compliance_checks: true,
          team_collaboration: true,
          priority_support: true,
          custom_templates: true,
          dedicated_support: true,
          prompt_optimization: true,
          sso: true,
          sla: true,
          custom_integrations: true,
        });
        setIsLoading(false);
        return;
      }
      
      // Get user's active subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') throw subError;

      // Get plan details
      let planQuery = supabase
        .from('subscription_plans')
        .select('plan_type, plan_name, limits, features')
        .eq('is_active', true);

      if (subscription?.plan_id) {
        planQuery = planQuery.eq('id', subscription.plan_id);
      } else {
        // Default to free plan
        planQuery = planQuery.eq('plan_type', 'free');
      }

      const { data: plan, error: planError } = await planQuery.maybeSingle();

      if (planError) throw planError;

      if (plan) {
        setPlanType(plan.plan_type);
        setPlanName(plan.plan_name);
        setLimits(plan.limits);
        setFeatures(plan.features);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canAccessFeature = (feature: keyof PlanFeatures): boolean => {
    if (isAdmin) return true;
    return features[feature] === true;
  };

  const canAccessWorkflows = (): boolean => {
    if (isAdmin) return true;
    return limits.workflows !== 0;
  };

  const canAccessAgents = (): boolean => {
    if (isAdmin) return true;
    // Free plan can create agents but with limited features
    // Pro and above have full access
    return planType !== 'free' || limits.prompts_per_month > 0;
  };

  const hasProPlan = (): boolean => {
    if (isAdmin) return true;
    return planType !== 'free';
  };

  const redirectToPricing = () => {
    navigate('/pricing');
  };

  const canUseFeature = async (featureName: string, userId: string): Promise<boolean> => {
    if (isAdmin) return true;
    if (planType !== 'free') return true; // Paid plans have unlimited access
    
    try {
      // Check how many times user has used this feature today
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('id')
        .eq('user_id', userId)
        .eq('feature', featureName)
        .gte('timestamp', `${today}T00:00:00.000Z`)
        .lt('timestamp', `${today}T23:59:59.999Z`);
      
      if (error) {
        console.error('Error checking feature usage:', error);
        return false;
      }
      
      const usageCount = data?.length || 0;
      return usageCount < limits.prompts_per_feature;
    } catch (error) {
      console.error('Error in canUseFeature:', error);
      return false;
    }
  };

  const showUpgradeMessage = (featureName: string) => {
    toast({
      title: "Upgrade Required",
      description: `You've reached your limit for ${featureName}. Upgrade to continue using this feature.`,
      variant: "destructive",
    });
  };

  return {
    planType,
    planName,
    limits,
    features,
    isLoading,
    canAccessFeature,
    canAccessWorkflows,
    canAccessAgents,
    hasProPlan,
    canUseFeature,
    redirectToPricing,
    showUpgradeMessage,
  };
};
