import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { IntelligentInsights } from "@/components/IntelligentInsights";
import { AutomationDashboard } from "@/components/AutomationDashboard";
import { PersonalizationHub } from "@/components/PersonalizationHub";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container-responsive mx-auto max-w-6xl py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.15] pb-1">
              Analytics Dashboard
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Track your prompt performance with AI-powered insights and predictive analytics
            </p>
          </div>
          
          {/* Intelligent Insights Section */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-14">
            <IntelligentInsights />
          </div>

          {/* Personalization Hub */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-14">
            <PersonalizationHub user={user} />
          </div>

          {/* Automation & Intelligence Dashboard */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-14">
            <AutomationDashboard user={user} />
          </div>

          {/* Traditional Analytics Dashboard */}
          <div className="w-full">
            <AnalyticsDashboard user={user} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
