import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { validateEmail, validatePassword, validateUsername } from "@/utils/validation";
import { handleSupabaseError, showErrorToast } from "@/utils/errorHandling";
import { Mail } from "lucide-react";
import Starfield from "@/components/Starfield";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const sendOTP = async (email: string) => {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otpCode);

    try {
      const { error } = await supabase.functions.invoke('send-otp-email', {
        body: { email, otp: otpCode }
      });

      if (error) throw error;

      toast({
        title: "Verification code sent",
        description: `Check your email and console for the code (${otpCode})`,
      });
    } catch (error: any) {
      console.error("OTP Error:", error);
      toast({
        title: "Info",
        description: `For demo: Your code is ${otpCode}`,
      });
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs using our validation utilities
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);
      const usernameValidation = validateUsername(username);

      const errors = [
        ...emailValidation.errors,
        ...passwordValidation.errors,
        ...usernameValidation.errors
      ];

      if (errors.length > 0) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive",
        });
        return;
      }

      // Store signup data for later
      setPendingSignupData({
        email,
        password,
        username,
      });

      // Send OTP
      await sendOTP(email);
      setShowOTPVerification(true);
    } catch (error: any) {
      const appError = handleSupabaseError(error);
      showErrorToast(appError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp !== generatedOTP) {
      toast({
        title: "Invalid code",
        description: "Please check the verification code and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Sign up with email_confirm disabled — our OTP already verified the email
      const { data, error } = await supabase.auth.signUp({
        email: pendingSignupData.email,
        password: pendingSignupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            username: pendingSignupData.username,
            email_verified: true,
          },
        },
      });

      if (error) throw error;

      // If the user was created but email is not confirmed,
      // try to sign them in immediately (works when Supabase
      // "Confirm email" is disabled or auto-confirm is on)
      if (data?.user && !data.session) {
        // Attempt auto sign-in — this will work if email confirmation
        // is disabled in Supabase Auth settings
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingSignupData.email,
          password: pendingSignupData.password,
        });

        if (signInError) {
          // If sign-in fails due to "Email not confirmed", show a helpful message
          if (signInError.message?.includes('Email not confirmed')) {
            toast({
              title: "Account created!",
              description: "Please check your email for a confirmation link from Supabase, then sign in.",
            });
          } else {
            throw signInError;
          }
        }
      } else {
        // Session was returned — user is auto-signed-in
        toast({
          title: "Welcome! 🎉",
          description: "Your account has been created and you're signed in.",
        });
      }

      // Reset states
      setShowOTPVerification(false);
      setOtp("");
      setPendingSignupData(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs using our validation utilities
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);

      const errors = [
        ...emailValidation.errors,
        ...passwordValidation.errors
      ];

      if (errors.length > 0) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Better error messages
        if (error.message?.includes('Email not confirmed')) {
          toast({
            title: "Email Not Verified",
            description: "Check your inbox for a confirmation email from Supabase. Click the link to verify, then sign in again.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Invalid login credentials')) {
          toast({
            title: "Invalid Credentials",
            description: "Wrong email or password. Double-check and try again.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
    } catch (error: any) {
      const appError = handleSupabaseError(error);
      showErrorToast(appError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4 sm:p-6">
      {/* Background layers container */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Starfield - deepest layer */}
        <Starfield speed={0.5} density={1.5} className="z-0" />

        {/* PromptX text - middle layer with animation */}
        <div className="absolute inset-0 z-10 flex items-center justify-center select-none">
          <div
            className="text-[clamp(5rem,20vw,24vw)] sm:text-[clamp(8rem,20vw,26vw)] font-extrabold whitespace-nowrap tracking-[-0.05em] animate-pulse-subtle bg-gradient-to-br from-foreground/[0.12] via-foreground/[0.20] to-foreground/[0.12] bg-clip-text text-transparent"
          >
            PromptX
          </div>
        </div>
      </div>

      {/* Enhanced animated gradient orbs with glow */}
      <div className="absolute top-0 -left-48 -z-10 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" />
      <div className="absolute bottom-0 -right-48 -z-10 w-96 h-96 bg-gradient-to-tl from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse-subtle pointer-events-none" style={{ animationDelay: '0.5s' }} />

      {/* Enhanced grid pattern with shimmer effect */}
      <div
        className="absolute inset-0 -z-20 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />


      {/* Container for tagline and card */}
      <div className="flex flex-col items-center w-full max-w-md relative z-20">
        {/* Tagline */}
        <p className="text-sm sm:text-base font-bold tracking-[0.3em] uppercase mb-6 bg-gradient-to-r from-slate-900 via-blue-500 to-slate-900 dark:from-slate-500 dark:via-white dark:to-slate-500 bg-clip-text text-transparent text-center animate-text-shimmer bg-[length:200%_auto]">
          UNIVERSE IS YOURS
        </p>

        {/* Premium card with enhanced glassmorphism */}
        <Card className="w-full border border-border bg-card/95 backdrop-blur-3xl shadow-elegant animate-scale-in overflow-hidden group">
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          </div>

          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent pointer-events-none" />

          <CardHeader className="space-y-3 sm:space-y-4 pb-8 px-6 sm:px-8 pt-10 relative z-10">
            <div className="space-y-3">
              <CardTitle className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
                Welcome to <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">PromptX</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base leading-relaxed font-light">
                Sign in to continue your journey
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 pb-10">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border p-1 h-11 rounded-lg mb-8">
                <TabsTrigger
                  value="signin"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground transition-colors duration-200 text-sm font-medium rounded-md"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground transition-colors duration-200 text-sm font-medium rounded-md"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-0 space-y-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="signin-email" className="text-foreground text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-13 text-base transition-all duration-300 hover:border-border/80 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="signin-password" className="text-foreground text-sm font-semibold">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-13 text-base transition-all duration-300 hover:border-border/80 rounded-lg"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-13 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 text-base mt-8 rounded-lg hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-13 bg-muted/50 border-border text-foreground hover:bg-muted hover:border-border/80 font-medium transition-all duration-300 rounded-lg"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-6">
                {!showOTPVerification ? (
                  <form onSubmit={handleRequestOTP} className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="signup-username" className="text-foreground text-sm font-semibold">
                        Username
                      </Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="johndoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-13 text-base transition-all duration-300 hover:border-border/80 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="signup-email" className="text-foreground text-sm font-semibold">
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-13 text-base transition-all duration-300 hover:border-border/80 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="signup-password" className="text-foreground text-sm font-semibold">
                        Password
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-13 text-base transition-all duration-300 hover:border-border/80 rounded-lg"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-13 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 text-base mt-8 rounded-lg hover:scale-[1.02] active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Sending code...
                        </span>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-semibold text-foreground">Verify Your Email</h3>
                      <p className="text-muted-foreground text-sm">
                        Enter the 6-digit code sent to {email}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                          <InputOTPSlot index={1} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                          <InputOTPSlot index={2} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                          <InputOTPSlot index={3} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                          <InputOTPSlot index={4} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                          <InputOTPSlot index={5} className="w-12 h-12 bg-muted/50 border-border text-foreground text-lg" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={handleVerifyOTP}
                        className="w-full h-13 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 text-base rounded-lg hover:scale-[1.02] active:scale-[0.98]"
                        disabled={loading || otp.length !== 6}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Verify & Create Account"
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowOTPVerification(false);
                          setOtp("");
                        }}
                        className="w-full text-muted-foreground hover:text-foreground"
                      >
                        Back to sign up
                      </Button>
                    </div>
                  </div>
                )}

                {!showOTPVerification && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      className="w-full h-13 bg-muted/50 border-border text-foreground hover:bg-muted hover:border-border/80 font-medium transition-all duration-300 rounded-lg"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign up with Google
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
