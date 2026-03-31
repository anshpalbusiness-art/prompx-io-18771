import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Bot, LayoutTemplate, TerminalSquare, Loader2, DollarSign, Plus, Sparkles, Network, Terminal } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Listing {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    tags: string[];
    is_workflow: boolean;
    prompt_content: string;
    preview_content: string;
    created_at: string;
}

interface MyPublishingsProps {
    user: User | null;
    onPublish?: (type: 'prompt' | 'workflow' | 'cli') => void;
}

export function MyPublishings({ user, onPublish }: MyPublishingsProps) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingListing, setEditingListing] = useState<Listing | null>(null);
    const [showPublishTypeModal, setShowPublishTypeModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            fetchListings();
        }
    }, [user]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("marketplace_listings")
                .select("*")
                .eq("seller_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setListings(data || []);
        } catch (error: any) {
            toast({ title: "Error fetching your publishings", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from("marketplace_listings")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast({ title: "Listing deleted" });
            setListings(listings.filter(l => l.id !== id));
        } catch (error: any) {
            toast({ title: "Error deleting listing", description: error.message, variant: "destructive" });
        }
    };

    const handleUpdate = async () => {
        if (!editingListing) return;
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from("marketplace_listings")
                .update({
                    title: editingListing.title,
                    description: editingListing.description,
                    category: editingListing.category,
                    price: editingListing.price,
                    tags: Array.isArray(editingListing.tags) ? editingListing.tags : (typeof editingListing.tags === "string" ? (editingListing.tags as string).split(',').map(t => t.trim()) : []),
                    prompt_content: editingListing.prompt_content,
                    preview_content: editingListing.preview_content,
                })
                .eq("id", editingListing.id);

            if (error) throw error;

            toast({ title: "Listing updated successfully!" });
            setEditingListing(null);
            fetchListings();
        } catch (error: any) {
            toast({ title: "Error updating", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const getListingIcon = (listing: Listing) => {
        if (listing.is_workflow) return <Network className="h-4 w-4 text-purple-400" />;
        if (listing.category === 'cli') return <Terminal className="h-4 w-4 text-green-400" />;
        return <Sparkles className="h-4 w-4 text-blue-400" />;
    };

    const getListingTypeLabel = (listing: Listing) => {
        if (listing.is_workflow) return "Workflow";
        if (listing.category === 'cli') return "CLI Tool";
        return "AI Prompt";
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-xl font-bold mb-2">Sign in Required</h3>
                <p className="text-muted-foreground mb-6">Please sign in to view and manage your marketplace publishings.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Your Publishings</h2>
                    <p className="text-muted-foreground">Manage the prompts, workflows, and CLIs you've listed on the marketplace.</p>
                </div>
                <Button onClick={() => setShowPublishTypeModal(true)} className="gap-2 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                    <Plus className="h-4 w-4" /> Publish New
                </Button>
            </div>

            {listings.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/10 p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <Bot className="h-12 w-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No publishings yet</h3>
                        <p className="text-muted-foreground mb-6">You haven't listed anything on the marketplace yet. Go to the other tabs to register your first item!</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map(listing => (
                        <Card key={listing.id} className="bg-white/[0.03] border-white/10 hover:bg-white/[0.05] transition-all overflow-hidden flex flex-col group h-full">
                            <CardHeader className="p-5 pb-4 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <div className="flex items-center gap-2">
                                        {getListingIcon(listing)}
                                        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">{getListingTypeLabel(listing)}</span>
                                    </div>
                                    <Badge variant="outline" className={`bg-black/40 border-white/10 ${listing.price === 0 ? "text-emerald-400" : "text-primary"}`}>
                                        {listing.price === 0 ? "FREE" : `$${listing.price.toFixed(2)}`}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                    {listing.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-sm text-white/60 mt-2 min-h-[40px]">
                                    {listing.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 pt-0 flex flex-col flex-grow">
                                <div className="flex flex-wrap gap-1.5 mb-6">
                                    {listing.tags?.slice(0, 3).map((tag, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {listing.tags?.length > 3 && (
                                        <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10">
                                            +{listing.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-auto pt-4 border-t border-white/10 flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                        onClick={() => {
                                            // Create a clean copy with tags joined to string for editing
                                            setEditingListing({
                                                ...listing,
                                                tags: Array.isArray(listing.tags) ? listing.tags.join(', ') : listing.tags
                                            } as any);
                                        }}
                                    >
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-12 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all font-medium"
                                        onClick={() => handleDelete(listing.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingListing} onOpenChange={(open) => !open && setEditingListing(null)}>
                <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden bg-zinc-950/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 flex flex-col rounded-2xl sm:rounded-[32px]">
                    <DialogHeader className="p-8 sm:px-10 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/[0.05] to-transparent relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                        <DialogTitle className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent relative z-10">Edit Listing</DialogTitle>
                        <DialogDescription className="text-white/60 text-base mt-2 relative z-10">
                            Update the details of your publishing.
                        </DialogDescription>
                    </DialogHeader>

                    {editingListing && (
                        <div className="flex-1 p-8 sm:px-10 overflow-y-auto bg-white/[0.02] space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Title / Name *</Label>
                                <Input
                                    value={editingListing.title}
                                    onChange={(e) => setEditingListing({ ...editingListing, title: e.target.value })}
                                    className="h-12 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-6 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Description *</Label>
                                <Textarea
                                    value={editingListing.description}
                                    onChange={(e) => setEditingListing({ ...editingListing, description: e.target.value })}
                                    rows={4}
                                    className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Category</Label>
                                    <Input
                                        value={editingListing.category}
                                        onChange={(e) => setEditingListing({ ...editingListing, category: e.target.value })}
                                        className="h-14 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Price (USD) *</Label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-medium">$</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editingListing.price}
                                            onChange={(e) => setEditingListing({ ...editingListing, price: parseFloat(e.target.value) || 0 })}
                                            className="h-14 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base pl-9 pr-5 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Tags (comma-separated)</Label>
                                <Input
                                    value={editingListing.tags as any}
                                    onChange={(e) => setEditingListing({ ...editingListing, tags: e.target.value as any })}
                                    className="h-12 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-6 transition-all shadow-inner"
                                />
                            </div>

                            {/* Only show preview content if it's a regular prompt (not flow/cli) where it might make sense, or just always show it */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                                    Preview Content
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full lowercase normal-case tracking-normal">Optional</span>
                                </Label>
                                <Textarea
                                    value={editingListing.preview_content || ""}
                                    onChange={(e) => setEditingListing({ ...editingListing, preview_content: e.target.value })}
                                    rows={2}
                                    className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner resize-none font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Core Content / Prompt / Logic *</Label>
                                <Textarea
                                    value={editingListing.prompt_content}
                                    onChange={(e) => setEditingListing({ ...editingListing, prompt_content: e.target.value })}
                                    rows={8}
                                    className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner font-mono text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-6 sm:px-10 border-t border-white/10 shrink-0 bg-white/[0.02] backdrop-blur-md flex justify-end items-center">
                        <Button
                            className="w-full sm:w-auto px-10 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] hover:shadow-[0_0_40px_-5px_rgba(var(--primary),0.7)] transition-all"
                            onClick={handleUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Publish Type Selection Modal */}
            <Dialog open={showPublishTypeModal} onOpenChange={setShowPublishTypeModal}>
                <DialogContent className="max-w-3xl w-[90vw] bg-zinc-950/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 flex flex-col rounded-2xl sm:rounded-[32px] overflow-hidden">
                    <DialogHeader className="p-8 sm:px-10 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/[0.05] to-transparent relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                        <DialogTitle className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent relative z-10 text-center">What would you like to publish?</DialogTitle>
                        <DialogDescription className="text-white/60 text-base mt-2 relative z-10 text-center">
                            Select the type of AI asset you want to list on the marketplace.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 sm:p-10 bg-white/[0.02] grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {/* AI Prompt Button */}
                        <button
                            onClick={() => {
                                setShowPublishTypeModal(false);
                                onPublish?.('prompt');
                            }}
                            className="relative flex flex-col items-center justify-center p-8 rounded-2xl border border-white/5 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all duration-300 group cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 mb-5 group-hover:scale-110 group-hover:border-blue-500/30 group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] transition-all duration-300">
                                <Sparkles className="h-8 w-8 text-blue-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 relative z-10 transition-colors group-hover:text-blue-400">AI Prompt</h3>
                            <p className="text-sm text-zinc-400 text-center relative z-10 leading-relaxed font-medium">Monetize powerful, single-purpose AI prompts.</p>
                        </button>

                        {/* Workflow Button */}
                        <button
                            onClick={() => {
                                setShowPublishTypeModal(false);
                                onPublish?.('workflow');
                            }}
                            className="relative flex flex-col items-center justify-center p-8 rounded-2xl border border-white/5 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all duration-300 group cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 mb-5 group-hover:scale-110 group-hover:border-purple-500/30 group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)] transition-all duration-300">
                                <Network className="h-8 w-8 text-purple-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 relative z-10 transition-colors group-hover:text-purple-400">Workflow</h3>
                            <p className="text-sm text-zinc-400 text-center relative z-10 leading-relaxed font-medium">Share multi-step automated agent processes.</p>
                        </button>

                        {/* CLI Agent Button */}
                        <button
                            onClick={() => {
                                setShowPublishTypeModal(false);
                                onPublish?.('cli');
                            }}
                            className="relative flex flex-col items-center justify-center p-8 rounded-2xl border border-white/5 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all duration-300 group cursor-pointer overflow-hidden text-left"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 mb-5 group-hover:scale-110 group-hover:border-green-500/30 group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)] transition-all duration-300">
                                <Terminal className="h-8 w-8 text-green-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 relative z-10 transition-colors group-hover:text-green-400">CLI Agent</h3>
                            <p className="text-sm text-zinc-400 text-center relative z-10 leading-relaxed font-medium">Deploy powerful AI-driven terminal tools.</p>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
