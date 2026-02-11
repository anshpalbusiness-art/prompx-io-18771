import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Wrench, Plus, Globe, Calculator, Code2, FileText,
    Database, Key, Shield, Crown, Save, Trash2, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAgentTools, setAgentTools, AgentToolConfig } from "@/lib/agentUtils";

const STORAGE_KEY = 'promptx_tool_configs';

interface BuiltInTool {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    isPro: boolean;
    category: 'search' | 'compute' | 'file' | 'database';
}

interface CustomIntegration {
    id: string;
    name: string;
    url: string;
    apiKey?: string;
    description: string;
    createdAt: string;
}

const BUILT_IN_TOOLS: BuiltInTool[] = [
    {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the internet for current information and real-time data',
        icon: Globe,
        isPro: false,
        category: 'search',
    },
    {
        id: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations and unit conversions',
        icon: Calculator,
        isPro: false,
        category: 'compute',
    },
    {
        id: 'file-read',
        name: 'File Reader',
        description: 'Read and analyze uploaded documents (PDF, TXT, CSV, etc.)',
        icon: FileText,
        isPro: false,
        category: 'file',
    },
    {
        id: 'code-interpreter',
        name: 'Code Interpreter',
        description: 'Execute Python code in a sandboxed environment',
        icon: Code2,
        isPro: true,
        category: 'compute',
    },
    {
        id: 'file-write',
        name: 'File Writer',
        description: 'Generate and save files (documents, images, code)',
        icon: FileText,
        isPro: true,
        category: 'file',
    },
    {
        id: 'database-query',
        name: 'Database Query',
        description: 'Query connected databases using natural language',
        icon: Database,
        isPro: true,
        category: 'database',
    },
];

interface AgentToolsProps {
    userId?: string;
    agentId?: string;
    isPro?: boolean;
}

export const AgentTools = ({ userId, agentId = 'global', isPro = false }: AgentToolsProps) => {
    const [toolConfigs, setToolConfigs] = useState<AgentToolConfig[]>([]);
    const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [newIntegration, setNewIntegration] = useState({
        name: '',
        url: '',
        apiKey: '',
        description: '',
    });
    const { toast } = useToast();

    // Load configs from localStorage
    useEffect(() => {
        setToolConfigs(getAgentTools(agentId));
        loadCustomIntegrations();
    }, [agentId]);

    const loadCustomIntegrations = () => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_custom`);
            setCustomIntegrations(stored ? JSON.parse(stored) : []);
        } catch {
            setCustomIntegrations([]);
        }
    };

    const saveCustomIntegrations = (integrations: CustomIntegration[]) => {
        localStorage.setItem(`${STORAGE_KEY}_custom`, JSON.stringify(integrations));
        setCustomIntegrations(integrations);
    };

    const handleToggleTool = (toolId: string, enabled: boolean) => {
        const tool = BUILT_IN_TOOLS.find(t => t.id === toolId);

        if (tool?.isPro && !isPro && enabled) {
            toast({
                title: "Pro Feature",
                description: "Upgrade to Pro to access this tool.",
                variant: "destructive",
            });
            return;
        }

        const updated = toolConfigs.map(t =>
            t.toolId === toolId ? { ...t, enabled } : t
        );

        // Add if not exists
        if (!updated.find(t => t.toolId === toolId)) {
            updated.push({ toolId, enabled });
        }

        setToolConfigs(updated);
        setHasChanges(true);
    };

    const handleSaveTools = () => {
        setAgentTools(agentId, toolConfigs);
        setHasChanges(false);
        toast({
            title: "Tools Saved",
            description: "Your tool configuration has been saved.",
        });
    };

    const handleAddIntegration = () => {
        if (!newIntegration.name.trim() || !newIntegration.url.trim()) {
            toast({
                title: "Error",
                description: "Name and URL are required",
                variant: "destructive",
            });
            return;
        }

        if (!isPro) {
            toast({
                title: "Pro Feature",
                description: "Custom integrations require a Pro plan.",
                variant: "destructive",
            });
            return;
        }

        const integration: CustomIntegration = {
            id: `int-${Date.now()}`,
            name: newIntegration.name,
            url: newIntegration.url,
            apiKey: newIntegration.apiKey || undefined,
            description: newIntegration.description,
            createdAt: new Date().toISOString(),
        };

        saveCustomIntegrations([...customIntegrations, integration]);
        setNewIntegration({ name: '', url: '', apiKey: '', description: '' });
        setIsAddOpen(false);
        toast({
            title: "Integration Added",
            description: `${integration.name} has been configured.`,
        });
    };

    const handleDeleteIntegration = (integrationId: string) => {
        saveCustomIntegrations(customIntegrations.filter(i => i.id !== integrationId));
        toast({
            title: "Integration Removed",
            description: "The integration has been deleted.",
        });
    };

    const isToolEnabled = (toolId: string) =>
        toolConfigs.find(t => t.toolId === toolId)?.enabled ??
        BUILT_IN_TOOLS.find(t => t.id === toolId)?.isPro === false;

    const getCategoryTools = (category: BuiltInTool['category']) =>
        BUILT_IN_TOOLS.filter(t => t.category === category);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="h-6 w-6 text-primary" />
                        Agent Tools
                    </h2>
                    <p className="text-muted-foreground">
                        Configure capabilities and integrations for your agents
                    </p>
                </div>
                {hasChanges && (
                    <Button onClick={handleSaveTools} className="gap-2">
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                )}
            </div>

            {/* Built-in Tools */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Built-in Tools</CardTitle>
                    <CardDescription>
                        Enable capabilities that all agents can use
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Search & Web */}
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">SEARCH & WEB</h4>
                        <div className="space-y-3">
                            {getCategoryTools('search').map(tool => {
                                const enabled = isToolEnabled(tool.id);
                                return (
                                    <div
                                        key={tool.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            enabled
                                                ? "bg-primary/5 border-primary/20"
                                                : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                enabled ? "bg-primary/20" : "bg-muted"
                                            )}>
                                                <tool.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{tool.name}</span>
                                                    {tool.isPro && (
                                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                                            <Crown className="h-3 w-3 mr-1" /> Pro
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Compute */}
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">COMPUTE</h4>
                        <div className="space-y-3">
                            {getCategoryTools('compute').map(tool => {
                                const enabled = isToolEnabled(tool.id);
                                return (
                                    <div
                                        key={tool.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            enabled
                                                ? "bg-primary/5 border-primary/20"
                                                : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                enabled ? "bg-primary/20" : "bg-muted"
                                            )}>
                                                <tool.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{tool.name}</span>
                                                    {tool.isPro && (
                                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                                            <Crown className="h-3 w-3 mr-1" /> Pro
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Files */}
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">FILES</h4>
                        <div className="space-y-3">
                            {getCategoryTools('file').map(tool => {
                                const enabled = isToolEnabled(tool.id);
                                return (
                                    <div
                                        key={tool.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            enabled
                                                ? "bg-primary/5 border-primary/20"
                                                : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                enabled ? "bg-primary/20" : "bg-muted"
                                            )}>
                                                <tool.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{tool.name}</span>
                                                    {tool.isPro && (
                                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                                            <Crown className="h-3 w-3 mr-1" /> Pro
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Database */}
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">DATABASE</h4>
                        <div className="space-y-3">
                            {getCategoryTools('database').map(tool => {
                                const enabled = isToolEnabled(tool.id);
                                return (
                                    <div
                                        key={tool.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            enabled
                                                ? "bg-primary/5 border-primary/20"
                                                : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                enabled ? "bg-primary/20" : "bg-muted"
                                            )}>
                                                <tool.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{tool.name}</span>
                                                    {tool.isPro && (
                                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                                            <Crown className="h-3 w-3 mr-1" /> Pro
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Custom Integrations */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Custom API Integrations
                                {!isPro && (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                        <Crown className="h-3 w-3 mr-1" /> Pro
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Connect external APIs and services
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setIsAddOpen(true)}
                            disabled={!isPro}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Integration
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {customIntegrations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No custom integrations configured</p>
                            {!isPro && (
                                <p className="text-xs mt-1">Upgrade to Pro to add custom APIs</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {customIntegrations.map(integration => (
                                <div
                                    key={integration.id}
                                    className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 border-border/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            <Key className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{integration.name}</span>
                                                {integration.apiKey && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Shield className="h-3 w-3 mr-1" /> Secured
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                {integration.url}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDeleteIntegration(integration.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Integration Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Integration</DialogTitle>
                        <DialogDescription>
                            Connect an external API or service
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Integration Name</Label>
                            <Input
                                value={newIntegration.name}
                                onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                                placeholder="e.g., Weather API"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API URL</Label>
                            <Input
                                value={newIntegration.url}
                                onChange={(e) => setNewIntegration({ ...newIntegration, url: e.target.value })}
                                placeholder="https://api.example.com/v1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key (Optional)</Label>
                            <Input
                                type="password"
                                value={newIntegration.apiKey}
                                onChange={(e) => setNewIntegration({ ...newIntegration, apiKey: e.target.value })}
                                placeholder="Your API key"
                            />
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Stored securely in your browser
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={newIntegration.description}
                                onChange={(e) => setNewIntegration({ ...newIntegration, description: e.target.value })}
                                placeholder="What does this API do?"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddIntegration}>Add Integration</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
                <CardContent className="py-4 flex items-start gap-3">
                    <Wrench className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                        <p className="font-medium text-sm">How Tools Work</p>
                        <p className="text-sm text-muted-foreground">
                            Enabled tools are described to your agents in their system prompt, allowing them to understand
                            what capabilities they have. Your agents will mention when they need a tool that isn't enabled.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentTools;
