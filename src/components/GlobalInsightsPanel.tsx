import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, TrendingUp, Lightbulb, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface GlobalPattern {
  id: string;
  pattern_type: string;
  pattern_name: string;
  pattern_description: string;
  success_rate: number;
  usage_count: number;
  avg_improvement: number;
  category: string;
  platform: string;
  example_pattern: any;
}

interface GlobalInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  confidence_score: number;
  impact_score: number;
  category: string;
  platform: string;
}

interface GlobalTrend {
  id: string;
  topic_name: string;
  trend_direction: string;
  popularity_score: number;
  growth_rate: number;
  related_topics: string[];
  category: string;
  platform: string;
}

export const GlobalInsightsPanel = () => {
  const [patterns, setPatterns] = useState<GlobalPattern[]>([]);
  const [insights, setInsights] = useState<GlobalInsight[]>([]);
  const [trends, setTrends] = useState<GlobalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGlobalData = async () => {
    try {
      const [patternsRes, insightsRes, trendsRes] = await Promise.all([
        supabase.from('global_prompt_patterns').select('*').order('success_rate', { ascending: false }).limit(10),
        supabase.from('global_insights').select('*').order('confidence_score', { ascending: false }).limit(10),
        supabase.from('global_topic_trends').select('*').order('popularity_score', { ascending: false }).limit(10),
      ]);

      if (patternsRes.data) setPatterns(patternsRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
      if (trendsRes.data) setTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching global data:', error);
      toast.error('Failed to load global insights');
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('aggregate-global-insights');
      if (error) throw error;
      
      toast.success('Global insights refreshed successfully');
      await fetchGlobalData();
    } catch (error) {
      console.error('Error refreshing insights:', error);
      toast.error('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle>Prompt Intelligence Cloud</CardTitle>
          </div>
          <CardDescription>Loading global insights...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'best_practice': return <Lightbulb className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'opportunity': return <Sparkles className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'rising': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Prompt Intelligence Cloud</CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshInsights}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Insights'}
          </Button>
        </div>
        <CardDescription>
          Anonymized insights from successful prompts across the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patterns" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns">Patterns ({patterns.length})</TabsTrigger>
            <TabsTrigger value="insights">Insights ({insights.length})</TabsTrigger>
            <TabsTrigger value="trends">Trends ({trends.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4 mt-4">
            {patterns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No patterns available yet. Be the first to contribute!
              </p>
            ) : (
              patterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{pattern.pattern_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {pattern.pattern_description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{pattern.pattern_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <Badge variant="outline">{(pattern.success_rate * 100).toFixed(0)}%</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Used by:</span>
                        <Badge variant="outline">{pattern.usage_count} users</Badge>
                      </div>
                      {pattern.avg_improvement > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Improvement:</span>
                          <Badge variant="outline" className="text-green-600">
                            +{pattern.avg_improvement.toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Progress value={pattern.success_rate * 100} className="h-2" />
                    {pattern.category && pattern.platform && (
                      <div className="flex gap-2">
                        <Badge variant="outline">{pattern.category}</Badge>
                        <Badge variant="outline">{pattern.platform}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No insights available yet. Check back soon!
              </p>
            ) : (
              insights.map((insight) => (
                <Card key={insight.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        {getInsightIcon(insight.insight_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                          <Badge variant="secondary">{insight.insight_type}</Badge>
                        </div>
                        <CardDescription>{insight.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Confidence:</span>
                        <Badge variant="outline">{(insight.confidence_score * 100).toFixed(0)}%</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Impact:</span>
                        <Badge variant="outline">{(insight.impact_score * 100).toFixed(0)}%</Badge>
                      </div>
                    </div>
                    {insight.category && insight.platform && (
                      <div className="flex gap-2">
                        <Badge variant="outline">{insight.category}</Badge>
                        <Badge variant="outline">{insight.platform}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4 mt-4">
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No trends detected yet. Keep creating prompts!
              </p>
            ) : (
              trends.map((trend) => (
                <Card key={trend.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{trend.topic_name}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-2">
                          <TrendingUp className={`h-4 w-4 ${getTrendColor(trend.trend_direction)}`} />
                          <span className={getTrendColor(trend.trend_direction)}>
                            {trend.trend_direction}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{trend.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Popularity:</span>
                        <Badge variant="outline">{trend.popularity_score}/100</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Growth:</span>
                        <Badge variant="outline" className={trend.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}>
                          {trend.growth_rate > 0 ? '+' : ''}{trend.growth_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={trend.popularity_score} className="h-2" />
                    {trend.related_topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Related:</span>
                        {trend.related_topics.map((topic, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {trend.platform && (
                      <Badge variant="outline">{trend.platform}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
