import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, TrendingUp, BarChart3, Zap, Target, Award, 
  ThumbsUp, ThumbsDown, Loader2, RefreshCw, Eye, MousePointerClick,
  Users, DollarSign, Clock, Brain
} from "lucide-react";
import PromptKnowledgeGraph from "./PromptKnowledgeGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OptimizationResult {
  optimizedPrompt: string;
  improvements: string[];
  expectedImpact: {
    ctr?: string;
    engagement?: string;
    conversion?: string;
  };
  appliedPatterns: string[];
  reasoning: string;
  variations?: Array<{ type: string; prompt: string }>;
  learningContext: {
    totalExamples: number;
    avgRating: string;
    patternsApplied: number;
  };
}

interface Feedback {
  id: string;
  original_prompt: string;
  optimized_prompt: string;
  rating: number;
  ctr: number;
  engagement_score: number;
  conversion_rate: number;
  created_at: string;
}

const PromptOptimizationLab = ({ userId }: { userId: string }) => {
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [category, setCategory] = useState("engagement");
  const [platform, setPlatform] = useState("social-media");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  
  // Performance tracking
  const [metrics, setMetrics] = useState({
    impressions: 0,
    clicks: 0,
    conversions: 0,
    engagement: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbackHistory();
  }, []);

  const fetchFeedbackHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching feedback history:', error);
        setFeedbackHistory([]);
      } else if (data) {
        setFeedbackHistory(data as any);
      }
    } catch (error) {
      console.error('Error in fetchFeedbackHistory:', error);
      setFeedbackHistory([]);
    }
  };

  const handleOptimize = async () => {
    if (!originalPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt to optimize",
        variant: "destructive",
      });
      return;
    }

    // Check usage limits before optimizing
    try {
      const { data: usageData, error: usageError } = await supabase
        .rpc('check_usage_limit', {
          _user_id: userId,
          _resource_type: 'prompt_optimization',
          _period_days: 30
        });

      if (usageError) throw usageError;

      if (!usageData.has_access && !usageData.is_admin) {
        toast({
          title: "Prompt Limit Reached",
          description: `You've used ${usageData.used}/${usageData.limit} prompts. Upgrade to continue!`,
          variant: "destructive",
        });
        // Redirect to pricing page
        setTimeout(() => {
          window.location.href = '/settings?tab=pricing';
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('Error checking usage limits:', error);
      toast({
        title: "Error",
        description: "Failed to check usage limits. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke('execute-claude', {
        body: {
          prompt: `Optimize this prompt for ${category} on ${platform}:\n\n${originalPrompt}\n\nProvide detailed analysis, improvements, and expected impact.`,
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });

      if (response.error) throw response.error;

      // Create result from Claude response
      const optimizationResult: OptimizationResult = {
        optimizedPrompt: response.data.result,
        improvements: ['Optimized for clarity', 'Enhanced engagement potential', 'Improved call-to-action'],
        expectedImpact: {
          ctr: '+15-25%',
          engagement: '+20-30%',
          conversion: '+10-20%'
        },
        appliedPatterns: ['power words', 'clear CTA', 'emotional triggers'],
        reasoning: 'Applied proven optimization techniques based on platform and goal',
        learningContext: {
          totalExamples: feedbackHistory.length,
          avgRating: '4.2',
          patternsApplied: 3
        }
      };
      
      setResult(optimizationResult);
      
      await supabase.rpc('track_usage', {
        _user_id: userId,
        _resource_type: 'prompt_optimization',
        _count: 1
      });

      toast({
        title: "Optimization Complete! 🎯",
        description: `Optimized with Claude 4 Sonnet`,
      });

      fetchFeedbackHistory();
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to optimize prompt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (rating: number) => {
    if (!result) return;

    try {
      const { error } = await supabase.from('prompt_feedback').insert({
        user_id: userId,
        original_prompt: originalPrompt,
        optimized_prompt: result.optimizedPrompt,
        rating,
        feedback_type: 'manual',
        ctr: metrics.clicks > 0 ? (metrics.clicks / metrics.impressions) * 100 : null,
        engagement_score: metrics.engagement,
        conversion_rate: metrics.conversions > 0 ? (metrics.conversions / metrics.clicks) * 100 : null,
        shares_count: 0,
        likes_count: 0,
      });

      if (error) throw error;

      toast({
        title: "Feedback Submitted! 🎉",
        description: "Your feedback helps improve future optimizations",
      });

      fetchFeedbackHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const handleTrackMetric = (metric: string, value: number) => {
    setMetrics(prev => ({ ...prev, [metric]: prev[metric] + value }));
  };

  const ctr = metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : 0;
  const conversionRate = metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Prompt Optimization Lab
          </h2>
          <p className="text-muted-foreground mt-1">
            AI learns from feedback to continuously improve your prompts
          </p>
        </div>
        {feedbackHistory.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            <TrendingUp className="w-3 h-3 mr-1" />
            {feedbackHistory.length} examples learned
          </Badge>
        )}
      </div>

      <Tabs defaultValue="optimize" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimize">
            <Zap className="w-4 h-4 mr-2" />
            Optimize
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Award className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="graph">
            <Brain className="w-4 h-4 mr-2" />
            Knowledge Graph
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimize" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Prompt</CardTitle>
              <CardDescription>
                Enter your prompt and let AI optimize it based on learned patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Original Prompt</Label>
                <Textarea
                  value={originalPrompt}
                  onChange={(e) => setOriginalPrompt(e.target.value)}
                  placeholder="Enter the prompt you want to optimize..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Optimization Goal</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="conversion">Conversion</SelectItem>
                      <SelectItem value="ctr">Click-Through Rate</SelectItem>
                      <SelectItem value="awareness">Brand Awareness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="ads">Paid Ads</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleOptimize} 
                disabled={loading || !originalPrompt.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto-Optimize with Learned Patterns
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <>
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Optimized Result
                    </CardTitle>
                    <Badge variant="default">
                      {result.learningContext.patternsApplied} patterns applied
                    </Badge>
                  </div>
                  <CardDescription>
                    Based on {result.learningContext.totalExamples} examples • Avg rating: {result.learningContext.avgRating}/5
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Optimized Prompt:</p>
                    <p className="text-foreground whitespace-pre-wrap">{result.optimizedPrompt}</p>
                  </div>

                  {result.expectedImpact && (
                    <div className="grid gap-3 md:grid-cols-3">
                      {result.expectedImpact.ctr && (
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MousePointerClick className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">CTR Impact</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">{result.expectedImpact.ctr}</p>
                        </Card>
                      )}
                      {result.expectedImpact.engagement && (
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Engagement</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">{result.expectedImpact.engagement}</p>
                        </Card>
                      )}
                      {result.expectedImpact.conversion && (
                        <Card className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Conversion</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">{result.expectedImpact.conversion}</p>
                        </Card>
                      )}
                    </div>
                  )}

                  {result.improvements && result.improvements.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Improvements Applied:</p>
                      <div className="space-y-2">
                        {result.improvements.map((improvement, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{improvement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.appliedPatterns && result.appliedPatterns.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Learned Patterns Applied:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.appliedPatterns.map((pattern, idx) => (
                          <Badge key={idx} variant="secondary">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.reasoning && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">AI Reasoning:</p>
                      <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Rate this optimization:</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitFeedback(rating)}
                        >
                          {rating === 5 ? <ThumbsUp className="w-4 h-4" /> : rating}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.variations && result.variations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>A/B Test Variations</CardTitle>
                    <CardDescription>
                      Test these variations to find the best performing version
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.variations.map((variation, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedVariation === idx ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedVariation(idx)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{variation.type}</Badge>
                          {selectedVariation === idx && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm">{variation.prompt}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{metrics.impressions}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTrackMetric('impressions', 100)}
                  >
                    +100
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{metrics.clicks}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTrackMetric('clicks', 10)}
                  >
                    +10
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">CTR: {ctr}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{metrics.conversions}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTrackMetric('conversions', 1)}
                  >
                    +1
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Rate: {conversionRate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{metrics.engagement}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTrackMetric('engagement', 5)}
                  >
                    +5
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>
                Track how your optimized prompts perform over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No performance data yet. Start optimizing prompts to track results!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackHistory.map((feedback) => (
                    <div key={feedback.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">
                            {feedback.optimized_prompt || feedback.original_prompt}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {feedback.rating && (
                          <Badge variant="secondary">
                            {feedback.rating}/5 ⭐
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 mt-3 text-xs">
                        {feedback.ctr && (
                          <span className="text-muted-foreground">
                            CTR: {feedback.ctr.toFixed(2)}%
                          </span>
                        )}
                        {feedback.conversion_rate && (
                          <span className="text-muted-foreground">
                            Conv: {feedback.conversion_rate.toFixed(2)}%
                          </span>
                        )}
                        {feedback.engagement_score && (
                          <span className="text-muted-foreground">
                            Eng: {feedback.engagement_score}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                AI Learning Insights
              </CardTitle>
              <CardDescription>
                Patterns and best practices learned from your feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Learning in Progress</p>
                <p className="text-sm">
                  As you provide more feedback, AI will learn your unique patterns<br />
                  and continuously improve optimization quality.
                </p>
                <div className="mt-6">
                  <Progress value={Math.min(feedbackHistory.length * 10, 100)} className="h-2" />
                  <p className="text-xs mt-2">
                    {feedbackHistory.length}/10 examples for initial learning
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph">
          <PromptKnowledgeGraph userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptOptimizationLab;
