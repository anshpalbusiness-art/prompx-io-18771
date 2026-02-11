import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Bot, Store, BarChart3, Brain, Wrench, GitBranch,
    Plus, Search, Grid3X3, List, Sparkles, Monitor
} from "lucide-react";
import { Agent, AgentCard } from "./AgentCard";
import { AgentStore } from "./AgentStore";
import { AgentMetrics } from "./AgentMetrics";
import { AgentMemory } from "./AgentMemory";
import { AgentTools } from "./AgentTools";
import { AgentOrchestrator } from "./AgentOrchestrator";
import { AgentChatModal } from "./AgentChatModal";
import AgentBuilder from "./AgentBuilder";
import AgentTemplates from "./AgentTemplates";
import { DesktopAppDownload } from "./DesktopAppDownload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AgentHubProps {
    userId: string;
    planAccess?: {
        planType: string;
        isLoading: boolean;
    };
}

export const AgentHub = ({ userId, planAccess }: AgentHubProps) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState("my-agents");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [chatAgent, setChatAgent] = useState<Agent | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Fetch user's agents
    const fetchAgents = async () => {
        try {
            const { data, error } = await supabase
                .from('prompt_agents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Add mock metrics data for demo
            const agentsWithMetrics = (data || []).map(agent => ({
                ...agent,
                executions: Math.floor(Math.random() * 1000),
                avg_response_time: Math.random() * 3000 + 500,
                total_tokens: Math.floor(Math.random() * 500000),
                quality_score: Math.floor(Math.random() * 20) + 80,
            }));

            setAgents(agentsWithMetrics);
        } catch (error) {
            console.error('Error fetching agents:', error);
            toast({
                title: "Error",
                description: "Failed to load agents",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchAgents();
        }
    }, [userId]);

    const handleAgentSave = () => {
        setIsCreateOpen(false);
        setEditingAgent(null);
        setShowTemplates(false);
        fetchAgents();
    };

    const handleEditAgent = (agent: Agent) => {
        setEditingAgent(agent);
        setIsCreateOpen(true);
    };

    const handleDeleteAgent = async (agent: Agent) => {
        try {
            const { error } = await supabase
                .from('prompt_agents')
                .delete()
                .eq('id', agent.id);

            if (error) throw error;

            toast({
                title: "Agent Deleted",
                description: `${agent.name} has been removed.`,
            });
            fetchAgents();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete agent",
                variant: "destructive",
            });
        }
    };

    const handleDuplicateAgent = async (agent: Agent) => {
        try {
            const { id, created_at, ...agentData } = agent;
            const { error } = await supabase
                .from('prompt_agents')
                .insert([{
                    ...agentData,
                    name: `${agent.name} (Copy)`,
                    user_id: userId,
                }]);

            if (error) throw error;

            toast({
                title: "Agent Duplicated",
                description: `Copy of ${agent.name} created.`,
            });
            fetchAgents();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to duplicate agent",
                variant: "destructive",
            });
        }
    };

    const handleChatWithAgent = (agent: Agent) => {
        // Open inline chat modal
        setChatAgent(agent);
    };

    const handleTemplateSelect = (template: any) => {
        setEditingAgent({
            id: '',
            name: template.name,
            description: template.description,
            system_prompt: template.systemPrompt,
            category: template.category,
            model: template.model,
            tags: template.tags,
            user_id: userId,
            created_at: '',
        });
        setShowTemplates(false);
    };

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const isPro = planAccess?.planType === 'pro' || planAccess?.planType === 'enterprise';

    return (
        <div className="space-y-6">
            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <TabsList className="bg-transparent border-b border-border/50 p-0 h-auto rounded-none w-full sm:w-auto flex-wrap justify-start">
                        <TabsTrigger
                            value="my-agents"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <Bot className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">My Agents</span>
                            <span className="sm:hidden font-medium">Agents</span>
                            <Badge variant="secondary" className="ml-1.5 text-xs font-semibold px-2">{agents.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="store"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <Store className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Agent Store</span>
                            <span className="sm:hidden font-medium">Store</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="orchestration"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <GitBranch className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Orchestration</span>
                            <span className="sm:hidden font-medium">Chain</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="metrics"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Metrics</span>
                            <span className="sm:hidden font-medium">Stats</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="memory"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <Brain className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Memory</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="tools"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <Wrench className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Tools</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="desktop"
                            className="gap-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-4 py-3 transition-all duration-300"
                        >
                            <Monitor className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Desktop App</span>
                            <span className="sm:hidden font-medium">Desktop</span>
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'my-agents' && (
                        <Dialog open={isCreateOpen} onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (!open) {
                                setEditingAgent(null);
                                setShowTemplates(false);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2.5 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-6">
                                    <Plus className="h-4 w-4" />
                                    Create Agent
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingAgent?.id ? 'Edit Agent' : showTemplates ? 'Choose Template' : 'Create New Agent'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {showTemplates
                                            ? 'Start with a pre-built template or create from scratch'
                                            : 'Define your agent\'s capabilities and behavior'
                                        }
                                    </DialogDescription>
                                </DialogHeader>

                                {!editingAgent?.id && !showTemplates && (
                                    <div className="flex gap-2 mb-4">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2"
                                            onClick={() => setShowTemplates(true)}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Use Template
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2"
                                            onClick={() => setEditingAgent({ id: '', name: '', description: '', system_prompt: '', category: 'Writing', user_id: userId, created_at: '' })}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Start Fresh
                                        </Button>
                                    </div>
                                )}

                                {showTemplates ? (
                                    <AgentTemplates onSelectTemplate={handleTemplateSelect} />
                                ) : editingAgent ? (
                                    <AgentBuilder
                                        userId={userId}
                                        agent={editingAgent}
                                        onSave={handleAgentSave}
                                    />
                                ) : null}
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* My Agents Tab */}
                <TabsContent value="my-agents" className="mt-0">
                    <div className="space-y-6">
                        {/* Search and View Toggle */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search your agents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 h-11 bg-muted/30 border-border/50 focus:border-primary/50 transition-all duration-300"
                                />
                            </div>
                            <div className="flex gap-2 border border-border/50 rounded-lg p-1.5 bg-muted/20">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('grid')}
                                    className="h-8 w-8"
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('list')}
                                    className="h-8 w-8"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Agents Grid/List */}
                        {loading ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map(i => (
                                    <Card key={i} className="animate-pulse">
                                        <CardHeader className="space-y-2">
                                            <div className="h-12 w-12 bg-muted rounded-xl" />
                                            <div className="h-5 bg-muted rounded w-3/4" />
                                            <div className="h-4 bg-muted rounded w-1/2" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-16 bg-muted rounded" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : filteredAgents.length > 0 ? (
                            <div className={cn(
                                "gap-6",
                                viewMode === 'grid'
                                    ? "grid md:grid-cols-2 lg:grid-cols-3"
                                    : "flex flex-col"
                            )}>
                                {filteredAgents.map((agent) => (
                                    <AgentCard
                                        key={agent.id}
                                        agent={agent}
                                        variant={viewMode === 'list' ? 'compact' : 'default'}
                                        showMetrics={true}
                                        onChat={handleChatWithAgent}
                                        onEdit={handleEditAgent}
                                        onDelete={handleDeleteAgent}
                                        onDuplicate={handleDuplicateAgent}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                                <CardContent className="py-12 text-center">
                                    <Bot className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                                    <h3 className="text-xl font-semibold mb-2">No Agents Yet</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Create your first AI agent to get started
                                    </p>
                                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Create Your First Agent
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Agent Store Tab */}
                <TabsContent value="store" className="mt-0">
                    <AgentStore userId={userId} onAgentSelect={handleChatWithAgent} />
                </TabsContent>

                {/* Orchestration Tab */}
                <TabsContent value="orchestration" className="mt-0">
                    <AgentOrchestrator userId={userId} agents={agents} />
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics" className="mt-0">
                    <AgentMetrics userId={userId} agents={agents} />
                </TabsContent>

                {/* Memory Tab */}
                <TabsContent value="memory" className="mt-0">
                    <AgentMemory userId={userId} />
                </TabsContent>

                {/* Tools Tab */}
                <TabsContent value="tools" className="mt-0">
                    <AgentTools userId={userId} isPro={isPro} />
                </TabsContent>

                {/* Desktop App Tab */}
                <TabsContent value="desktop" className="mt-0">
                    <DesktopAppDownload />
                </TabsContent>
            </Tabs>

            {/* Inline Chat Modal */}
            {chatAgent && (
                <AgentChatModal
                    agent={chatAgent}
                    open={!!chatAgent}
                    onOpenChange={(open) => !open && setChatAgent(null)}
                />
            )}
        </div>
    );
};

export default AgentHub;
