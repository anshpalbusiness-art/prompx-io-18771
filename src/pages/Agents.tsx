import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AgentLibrary from "@/components/AgentLibrary";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

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
    <Layout user={user}>
      <div className="w-full min-h-screen bg-background">
        <div className="container-responsive mx-auto max-w-6xl py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-[1.15]">
              Custom Prompt Agents
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Create and manage specialized AI agents trained for specific tasks
            </p>
          </div>

          {!planAccess.isLoading && planAccess.planType === 'free' && (
            <Alert className="mb-6 border-primary/50 bg-primary/5">
              <Lock className="h-4 w-4" />
              <AlertTitle>Limited Access on Free Plan</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Free plan users have limited AI agent features. Upgrade to Pro for advanced workflows and unlimited agents.
                </span>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/pricing')}
                  className="ml-4"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="w-full">
            <AgentLibrary userId={user?.id || ""} planAccess={planAccess} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Agents;