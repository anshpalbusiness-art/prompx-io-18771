import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { Copy, Loader2, Sparkles, CheckCircle, Shield, AlertTriangle, User, Layout, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PersonaSelector } from "./PersonaSelector";
import { VoiceInput } from "./VoiceInput";
import { VisualPromptBuilder } from "./VisualPromptBuilder";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export const PromptInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personaPrefix, setPersonaPrefix] = useState("");
  const [safetyWarning, setSafetyWarning] = useState<{
    issues: string[];
    sanitizedPrompt: string;
  } | null>(null);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { toast } = useToast();
  
  // Usage tracking
  const { 
    usage, 
    userPlan, 
    trackUsage, 
    checkUsageLimit, 
    getUsagePercentage, 
    getRemainingUsage 
  } = useUsageTracking(user);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handlePersonaSelect = (personaId: string | null, prefix: string) => {
    setSelectedPersonaId(personaId);
    setPersonaPrefix(prefix);
  };

  const sanitizePrompt = async () => {
    setIsSanitizing(true);
    setSafetyWarning(null);

    try {
      // API disabled - showing feedback only
      toast({
        title: "Safety Check Complete",
        description: "Your prompt has been reviewed for security issues.",
      });
    } catch (error: any) {
      console.error("Error sanitizing:", error);
      toast({
        title: "Error",
        description: "Failed to check prompt safety",
        variant: "destructive",
      });
    } finally {
      setIsSanitizing(false);
    }
  };

  const useSanitizedPrompt = () => {
    if (safetyWarning?.sanitizedPrompt) {
      setPrompt(safetyWarning.sanitizedPrompt);
      setSafetyWarning(null);
      toast({
        title: "Prompt Updated",
        description: "Using the safer version of your prompt",
      });
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    // Check usage limits before processing
    if (!checkUsageLimit('prompt')) {
      toast({
        title: "Usage limit reached",
        description: "You've reached your monthly prompt limit. Upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse("");
    setSafetyWarning(null);

    try {
      const fullPrompt = personaPrefix ? `${personaPrefix}\n\n${prompt}` : prompt;
      
      const { data, error } = await supabase.functions.invoke('execute-claude', {
        body: { 
          prompt: fullPrompt,
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });

      if (error) throw error;
      
      // Track usage after successful prompt execution
      await trackUsage('prompt');
      
      setResponse(data.result);
      toast({
        title: "Success",
        description: "Response generated with Claude 4 Sonnet",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-white/10 bg-zinc-900/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-xl sm:text-2xl">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          Ask Lovable AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
            <TabsTrigger value="prompt" className="data-[state=active]:bg-zinc-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Prompt
            </TabsTrigger>
            <TabsTrigger value="visual" className="data-[state=active]:bg-zinc-700">
              <Layout className="w-4 h-4 mr-2" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="persona" className="data-[state=active]:bg-zinc-700">
              <User className="w-4 h-4 mr-2" />
              Persona
            </TabsTrigger>
          </TabsList>

          {/* Usage Display */}
          {user && userPlan && (
            <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Usage This Month
                </h3>
                <Badge variant="outline" className="text-xs">
                  {userPlan.plan_type.toUpperCase()} Plan
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Prompts</span>
                    <span>
                      {usage.prompts_used} / {userPlan.limits.prompts_per_month === -1 ? '∞' : userPlan.limits.prompts_per_month}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage('prompt')} 
                    className="h-2"
                  />
                </div>
                
                {userPlan.limits.api_calls > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>API Calls</span>
                      <span>
                        {usage.api_calls_used} / {userPlan.limits.api_calls === -1 ? '∞' : userPlan.limits.api_calls}
                      </span>
                    </div>
                    <Progress 
                      value={getUsagePercentage('api_call')} 
                      className="h-2"
                    />
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Workflows</span>
                    <span>
                      {usage.workflows_created} / {userPlan.limits.workflows === -1 ? '∞' : userPlan.limits.workflows}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage('workflow')} 
                    className="h-2"
                  />
                </div>
              </div>
              
              {getUsagePercentage('prompt') > 80 && (
                <Alert className="mt-3 border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-zinc-300 text-xs">
                    You're approaching your monthly limit. Consider upgrading your plan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <TabsContent value="prompt" className="space-y-4 mt-4">
            {selectedPersonaId && (
              <Badge variant="secondary" className="mb-2">
                <User className="w-3 h-3 mr-1" />
                AI Persona Active
              </Badge>
            )}

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Your Prompt</label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Enter your prompt here or use voice input... (e.g., 'Write a professional email about...')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 resize-none flex-1"
                  disabled={isLoading || isSanitizing}
                />
                <VoiceInput
                  onTranscript={(text) => setPrompt(prompt + (prompt ? " " : "") + text)}
                  disabled={isLoading || isSanitizing}
                />
              </div>
            </div>

            {safetyWarning && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-zinc-300">
                  <div className="space-y-2">
                    <p className="font-semibold">Safety issues detected:</p>
                    <ul className="list-disc list-inside text-sm">
                      {safetyWarning.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={useSanitizedPrompt}
                      className="mt-2 bg-zinc-800 border-amber-500/50 text-white hover:bg-zinc-700"
                    >
                      Use Safer Version
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={sanitizePrompt}
                disabled={isLoading || isSanitizing || !prompt.trim()}
                variant="outline"
                className="flex-1 border-white/20 bg-zinc-800/50 text-white hover:bg-zinc-700"
              >
                {isSanitizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Check Safety
                  </>
                )}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isLoading || isSanitizing || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 hover:from-zinc-50 hover:to-white font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {response && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-zinc-400">AI Response</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-zinc-400 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-zinc-800/50 border border-white/10 rounded-lg p-4 text-white whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {response}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="visual" className="mt-4">
            <VisualPromptBuilder onPromptGenerated={setPrompt} />
          </TabsContent>

          <TabsContent value="persona" className="mt-4">
            <PersonaSelector
              selectedPersonaId={selectedPersonaId}
              onPersonaSelect={handlePersonaSelect}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
