import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search, TrendingUp, Star, Sparkles, Check,
    ShoppingCart, Crown, Zap, Bot, Download, Play, Loader2, Plus
} from "lucide-react";
import { AgentCard, Agent } from "./AgentCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPurchasedAgentIds, markAgentAsPurchased, isAgentPurchased } from "@/lib/agentUtils";
import { RegistrationAssistant } from "./RegistrationAssistant";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

// Store agents with comprehensive system prompts
const STORE_AGENTS: Agent[] = [
    {
        id: "cli-promptx",
        name: "PromptX",
        description: "PromptX is a personal AI assistant you run on your own devices. It answers you on the channels you already use (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Microsoft Teams, WebChat), plus extension channels like BlueBubbles, Matrix, Zalo, and Zalo Personal. It can speak and listen on macOS/iOS/Android, and can render a live Canvas you control. The Gateway is just the control plane — the product is the assistant.\n\nInstallation Guide: bash this in terminal\nnpm install -g @anshpalsingh/promptx\nand then\npromptx onboard",
        system_prompt: "You are the PromptX AI assistant router and control plane.",
        category: "Other",
        tags: ["assistant", "cli", "ai"],
        user_id: "admin",
        created_at: new Date().toISOString(),
        price: 0,
        downloads: 5000,
        rating: 5.0,
        seller_name: "PromptX Official",
        is_featured: true,
    },
    {
        id: "cli-trexcode",
        name: "TreXCode",
        description: "TreXCode is an agentic coding beast that owns your terminal, fully groks your codebase, and makes you code like a god by crushing repetitive tasks, breaking down gnarly logic, and dominating git workflows—all through straight-up natural language commands.\n\nInstallation Guide: bash this in terminal;\nnpm install -g trexcode\nand then\ntrexcode",
        system_prompt: "You are TreXCode, an elite agentic coding assistant.",
        category: "Development",
        tags: ["coding", "cli", "agentic"],
        user_id: "admin",
        created_at: new Date().toISOString(),
        price: 0,
        downloads: 12000,
        rating: 5.0,
        seller_name: "PromptX Official",
        is_featured: true,
    }
];

const CATEGORIES = ["All", "Business", "Development", "Marketing", "Creative", "Education", "Research"];

interface AgentStoreProps {
    userId?: string;
    onAgentSelect?: (agent: Agent) => void;
    triggerCreate?: boolean;
    onTriggerHandled?: () => void;
}

export const AgentStore = ({ userId, onAgentSelect, triggerCreate, onTriggerHandled }: AgentStoreProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortBy, setSortBy] = useState("popular");
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
    const [addingToLibrary, setAddingToLibrary] = useState<string | null>(null);
    const [cliListings, setCliListings] = useState<Agent[]>(STORE_AGENTS);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [selectedCli, setSelectedCli] = useState<Agent | null>(null);
    const [newListing, setNewListing] = useState({
        title: "",
        description: "",
        system_prompt: "",
        price: 0,
        tags: "",
    });
    const [isCreating, setIsCreating] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        setPurchasedIds(getPurchasedAgentIds());
        loadCliListings();
    }, [userId]); // Added userId to dependencies to re-fetch if user changes

    useEffect(() => {
        if (triggerCreate) {
            setShowCreateDialog(true);
            onTriggerHandled?.();
        }
    }, [triggerCreate, onTriggerHandled]);

    const loadCliListings = async () => {
        try {
            const { data: listingsData, error } = await supabase
                .from("marketplace_listings")
                .select("*")
                .eq("is_active", true)
                .eq("category", "cli")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const sellerIds = [...new Set(listingsData?.map(l => l.seller_id) || [])];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username, email")
                .in("id", sellerIds);

            const fetchedAgents: Agent[] = listingsData.map((listing) => {
                const seller = profiles?.find(p => p.id === listing.seller_id);
                return {
                    id: listing.id,
                    name: listing.title,
                    description: listing.description,
                    system_prompt: listing.prompt_content,
                    category: "Development",
                    tags: listing.tags || [],
                    user_id: listing.seller_id,
                    created_at: listing.created_at,
                    price: listing.price,
                    downloads: listing.downloads || 0,
                    rating: 0,
                    seller_name: seller?.username || seller?.email?.split('@')[0] || "Anonymous",
                    is_featured: false,
                };
            });

            setCliListings([...STORE_AGENTS, ...fetchedAgents]);
        } catch (error) {
            console.error("Error loading CLI listings:", error);
        }
    };

    const createListing = async () => {
        if (!userId) {
            toast({ title: "Authentication required", description: "Please sign in to list a CLI", variant: "destructive" });
            return;
        }
        if (!newListing.title || !newListing.description || !newListing.system_prompt) {
            toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        try {
            setIsCreating(true);
            const tagsList = newListing.tags.split(",").map(t => t.trim()).filter(Boolean);
            const { error } = await supabase.from("marketplace_listings").insert({
                title: newListing.title,
                description: newListing.description,
                prompt_content: newListing.system_prompt,
                category: "cli",
                price: newListing.price,
                tags: tagsList,
                seller_id: userId,
                is_active: true,
                is_workflow: false,
            });

            if (error) throw error;

            toast({ title: "Success", description: "CLI listed successfully" });
            setNewListing({
                title: "",
                description: "",
                system_prompt: "",
                price: 0,
                tags: "",
            });
            setShowCreateDialog(false);
            loadCliListings();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const filteredAgents = cliListings.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory;

        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        switch (sortBy) {
            case "popular":
                return (b.downloads || 0) - (a.downloads || 0);
            case "rating":
                return (b.rating || 0) - (a.rating || 0);
            case "price-low":
                return (a.price || 0) - (b.price || 0);
            case "price-high":
                return (b.price || 0) - (a.price || 0);
            case "newest":
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            default:
                return 0;
        }
    });

    const featuredAgents = filteredAgents.filter(a => a.is_featured);
    const freeAgents = filteredAgents.filter(a => a.price === 0);
    const premiumAgents = filteredAgents.filter(a => (a.price || 0) > 0);

    const handlePurchase = async (agent: Agent) => {
        if (purchasedIds.has(agent.id)) {
            toast({
                title: "Already Owned",
                description: "You already have this agent in your library.",
            });
            return;
        }

        if (!userId) {
            toast({
                title: "Sign in Required",
                description: "Please sign in to add agents to your library.",
                variant: "destructive",
            });
            return;
        }

        setAddingToLibrary(agent.id);

        try {
            // Record purchase for paid community agents
            if (agent.price && agent.price > 0 && !agent.id.startsWith("cli-")) {
                const { error: purchaseError } = await supabase.from("prompt_purchases").insert({
                    listing_id: agent.id,
                    buyer_id: userId,
                    price: agent.price,
                });

                if (purchaseError) throw purchaseError;

                // Increment downloads
                await supabase
                    .from("marketplace_listings")
                    .update({ downloads: (agent.downloads || 0) + 1 })
                    .eq("id", agent.id);
            }

            // Add agent to user's library in Supabase
            const { error } = await supabase
                .from('prompt_agents')
                .insert([{
                    user_id: userId,
                    name: agent.name,
                    description: agent.description,
                    system_prompt: agent.system_prompt,
                    category: agent.category,
                    model: agent.model,
                    tags: agent.tags,
                    is_public: false,
                }]);

            if (error) throw error;

            // Mark as purchased in localStorage
            markAgentAsPurchased(agent.id);
            setPurchasedIds(new Set([...purchasedIds, agent.id]));

            toast({
                title: agent.price === 0 ? "Agent Added! 🎉" : "Purchase Complete! 🎉",
                description: `${agent.name} has been added to your library.`,
            });

        } catch (error) {
            console.error('Error adding agent:', error);
            toast({
                title: "Error",
                description: "Failed to add agent to library. Please try again.",
                variant: "destructive",
            });
        } finally {
            setAddingToLibrary(null);
        }
    };

    const handleChat = (agent: Agent) => {
        // Navigate to dashboard with agent context
        navigate('/dashboard', { state: { selectedAgent: agent } });
    };

    const renderAgentGrid = (agents: Agent[]) => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, i) => {
                const isOwned = purchasedIds.has(agent.id);
                const isAdding = addingToLibrary === agent.id;

                // Hide installation guide if not owned
                const displayDescription = isOwned
                    ? agent.description
                    : agent.description.split(/install/i)[0].split(/guide/i)[0].trim() + "...\n\n[Purchase to view Installation Guide & System Prompt]";

                return (
                    <div
                        key={agent.id}
                        className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-blue-500/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500 will-change-transform" />
                        <Card
                            onClick={() => { setSelectedCli(agent); setShowDetailsDialog(true); }}
                            className="relative h-full bg-background/60 backdrop-blur-xl border-white/10 rounded-3xl overflow-hidden flex flex-col hover:border-primary/50 transition-colors duration-500 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-500" />

                            {agent.is_featured && (
                                <div className="absolute top-4 right-4 z-10">
                                    <Badge className="bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white gap-1 backdrop-blur-md border-0 shadow-lg px-3 py-1">
                                        <Crown className="h-3.5 w-3.5" /> Featured
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="pb-4 relative z-10 pt-6 px-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 shadow-inner">
                                        <Bot className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors">{agent.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            @xionAi / {agent.seller_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-zinc-300 leading-relaxed max-h-24 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/40 to-transparent" />
                                    <span className="text-primary mr-2">&gt;</span>
                                    <span className="whitespace-pre-wrap">{displayDescription}</span>
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-end px-2 pb-1">...</div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0 space-y-5 px-6 pb-6 flex-1 flex flex-col justify-end relative z-10">
                                {/* Stats Row */}
                                <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-white/5 pb-4">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Download className="h-4 w-4 text-primary/70" />
                                            {(agent.downloads || 0).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            {agent.rating?.toFixed(1)}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-white/5 border-white/10">{agent.category}</Badge>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {agent.tags?.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs bg-white/5 border-white/10 hover:bg-white/10">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Price and Actions */}
                                <div className="flex items-center justify-between pt-4 mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Price</span>
                                        <div className="text-2xl font-black">
                                            {agent.price === 0 ? (
                                                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">FREE</span>
                                            ) : (
                                                <span className="text-foreground">${agent.price?.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="rounded-xl h-11 px-5 font-bold shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-shadow"
                                            onClick={(e) => { e.stopPropagation(); handlePurchase(agent); }}
                                            disabled={isOwned || isAdding}
                                            variant={isOwned ? "secondary" : "default"}
                                        >
                                            {isAdding ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : isOwned ? (
                                                <><Check className="h-4 w-4 mr-1.5" /> Owned</>
                                            ) : agent.price === 0 ? (
                                                "Get"
                                            ) : (
                                                <><ShoppingCart className="h-4 w-4 mr-1.5" /> Buy</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-background/30 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-white/10 shadow-lg">
                <div className="w-full sm:w-[380px] relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                        <Input
                            placeholder="Find agents, APIs, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-12 bg-background/50 border-white/10 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-base"
                        />
                    </div>
                </div>
                <div className="flex w-full sm:w-auto gap-3 items-center">
                    {userId && (
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button className="h-12 rounded-full px-6 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all font-semibold">
                                    <Plus className="h-5 w-5" />
                                    <span className="hidden sm:inline">Register CLI</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-hidden bg-zinc-950/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 flex flex-col rounded-2xl sm:rounded-[32px]">
                                <DialogHeader className="p-8 sm:px-10 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/[0.05] to-transparent relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                                    <DialogTitle className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent relative z-10">Register Your CLI</DialogTitle>
                                    <DialogDescription className="text-white/60 text-base mt-2 relative z-10">
                                        Share your custom CLI tools with the community and monetize your expertise.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
                                    {/* Left Side: Manual Form */}
                                    <div className="flex-1 p-8 sm:px-10 overflow-y-auto border-r border-white/10 bg-white/[0.02]">
                                        <div className="space-y-6 text-left max-w-3xl mx-auto">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Name *</Label>
                                                <Input
                                                    value={newListing.title}
                                                    onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                                                    placeholder="E.g., DevToolX"
                                                    className="h-12 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-6 transition-all shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Description & Installation Guide *</Label>
                                                <Textarea
                                                    value={newListing.description}
                                                    onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                                                    placeholder="Describe what your CLI does and how to install it (e.g., npm install -g ...)"
                                                    rows={4}
                                                    className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner resize-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Price (USD) *</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-medium">$</span>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={newListing.price}
                                                            onChange={(e) => setNewListing({ ...newListing, price: parseFloat(e.target.value) || 0 })}
                                                            placeholder="0.00"
                                                            className="h-14 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base pl-9 pr-5 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Tags (comma-separated)</Label>
                                                    <Input
                                                        value={newListing.tags}
                                                        onChange={(e) => setNewListing({ ...newListing, tags: e.target.value })}
                                                        placeholder="cli, development, tools"
                                                        className="h-14 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                                                    System Prompt / Configuration *
                                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full lowercase normal-case tracking-normal">Core Logic</span>
                                                </Label>
                                                <Textarea
                                                    value={newListing.system_prompt}
                                                    onChange={(e) => setNewListing({ ...newListing, system_prompt: e.target.value })}
                                                    placeholder="The core instructions or configuration for your CLI..."
                                                    rows={6}
                                                    className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner font-mono text-sm leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: AI Assistant */}
                                    <div className="w-full md:w-[420px] p-0 flex flex-col shrink-0 border-l border-white/10 bg-gradient-to-b from-black/60 to-black/90 relative z-10 shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.5)]">
                                        <RegistrationAssistant
                                            itemType="CLI"
                                            onSuggest={(suggest) => {
                                                setNewListing(prev => ({
                                                    ...prev,
                                                    title: suggest.title || prev.title,
                                                    description: suggest.description || prev.description,
                                                    price: suggest.price !== undefined ? suggest.price : prev.price,
                                                    tags: suggest.tags || prev.tags,
                                                    system_prompt: suggest.system_prompt || prev.system_prompt
                                                }));
                                            }}
                                            onAutoSubmit={createListing}
                                        />
                                    </div>
                                </div>

                                <div className="p-6 sm:px-10 border-t border-white/10 shrink-0 bg-white/[0.02] backdrop-blur-md flex justify-end items-center">
                                    <span className="text-white/40 text-sm mr-auto hidden sm:block">All fields marked with * are required to list on the marketplace.</span>
                                    <Button
                                        className="w-full sm:w-auto px-10 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] hover:shadow-[0_0_40px_-5px_rgba(var(--primary),0.7)] transition-all"
                                        onClick={createListing}
                                        disabled={!newListing.title || !newListing.description || !newListing.system_prompt || isCreating}
                                    >
                                        {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        Register CLI
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-full bg-background/50 border-white/10 hover:border-white/20 transition-colors">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="popular">
                                <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Most Popular</span>
                            </SelectItem>
                            <SelectItem value="rating">
                                <span className="flex items-center gap-2"><Star className="h-4 w-4" /> Highest Rated</span>
                            </SelectItem>
                            <SelectItem value="price-low">Price: Low to High</SelectItem>
                            <SelectItem value="price-high">Price: High to Low</SelectItem>
                            <SelectItem value="newest">Newest First</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {CATEGORIES.map((category) => (
                    <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className={`rounded-full h-10 px-5 text-sm transition-all duration-300 ${selectedCategory !== category ? 'border-white/10 bg-background/40 hover:bg-white/5 backdrop-blur-sm text-muted-foreground hover:text-foreground' : 'shadow-[0_0_15px_rgba(var(--primary),0.3)]'}`}
                    >
                        {category}
                    </Button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Tabs & Content */}
                <div className="flex-1 w-full flex flex-col gap-6">
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="bg-background/40 backdrop-blur-md border border-white/10 rounded-full h-12 p-1.5 w-full overflow-x-auto justify-start sm:justify-center hidden-scrollbar">
                            <TabsTrigger value="all" className="rounded-full px-5 gap-2 text-sm font-medium">
                                <Bot className="h-4 w-4" /> All
                            </TabsTrigger>
                            <TabsTrigger value="featured" className="rounded-full px-5 gap-2 text-sm font-medium">
                                <Crown className="h-4 w-4" /> Featured
                            </TabsTrigger>
                            <TabsTrigger value="free" className="rounded-full px-5 gap-2 text-sm font-medium">
                                <Sparkles className="h-4 w-4" /> Free
                            </TabsTrigger>
                            <TabsTrigger value="premium" className="rounded-full px-5 gap-2 text-sm font-medium">
                                <Zap className="h-4 w-4" /> Premium
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-8 transition-all duration-500 min-h-[400px]">
                            <TabsContent value="all" className="m-0 focus-visible:outline-none">{renderAgentGrid(filteredAgents)}</TabsContent>
                            <TabsContent value="featured" className="m-0 focus-visible:outline-none">{renderAgentGrid(featuredAgents)}</TabsContent>
                            <TabsContent value="free" className="m-0 focus-visible:outline-none">{renderAgentGrid(freeAgents)}</TabsContent>
                            <TabsContent value="premium" className="m-0 focus-visible:outline-none">{renderAgentGrid(premiumAgents)}</TabsContent>

                            {filteredAgents.length === 0 && (
                                <div className="text-center py-20 bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-muted-foreground">
                                        <Search className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">No agents found</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto">Try adjusting your search criteria or removing some filters to see more results.</p>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>
            </div>

            {/* Stats Banner Upgrade - Animated Metrics */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-xl p-8 lg:p-12 mb-8 group">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none translate-y-1/3 -translate-x-1/3" />

                <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        <div className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                            {STORE_AGENTS.length}
                        </div>
                        <div className="text-sm tracking-wider font-semibold text-primary uppercase">Total Agents</div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <div className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent group-hover:text-primary transition-colors duration-500">
                            {STORE_AGENTS.reduce((sum, a) => sum + (a.downloads || 0), 0).toLocaleString()}+
                        </div>
                        <div className="text-sm tracking-wider font-semibold text-primary uppercase">Downloads</div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <div className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent flex items-baseline gap-1">
                            {(STORE_AGENTS.reduce((sum, a) => sum + (a.rating || 0), 0) / STORE_AGENTS.length).toFixed(1)}
                            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="text-sm tracking-wider font-semibold text-primary uppercase">Avg Rating</div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 text-center">
                        <div className="text-4xl lg:text-5xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                            {purchasedIds.size}
                        </div>
                        <div className="text-sm tracking-wider font-semibold text-primary uppercase leading-tight">In Your<br />Library</div>
                    </div>
                </div>
            </div>

            {/* Selected CLI Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-3xl border-white/10">
                    {selectedCli && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 shadow-inner">
                                        <Bot className="h-8 w-8 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-3xl font-bold">{selectedCli.name}</DialogTitle>
                                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            @xionAi / {selectedCli.seller_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Badge variant="outline" className="bg-white/5 border-white/10">{selectedCli.category}</Badge>
                                    {selectedCli.tags?.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs bg-white/5 border-white/10">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">About this CLI</h3>
                                    <div className="p-5 rounded-xl bg-black/40 border border-white/5 font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {purchasedIds.has(selectedCli.id)
                                            ? selectedCli.description
                                            : selectedCli.description.split(/install/i)[0].split(/guide/i)[0].trim() + "\n\n[Purchase to view full documentation and installation guide.]"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-white/5">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{(selectedCli.downloads || 0).toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">Downloads</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold flex items-center justify-center gap-1">
                                            {selectedCli.rating?.toFixed(1)} <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        </div>
                                        <div className="text-xs text-muted-foreground">Rating</div>
                                    </div>
                                    <div className="text-center col-span-2 md:col-span-2 flex flex-col justify-center items-center">
                                        <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-1">Price</div>
                                        <div className="text-3xl font-black">
                                            {selectedCli.price === 0 ? (
                                                <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">FREE</span>
                                            ) : (
                                                <span className="text-foreground">${selectedCli.price?.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg font-bold shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-shadow"
                                    onClick={() => { handlePurchase(selectedCli); setShowDetailsDialog(false); }}
                                    disabled={purchasedIds.has(selectedCli.id) || addingToLibrary === selectedCli.id}
                                    variant={purchasedIds.has(selectedCli.id) ? "secondary" : "default"}
                                >
                                    {addingToLibrary === selectedCli.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : purchasedIds.has(selectedCli.id) ? (
                                        <><Check className="h-5 w-5 mr-2" /> Owned in Library</>
                                    ) : selectedCli.price === 0 ? (
                                        "Get CLI"
                                    ) : (
                                        <><ShoppingCart className="h-5 w-5 mr-2" /> Purchase CLI</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
export default AgentStore;
