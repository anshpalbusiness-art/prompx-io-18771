import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Network, GitBranch, Sparkles, Target, TrendingUp, 
  Brain, Zap, Share2, Link2, Eye, Lightbulb
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobalInsightsPanel } from "./GlobalInsightsPanel";

interface PromptNode {
  id: string;
  prompt_text: string;
  category: string;
  platform: string;
  keywords: string[];
  created_at: string;
}

interface Relationship {
  id: string;
  source_prompt_id: string;
  target_prompt_id: string;
  relationship_type: string;
  strength: number;
  metadata: any;
}

interface Topic {
  id: string;
  topic_name: string;
  description: string;
  prompt_count: number;
}

interface NetworkInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  confidence_score: number;
  actionable_suggestion: string;
  created_at: string;
}

const PromptKnowledgeGraph = ({ userId }: { userId: string }) => {
  const [nodes, setNodes] = useState<PromptNode[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [insights, setInsights] = useState<NetworkInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<PromptNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGraphData();
  }, [userId]);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      // Fetch nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('prompt_nodes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (nodesError) {
        console.error('Error fetching nodes:', nodesError);
        // Don't throw, just set empty array and continue
        setNodes([]);
      } else {
        setNodes(nodesData || []);
      }

      // Fetch relationships
      if (nodesData && nodesData.length > 0) {
        const nodeIds = nodesData.map(n => n.id);
        const { data: relsData, error: relsError } = await supabase
          .from('prompt_relationships')
          .select('*')
          .in('source_prompt_id', nodeIds);

        if (relsError) {
          console.error('Error fetching relationships:', relsError);
          setRelationships([]);
        } else {
          setRelationships(relsData || []);
        }
      }

      // Fetch topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('prompt_topics')
        .select('*')
        .eq('user_id', userId)
        .order('prompt_count', { ascending: false });

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        setTopics([]);
      } else {
        setTopics(topicsData || []);
      }

      // Fetch insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('prompt_network_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (insightsError) {
        console.error('Error fetching insights:', insightsError);
        setInsights([]);
      } else {
        setInsights(insightsData || []);
      }

    } catch (error) {
      console.error('Error fetching graph data:', error);
      // Don't show error toast, just log it
      setNodes([]);
      setRelationships([]);
      setTopics([]);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'derived_from': return <GitBranch className="w-4 h-4" />;
      case 'similar_to': return <Link2 className="w-4 h-4" />;
      case 'inspired_by': return <Sparkles className="w-4 h-4" />;
      case 'prerequisite_for': return <Target className="w-4 h-4" />;
      case 'alternative_to': return <Share2 className="w-4 h-4" />;
      default: return <Network className="w-4 h-4" />;
    }
  };

  const getRelatedPrompts = (nodeId: string) => {
    const related = relationships.filter(
      r => r.source_prompt_id === nodeId || r.target_prompt_id === nodeId
    );
    return related.map(r => {
      const relatedId = r.source_prompt_id === nodeId ? r.target_prompt_id : r.source_prompt_id;
      return {
        ...nodes.find(n => n.id === relatedId),
        relationship: r
      };
    }).filter(r => r.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse-subtle">
          <Brain className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Intelligence Cloud - Shared Community Insights */}
      <GlobalInsightsPanel />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Network className="w-8 h-8 text-primary" />
            Your Personal Knowledge Graph
          </h2>
          <p className="text-muted-foreground mt-1">
            Semantic connections between your prompts
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{nodes.length}</div>
            <div className="text-xs text-muted-foreground">Prompts</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{relationships.length}</div>
            <div className="text-xs text-muted-foreground">Connections</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{topics.length}</div>
            <div className="text-xs text-muted-foreground">Topics</div>
          </Card>
        </div>
      </div>

      {nodes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No prompt data yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Use the Optimization Lab to create and optimize prompts. Your prompt network will grow as you use the platform.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="graph" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="graph">
              <Network className="w-4 h-4 mr-2" />
              Graph View
            </TabsTrigger>
            <TabsTrigger value="topics">
              <Target className="w-4 h-4 mr-2" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="relationships">
              <GitBranch className="w-4 h-4 mr-2" />
              Relationships
            </TabsTrigger>
          </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Nodes List */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Nodes</CardTitle>
                <CardDescription>Click to view connections</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedNode?.id === node.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <p className="text-sm font-medium line-clamp-2">
                          {node.prompt_text}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {node.category && (
                            <Badge variant="secondary" className="text-xs">
                              {node.category}
                            </Badge>
                          )}
                          {node.keywords?.slice(0, 2).map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Connections View */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedNode ? 'Connected Prompts' : 'Select a Node'}
                </CardTitle>
                <CardDescription>
                  {selectedNode 
                    ? `Exploring relationships for selected prompt`
                    : 'Click a prompt to view its connections'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {getRelatedPrompts(selectedNode.id).map((related: any) => (
                        <div
                          key={related.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {getRelationshipIcon(related.relationship.relationship_type)}
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-2">
                                {related.relationship.relationship_type.replace('_', ' ')}
                              </Badge>
                              <p className="text-sm line-clamp-3">
                                {related.prompt_text}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${related.relationship.strength * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(related.relationship.strength * 100)}% match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Select a prompt to view connections</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {topic.topic_name}
                  </CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{topic.prompt_count}</div>
                  <div className="text-sm text-muted-foreground">prompts</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    {insight.title}
                  </CardTitle>
                  <Badge variant={insight.confidence_score > 0.7 ? 'default' : 'secondary'}>
                    {Math.round(insight.confidence_score * 100)}% confidence
                  </Badge>
                </div>
                <CardDescription>{insight.insight_type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{insight.description}</p>
                {insight.actionable_suggestion && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Action Suggestion</p>
                        <p className="text-sm text-muted-foreground">
                          {insight.actionable_suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Types</CardTitle>
              <CardDescription>
                Distribution of connections in your prompt network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['derived_from', 'similar_to', 'inspired_by', 'prerequisite_for', 'alternative_to'].map((type) => {
                  const count = relationships.filter(r => r.relationship_type === type).length;
                  const percentage = relationships.length > 0 
                    ? (count / relationships.length) * 100 
                    : 0;

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRelationshipIcon(type)}
                          <span className="text-sm font-medium capitalize">
                            {type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};

export default PromptKnowledgeGraph;
