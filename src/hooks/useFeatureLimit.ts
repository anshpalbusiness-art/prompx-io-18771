// Hook to manage feature usage limits for free users

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanAccess } from './usePlanAccess';
import { useNavigate } from 'react-router-dom';

interface FeatureLimitState {
  canUse: boolean;
  usageCount: number;
  isLoading: boolean;
  checkUsage: () => Promise<void>;
  trackUsage: () => Promise<boolean>;
  showUpgradePrompt: () => void;
}

export const useFeatureLimit = (
  featureName: string,
  userId: string | undefined
): FeatureLimitState => {
  const [canUse, setCanUse] = useState(true);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const planAccess = usePlanAccess(userId);

  useEffect(() => {
    if (userId && !planAccess.isLoading) {
      checkUsage();
    }
  }, [userId, featureName, planAccess.isLoading]);

  const checkUsage = async () => {
    if (!userId) {
      setCanUse(false);
      setIsLoading(false);
      return;
    }

    // Paid plans have unlimited access
    if (planAccess.hasProPlan()) {
      setCanUse(true);
      setUsageCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check today's usage for this feature
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('id, timestamp')
        .eq('user_id', userId)
        .eq('feature', featureName)
        .gte('timestamp', `${today}T00:00:00.000Z`)
        .lt('timestamp', `${today}T23:59:59.999Z`)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error checking usage:', error);
        setCanUse(false);
        return;
      }

      const todayUsage = data?.length || 0;
      setUsageCount(todayUsage);
      
      // Free users get 1 use per feature per day
      const limit = planAccess.limits.prompts_per_feature;
      setCanUse(todayUsage < limit);
      
    } catch (error) {
      console.error('Error in checkUsage:', error);
      setCanUse(false);
    } finally {
      setIsLoading(false);
    }
  };

  const trackUsage = async (): Promise<boolean> => {
    if (!userId) return false;

    // Paid plans don't need tracking
    if (planAccess.hasProPlan()) {
      return true;
    }

    // Check if user can still use this feature
    if (!canUse) {
      showUpgradePrompt();
      return false;
    }

    try {
      // Record the usage
      const { error } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          feature: featureName,
          timestamp: new Date().toISOString(),
          metadata: {
            plan_type: planAccess.planType,
            usage_count: usageCount + 1
          }
        });

      if (error) {
        console.error('Error tracking usage:', error);
        toast({
          title: "Error",
          description: "Failed to track usage. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      const newUsageCount = usageCount + 1;
      setUsageCount(newUsageCount);
      
      // Check if user has reached the limit
      const limit = planAccess.limits.prompts_per_feature;
      const stillCanUse = newUsageCount < limit;
      setCanUse(stillCanUse);

      // Show upgrade prompt if they've reached the limit
      if (!stillCanUse) {
        setTimeout(() => showUpgradePrompt(), 1000); // Delay to show after success message
      }

      return true;
    } catch (error) {
      console.error('Error in trackUsage:', error);
      return false;
    }
  };

  const showUpgradePrompt = () => {
    toast({
      title: "Feature Limit Reached",
      description: `You've used your daily limit for ${featureName}. Upgrade to Pro for unlimited access!`,
      variant: "destructive",
    });
    
    // Show upgrade prompt after a short delay
    setTimeout(() => {
      navigate('/pricing');
    }, 2000);
  };

  return {
    canUse,
    usageCount,
    isLoading,
    checkUsage,
    trackUsage,
    showUpgradePrompt,
  };
};
