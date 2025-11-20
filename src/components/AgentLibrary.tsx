import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Trash2, Edit, Play, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentBuilder from "./AgentBuilder";
import AgentChatEnhanced from "./AgentChatEnhanced";
import AgentTemplates from "./AgentTemplates";

interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  category: string;
  tags: string[];
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

interface AgentLibraryProps {
  userId: string;
  planAccess: any;
}

const AgentLibrary = ({ userId, planAccess }: AgentLibraryProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, [userId]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error Loading Agents",
        description: error instanceof Error ? error.message : "Failed to load agents. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('prompt_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error Deleting Agent",
        description: error instanceof Error ? error.message : "Failed to delete agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAgentSaved = () => {
    fetchAgents();
    setIsBuilderOpen(false);
    setEditingAgent(null);
    setActiveTab("templates");
  };

  const handleCreateAgent = () => {
    // Check if on free plan and already has agents
    if (planAccess.planType === 'free' && agents.length >= 2) {
      planAccess.showUpgradeMessage('Creating more than 2 AI agents');
      planAccess.redirectToPricing();
      return;
    }
    setEditingAgent(null);
    setActiveTab("templates");
    setIsBuilderOpen(true);
  };

  const handleTemplateSelect = (template: any) => {
    setEditingAgent({
      id: '', // New agent
      name: template.name,
      description: template.description,
      system_prompt: template.systemPrompt,
      category: template.category,
      tags: template.tags,
      is_public: false,
      usage_count: 0,
      created_at: new Date().toISOString()
    });
    setActiveTab("scratch"); // Switch to builder tab
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading your agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            My AI Agents
          </h2>
          <p className="text-muted-foreground mt-1">
            Build and manage your personal AI agent library
          </p>
        </div>
        <Dialog open={isBuilderOpen} onOpenChange={(open) => {
          setIsBuilderOpen(open);
          if (!open) {
            setActiveTab("templates"); // Reset to templates when closed
            setEditingAgent(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleCreateAgent}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAgent?.id ? 'Edit Agent' : 'Create Custom Agent'}
              </DialogTitle>
              <DialogDescription>
                {editingAgent?.id ? 'Modify your existing AI agent settings' : 'Choose a template or build your AI agent from scratch'}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">Start from Template</TabsTrigger>
                <TabsTrigger value="scratch">Build from Scratch</TabsTrigger>
              </TabsList>
              
              <TabsContent value="templates">
                <AgentTemplates onSelectTemplate={handleTemplateSelect} />
              </TabsContent>
              
              <TabsContent value="scratch">
                <AgentBuilder
                  userId={userId}
                  agent={editingAgent}
                  onSave={handleAgentSaved}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first AI agent to get started
            </p>
            <Button onClick={() => setIsBuilderOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Bot className="w-8 h-8 text-primary" />
                  <div className="flex gap-2">
                    {agent.is_public && (
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4">{agent.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{agent.category}</Badge>
                    {agent.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Used {agent.usage_count} times
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsChatOpen(true);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Use
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingAgent(agent);
                        setActiveTab("scratch");
                        setIsBuilderOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(agent.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedAgent?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <AgentChatEnhanced agent={selectedAgent} userId={userId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentLibrary;