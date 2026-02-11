import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/components/UserProfile";
import ApiKeyManagement from "@/components/ApiKeyManagement";
import ABTestingPanel from "@/components/ABTestingPanel";
import SDKDocumentation from "@/components/SDKDocumentation";
// Removed PricingPlans import - now redirects to main pricing page
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'pricing') {
      // Redirect to main pricing page
      navigate('/pricing');
      return;
    }
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams, navigate]);

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
      <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container-responsive mx-auto max-w-6xl py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Settings
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Manage your profile, API keys, SDK integration, and platform preferences
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 sm:space-y-8 md:space-y-10">
            <div className="flex justify-center overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex h-11 sm:h-12 md:h-14 items-center justify-center rounded-xl bg-muted/50 p-1.5 text-muted-foreground backdrop-blur-sm border border-border/50 shadow-lg">
                <TabsTrigger value="profile" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">Profile</TabsTrigger>
                <TabsTrigger value="apikeys" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">API Keys</TabsTrigger>
                <TabsTrigger value="sdk" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">SDK</TabsTrigger>
                <TabsTrigger value="abtesting" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">A/B Testing</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="profile" className="mt-0 space-y-6">
              <UserProfile userId={user?.id || ""} />
            </TabsContent>
            <TabsContent value="apikeys" className="mt-0 space-y-6">
              <ApiKeyManagement user={user} />
            </TabsContent>
            <TabsContent value="sdk" className="mt-0 space-y-6">
              <SDKDocumentation />
            </TabsContent>
            <TabsContent value="abtesting" className="mt-0 space-y-6">
              <ABTestingPanel user={user} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
