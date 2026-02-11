import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Bot, Play, Settings, BarChart3, Clock, Zap,
    Star, DollarSign, Users, Brain, MoreVertical,
    Trash2, Edit, Copy, Share2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Agent {
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    category: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    is_public?: boolean;
    tags?: string[];
    user_id: string;
    created_at: string;
    // New metrics fields
    executions?: number;
    avg_response_time?: number;
    total_tokens?: number;
    quality_score?: number;
    // Store fields
    price?: number;
    downloads?: number;
    rating?: number;
    seller_name?: string;
    is_featured?: boolean;
}

interface AgentCardProps {
    agent: Agent;
    variant?: 'default' | 'store' | 'compact';
    onChat?: (agent: Agent) => void;
    onEdit?: (agent: Agent) => void;
    onDelete?: (agent: Agent) => void;
    onDuplicate?: (agent: Agent) => void;
    onShare?: (agent: Agent) => void;
    onPurchase?: (agent: Agent) => void;
    onViewMetrics?: (agent: Agent) => void;
    showMetrics?: boolean;
    showActions?: boolean;
    className?: string;
}

const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
        Writing: '✍️',
        Education: '📚',
        Business: '💼',
        Marketing: '📈',
        Development: '💻',
        Research: '🔬',
        Creative: '🎨',
        Other: '🤖',
    };
    return icons[category] || '🤖';
};

const getModelBadgeColor = (model?: string) => {
    if (!model) return 'bg-muted';
    if (model.includes('gemini')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (model.includes('gpt')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (model.includes('claude')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-muted';
};

export const AgentCard = ({
    agent,
    variant = 'default',
    onChat,
    onEdit,
    onDelete,
    onDuplicate,
    onShare,
    onPurchase,
    onViewMetrics,
    showMetrics = false,
    showActions = true,
    className,
}: AgentCardProps) => {
    const isStore = variant === 'store';
    const isCompact = variant === 'compact';

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-xl",
                "bg-card",
                "border border-white/10 hover:border-white/20",
                "hover:translate-y-[-2px]",
                isCompact && "p-3",
                className
            )}
        >
            {/* Featured badge */}
            {agent.is_featured && (
                <div className="absolute top-0 right-0 bg-white text-black px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    Featured
                </div>
            )}

            {/* Subtle glow effect on hover - monochrome */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <CardHeader className={cn("pb-3", isCompact && "p-0 pb-2")}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        {/* Agent Icon */}
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl border border-white/10 group-hover:border-white/20 transition-colors">
                                {getCategoryIcon(agent.category)}
                            </div>
                            {agent.quality_score && agent.quality_score >= 90 && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-black" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold truncate group-hover:text-white transition-colors">
                                {agent.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs border-white/10">
                                    {agent.category}
                                </Badge>
                                {agent.model && (
                                    <Badge variant="outline" className="text-xs border-white/10 bg-transparent text-muted-foreground">
                                        {agent.model.split('/')[1]?.split('-').slice(0, 2).join('-') || agent.model}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions dropdown */}
                    {showActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
                                {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(agent)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit Agent
                                    </DropdownMenuItem>
                                )}
                                {onDuplicate && (
                                    <DropdownMenuItem onClick={() => onDuplicate(agent)}>
                                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                                    </DropdownMenuItem>
                                )}
                                {onShare && (
                                    <DropdownMenuItem onClick={() => onShare(agent)}>
                                        <Share2 className="h-4 w-4 mr-2" /> Share
                                    </DropdownMenuItem>
                                )}
                                {onViewMetrics && (
                                    <DropdownMenuItem onClick={() => onViewMetrics(agent)}>
                                        <BarChart3 className="h-4 w-4 mr-2" /> View Metrics
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem onClick={() => onDelete(agent)} className="text-white focus:text-white focus:bg-white/10">
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {!isCompact && (
                    <CardDescription className="mt-2 line-clamp-2 text-muted-foreground/80">
                        {agent.description || "No description provided"}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className={cn("pt-0 space-y-4", isCompact && "p-0")}>
                {/* Metrics Row */}
                {showMetrics && (
                    <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-white/5">
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                                {agent.executions?.toLocaleString() || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Runs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                                {agent.avg_response_time ? `${(agent.avg_response_time / 1000).toFixed(1)}s` : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">Avg Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                                {agent.total_tokens ? `${(agent.total_tokens / 1000).toFixed(1)}k` : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">Tokens</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                                {agent.quality_score ? `${agent.quality_score}%` : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">Quality</div>
                        </div>
                    </div>
                )}

                {/* Store variant: Price and ratings */}
                {isStore && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-white fill-white" />
                                <span className="font-semibold">{agent.rating?.toFixed(1) || '5.0'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">{agent.downloads?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {agent.price === 0 ? (
                                <Badge variant="outline" className="border-white/20">Free</Badge>
                            ) : (
                                <span className="text-lg font-bold">${agent.price?.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {agent.tags && agent.tags.length > 0 && !isCompact && (
                    <div className="flex flex-wrap gap-1.5">
                        {agent.tags.slice(0, 4).map((tag, i) => (
                            <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs bg-secondary/50 hover:bg-secondary transition-colors text-muted-foreground"
                            >
                                {tag}
                            </Badge>
                        ))}
                        {agent.tags.length > 4 && (
                            <Badge variant="secondary" className="text-xs bg-secondary/50 text-muted-foreground">
                                +{agent.tags.length - 4}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                    {isStore ? (
                        <>
                            <Button
                                onClick={() => onPurchase?.(agent)}
                                className="flex-1 bg-white text-black hover:bg-white/90"
                            >
                                {agent.price === 0 ? 'Get Free' : 'Purchase'}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => onChat?.(agent)} className="border-white/10 hover:bg-white/5">
                                <Play className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => onChat?.(agent)}
                                className="flex-1 bg-white text-black hover:bg-white/90"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Chat
                            </Button>
                            {onEdit && (
                                <Button variant="outline" size="icon" onClick={() => onEdit(agent)} className="border-white/10 hover:bg-white/5">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AgentCard;
