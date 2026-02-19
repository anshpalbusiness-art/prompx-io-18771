import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import ApiKeyManagement from "@/components/ApiKeyManagement";
import SDKDocumentation from "@/components/SDKDocumentation";
import { Code2, Plug, TrendingUp, Shield, Zap, Globe, Webhook, Activity, TestTube2, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { integrationRegistry } from "@/lib/integrations/registry";

export default function Integrations() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testPrompt, setTestPrompt] = useState("Write a professional email requesting a meeting");
  const [testModel, setTestModel] = useState("google/gemini-2.5-flash");
  const [testResponse, setTestResponse] = useState("");
  const [isTestingApi, setIsTestingApi] = useState(false);
  const { toast } = useToast();

  const { data: apiKeys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: activeIntegrations, refetch: refetchIntegrations } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("user_integrations").select("*");
      return data || [];
    },
  });

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SHOPIFY_CONNECTED') {
        const { accessToken, shop, scopes } = event.data.payload;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          await supabase.from('user_integrations').upsert({
            user_id: user.id,
            provider: 'shopify',
            access_token: accessToken,
            metadata: { shop, scopes, connected_at: new Date().toISOString() }
          }, { onConflict: 'user_id,provider' });

          toast({ title: "Shopify Connected", description: `Successfully connected to ${shop}` });
          refetchIntegrations();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = (providerId: string) => {
    if (providerId === 'shopify') {
      const shop = prompt("Enter your Shopify Store Domain (e.g. my-store.myshopify.com):");
      if (shop) {
        const width = 600, height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        // Use the proxy URL for auth
        const authUrl = `${import.meta.env.VITE_API_URL}/api/auth/shopify/connect?shop=${shop}`;
        window.open(authUrl, 'Connect Shopify', `width=${width},height=${height},top=${top},left=${left}`);
      }
    }
  };

  const handleTestApi = async () => {
    if (!apiKeys || apiKeys.length === 0) {
      toast({
        title: "No API Key",
        description: "Please create an API key first in the API Keys tab",
        variant: "destructive",
      });
      return;
    }

    setIsTestingApi(true);
    setTestResponse("");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk-generate-prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeys[0].api_key,
        },
        body: JSON.stringify({
          prompt: testPrompt,
          model: testModel,
          toolType: "general",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResponse(data.optimizedPrompt || "Success! Check the response in the console.");
        toast({
          title: "API Test Successful",
          description: "Your API integration is working correctly",
        });
      } else {
        throw new Error(data.error || "API request failed");
      }
    } catch (error: any) {
      toast({
        title: "API Test Failed",
        description: error.message,
        variant: "destructive",
      });
      setTestResponse(`Error: ${error.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid webhook URL",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Webhook Saved",
      description: "Your webhook URL has been configured",
    });
  };

  const useCases = [
    {
      icon: <Plug className="h-6 w-6" />,
      title: "SaaS Integration",
      description: "Embed prompt optimization into your product's AI features",
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: "Chatbot Enhancement",
      description: "Automatically optimize chatbot prompts for better responses",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "CRM Systems",
      description: "Generate personalized, compliant prompts at scale",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Marketing Tools",
      description: "Create high-converting copy with AI-optimized prompts",
    },
  ];

  return (
    <Layout user={user} showHeader={false}>
      <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Plug className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Integration API</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Plug our prompt optimization engine into your applications. Build on top of enterprise-grade PromptOps infrastructure.
          </p>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Production-ready API with authentication, rate limiting, and comprehensive monitoring. Currently in beta with free tier available.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <Card key={index} className="p-6 space-y-3 hover:shadow-lg transition-shadow">
              <div className="text-primary">{useCase.icon}</div>
              <h3 className="font-semibold text-lg">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground">{useCase.description}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="quickstart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="plugins">Plugins</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="usage">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="space-y-6">
            <SDKDocumentation />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeyManagement user={user} />
          </TabsContent>

          <TabsContent value="playground" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <TestTube2 className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">API Playground</h2>
                  <p className="text-sm text-muted-foreground">Test your API integration in real-time</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Model Selection</Label>
                    <Select value={testModel} onValueChange={setTestModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                        <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Test Prompt</Label>
                    <Textarea
                      placeholder="Enter your prompt to optimize..."
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      rows={8}
                    />
                  </div>

                  <Button
                    onClick={handleTestApi}
                    disabled={isTestingApi || !apiKeys || apiKeys.length === 0}
                    className="w-full"
                  >
                    {isTestingApi ? "Testing..." : "Test API Request"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Response</Label>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/30">
                      {testResponse ? (
                        <pre className="text-sm whitespace-pre-wrap">{testResponse}</pre>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Response will appear here after testing...
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>

              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  The playground uses your first API key. Make sure you have at least one active key.
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Webhook className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">Webhook Configuration</h2>
                  <p className="text-sm text-muted-foreground">Receive real-time notifications for API events</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://your-domain.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveWebhook}>Save Webhook</Button>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Available Events</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { event: "prompt.optimized", desc: "When a prompt is successfully optimized" },
                    { event: "api.rate_limit", desc: "When rate limit is reached" },
                    { event: "api.error", desc: "When an API error occurs" },
                    { event: "key.created", desc: "When a new API key is generated" },
                  ].map((item) => (
                    <Card key={item.event} className="p-3">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">{item.event}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Webhooks are signed with your API key. Verify the signature to ensure authenticity.
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">Request Logs</h2>
                  <p className="text-sm text-muted-foreground">Monitor your API activity in real-time</p>
                </div>
              </div>

              {apiKeys && apiKeys.length > 0 ? (
                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <div className="p-4 space-y-3">
                    {apiKeys.map((key) => (
                      <Card key={key.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{key.key_name}</Badge>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Total Requests: {key.requests_count || 0}
                            </p>
                            {key.last_used_at && (
                              <p className="text-xs text-muted-foreground">
                                Last used: {new Date(key.last_used_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Alert>
                  <AlertDescription>
                    No API keys found. Create an API key to start seeing logs.
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">Analytics & Usage</h2>
                  <p className="text-sm text-muted-foreground">Monitor your API performance and consumption</p>
                </div>
              </div>

              {apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{key.key_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{key.requests_count || 0}</div>
                          <p className="text-sm text-muted-foreground">Total Requests</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Rate Limit</p>
                          <p className="font-semibold">{key.rate_limit_per_hour || 100} req/hour</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <p className="font-semibold">{key.is_active ? "Active" : "Inactive"}</p>
                        </div>
                      </div>

                      {key.last_used_at && (
                        <p className="text-sm text-muted-foreground pt-2">
                          Last used: {new Date(key.last_used_at).toLocaleString()}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Create your first API key in the "API Keys" tab to start tracking usage.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Free Tier</h3>
                  <p className="text-sm text-muted-foreground">100 requests/hour</p>
                  <p className="text-sm text-muted-foreground">Basic support</p>
                </Card>
                <Card className="p-4 space-y-2 border-primary">
                  <h3 className="font-semibold">Pro Tier</h3>
                  <p className="text-sm text-muted-foreground">1,000 requests/hour</p>
                  <p className="text-sm text-muted-foreground">Priority support</p>
                </Card>
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold">Enterprise</h3>
                  <p className="text-sm text-muted-foreground">Custom limits</p>
                  <p className="text-sm text-muted-foreground">Dedicated support</p>
                </Card>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="plugins" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Plug className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">Workflow Plugins</h2>
                  <p className="text-sm text-muted-foreground">Manage active integration adapters for your AI agents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrationRegistry.getAllInfo().map((integration) => {
                  const dbIntegration = activeIntegrations?.find(i => i.provider === integration.id);
                  const isConnected = !!dbIntegration;

                  return (
                    <Card key={integration.id} className="p-4 space-y-3 hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: isConnected ? '#10b981' : '#e2e8f0' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{integration.icon}</span>
                          <h3 className="font-semibold">{integration.name}</h3>
                        </div>
                        {isConnected ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">Connected</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(integration.id)}
                            disabled={integration.id !== 'shopify'} // Only Shopify implemented for now
                          >
                            {integration.id === 'shopify' ? 'Connect' : 'Coming Soon'}
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground h-10 line-clamp-2">
                        {integration.description}
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize">{integration.category}</Badge>
                        {integration.requiresAuth && <span>• Requires Auth</span>}
                        {dbIntegration && <span className="text-green-600 ml-auto flex items-center gap-1">● Live</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
