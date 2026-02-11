import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Brain, Plus, Search, Trash2, Edit2, Save, X,
    FileText, Heart, MessageSquare, History, Database
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    getAllMemory,
    addAgentMemory,
    updateAgentMemory,
    deleteAgentMemory,
    AgentMemoryEntry
} from "@/lib/agentUtils";

const STORAGE_LIMIT_KB = 100; // 100KB limit for demo

interface AgentMemoryProps {
    userId?: string;
    agentId?: string; // Optional: filter to specific agent
}

const typeIcons = {
    fact: FileText,
    preference: Heart,
    context: MessageSquare,
    history: History,
};

const typeColors = {
    fact: 'bg-primary/5 text-primary border-primary/20',
    preference: 'bg-primary/5 text-primary border-primary/20',
    context: 'bg-primary/5 text-primary border-primary/20',
    history: 'bg-primary/5 text-primary border-primary/20',
};

export const AgentMemory = ({ userId, agentId = 'global' }: AgentMemoryProps) => {
    const [memories, setMemories] = useState<AgentMemoryEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [newMemory, setNewMemory] = useState({
        key: "",
        value: "",
        type: "fact" as AgentMemoryEntry['type']
    });
    const { toast } = useToast();

    // Load memories from localStorage
    const loadMemories = () => {
        const allMemory = getAllMemory();
        setMemories(allMemory[agentId] || []);
    };

    useEffect(() => {
        loadMemories();
    }, [agentId]);

    // Calculate storage usage
    const getStorageUsage = () => {
        const data = JSON.stringify(getAllMemory());
        return new Blob([data]).size / 1024; // KB
    };

    const storageUsed = getStorageUsage();
    const storagePercent = Math.min((storageUsed / STORAGE_LIMIT_KB) * 100, 100);

    const handleAddMemory = () => {
        if (!newMemory.key.trim() || !newMemory.value.trim()) {
            toast({ title: "Error", description: "Key and value are required", variant: "destructive" });
            return;
        }

        // Check for duplicate keys
        if (memories.some(m => m.key.toLowerCase() === newMemory.key.toLowerCase())) {
            toast({ title: "Error", description: "A memory with this key already exists", variant: "destructive" });
            return;
        }

        addAgentMemory({
            key: newMemory.key,
            value: newMemory.value,
            type: newMemory.type,
            agentId,
        });

        loadMemories();
        setNewMemory({ key: "", value: "", type: "fact" });
        setIsAddOpen(false);
        toast({ title: "Memory Added", description: "New memory entry saved successfully" });
    };

    const handleUpdateMemory = (entryId: string) => {
        if (!editValue.trim()) {
            toast({ title: "Error", description: "Value cannot be empty", variant: "destructive" });
            return;
        }

        updateAgentMemory(agentId, entryId, editValue);
        loadMemories();
        setEditingId(null);
        setEditValue("");
        toast({ title: "Updated", description: "Memory entry updated" });
    };

    const handleDeleteMemory = (entryId: string) => {
        deleteAgentMemory(agentId, entryId);
        loadMemories();
        toast({ title: "Deleted", description: "Memory entry removed" });
    };

    const startEditing = (memory: AgentMemoryEntry) => {
        setEditingId(memory.id);
        setEditValue(memory.value);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue("");
    };

    const filteredMemories = memories.filter(mem => {
        const matchesSearch = mem.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mem.value.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || mem.type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="h-6 w-6 text-primary" />
                        Agent Memory
                    </h2>
                    <p className="text-muted-foreground">
                        Persistent context that carries across conversations
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Memory
                </Button>
            </div>

            {/* Storage Usage */}
            <Card className="border-border/50">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Memory Usage</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {storageUsed.toFixed(2)}KB / {STORAGE_LIMIT_KB}KB
                        </span>
                    </div>
                    <Progress
                        value={storagePercent}
                        className={cn(
                            "h-2",
                            storagePercent > 80 ? "bg-destructive/50" : "bg-muted"
                        )}
                    />
                    {storagePercent > 80 && (
                        <p className="text-xs text-destructive mt-2">
                            ⚠️ Storage nearly full. Consider removing old entries.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search memories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-background/50 border-border/50"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="fact">Facts</SelectItem>
                        <SelectItem value="preference">Preferences</SelectItem>
                        <SelectItem value="context">Context</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Memory List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Memory Entries ({filteredMemories.length})</CardTitle>
                    <CardDescription>
                        These entries are automatically included in agent context
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {filteredMemories.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{memories.length === 0 ? "No memories yet" : "No matching memories"}</p>
                            <p className="text-sm">
                                {memories.length === 0
                                    ? "Add memories to give your agents persistent context"
                                    : "Try adjusting your search or filter"}
                            </p>
                        </div>
                    ) : (
                        filteredMemories.map((memory) => {
                            const TypeIcon = typeIcons[memory.type];
                            const isEditing = editingId === memory.id;

                            return (
                                <div
                                    key={memory.id}
                                    className={cn(
                                        "p-4 rounded-xl border transition-all",
                                        "bg-muted/30 border-border/50 hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg shrink-0",
                                            typeColors[memory.type].split(' ')[0]
                                        )}>
                                            <TypeIcon className="h-4 w-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-sm font-semibold">{memory.key}</span>
                                                <Badge className={typeColors[memory.type]}>{memory.type}</Badge>
                                            </div>

                                            {isEditing ? (
                                                <div className="flex gap-2 mt-2">
                                                    <Textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="flex-1 min-h-[60px]"
                                                        autoFocus
                                                    />
                                                    <div className="flex flex-col gap-1">
                                                        <Button size="icon" onClick={() => handleUpdateMemory(memory.id)}>
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" onClick={cancelEditing}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">{memory.value}</p>
                                            )}

                                            <p className="text-xs text-muted-foreground/60 mt-2">
                                                Updated: {new Date(memory.updatedAt).toLocaleString()}
                                            </p>
                                        </div>

                                        {!isEditing && (
                                            <div className="flex gap-1 shrink-0">
                                                <Button size="icon" variant="ghost" onClick={() => startEditing(memory)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteMemory(memory.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* Add Memory Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Memory</DialogTitle>
                        <DialogDescription>
                            Create a new persistent memory entry for your agents
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Key</Label>
                            <Input
                                value={newMemory.key}
                                onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
                                placeholder="e.g., user_name, favorite_topic"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Textarea
                                value={newMemory.value}
                                onChange={(e) => setNewMemory({ ...newMemory, value: e.target.value })}
                                placeholder="The information to remember"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={newMemory.type}
                                onValueChange={(v) => setNewMemory({ ...newMemory, type: v as AgentMemoryEntry['type'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fact">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" /> Fact
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="preference">
                                        <div className="flex items-center gap-2">
                                            <Heart className="h-4 w-4" /> Preference
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="context">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" /> Context
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="history">
                                        <div className="flex items-center gap-2">
                                            <History className="h-4 w-4" /> History
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddMemory}>Add Memory</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Card */}
            <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
                <CardContent className="py-4 flex items-start gap-3">
                    <Brain className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                        <p className="font-medium text-sm">How Memory Works</p>
                        <p className="text-sm text-muted-foreground">
                            Memory entries are injected into your agent's context at the start of each conversation.
                            Use facts for static info (name, role), preferences for behavior (tone, format),
                            context for current projects, and history for important past interactions.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentMemory;
