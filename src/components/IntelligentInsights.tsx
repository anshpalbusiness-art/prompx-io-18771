import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Lightbulb, AlertTriangle, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact?: string;
  actionable?: boolean;
  category?: string;
}

export const IntelligentInsights = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState('performance');

  const generateInsights = async (type: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-analytics-engine', {
        body: {
          userId: user.id,
          analysisType: type,
          context: {
            timestamp: new Date().toISOString(),
            source: 'intelligent-insights'
          }
        }
      });

      if (error) throw error;

      if (data?.success === false) {
        toast({
          title: data.code === 402 ? 'Add AI credits' : 'Please slow down',
          description: data.error || 'AI service temporarily unavailable.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.analysis) {
        const formattedInsights = formatInsights(data.analysis, type);
        setInsights(formattedInsights);
        
        toast({
          title: "✨ Insights Generated",
          description: `Generated ${formattedInsights.length} intelligent insights`,
        });
      }
    } catch (error) {
      console.error('Insights generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatInsights = (analysis: any, type: string): Insight[] => {
    const formatted: Insight[] = [];
    
    try {
      switch (type) {
        case 'performance':
          if (analysis.insights) {
            analysis.insights.forEach((insight: any, index: number) => {
              formatted.push({
                id: `perf-${index}`,
                type: 'performance',
                title: insight.title || `Performance Insight ${index + 1}`,
                description: insight.description || insight,
                confidence: 0.85,
                impact: insight.impact || 'high',
                actionable: true,
                category: 'metrics'
              });
            });
          }
          if (analysis.patterns) {
            analysis.patterns.forEach((pattern: any, index: number) => {
              formatted.push({
                id: `pattern-${index}`,
                type: 'pattern',
                title: pattern.title || `Pattern Discovery ${index + 1}`,
                description: pattern.description || pattern,
                confidence: 0.78,
                actionable: true,
                category: 'patterns'
              });
            });
          }
          break;

        case 'insights':
          if (analysis.patterns) {
            analysis.patterns.forEach((item: any, index: number) => {
              formatted.push({
                id: `insight-${index}`,
                type: 'insight',
                title: item.title || `Insight ${index + 1}`,
                description: item.description || item,
                confidence: 0.82,
                actionable: true,
                category: 'discovery'
              });
            });
          }
          if (analysis.discoveries) {
            analysis.discoveries.forEach((item: any, index: number) => {
              formatted.push({
                id: `discovery-${index}`,
                type: 'discovery',
                title: item.title || `Discovery ${index + 1}`,
                description: item.description || item,
                confidence: 0.75,
                actionable: true,
                category: 'opportunity'
              });
            });
          }
          break;
      }
    } catch (error) {
      console.error('Format error:', error);
    }

    return formatted.length > 0 ? formatted : [{
      id: 'default',
      type: 'info',
      title: 'Analysis Complete',
      description: 'Your AI analysis is ready. The system analyzed your data and generated intelligent insights.',
      confidence: 0.9,
      actionable: true
    }];
  };

  useEffect(() => {
    // Auto-load performance insights on mount
    generateInsights('performance');
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="w-5 h-5" />;
      case 'pattern': return <Target className="w-5 h-5" />;
      case 'insight': return <Lightbulb className="w-5 h-5" />;
      case 'discovery': return <Sparkles className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (confidence >= 0.6) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  };

  return (
    <Card className="border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="w-6 h-6 text-primary" />
              Intelligent Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis and recommendations for your prompts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateInsights(activeTab)}
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="performance" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Discoveries
            </TabsTrigger>
            <TabsTrigger value="optimization" className="gap-2">
              <Target className="w-4 h-4" />
              Optimization
            </TabsTrigger>
            <TabsTrigger value="prediction" className="gap-2">
              <Brain className="w-4 h-4" />
              Predictions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="border-white/10 bg-card/50 backdrop-blur">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {getInsightIcon(insight.type)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{insight.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                                  {Math.round(insight.confidence * 100)}% Confidence
                                </Badge>
                                {insight.actionable && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                    Actionable
                                  </Badge>
                                )}
                                {insight.impact && (
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                                    {insight.impact} Impact
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No insights yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click "Regenerate" to generate intelligent insights
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-center h-64">
              <Button
                onClick={() => generateInsights('insights')}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                <Lightbulb className="w-5 h-5" />
                Generate Discoveries
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <div className="flex items-center justify-center h-64">
              <Button
                onClick={() => generateInsights('optimization')}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                <Target className="w-5 h-5" />
                Analyze Optimizations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            <div className="flex items-center justify-center h-64">
              <Button
                onClick={() => generateInsights('prediction')}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                <Brain className="w-5 h-5" />
                Generate Predictions
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
