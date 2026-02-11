import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AgentHub } from "@/components/AgentHub";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";

const Agents = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const planAccess = usePlanAccess(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-subtle">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} showHeader={false}>
      <div className="w-full min-h-screen bg-background">
        <div className="container-responsive mx-auto max-w-7xl py-8 sm:py-12 md:py-16 lg:py-20">
          {/* Hero Header */}
          <div className="mb-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-lg">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
                <Sparkles className="relative h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-none">
                  AI Agent Hub
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-2 font-medium">
                  Build, orchestrate, and monetize intelligent agents
                </p>
              </div>
            </div>
          </div>

          {/* Pro Upgrade Banner for Free Users */}
          {!planAccess.isLoading && planAccess.planType === 'free' && (
            <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/30 via-background/50 to-muted/20 backdrop-blur-sm">
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold tracking-tight">Unlock Full Agent Power</h3>
                      <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                        Free plan has limited features. Upgrade to Pro for unlimited agents, orchestration, advanced tools, and Agent Store access.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 shrink-0"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Agent Hub */}
          <div className="w-full">
            <AgentHub userId={user?.id || ""} planAccess={planAccess} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Agents;