import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PromptMarketplace } from "@/components/PromptMarketplace";
import { IndustryTemplates } from "@/components/IndustryTemplates";
import { AgentStore } from "@/components/AgentStore";
import { MyPublishings } from "@/components/MyPublishings";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Marketplace = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("marketplace");
  const [triggerPromptCreate, setTriggerPromptCreate] = useState(false);
  const [triggerWorkflowCreate, setTriggerWorkflowCreate] = useState(false);
  const [triggerCliCreate, setTriggerCliCreate] = useState(false);

  const handlePublish = (type: 'prompt' | 'workflow' | 'cli') => {
    if (type === 'prompt') {
      setActiveTab('marketplace');
      // Use setTimeout to ensure tab switch happens before triggering the modal, just in case
      setTimeout(() => setTriggerPromptCreate(true), 100);
    } else if (type === 'workflow') {
      setActiveTab('templates');
      setTimeout(() => setTriggerWorkflowCreate(true), 100);
    } else if (type === 'cli') {
      setActiveTab('cli');
      setTimeout(() => setTriggerCliCreate(true), 100);
    }
  };

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
      <div className="w-full min-h-screen bg-background relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse-subtle" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse-subtle delay-1000" />
        </div>

        <div className="container-responsive mx-auto max-w-7xl py-12 sm:py-16 md:py-24 relative z-10 px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent drop-shadow-sm">
              The AI Marketplace
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground/90 leading-relaxed font-medium">
              Discover, share, and deploy professional multi-agent prompts, automated workflows, and powerful CLI tools.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="inline-flex h-12 md:h-14 items-center justify-center rounded-full bg-black/40 dark:bg-black/60 p-1 text-muted-foreground backdrop-blur-xl border border-white/10 dark:border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50" />
                <TabsTrigger
                  value="marketplace"
                  className="relative z-10 px-6 sm:px-8 py-2 md:py-2.5 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:text-foreground"
                >
                  Prompt Marketplace
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="relative z-10 px-6 sm:px-8 py-2 md:py-2.5 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:text-foreground"
                >
                  Workflows
                </TabsTrigger>
                <TabsTrigger
                  value="cli"
                  className="relative z-10 px-6 sm:px-8 py-2 md:py-2.5 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:text-foreground"
                >
                  CLI Store
                </TabsTrigger>
                {user && (
                  <TabsTrigger
                    value="publishings"
                    className="relative z-10 px-6 sm:px-8 py-2 md:py-2.5 rounded-full text-sm sm:text-base font-semibold whitespace-nowrap transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:text-foreground"
                  >
                    Your Publishings
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="mt-8 transition-all duration-500 ease-in-out">
              <TabsContent value="marketplace" className="m-0 border-none outline-none focus-visible:ring-0">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <PromptMarketplace
                    user={user}
                    triggerCreate={triggerPromptCreate}
                    onTriggerHandled={() => setTriggerPromptCreate(false)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="templates" className="m-0 border-none outline-none focus-visible:ring-0">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <IndustryTemplates
                    userId={user?.id}
                    onTemplateSelect={(template) => console.log(template)}
                    triggerCreate={triggerWorkflowCreate}
                    onTriggerHandled={() => setTriggerWorkflowCreate(false)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="cli" className="m-0 border-none outline-none focus-visible:ring-0">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                  <AgentStore
                    userId={user?.id}
                    triggerCreate={triggerCliCreate}
                    onTriggerHandled={() => setTriggerCliCreate(false)}
                  />
                </div>
              </TabsContent>
              {user && (
                <TabsContent value="publishings" className="m-0 border-none outline-none focus-visible:ring-0">
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left mt-8 max-w-7xl mx-auto">
                    <MyPublishings user={user} onPublish={handlePublish} />
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Marketplace;
