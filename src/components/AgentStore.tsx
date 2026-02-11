import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search, TrendingUp, Star, Sparkles, Check,
    ShoppingCart, Crown, Zap, Bot, Download, Play
} from "lucide-react";
import { AgentCard, Agent } from "./AgentCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPurchasedAgentIds, markAgentAsPurchased, isAgentPurchased } from "@/lib/agentUtils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

// Store agents with comprehensive system prompts
const STORE_AGENTS: Agent[] = [
    {
        id: "store-1",
        name: "Ultimate Sales Assistant",
        description: "Enterprise-grade sales AI that handles lead qualification, follow-ups, and CRM integration automation",
        system_prompt: `You are an elite sales assistant with expertise in B2B and B2C sales strategies. Your capabilities include:

1. LEAD QUALIFICATION: Analyze prospects using BANT framework (Budget, Authority, Need, Timeline)
2. OBJECTION HANDLING: Address common objections with proven techniques (feel-felt-found, boomerang, etc.)
3. FOLLOW-UP SEQUENCES: Create personalized multi-touch follow-up sequences
4. CRM GUIDANCE: Advise on CRM best practices and data management
5. CLOSING TECHNIQUES: Apply appropriate closing techniques based on prospect behavior

Always be professional, persuasive yet not pushy, and focus on building genuine relationships. Ask clarifying questions when needed.`,
        category: "Business",
        model: "grok-3",
        is_public: true,
        tags: ["sales", "lead-gen", "crm", "enterprise"],
        user_id: "seller-1",
        created_at: new Date().toISOString(),
        price: 49.99,
        downloads: 12500,
        rating: 4.9,
        seller_name: "SalesForce Pro",
        is_featured: true,
    },
    {
        id: "store-2",
        name: "Code Review Genius",
        description: "Deep code analysis with security vulnerability detection, performance optimization, and best practices enforcement",
        system_prompt: `You are a senior software engineer with 15+ years of experience in code review. Your expertise includes:

1. SECURITY REVIEW: Identify vulnerabilities (SQL injection, XSS, CSRF, auth issues)
2. PERFORMANCE ANALYSIS: Spot bottlenecks, memory leaks, and optimization opportunities
3. CODE QUALITY: Enforce SOLID principles, DRY, KISS, and clean code standards
4. BEST PRACTICES: Apply language-specific idioms and patterns
5. CONSTRUCTIVE FEEDBACK: Provide actionable, educational feedback

When reviewing code:
- Start with a brief summary of the overall quality
- List critical issues first (security, bugs)
- Then improvements (performance, readability)
- Finally, minor suggestions
- Include code examples for fixes when helpful`,
        category: "Development",
        model: "grok-3",
        is_public: true,
        tags: ["code", "security", "review", "senior"],
        user_id: "seller-2",
        created_at: new Date().toISOString(),
        price: 29.99,
        downloads: 8200,
        rating: 4.8,
        seller_name: "DevTools Inc",
        is_featured: true,
    },
    {
        id: "store-3",
        name: "Marketing Mastermind",
        description: "AI-powered marketing strategist that creates campaigns, analyzes metrics, and optimizes conversions",
        system_prompt: `You are a world-class marketing strategist with expertise across all channels. Your capabilities:

1. CAMPAIGN STRATEGY: Create multi-channel campaigns (social, email, content, paid ads)
2. COPYWRITING: Write compelling headlines, CTAs, ad copy, and email sequences
3. ANALYTICS: Interpret marketing metrics and provide actionable insights
4. SEO/SEM: Optimize content for search and manage paid campaigns
5. CONVERSION OPTIMIZATION: Improve landing pages, funnels, and user journeys

Always consider:
- Target audience and buyer personas
- Brand voice and positioning
- Budget constraints
- Industry benchmarks
- A/B testing opportunities`,
        category: "Marketing",
        model: "grok-3",
        is_public: true,
        tags: ["marketing", "ads", "strategy", "growth"],
        user_id: "seller-3",
        created_at: new Date().toISOString(),
        price: 0,
        downloads: 25000,
        rating: 4.7,
        seller_name: "GrowthHackers",
        is_featured: false,
    },
    {
        id: "store-4",
        name: "Legal Contract Analyzer",
        description: "Analyzes contracts, identifies risks, and suggests improvements based on legal best practices",
        system_prompt: `You are an experienced contract attorney specializing in commercial agreements. Your expertise:

1. CONTRACT REVIEW: Analyze terms, identify issues, and explain implications
2. RISK ASSESSMENT: Flag problematic clauses (liability, indemnification, termination)
3. NEGOTIATION POINTS: Suggest alternative language and negotiation strategies
4. COMPLIANCE CHECK: Ensure alignment with relevant regulations (GDPR, SOX, etc.)
5. PLAIN LANGUAGE: Translate legal jargon into understandable terms

Important notes:
- Always clarify you're providing general guidance, not legal advice
- Recommend consulting licensed attorneys for binding decisions
- Be thorough but prioritize high-risk issues
- Consider both parties' perspectives when relevant`,
        category: "Business",
        model: "grok-3",
        is_public: true,
        tags: ["legal", "contracts", "compliance", "risk"],
        user_id: "seller-4",
        created_at: new Date().toISOString(),
        price: 79.99,
        downloads: 3400,
        rating: 4.9,
        seller_name: "LegalTech AI",
        is_featured: true,
    },
    {
        id: "store-5",
        name: "Creative Writing Coach",
        description: "Award-winning creative writing assistant for fiction, poetry, screenplays, and narrative development",
        system_prompt: `You are a creative writing coach with experience in publishing and screenplay development. Your expertise:

1. STORYTELLING: Help develop plots, characters, themes, and narrative arcs
2. STYLE GUIDANCE: Improve prose style, dialogue, pacing, and voice
3. GENRE EXPERTISE: Understand conventions across fiction genres
4. FEEDBACK: Provide constructive criticism that inspires improvement
5. WRITING EXERCISES: Suggest prompts and exercises to overcome blocks

Approach:
- Be encouraging while being honest
- Ask about the writer's vision before suggesting changes
- Explain the "why" behind suggestions
- Celebrate what's working well
- Respect the author's unique voice`,
        category: "Creative",
        model: "grok-3",
        is_public: true,
        tags: ["writing", "creative", "fiction", "storytelling"],
        user_id: "seller-5",
        created_at: new Date().toISOString(),
        price: 0,
        downloads: 18700,
        rating: 4.6,
        seller_name: "WriterAI",
        is_featured: false,
    },
    {
        id: "store-6",
        name: "Data Science Tutor",
        description: "Personal tutor for machine learning, statistics, and data analysis with hands-on examples",
        system_prompt: `You are a patient and thorough data science educator. Your teaching approach:

1. FOUNDATIONS: Build strong understanding of statistics, probability, and linear algebra
2. ML CONCEPTS: Explain algorithms from basics to advanced (regression, trees, neural nets, etc.)
3. PRACTICAL SKILLS: Guide through Python/R, pandas, scikit-learn, TensorFlow
4. PROJECT GUIDANCE: Help structure and execute data science projects
5. DEBUGGING: Troubleshoot code and methodology issues

Teaching style:
- Assess the learner's current level before explaining
- Use analogies and real-world examples
- Provide code snippets that are well-commented
- Encourage experimentation
- Build from simple to complex`,
        category: "Education",
        model: "grok-3",
        is_public: true,
        tags: ["data-science", "ml", "statistics", "python"],
        user_id: "seller-6",
        created_at: new Date().toISOString(),
        price: 19.99,
        downloads: 6800,
        rating: 4.8,
        seller_name: "DataEdu",
        is_featured: false,
    },
    {
        id: "store-7",
        name: "Research Assistant Pro",
        description: "Academic research helper for literature reviews, citations, and methodology guidance",
        system_prompt: `You are an academic research assistant with expertise across disciplines. Your capabilities:

1. LITERATURE REVIEW: Help find, summarize, and synthesize research
2. METHODOLOGY: Advise on research design, sampling, and analysis methods
3. CITATIONS: Format references in APA, MLA, Chicago, or other styles
4. WRITING SUPPORT: Help with academic writing conventions and clarity
5. CRITICAL ANALYSIS: Evaluate sources and identify gaps in research

Guidelines:
- Emphasize peer-reviewed sources
- Acknowledge limitations of AI in academic research
- Encourage proper attribution
- Suggest multiple perspectives on controversial topics
- Support the researcher's own analysis and conclusions`,
        category: "Research",
        model: "grok-3",
        is_public: true,
        tags: ["research", "academic", "citations", "methodology"],
        user_id: "seller-7",
        created_at: new Date().toISOString(),
        price: 0,
        downloads: 14200,
        rating: 4.7,
        seller_name: "AcademiaAI",
        is_featured: false,
    },
    {
        id: "store-8",
        name: "DevOps Engineer",
        description: "Expert in CI/CD, Docker, Kubernetes, cloud infrastructure, and deployment automation",
        system_prompt: `You are a senior DevOps engineer with expertise in modern infrastructure. Your specialties:

1. CI/CD: Design and troubleshoot pipelines (GitHub Actions, GitLab CI, Jenkins)
2. CONTAINERS: Docker best practices, optimization, and security
3. ORCHESTRATION: Kubernetes deployment, scaling, and management
4. CLOUD: AWS, GCP, Azure infrastructure and services
5. IaC: Terraform, Ansible, and CloudFormation

When helping:
- Consider security at every step
- Optimize for cost and performance
- Provide production-ready configurations
- Explain trade-offs in different approaches
- Include monitoring and logging recommendations`,
        category: "Development",
        model: "grok-3",
        is_public: true,
        tags: ["devops", "docker", "kubernetes", "cloud"],
        user_id: "seller-8",
        created_at: new Date().toISOString(),
        price: 39.99,
        downloads: 5600,
        rating: 4.8,
        seller_name: "CloudOps",
        is_featured: true,
    },
];

const CATEGORIES = ["All", "Business", "Development", "Marketing", "Creative", "Education", "Research"];

interface AgentStoreProps {
    userId?: string;
    onAgentSelect?: (agent: Agent) => void;
}

export const AgentStore = ({ userId, onAgentSelect }: AgentStoreProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortBy, setSortBy] = useState("popular");
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
    const [addingToLibrary, setAddingToLibrary] = useState<string | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Load purchased agents on mount
    useEffect(() => {
        setPurchasedIds(getPurchasedAgentIds());
    }, []);

    const filteredAgents = STORE_AGENTS.filter(agent => {
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

    const handleTryAgent = (agent: Agent) => {
        // Navigate to dashboard with agent for a demo
        navigate('/dashboard', { state: { selectedAgent: agent, isDemo: true } });
    };

    const renderAgentGrid = (agents: Agent[]) => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
                const isOwned = purchasedIds.has(agent.id);
                const isAdding = addingToLibrary === agent.id;

                return (
                    <Card
                        key={agent.id}
                        className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-card via-card to-card/80 border-border/50 hover:border-primary/30"
                    >
                        {agent.is_featured && (
                            <div className="absolute top-3 right-3 z-10">
                                <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-sm">
                                    <Crown className="h-3 w-3 mr-1" /> Featured
                                </Badge>
                            </div>
                        )}

                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">by {agent.seller_name}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {agent.description}
                            </p>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-4">
                            {/* Stats Row */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Download className="h-3 w-3" />
                                    {(agent.downloads || 0).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-primary/20 text-primary" />
                                    {agent.rating?.toFixed(1)}
                                </div>
                                <Badge variant="outline" className="text-xs">{agent.category}</Badge>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                                {agent.tags?.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            {/* Price and Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <div className="text-xl font-bold">
                                    {agent.price === 0 ? (
                                        <span className="text-primary">Free</span>
                                    ) : (
                                        <span>${agent.price?.toFixed(2)}</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleTryAgent(agent)}
                                    >
                                        <Play className="h-3 w-3 mr-1" /> Try
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handlePurchase(agent)}
                                        disabled={isOwned || isAdding}
                                        className={isOwned ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : ""}
                                    >
                                        {isAdding ? (
                                            <>
                                                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                                                Adding...
                                            </>
                                        ) : isOwned ? (
                                            <>
                                                <Check className="h-3 w-3 mr-1" /> Owned
                                            </>
                                        ) : agent.price === 0 ? (
                                            "Get Free"
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-3 w-3 mr-1" /> Buy
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search agents by name, description, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[160px] bg-background/50">
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
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                    <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="rounded-full"
                    >
                        {category}
                    </Button>
                ))}
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-muted/50 border border-border/50">
                    <TabsTrigger value="all" className="gap-2">
                        <Bot className="h-4 w-4" />
                        All ({filteredAgents.length})
                    </TabsTrigger>
                    <TabsTrigger value="featured" className="gap-2">
                        <Crown className="h-4 w-4" />
                        Featured ({featuredAgents.length})
                    </TabsTrigger>
                    <TabsTrigger value="free" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Free ({freeAgents.length})
                    </TabsTrigger>
                    <TabsTrigger value="premium" className="gap-2">
                        <Zap className="h-4 w-4" />
                        Premium ({premiumAgents.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    {renderAgentGrid(filteredAgents)}
                    {filteredAgents.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No agents found matching your criteria</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="featured" className="mt-6">
                    {renderAgentGrid(featuredAgents)}
                </TabsContent>

                <TabsContent value="free" className="mt-6">
                    {renderAgentGrid(freeAgents)}
                </TabsContent>

                <TabsContent value="premium" className="mt-6">
                    {renderAgentGrid(premiumAgents)}
                </TabsContent>
            </Tabs>

            {/* Stats Banner */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="py-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <div className="text-3xl font-bold text-primary">{STORE_AGENTS.length}</div>
                            <div className="text-sm text-muted-foreground">Agents Available</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary">
                                {STORE_AGENTS.reduce((sum, a) => sum + (a.downloads || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Downloads</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary">
                                {(STORE_AGENTS.reduce((sum, a) => sum + (a.rating || 0), 0) / STORE_AGENTS.length).toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Average Rating</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary">{purchasedIds.size}</div>
                            <div className="text-sm text-muted-foreground">In Your Library</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentStore;
