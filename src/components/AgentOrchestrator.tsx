import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    GitBranch, Plus, Play, Trash2, ArrowRight, ArrowUp, ArrowDown,
    Bot, Save, Zap, MessageSquare, RotateCcw, CopyPlus, Timer,
    CheckCircle2, Clock, XCircle, Loader2, Copy
} from "lucide-react";
import { Agent } from "./AgentCard";
import { useToast } from "@/hooks/use-toast";
import { executeAgent, OrchestrationStep, runOrchestration } from "@/lib/agentUtils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrchestrationNode {
    id: string;
    agentId: string;
    agentName: string;
    systemPrompt: string;
    inputFrom?: string;
    order: number;
    status?: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    error?: string;
    duration?: number; // Execution time in milliseconds
}

interface Orchestration {
    id: string;
    name: string;
    description: string;
    nodes: OrchestrationNode[];
    createdAt: string;
    lastRun?: string;
    lastInput?: string; // For quick re-run
    totalDuration?: number; // Total execution time
    status: 'draft' | 'active' | 'running' | 'completed' | 'failed';
    finalOutput?: string;
}

const STORAGE_KEY = 'promptx_orchestrations';

const loadOrchestrations = (): Orchestration[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveOrchestrations = (orchs: Orchestration[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orchs));
};

interface AgentOrchestratorProps {
    userId?: string;
    agents?: Agent[];
}

export const AgentOrchestrator = ({ userId, agents = [] }: AgentOrchestratorProps) => {
    const [orchestrations, setOrchestrations] = useState<Orchestration[]>(() => loadOrchestrations());
    const [selectedOrch, setSelectedOrch] = useState<Orchestration | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isRunOpen, setIsRunOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [runningStep, setRunningStep] = useState<number>(0);
    const [initialInput, setInitialInput] = useState("");
    const [newOrch, setNewOrch] = useState({ name: "", description: "" });
    const { toast } = useToast();

    const updateOrchestrations = (updated: Orchestration[]) => {
        setOrchestrations(updated);
        saveOrchestrations(updated);
    };

    const handleCreateOrchestration = () => {
        if (!newOrch.name) {
            toast({ title: "Error", description: "Please enter a name", variant: "destructive" });
            return;
        }

        const orch: Orchestration = {
            id: `orch-${Date.now()}`,
            name: newOrch.name,
            description: newOrch.description,
            nodes: [],
            createdAt: new Date().toISOString(),
            status: "draft",
        };

        updateOrchestrations([orch, ...orchestrations]);
        setSelectedOrch(orch);
        setNewOrch({ name: "", description: "" });
        setIsCreateOpen(false);
        toast({ title: "Created!", description: "Now add agents to your workflow" });
    };

    const handleDeleteOrchestration = (orchId: string) => {
        const updated = orchestrations.filter(o => o.id !== orchId);
        updateOrchestrations(updated);
        if (selectedOrch?.id === orchId) {
            setSelectedOrch(null);
        }
        toast({ title: "Deleted", description: "Workflow removed" });
    };

    const handleAddNode = (agentId: string) => {
        if (!selectedOrch) return;

        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        const lastNode = selectedOrch.nodes[selectedOrch.nodes.length - 1];
        const newNode: OrchestrationNode = {
            id: `n-${Date.now()}`,
            agentId: agent.id,
            agentName: agent.name,
            systemPrompt: agent.system_prompt || '',
            inputFrom: lastNode?.id,
            order: selectedOrch.nodes.length + 1,
            status: 'pending',
        };

        const updated = {
            ...selectedOrch,
            nodes: [...selectedOrch.nodes, newNode],
        };

        setSelectedOrch(updated);
        updateOrchestrations(orchestrations.map(o => o.id === updated.id ? updated : o));
    };

    const handleRemoveNode = (nodeId: string) => {
        if (!selectedOrch) return;

        const updatedNodes = selectedOrch.nodes
            .filter(n => n.id !== nodeId)
            .map((n, i) => ({
                ...n,
                order: i + 1,
                inputFrom: i === 0 ? undefined : selectedOrch.nodes[i - 1]?.id,
            }));

        const updated = { ...selectedOrch, nodes: updatedNodes };
        setSelectedOrch(updated);
        updateOrchestrations(orchestrations.map(o => o.id === updated.id ? updated : o));
    };

    const handleMoveNode = (nodeId: string, direction: 'up' | 'down') => {
        if (!selectedOrch) return;

        const nodeIndex = selectedOrch.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;

        const newIndex = direction === 'up' ? nodeIndex - 1 : nodeIndex + 1;
        if (newIndex < 0 || newIndex >= selectedOrch.nodes.length) return;

        const newNodes = [...selectedOrch.nodes];
        [newNodes[nodeIndex], newNodes[newIndex]] = [newNodes[newIndex], newNodes[nodeIndex]];

        // Recalculate order and inputFrom
        const updatedNodes = newNodes.map((n, i) => ({
            ...n,
            order: i + 1,
            inputFrom: i === 0 ? undefined : newNodes[i - 1]?.id,
        }));

        const updated = { ...selectedOrch, nodes: updatedNodes };
        setSelectedOrch(updated);
        updateOrchestrations(orchestrations.map(o => o.id === updated.id ? updated : o));
    };

    const handleDuplicateOrchestration = (orch: Orchestration) => {
        const duplicate: Orchestration = {
            ...orch,
            id: `orch-${Date.now()}`,
            name: `${orch.name} (Copy)`,
            createdAt: new Date().toISOString(),
            status: 'draft',
            lastRun: undefined,
            lastInput: undefined,
            finalOutput: undefined,
            totalDuration: undefined,
            nodes: orch.nodes.map(n => ({
                ...n,
                id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                status: 'pending' as const,
                output: undefined,
                error: undefined,
                duration: undefined,
            })),
        };

        updateOrchestrations([duplicate, ...orchestrations]);
        setSelectedOrch(duplicate);
        toast({ title: "Duplicated!", description: `Created "${duplicate.name}"` });
    };

    const handleRunOrchestration = async () => {
        if (!selectedOrch || selectedOrch.nodes.length === 0) {
            toast({ title: "Error", description: "Add at least one agent to run", variant: "destructive" });
            return;
        }

        if (!initialInput.trim()) {
            toast({ title: "Error", description: "Please enter an initial prompt", variant: "destructive" });
            return;
        }

        setIsRunning(true);
        setRunningStep(0);
        setIsRunOpen(false);

        const workflowStartTime = Date.now();

        // Reset all nodes to pending and store lastInput
        let currentOrch = {
            ...selectedOrch,
            status: 'running' as const,
            lastInput: initialInput,
            nodes: selectedOrch.nodes.map(n => ({ ...n, status: 'pending' as const, output: undefined, error: undefined, duration: undefined })),
        };
        setSelectedOrch(currentOrch);
        updateOrchestrations(orchestrations.map(o => o.id === currentOrch.id ? currentOrch : o));

        let currentInput = initialInput;
        let success = true;
        let finalOutput = '';

        for (let i = 0; i < currentOrch.nodes.length; i++) {
            const node = currentOrch.nodes[i];
            setRunningStep(i + 1);

            const stepStartTime = Date.now();

            // Update to running
            currentOrch = {
                ...currentOrch,
                nodes: currentOrch.nodes.map((n, idx) =>
                    idx === i ? { ...n, status: 'running' as const } : n
                ),
            };
            setSelectedOrch(currentOrch);

            // Execute agent
            const result = await executeAgent(
                node.agentId,
                node.systemPrompt || `You are a helpful AI assistant named ${node.agentName}. Process the following input and provide a clear, useful response.`,
                currentInput
            );

            const stepDuration = Date.now() - stepStartTime;

            if (!result.success) {
                // Update to failed
                currentOrch = {
                    ...currentOrch,
                    status: 'failed' as const,
                    nodes: currentOrch.nodes.map((n, idx) =>
                        idx === i ? { ...n, status: 'failed' as const, error: result.error, duration: stepDuration } : n
                    ),
                };
                setSelectedOrch(currentOrch);
                updateOrchestrations(orchestrations.map(o => o.id === currentOrch.id ? currentOrch : o));

                toast({
                    title: "Workflow Failed",
                    description: `Step ${i + 1} (${node.agentName}) failed: ${result.error}`,
                    variant: "destructive"
                });
                success = false;
                break;
            }

            // Update to completed with duration
            currentOrch = {
                ...currentOrch,
                nodes: currentOrch.nodes.map((n, idx) =>
                    idx === i ? { ...n, status: 'completed' as const, output: result.response, duration: stepDuration } : n
                ),
            };
            setSelectedOrch(currentOrch);

            // Use output as next input
            currentInput = result.response || '';
            finalOutput = currentInput;
        }

        const totalDuration = Date.now() - workflowStartTime;

        // Finalize
        if (success) {
            currentOrch = {
                ...currentOrch,
                status: 'completed' as const,
                lastRun: new Date().toISOString(),
                totalDuration,
                finalOutput,
            };
            setSelectedOrch(currentOrch);
            updateOrchestrations(orchestrations.map(o => o.id === currentOrch.id ? currentOrch : o));

            const durationStr = totalDuration > 1000
                ? `${(totalDuration / 1000).toFixed(1)}s`
                : `${totalDuration}ms`;
            toast({ title: "Workflow Complete! 🎉", description: `Finished in ${durationStr}` });
        }

        setIsRunning(false);
        setRunningStep(0);
        setInitialInput("");
    };

    const getStatusColor = (status: Orchestration['status']) => {
        switch (status) {
            case 'active': return 'bg-primary/10 text-primary border-primary/20';
            case 'running': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'completed': return 'bg-primary/10 text-primary border-primary/20';
            case 'failed': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
            default: return 'bg-muted text-muted-foreground border-border/50';
        }
    };

    const getNodeStatusIcon = (status?: string) => {
        switch (status) {
            case 'running': return <Loader2 className="h-5 w-5 animate-spin" />;
            case 'completed': return <CheckCircle2 className="h-5 w-5" />;
            case 'failed': return <XCircle className="h-5 w-5" />;
            default: return null;
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Output copied to clipboard" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-2">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                            <GitBranch className="h-6 w-6 text-primary" />
                        </div>
                        Agent Orchestration
                    </h2>
                    <p className="text-muted-foreground text-base mt-2.5 ml-14">
                        Chain agents together to create powerful automated workflows
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2.5 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-6">
                            <Plus className="h-4 w-4" /> New Workflow
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Orchestration</DialogTitle>
                            <DialogDescription>Define a multi-agent workflow</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Workflow Name</Label>
                                <Input
                                    value={newOrch.name}
                                    onChange={(e) => setNewOrch({ ...newOrch, name: e.target.value })}
                                    placeholder="e.g., Content Research Pipeline"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newOrch.description}
                                    onChange={(e) => setNewOrch({ ...newOrch, description: e.target.value })}
                                    placeholder="What does this workflow accomplish?"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateOrchestration}>Create Workflow</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {agents.length === 0 && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-4 flex items-center gap-3">
                        <Bot className="h-5 w-5 text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Create some agents first in the "My Agents" tab to use them in workflows.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Orchestration List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Workflows</CardTitle>
                        <CardDescription>{orchestrations.length} orchestrations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {orchestrations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No workflows yet</p>
                            </div>
                        ) : (
                            orchestrations.map((orch) => (
                                <div
                                    key={orch.id}
                                    onClick={() => setSelectedOrch(orch)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all group",
                                        selectedOrch?.id === orch.id
                                            ? "bg-primary/10 border-primary/30"
                                            : "bg-muted/30 border-border/50 hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate">{orch.name}</h4>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{orch.description}</p>
                                        </div>
                                        <Badge className={getStatusColor(orch.status)}>{orch.status}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Bot className="h-3 w-3" />
                                            {orch.nodes.length} agents
                                            {orch.totalDuration && (
                                                <>
                                                    <span>•</span>
                                                    <Timer className="h-3 w-3" />
                                                    {orch.totalDuration > 1000
                                                        ? `${(orch.totalDuration / 1000).toFixed(1)}s`
                                                        : `${orch.totalDuration}ms`}
                                                </>
                                            )}
                                            {orch.lastRun && (
                                                <>
                                                    <span>•</span>
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(orch.lastRun).toLocaleDateString()}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                title="Duplicate workflow"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicateOrchestration(orch);
                                                }}
                                            >
                                                <CopyPlus className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                title="Delete workflow"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteOrchestration(orch.id);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Workflow Builder */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">
                                    {selectedOrch ? selectedOrch.name : "Select a Workflow"}
                                </CardTitle>
                                <CardDescription>
                                    {selectedOrch ? selectedOrch.description : "Choose a workflow to edit"}
                                </CardDescription>
                            </div>
                            {selectedOrch && (
                                <div className="flex items-center gap-2">
                                    {/* Quick Re-run button */}
                                    {selectedOrch.lastInput && !isRunning && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            title="Re-run with last input"
                                            onClick={() => {
                                                setInitialInput(selectedOrch.lastInput || '');
                                                setIsRunOpen(true);
                                            }}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Re-run
                                        </Button>
                                    )}
                                    <Dialog open={isRunOpen} onOpenChange={setIsRunOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                disabled={isRunning || selectedOrch.nodes.length === 0}
                                                className="gap-2"
                                            >
                                                {isRunning ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Running Step {runningStep}/{selectedOrch.nodes.length}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="h-4 w-4" /> Run Workflow
                                                    </>
                                                )}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Run Workflow</DialogTitle>
                                                <DialogDescription>
                                                    Enter the initial prompt to start the workflow. Each agent will process and pass output to the next.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>Initial Prompt</Label>
                                                    <Textarea
                                                        value={initialInput}
                                                        onChange={(e) => setInitialInput(e.target.value)}
                                                        placeholder="e.g., Write a blog post about the future of AI in healthcare"
                                                        rows={4}
                                                        className="resize-none"
                                                    />
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    <p>This workflow will run {selectedOrch?.nodes.length} agents in sequence:</p>
                                                    <p className="mt-1 font-medium">
                                                        {selectedOrch?.nodes.map(n => n.agentName).join(' → ')}
                                                    </p>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRunOpen(false)}>Cancel</Button>
                                                <Button onClick={handleRunOrchestration} disabled={!initialInput.trim()}>
                                                    <Play className="h-4 w-4 mr-2" /> Start Workflow
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {selectedOrch ? (
                            <div className="space-y-6">
                                {/* Flow Visualization */}
                                <div className="space-y-4">
                                    {selectedOrch.nodes.map((node, index) => (
                                        <div key={node.id} className="relative">
                                            {index > 0 && (
                                                <div className="absolute left-7 -top-4 w-0.5 h-4 bg-primary/30" />
                                            )}

                                            <div
                                                className={cn(
                                                    "p-4 rounded-xl border transition-all",
                                                    node.status === 'running'
                                                        ? "bg-blue-500/10 border-blue-500/50"
                                                        : node.status === 'completed'
                                                            ? "bg-primary/10 border-primary/30"
                                                            : node.status === 'failed'
                                                                ? "bg-red-500/10 border-red-500/30"
                                                                : "bg-muted/30 border-border/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Reorder Controls */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-5 w-5"
                                                            disabled={index === 0 || isRunning}
                                                            onClick={() => handleMoveNode(node.id, 'up')}
                                                            title="Move up"
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-5 w-5"
                                                            disabled={index === selectedOrch.nodes.length - 1 || isRunning}
                                                            onClick={() => handleMoveNode(node.id, 'down')}
                                                            title="Move down"
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                                                        node.status === 'running' ? "bg-blue-500 text-white" :
                                                            node.status === 'completed' ? "bg-primary text-primary-foreground" :
                                                                node.status === 'failed' ? "bg-red-500 text-white" :
                                                                    "bg-primary/20 text-primary"
                                                    )}>
                                                        {getNodeStatusIcon(node.status) || node.order}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Bot className="h-4 w-4 text-primary shrink-0" />
                                                            <span className="font-semibold">{node.agentName}</span>
                                                            {node.duration && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Timer className="h-3 w-3" />
                                                                    {node.duration > 1000
                                                                        ? `${(node.duration / 1000).toFixed(1)}s`
                                                                        : `${node.duration}ms`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {node.inputFrom && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                ← Receives output from Step {selectedOrch.nodes.find(n => n.id === node.inputFrom)?.order}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveNode(node.id)}
                                                        disabled={isRunning}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                {/* Output Display */}
                                                {node.output && (
                                                    <div className="mt-3 pt-3 border-t border-border/50">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-primary">Output:</span>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6"
                                                                onClick={() => copyToClipboard(node.output || '')}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <ScrollArea className="h-24">
                                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                                {node.output.substring(0, 500)}{node.output.length > 500 ? '...' : ''}
                                                            </p>
                                                        </ScrollArea>
                                                    </div>
                                                )}

                                                {node.error && (
                                                    <div className="mt-3 pt-3 border-t border-red-500/30">
                                                        <p className="text-xs text-red-400">Error: {node.error}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {index < selectedOrch.nodes.length - 1 && (
                                                <div className="flex justify-center py-2">
                                                    <ArrowRight className="h-5 w-5 text-primary/50 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Agent Button */}
                                    <Select onValueChange={handleAddNode} disabled={isRunning || agents.length === 0}>
                                        <SelectTrigger className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10">
                                            <SelectValue placeholder={agents.length === 0 ? "Create agents first" : "+ Add Agent to Workflow"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={agent.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Bot className="h-4 w-4" />
                                                        {agent.name}
                                                        <span className="text-xs text-muted-foreground">({agent.category})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Final Output */}
                                {selectedOrch.finalOutput && (
                                    <Card className="border-green-500/30 bg-green-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-green-400" />
                                                    Final Output
                                                </CardTitle>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(selectedOrch.finalOutput || '')}
                                                >
                                                    <Copy className="h-3 w-3 mr-1" /> Copy
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-40">
                                                <p className="text-sm whitespace-pre-wrap">{selectedOrch.finalOutput}</p>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {selectedOrch.nodes.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No agents in this workflow</p>
                                        <p className="text-sm">Add agents above to build your automation pipeline</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Select a workflow to view and edit</p>
                                <p className="text-sm">Or create a new one to get started</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
                <CardContent className="py-4 flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                        <p className="font-medium text-sm">How Orchestration Works</p>
                        <p className="text-sm text-muted-foreground">
                            Each agent receives the output from the previous agent as context. Chain Research → Analysis → Writing
                            for powerful automated content creation, or build custom pipelines for any multi-step task.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentOrchestrator;
