import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PromptMarketplace } from "@/components/PromptMarketplace";
import LegalPromptPacks from "@/components/LegalPromptPacks";
import { IndustryTemplates } from "@/components/IndustryTemplates";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Marketplace = () => {
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
    <Layout user={user} showHeader={false}>
      <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container-responsive mx-auto max-w-6xl py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 space-y-2 sm:space-y-3 md:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Prompt Marketplace
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Discover, share, and purchase professional prompt templates and industry-specific packs
            </p>
          </div>
          <Tabs defaultValue="marketplace" className="w-full space-y-6 sm:space-y-8 md:space-y-10">
            <div className="flex justify-center overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex h-11 sm:h-12 md:h-14 items-center justify-center rounded-xl bg-muted/50 p-1.5 text-muted-foreground backdrop-blur-sm border border-border/50 shadow-lg">
                <TabsTrigger value="marketplace" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">Marketplace</TabsTrigger>
                <TabsTrigger value="templates" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">Templates</TabsTrigger>
                <TabsTrigger value="legal" className="px-3 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap">Legal Packs</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="marketplace" className="mt-0 space-y-6">
              <PromptMarketplace user={user} />
            </TabsContent>
            <TabsContent value="templates" className="mt-0 space-y-6">
              <IndustryTemplates onTemplateSelect={(template) => console.log(template)} />
            </TabsContent>
            <TabsContent value="legal" className="mt-0 space-y-6">
              <LegalPromptPacks />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Marketplace;
