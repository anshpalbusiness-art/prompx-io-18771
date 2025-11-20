import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Sparkles, 
  Target, 
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Eye,
  Zap
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface PersonalizationHubProps {
  user: User;
}

export function PersonalizationHub({ user }: PersonalizationHubProps) {
  const [preferences, setPreferences] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [learnedPatterns, setLearnedPatterns] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPersonalizationData();
  }, [user]);

  const fetchPersonalizationData = async () => {
    setLoading(true);
    try {
      // Fetch preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setPreferences(prefs);

      // Fetch recommendations
      const { data: recs } = await supabase
        .from('personalized_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('relevance_score', { ascending: false })
        .limit(10);

      setRecommendations(recs || []);

      // Fetch learned patterns
      const { data: patterns } = await supabase
        .from('learned_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('success_rate', { ascending: false })
        .limit(5);

      setLearnedPatterns(patterns || []);

      // Fetch adaptive models
      const { data: modelData } = await supabase
        .from('adaptive_models')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setModels(modelData || []);

    } catch (error: any) {
      toast({
        title: "Error loading personalization data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('personalization-engine', {
        body: {
          userId: user.id,
          action: 'get_recommendations',
          context: {
            source: 'manual_request'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Recommendations Generated",
        description: `${data.count} personalized recommendations created.`,
      });

      fetchPersonalizationData();
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('adaptive-learning', {
        body: {
          userId: user.id,
          action: 'train_model',
          modelType: 'recommendation'
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Training requires more data",
          description: data.message,
          variant: "default",
        });
        return;
      }

      toast({
        title: "Model Trained Successfully",
        description: `Version ${data.model.model_version} with ${data.accuracy.toFixed(1)}% accuracy`,
      });

      fetchPersonalizationData();
    } catch (error: any) {
      toast({
        title: "Training failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          [field]: value
        });

      if (error) throw error;

      setPreferences({ ...preferences, [field]: value });

      toast({
        title: "Preferences updated",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyRecommendation = async (recId: string) => {
    try {
      await supabase
        .from('personalized_recommendations')
        .update({ is_applied: true })
        .eq('id', recId);

      setRecommendations(recommendations.filter(r => r.id !== recId));

      toast({
        title: "Recommendation applied",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const dismissRecommendation = async (recId: string) => {
    try {
      await supabase
        .from('personalized_recommendations')
        .update({ is_dismissed: true })
        .eq('id', recId);

      setRecommendations(recommendations.filter(r => r.id !== recId));

      toast({
        title: "Recommendation dismissed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Personalization Hub</h2>
        <p className="text-muted-foreground">AI-powered learning and adaptive recommendations</p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Personalization Settings
          </CardTitle>
          <CardDescription>Configure your AI learning preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Personalization</Label>
              <p className="text-xs text-muted-foreground">
                Allow AI to learn from your behavior and provide tailored recommendations
              </p>
            </div>
            <Switch 
              checked={preferences?.personalization_enabled ?? true}
              onCheckedChange={(checked) => updatePreferences('personalization_enabled', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select 
                value={preferences?.experience_level || 'intermediate'}
                onValueChange={(value) => updatePreferences('experience_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select 
                value={preferences?.industry || 'general'}
                onValueChange={(value) => updatePreferences('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Learning Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Learned Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{learnedPatterns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Success patterns identified
            </p>
            {learnedPatterns.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">
                    Avg {(learnedPatterns[0]?.success_rate * 100 || 0).toFixed(0)}% success
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Active Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI models trained
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={trainModel}
              disabled={loading}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Train New Model
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Personalized for you
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={generateRecommendations}
              disabled={loading}
            >
              <Sparkles className="h-3 w-3 mr-2" />
              Generate More
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="patterns">Learned Patterns</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Recommendations</CardTitle>
              <CardDescription>AI-generated suggestions based on your behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No recommendations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate personalized recommendations based on your usage
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-4"
                      onClick={generateRecommendations}
                      disabled={loading}
                    >
                      Generate Recommendations
                    </Button>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                            <Badge variant="secondary">
                              {(rec.relevance_score * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                          {rec.reason && (
                            <p className="text-xs text-muted-foreground mt-2">
                              <Target className="h-3 w-3 inline mr-1" />
                              {rec.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => applyRecommendation(rec.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-2" />
                          Apply
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => dismissRecommendation(rec.id)}
                        >
                          <XCircle className="h-3 w-3 mr-2" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learned Success Patterns</CardTitle>
              <CardDescription>AI-identified patterns from your successful prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {learnedPatterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No patterns learned yet. Keep using the platform to build your pattern library.
                  </p>
                ) : (
                  learnedPatterns.map((pattern) => (
                    <div key={pattern.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm capitalize">
                          {pattern.pattern_name.replace(/_/g, ' ')}
                        </h4>
                        <Badge variant={pattern.success_rate > 0.8 ? 'default' : 'secondary'}>
                          {(pattern.success_rate * 100).toFixed(0)}% success
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Used {pattern.usage_count} times</span>
                        <span>Confidence: {(pattern.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress 
                        value={pattern.success_rate * 100} 
                        className="h-2 mt-2"
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive AI Models</CardTitle>
              <CardDescription>Machine learning models trained on your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {models.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No models trained yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Train your first model to get personalized predictions
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-4"
                      onClick={trainModel}
                      disabled={loading}
                    >
                      Train Model
                    </Button>
                  </div>
                ) : (
                  models.map((model) => (
                    <div key={model.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold capitalize">{model.model_type} Model</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Version {model.model_version} • Trained on {model.training_samples} samples
                          </p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      
                      {model.accuracy_score && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span className="font-medium">{(model.accuracy_score * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={model.accuracy_score * 100} className="h-2" />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-3">
                        Last trained: {new Date(model.last_trained_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
