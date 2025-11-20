import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface ProFeatureGateProps {
  children: ReactNode;
  feature: string;
  requiredPlan?: 'pro' | 'premium' | 'enterprise';
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

interface UserSubscription {
  plan_type: string;
  status: string;
  end_date: string;
}

export function ProFeatureGate({ 
  children, 
  feature, 
  requiredPlan = 'pro',
  fallback,
  showUpgradePrompt = true 
}: ProFeatureGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: subscriptionData } = await supabase
          .from('user_subscriptions')
          .select('plan_type, status, end_date')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error checking user access:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = () => {
    if (!user) return false;
    if (!subscription) return false;

    const planHierarchy = {
      'free': 0,
      'pro': 1,
      'premium': 2,
      'enterprise': 3
    };

    const userPlanLevel = planHierarchy[subscription.plan_type as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan];

    return userPlanLevel >= requiredPlanLevel;
  };

  const handleUpgrade = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upgrade your plan",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    navigate('/pricing');
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Zap className="w-5 h-5 text-white" />;
      case 'premium':
        return <Crown className="w-5 h-5 text-white" />;
      case 'enterprise':
        return <Crown className="w-5 h-5 text-white" />;
      default:
        return <Lock className="w-5 h-5 text-white" />;
    }
  };

  const getPlanColor = (plan: string) => {
    // All plans use the same black and white theme
    return 'from-white to-zinc-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (hasAccess()) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="flex items-center justify-center p-4 sm:p-8">
      <Card className="max-w-md bg-gradient-to-br from-black to-zinc-950 border border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden smooth-card shadow-[0_20px_80px_rgba(255,255,255,0.03)]">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <CardHeader className="text-center pb-6 pt-8 px-6 sm:px-8 relative">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] flex items-center justify-center backdrop-blur-sm border border-white/[0.1] shadow-[0_8px_32px_rgba(255,255,255,0.08)]">
              {getPlanIcon(requiredPlan)}
            </div>
          </div>
          <CardTitle className="text-white flex items-center justify-center gap-3 text-2xl font-light tracking-wide mb-3">
            <Lock className="w-5 h-5" />
            Premium Feature
          </CardTitle>
          <CardDescription className="text-zinc-400 font-light text-base leading-relaxed">
            {feature} requires a {requiredPlan} plan or higher
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6 px-6 sm:px-8 pb-8 relative">
          <Badge className="bg-gradient-to-r from-white to-zinc-100 text-black font-bold capitalize px-4 py-2 rounded-lg shadow-lg">
            {requiredPlan} Plan Required
          </Badge>
          
          <p className="text-zinc-300 text-sm font-light leading-relaxed">
            Upgrade your plan to unlock this feature and many more advanced capabilities.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full h-12 bg-gradient-to-r from-white to-zinc-100 text-black hover:from-zinc-50 hover:to-white font-bold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.35)] transition-all duration-300 rounded-xl smooth-button"
            >
              Upgrade to {requiredPlan}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => navigate('/pricing')}
              className="w-full h-11 text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 rounded-xl font-medium smooth-button"
            >
              View All Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for checking feature access
export function useProFeatureAccess(requiredPlan: 'pro' | 'premium' | 'enterprise' = 'pro') {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAccess();
  }, [requiredPlan]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setHasAccess(false);
        return;
      }

      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!subscriptionData) {
        setHasAccess(false);
        return;
      }

      const planHierarchy = {
        'free': 0,
        'pro': 1,
        'premium': 2,
        'enterprise': 3
      };

      const userPlanLevel = planHierarchy[subscriptionData.plan_type as keyof typeof planHierarchy] || 0;
      const requiredPlanLevel = planHierarchy[requiredPlan];

      setHasAccess(userPlanLevel >= requiredPlanLevel);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, user, checkAccess };
}
