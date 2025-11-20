import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Lock, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { validatePaymentForm, type PaymentFormData } from "@/utils/validation";
import { handleSupabaseError, showErrorToast } from "@/utils/errorHandling";
import { subscriptionApi, userApi } from "@/utils/apiHelpers";
import type { User } from "@supabase/supabase-js";

interface PaymentState {
  plan: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  const state = location.state as PaymentState;

  useEffect(() => {
    checkUser();
    if (!state) {
      navigate('/pricing');
    }
  }, [state, navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/auth');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('billing.')) {
      const billingField = field.split('.')[1];
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [billingField]: value
        }
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    if (!user || !state) return;

    // Validate payment form
    const validation = validatePaymentForm(paymentData as PaymentFormData);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate payment processing with validation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create subscription record using API helper
      const subscriptionData = {
        user_id: user.id,
        plan_type: state.plan,
        status: 'active',
        billing_cycle: state.billingCycle,
        amount: state.price,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + (state.billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
        payment_method: 'card',
        card_last_four: paymentData.cardNumber.slice(-4).replace(/\s/g, ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await subscriptionApi.upsertSubscription(subscriptionData);

      toast({
        title: "Payment Successful!",
        description: `You've successfully upgraded to the ${state.plan} plan.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      const appError = handleSupabaseError(error);
      showErrorToast(appError);
    } finally {
      setLoading(false);
    }
  };

  if (!state) {
    return null;
  }

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

  return (
    <Layout user={user}>
      <div className="min-h-screen bg-black py-16 relative overflow-hidden smooth-page">
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <div className="text-[30rem] font-black text-zinc-800/30 tracking-tighter leading-none">
            PrompX
          </div>
        </div>
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>
        
        <div className="responsive-container relative z-10">
          {/* Elegant Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-8 mb-8 sm:mb-12">
            <div className="order-2 sm:order-1">
              <Button
                variant="ghost"
                onClick={() => navigate('/pricing')}
                className="text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-500 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 smooth-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2 sm:mr-3" />
                Back to Pricing
              </Button>
            </div>
            <div className="text-left sm:text-right order-1 sm:order-2">
              <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide leading-tight">Complete Your Purchase</h1>
              <p className="text-zinc-500 mt-1 font-light text-sm sm:text-base">Secure checkout powered by PrompX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Order Summary */}
            <div className="order-2 lg:order-1 payment-card-enter">
              <Card className="bg-gradient-to-br from-black to-zinc-950 border border-white/[0.06] shadow-[0_20px_80px_rgba(255,255,255,0.03)] backdrop-blur-xl rounded-2xl overflow-hidden smooth-card">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <CardHeader className="pb-6 sm:pb-8 pt-6 sm:pt-8 px-4 sm:px-8 relative">
                  <CardTitle className="text-white flex items-center gap-3 sm:gap-4 text-xl sm:text-2xl font-light tracking-wide">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] flex items-center justify-center backdrop-blur-sm border border-white/[0.1]">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    Order Summary
                  </CardTitle>
                  <div className="h-px bg-gradient-to-r from-white/[0.1] via-white/[0.05] to-transparent mt-4 sm:mt-6" />
                </CardHeader>
                <CardContent className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-6 sm:space-y-8 relative">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 px-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <span className="text-zinc-300 font-light text-lg">Plan</span>
                      <Badge className="bg-gradient-to-r from-white to-zinc-100 text-black font-bold capitalize px-4 py-2 rounded-lg shadow-lg">
                        {state.plan}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-4 px-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <span className="text-zinc-300 font-light text-lg">Billing</span>
                      <span className="text-white font-medium capitalize text-lg">{state.billingCycle}</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                  
                  <div className="flex justify-between items-center py-6 px-6 bg-gradient-to-r from-white/[0.03] to-white/[0.01] rounded-xl border border-white/[0.06]">
                    <span className="text-white text-2xl font-light tracking-wide">Total</span>
                    <span className="text-white text-3xl font-light tracking-wider">${state.price}</span>
                  </div>
                
                  {/* Features */}
                  <div className="mt-8 p-8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-2xl border border-white/[0.06] backdrop-blur-sm">
                    <h3 className="text-white font-light text-xl mb-6 flex items-center gap-3 tracking-wide">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] flex items-center justify-center border border-white/[0.1]">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      What's included
                    </h3>
                    <ul className="space-y-4">
                      {planFeatures[state.plan as keyof typeof planFeatures]?.map((feature, index) => (
                        <li key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors duration-300">
                          <div className="w-5 h-5 rounded-full bg-white/[0.1] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-zinc-300 leading-relaxed font-light">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div className="order-1 lg:order-2 payment-form-enter">
              <Card className="bg-gradient-to-br from-black to-zinc-950 border border-white/[0.06] shadow-[0_20px_80px_rgba(255,255,255,0.03)] backdrop-blur-xl rounded-2xl overflow-hidden smooth-card">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <CardHeader className="pb-8 pt-8 px-8 relative">
                  <CardTitle className="text-white flex items-center gap-4 text-2xl font-light tracking-wide">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] flex items-center justify-center backdrop-blur-sm border border-white/[0.1]">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    Payment Information
                  </CardTitle>
                  <CardDescription className="text-zinc-400 mt-3 ml-16 font-light text-lg">
                    Your payment information is secure and encrypted
                  </CardDescription>
                  <div className="h-px bg-gradient-to-r from-white/[0.1] via-white/[0.05] to-transparent mt-6" />
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-10 relative">
                  {/* Card Information */}
                  <div className="space-y-8">
                    <h3 className="text-white font-light text-xl flex items-center gap-3 tracking-wide">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] flex items-center justify-center border border-white/[0.1]">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      Card Details
                    </h3>
                  
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="cardNumber" className="text-white font-light text-base sm:text-lg tracking-wide">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                          maxLength={19}
                          className="bg-gradient-to-r from-black/60 to-zinc-950/60 border border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/40 focus:bg-black/95 focus:shadow-[0_0_30px_rgba(255,255,255,0.3)] h-12 sm:h-14 text-base sm:text-lg rounded-xl backdrop-blur-sm smooth-input hover:border-white/20 hover:bg-black/70"
                        />
                      </div>
                  
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="expiryDate" className="text-white font-light text-base sm:text-lg tracking-wide">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={paymentData.expiryDate}
                          onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                          maxLength={5}
                          className="bg-gradient-to-r from-black/60 to-zinc-950/60 border border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/40 focus:bg-black/95 h-12 sm:h-14 text-base sm:text-lg rounded-xl backdrop-blur-sm smooth-input hover:border-white/20 hover:bg-black/70"
                        />
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="cvv" className="text-white font-light text-base sm:text-lg tracking-wide">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={paymentData.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          className="bg-gradient-to-r from-black/60 to-zinc-950/60 border border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/40 focus:bg-black/95 h-12 sm:h-14 text-base sm:text-lg rounded-xl backdrop-blur-sm smooth-input hover:border-white/20 hover:bg-black/70"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="cardholderName" className="text-white font-light text-base sm:text-lg tracking-wide">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        placeholder="John Doe"
                        value={paymentData.cardholderName}
                        onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                        className="bg-gradient-to-r from-black/60 to-zinc-950/60 border border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/40 focus:bg-black/95 h-12 sm:h-14 text-base sm:text-lg rounded-xl backdrop-blur-sm smooth-input hover:border-white/20 hover:bg-black/70"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/[0.08]" />

                {/* Billing Address */}
                <div className="space-y-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    Billing Address
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="street" className="text-white font-medium mb-2 block">Street Address</Label>
                      <Input
                        id="street"
                        placeholder="123 Main St"
                        value={paymentData.billingAddress.street}
                        onChange={(e) => handleInputChange('billing.street', e.target.value)}
                        className="bg-black/50 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/20 h-12"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-white font-medium mb-2 block">City</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          value={paymentData.billingAddress.city}
                          onChange={(e) => handleInputChange('billing.city', e.target.value)}
                          className="bg-black/50 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/20 h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-white font-medium mb-2 block">State</Label>
                        <Input
                          id="state"
                          placeholder="NY"
                          value={paymentData.billingAddress.state}
                          onChange={(e) => handleInputChange('billing.state', e.target.value)}
                          className="bg-black/50 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/20 h-12"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zipCode" className="text-white font-medium mb-2 block">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          placeholder="10001"
                          value={paymentData.billingAddress.zipCode}
                          onChange={(e) => handleInputChange('billing.zipCode', e.target.value)}
                          className="bg-black/50 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/20 h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country" className="text-white font-medium mb-2 block">Country</Label>
                        <Input
                          id="country"
                          placeholder="United States"
                          value={paymentData.billingAddress.country}
                          onChange={(e) => handleInputChange('billing.country', e.target.value)}
                          className="bg-black/50 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-white/20 h-12"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-6 pt-8">
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-white to-zinc-100 text-black hover:from-zinc-50 hover:to-white font-bold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.4)] rounded-xl text-lg smooth-button active:shadow-[0_2px_10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-3" />
                      Complete Payment - ${state.price}
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Lock className="w-3 h-3" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>
                
                <p className="text-xs text-zinc-500 text-center leading-relaxed">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
