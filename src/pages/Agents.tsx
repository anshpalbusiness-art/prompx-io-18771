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
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background pointer-events-none" />

        <div className="container-responsive mx-auto max-w-7xl py-12 sm:py-16 md:py-20 lg:py-24 relative z-10">
          {/* Compact Header for Dashboard Feel */}
          <div className="mb-6 flex items-center justify-between px-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                AI Agent Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1 ml-11">
                Manage your intelligent agents and CLI tools.
              </p>
            </div>

            {/* Compact Pro Banner */}
            {!planAccess.isLoading && planAccess.planType === 'free' && (
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                size="sm"
                className="gap-2 h-8 text-xs border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <Crown className="h-3.5 w-3.5" />
                Upgrade to Pro
              </Button>
            )}
          </div>

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