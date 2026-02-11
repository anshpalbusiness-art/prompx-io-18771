import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Users, Building, Crown, Star, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limitations: string[];
  popular?: boolean;
  icon: any;
  buttonText: string;
  planType: 'free' | 'pro' | 'premium' | 'enterprise';
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try before you buy',
    price: { monthly: 0, yearly: 0 },
    features: [
      '1 prompt per feature',
      '1 AI agent creation',
      '1 template access',
      'Community support',
      'Basic analytics'
    ],
    limitations: [
      'Only 1 prompt per feature',
      'Limited functionality',
      'No advanced features',
      'No priority support'
    ],
    icon: Star,
    buttonText: 'Try Free',
    planType: 'free'
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professionals and growing teams',
    price: { monthly: 29, yearly: 290 },
    features: [
      'Unlimited prompts',
      'Unlimited AI agents',
      'Advanced templates',
      'Priority support',
      'Advanced analytics',
      'Team collaboration',
      'API access',
      'Custom workflows',
      'Export capabilities'
    ],
    limitations: [],
    popular: true,
    icon: Zap,
    buttonText: 'Upgrade to Pro',
    planType: 'pro'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For power users and large teams',
    price: { monthly: 79, yearly: 790 },
    features: [
      'Everything in Pro',
      'Advanced AI models',
      'White-label solutions',
      'Dedicated support',
      'Custom integrations',
      'Advanced compliance',
      'SLA guarantee',
      'Unlimited team members'
    ],
    limitations: [],
    icon: Crown,
    buttonText: 'Upgrade to Premium',
    planType: 'premium'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: { monthly: 199, yearly: 1990 },
    features: [
      'Everything in Premium',
      'Custom deployment',
      'SSO integration',
      'Advanced security',
      'Dedicated account manager',
      'Custom training',
      'On-premise options',
      'Custom contracts'
    ],
    limitations: [],
    icon: Building2,
    buttonText: 'Contact Sales',
    planType: 'enterprise'
  }
];

export default function Pricing() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check current subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('plan_type')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscription) {
          setCurrentPlan(subscription.plan_type);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upgrade your plan",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (plan.planType === 'free') {
      toast({
        title: "Free Plan",
        description: "You're already on the free plan!",
      });
      return;
    }

    if (plan.planType === 'enterprise') {
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for enterprise pricing",
      });
      return;
    }

    // Redirect to payment page with plan details
    navigate('/payment', {
      state: {
        plan: plan.planType,
        price: billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly,
        billingCycle
      }
    });
  };

  const getSavingsPercentage = () => {
    return Math.round((1 - (290 / (29 * 12))) * 100);
  };

  if (loading) {
    return (
      <Layout user={user} showHeader={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
            <p className="mt-4 text-white">Loading pricing...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} showHeader={false}>
      <div className="min-h-screen bg-background py-20 relative overflow-hidden smooth-page">
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <div className="text-[30rem] font-black text-foreground/5 tracking-tighter leading-none">
            PromptX
          </div>
        </div>

        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="responsive-container relative z-20">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 opacity-0" style={{ animation: 'fadeIn 0.8s ease-out forwards' }}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
              Choose Your <span className="text-primary">Perfect Plan</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Unlock the full potential of AI-powered prompt engineering with our flexible pricing plans
            </p>

            {/* Billing Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="flex items-center gap-4">
                <span className={`text-base sm:text-lg font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors smooth-button ${billingCycle === 'yearly' ? 'bg-primary' : 'bg-muted'
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full transition-transform bg-background shadow-sm ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
                <span className={`text-base sm:text-lg font-medium ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Yearly
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 text-sm">
                  Save {getSavingsPercentage()}%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto px-4 sm:px-0">
            {pricingPlans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.planType;
              const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;

              return (
                <Card
                  key={plan.id}
                  className={`relative bg-card border-border backdrop-blur-sm smooth-card ${plan.popular
                    ? 'border-primary shadow-lg shadow-primary/10 scale-105'
                    : isCurrentPlan
                      ? 'border-primary shadow-lg shadow-primary/10'
                      : 'hover:border-primary/20'
                    }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground font-bold px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1">
                        Current
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-full ${plan.popular
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                        }`}>
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-card-foreground mb-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mb-4">
                      {plan.description}
                    </CardDescription>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-card-foreground">
                        ${price}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                      {billingCycle === 'yearly' && plan.price.monthly > 0 && (
                        <div className="text-sm text-primary mt-1">
                          Save ${(plan.price.monthly * 12) - plan.price.yearly}/year
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-card-foreground mb-3">Features included:</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-6">
                    <Button
                      className={`w-full smooth-button ${plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold'
                        : isCurrentPlan
                          ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                          : 'bg-transparent border border-input text-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      disabled={isCurrentPlan}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">We accept all major credit cards, PayPal, and bank transfers for enterprise plans.</p>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">Our free plan gives you access to core features. You can upgrade anytime to unlock advanced capabilities.</p>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground">Yes, we offer a 30-day money-back guarantee for all paid plans.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
