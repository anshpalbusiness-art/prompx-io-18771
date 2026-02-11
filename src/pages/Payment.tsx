import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, ExternalLink, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { getWhopProduct, getWhopCheckoutUrl, WHOP_CONFIG } from "@/utils/whop";
import type { User } from "@supabase/supabase-js";

interface PaymentState {
  plan: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const status = searchParams.get('status');
  const state = location.state as PaymentState;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    // If no state and no status parameter, redirect to pricing
    if (!state && !status) {
      navigate('/pricing');
      return;
    }
  }, [state, status, navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Allow viewing if just checking status, but generally authentication is needed
        if (!status) {
          navigate('/auth');
        }
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/auth');
    }
  };

  const handleWhopCheckout = () => {
    if (!user || !state) return;

    setLoading(true);

    // Get Whop product details
    const product = getWhopProduct(state.plan, state.billingCycle);

    if (!product || !product.id) {
      toast({
        title: "Configuration Error",
        description: "Payment system is not fully configured. Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Generate checkout URL
    const checkoutUrl = getWhopCheckoutUrl(product.id, user.id);

    // Redirect to Whop
    window.location.href = checkoutUrl;
  };

  const planFeatures = {
    pro: [
      'Unlimited prompts',
      'Advanced AI agents',
      'Priority support',
      'Team collaboration',
      'API access'
    ],
    premium: [
      'Everything in Pro',
      'Advanced AI models',
      'White-label solutions',
      'Dedicated support',
      'Custom integrations'
    ]
  };

  // Render Success State
  if (status === 'success') {
    return (
      <Layout user={user} showHeader={false}>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-zinc-950 border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white text-2xl">Payment Successful!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-zinc-400">
                Thank you for your purchase. Your subscription is now active and your account has been upgraded.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Go to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  // Render Cancel/Error State
  if (status === 'cancel') {
    return (
      <Layout user={user} showHeader={false}>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-zinc-950 border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-white text-2xl">Payment Cancelled</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-zinc-400">
                The payment process was cancelled or failed. No charges were made to your account.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                className="w-full text-white border-zinc-800 hover:bg-zinc-900"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="w-full text-zinc-400 hover:text-white"
              >
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  // Check if state is present before rendering main checkout (handled by useEffect, but safe guard)
  if (!state) return null;

  return (
    <Layout user={user} showHeader={false}>
      <div className="min-h-screen bg-black py-16 relative overflow-hidden smooth-page">
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <div className="text-[30rem] font-black text-zinc-800/30 tracking-tighter leading-none">
            PromptX
          </div>
        </div>

        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="responsive-container relative z-10 max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/pricing')}
                className="text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] rounded-xl px-4 py-2 smooth-button mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pricing
              </Button>
            </div>
            <div className="text-left sm:text-right">
              <h1 className="text-3xl font-light text-white tracking-wide">Checkout</h1>
              <p className="text-zinc-500 mt-1 font-light">Secure payment processing via Whop</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Order Summary */}
            <Card className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-6 border-b border-white/[0.05]">
                <CardTitle className="text-white flex items-center gap-3 text-xl font-light">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center border border-white/[0.05]">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-xl border border-white/[0.05]">
                  <span className="text-zinc-300">Plan</span>
                  <Badge className="bg-white text-black font-bold uppercase tracking-wide">
                    {state.plan}
                  </Badge>
                </div>
                <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-xl border border-white/[0.05]">
                  <span className="text-zinc-300">Billing Cycle</span>
                  <span className="text-white capitalize">{state.billingCycle}</span>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-white text-xl font-light">Total due today</span>
                  <span className="text-white text-3xl font-light tracking-wide">${state.price}</span>
                </div>

                <div className="mt-8 pt-8 border-t border-white/[0.05]">
                  <h3 className="text-white mb-4 font-medium flex items-center gap-2">
                    Included specific features:
                  </h3>
                  <ul className="space-y-3">
                    {planFeatures[state.plan as keyof typeof planFeatures]?.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Payment Action */}
            <div className="space-y-6">
              <Card className="bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-6 border-b border-white/[0.05]">
                  <CardTitle className="text-white flex items-center gap-3 text-xl font-light">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/[0.05]">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    Secure Payment
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    You will be redirected to Whop to complete your purchase securely.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-8 space-y-6">

                  {/* Whop Branding / Trust */}
                  <div className="flex items-center justify-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <div className="text-center">
                      <p className="text-zinc-400 text-sm mb-2">Powered by</p>
                      <span className="text-2xl font-bold text-white tracking-tight">Whop</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleWhopCheckout}
                    disabled={loading}
                    className="w-full h-14 bg-[#FF6243] hover:bg-[#E0553A] text-white font-bold shadow-lg shadow-orange-900/20 rounded-xl text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        Redirecting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Pay with Whop <ExternalLink className="w-4 h-4" />
                      </div>
                    )}
                  </Button>

                  <p className="text-xs text-zinc-500 text-center px-4">
                    By clicking above, you agree to be redirected to Whop for payment processing.
                    Your subscription will be activated automatically upon successful payment.
                  </p>
                </CardContent>
              </Card>

              {/* Security Badges */}
              <div className="flex justify-center gap-6 opacity-40 grayscale">
                {/* Placeholders for security logos if needed, simply text for now */}
                <span className="text-xs text-zinc-500 font-mono">SSL ENCRYPTED</span>
                <span className="text-xs text-zinc-500 font-mono">SECURE CHECKOUT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
