import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Sparkles, TrendingUp, Code, Heart, GraduationCap, ShoppingCart, Scale, DollarSign, Plus, Check, Loader2, Crown, Flame, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RegistrationAssistant } from "./RegistrationAssistant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

interface IndustryTemplate {
  id: string;
  industry: string;
  template_name: string;
  template_prompt: string;
  description: string;
  platform: string;
  price?: number;
  seller_id?: string;
  seller_name?: string;
  isOwned?: boolean;
}

interface IndustryTemplatesProps {
  userId?: string;
  onTemplateSelect?: (template: any) => void;
  triggerCreate?: boolean;
  onTriggerHandled?: () => void;
}

const INDUSTRY_ICONS: { [key: string]: any } = {
  trading: TrendingUp,
  marketing: Sparkles,
  coding: Code,
  healthcare: Heart,
  education: GraduationCap,
  'e-commerce': ShoppingCart,
  legal: Scale,
  finance: DollarSign,
};

export const IndustryTemplates = ({ userId, onTemplateSelect, triggerCreate, onTriggerHandled }: IndustryTemplatesProps) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Registration Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListing, setNewListing] = useState({
    template_name: "",
    description: "",
    template_prompt: "",
    industry: "marketing",
    platform: "All",
    price: 0,
  });

  // Purchase Dialog State
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, [userId]);

  useEffect(() => {
    if (triggerCreate) {
      setShowCreateDialog(true);
      onTriggerHandled?.();
    }
  }, [triggerCreate, onTriggerHandled]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Load standard templates
      const { data: standardData, error: standardError } = await supabase
        .from('industry_templates')
        .select('*')
        .order('industry', { ascending: true });

      if (standardError) throw standardError;

      // Load marketplace workflows
      const { data: communityData, error: communityError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_workflow', true)
        .eq('is_active', true);

      if (communityError) throw communityError;

      let userPurchases: string[] = [];
      if (userId) {
        const { data: purchases } = await supabase
          .from('prompt_purchases')
          .select('listing_id')
          .eq('buyer_id', userId);
        userPurchases = purchases?.map(p => p.listing_id) || [];
      }

      // Fetch seller profiles for community workflows
      const sellerIds = [...new Set(communityData?.map(l => l.seller_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", sellerIds);

      const communityTemplates: IndustryTemplate[] = communityData.map((listing: any) => {
        const seller = profiles?.find(p => p.id === listing.seller_id);
        const sellerName = seller?.username || seller?.email?.split('@')[0] || "Anonymous";
        return {
          id: listing.id,
          industry: listing.category || 'other',
          template_name: listing.title,
          template_prompt: listing.prompt_content,
          description: listing.description,
          platform: (listing.tags && listing.tags[0]) || 'Community',
          price: listing.price,
          seller_id: listing.seller_id,
          seller_name: sellerName,
          isOwned: userPurchases.includes(listing.id) || listing.seller_id === userId,
        };
      });

      // Standard templates have no price so they are free
      const standardTemplates: IndustryTemplate[] = standardData?.map(t => ({
        ...t,
        price: 0,
        isOwned: true,
      })) || [];

      setTemplates([...standardTemplates, ...communityTemplates]);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error Loading Templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createListing = async () => {
    if (!userId) {
      toast({ title: "Authentication required", description: "Please sign in to list a workflow", variant: "destructive" });
      return;
    }
    if (!newListing.template_name || !newListing.description || !newListing.template_prompt) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("marketplace_listings").insert({
        title: newListing.template_name,
        description: newListing.description,
        prompt_content: newListing.template_prompt,
        category: newListing.industry,
        price: newListing.price,
        tags: [newListing.platform],
        seller_id: userId,
        is_active: true,
        is_workflow: true,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Workflow listed successfully" });
      setNewListing({
        template_name: "",
        description: "",
        template_prompt: "",
        industry: "marketing",
        platform: "All",
        price: 0,
      });
      setShowCreateDialog(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePurchase = async () => {
    if (!userId || !selectedTemplate) return;

    setIsPurchasing(true);
    try {
      const { error: purchaseError } = await supabase.from("prompt_purchases").insert({
        listing_id: selectedTemplate.id,
        buyer_id: userId,
        price: selectedTemplate.price,
      });

      if (purchaseError) throw purchaseError;

      toast({ title: "Purchase successful!", description: "You can now use this workflow." });
      setShowPurchaseDialog(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPurchasing(false);
    }
  };

  const industries = ['all', ...Array.from(new Set(templates.map(t => t.industry)))];

  let filtered = templates;

  if (activeTab === "featured") {
    // standard templates are featured (price === 0)
    filtered = filtered.filter(t => t.price === 0);
  } else if (activeTab === "trending") {
    // community templates are trending (price > 0)
    filtered = filtered.filter(t => (t.price || 0) > 0);
  } else if (activeTab === "purchased") {
    filtered = filtered.filter(t => t.isOwned);
  }

  if (selectedIndustry !== 'all') {
    filtered = filtered.filter(t => t.industry === selectedIndustry);
  }

  const filteredTemplates = filtered;

  const handleTemplateClick = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Industry Templates</CardTitle>
          </div>
          {userId && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-full px-4 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all font-semibold">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Register Workflow</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-hidden bg-zinc-950/90 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] p-0 flex flex-col rounded-2xl sm:rounded-[32px]">
                <DialogHeader className="p-8 sm:px-10 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/[0.05] to-transparent relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"></div>
                  <DialogTitle className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent relative z-10">Register Your Workflow</DialogTitle>
                  <DialogDescription className="text-white/60 text-base mt-2 relative z-10">
                    Share your specialized workflows with the community and monetize your expertise.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
                  {/* Left Side: Manual Form */}
                  <div className="flex-1 p-8 sm:px-10 overflow-y-auto border-r border-white/10 bg-white/[0.02]">
                    <div className="space-y-6 text-left max-w-3xl mx-auto">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Workflow Name *</Label>
                        <Input
                          value={newListing.template_name}
                          onChange={(e) => setNewListing({ ...newListing, template_name: e.target.value })}
                          placeholder="E.g., Automated SEO Content Generator"
                          className="h-12 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-6 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Description *</Label>
                        <Textarea
                          value={newListing.description}
                          onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                          placeholder="Describe what your workflow achieves..."
                          rows={3}
                          className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Industry/Category *</Label>
                          <Select value={newListing.industry} onValueChange={(value) => setNewListing({ ...newListing, industry: value })}>
                            <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl px-5 transition-all shadow-inner">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950/95 border-white/10 backdrop-blur-xl">
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="trading">Trading</SelectItem>
                              <SelectItem value="coding">Coding</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="e-commerce">E-Commerce</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="legal">Legal</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest">Platform / Tags</Label>
                        <Input
                          value={newListing.platform}
                          onChange={(e) => setNewListing({ ...newListing, platform: e.target.value })}
                          placeholder="e.g., Cross-Platform, Web, API"
                          className="h-12 bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-6 transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                          Workflow Prompt / Configuration *
                          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full lowercase normal-case tracking-normal">Core Logic</span>
                        </Label>
                        <Textarea
                          value={newListing.template_prompt}
                          onChange={(e) => setNewListing({ ...newListing, template_prompt: e.target.value })}
                          placeholder="Provide the core chain-of-thought instructions or JSON schema the model should execute..."
                          rows={6}
                          className="bg-white/[0.03] border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/[0.05] rounded-xl text-base px-5 py-4 transition-all shadow-inner font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: AI Assistant */}
                  <div className="w-full md:w-[420px] p-0 flex flex-col shrink-0 border-l border-white/10 bg-gradient-to-b from-black/60 to-black/90 relative z-10 shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.5)]">
                    <RegistrationAssistant
                      itemType="Workflow"
                      onSuggest={(suggest) => {
                        setNewListing(prev => ({
                          ...prev,
                          template_name: suggest.template_name || suggest.title || prev.template_name,
                          description: suggest.description || prev.description,
                          price: suggest.price !== undefined ? suggest.price : prev.price,
                          platform: suggest.tags || prev.platform,
                          template_prompt: suggest.template_prompt || suggest.system_prompt || prev.template_prompt,
                          industry: suggest.category ? suggest.category.toLowerCase() : prev.industry
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
                    disabled={!newListing.template_name || !newListing.description || !newListing.template_prompt}
                  >
                    Register Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <CardDescription>
          Pre-built prompt templates optimized for specific industries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading templates...</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="bg-background/40 backdrop-blur-md border border-white/10 rounded-full h-10 p-1 w-full sm:w-auto flex">
                  <TabsTrigger value="all" className="rounded-full px-4 text-xs font-medium flex-1 sm:flex-none">All</TabsTrigger>
                  <TabsTrigger value="featured" className="rounded-full px-4 gap-1.5 text-xs font-medium flex-1 sm:flex-none"><Crown className="h-3 w-3" /> Featured</TabsTrigger>
                  <TabsTrigger value="trending" className="rounded-full px-4 gap-1.5 text-xs font-medium flex-1 sm:flex-none"><Flame className="h-3 w-3" /> Trending</TabsTrigger>
                  {userId && <TabsTrigger value="purchased" className="rounded-full px-4 gap-1.5 text-xs font-medium flex-1 sm:flex-none"><CheckCircle className="h-3 w-3" /> Owned</TabsTrigger>}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={selectedIndustry === industry ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedIndustry(industry)}
                >
                  {industry === 'all' ? 'All' : industry.charAt(0).toUpperCase() + industry.slice(1)}
                </Button>
              ))}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredTemplates.map((template) => {
                const Icon = INDUSTRY_ICONS[template.industry] || Briefcase;
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{template.template_name}</h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {template.industry}
                              </Badge>
                              {template.price !== undefined && template.price > 0 && !template.isOwned && (
                                <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                                  ${template.price.toFixed(2)}
                                </Badge>
                              )}
                              {template.isOwned && template.price !== undefined && template.price > 0 && (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                  <Check className="h-3 w-3 mr-1" /> Owned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates found for this industry
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-3xl border-white/10">
          <DialogHeader>
            <DialogTitle>Unlock Workflow</DialogTitle>
            <DialogDescription>
              Purchase this community workflow to use it.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 pt-4">
              <div className="p-4 rounded-xl bg-secondary/20 border border-white/5 space-y-2">
                <h4 className="font-semibold">{selectedTemplate.template_name}</h4>
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                <div className="flex justify-between items-center pt-2">
                  <Badge variant="outline">{selectedTemplate.industry}</Badge>
                  <span className="text-xl font-bold">${selectedTemplate.price?.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                size="lg"
                onClick={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${selectedTemplate.price?.toFixed(2)}`
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-3xl border-white/10">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{selectedTemplate?.template_name}</DialogTitle>
                <DialogDescription>{selectedTemplate?.description}</DialogDescription>
              </div>
              <Badge variant="secondary" className="capitalize">
                {selectedTemplate?.industry === 'all' ? 'Various' : selectedTemplate?.industry}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTemplate?.price !== undefined && selectedTemplate.price > 0 && !selectedTemplate.isOwned ? (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-1">
                    {selectedTemplate?.seller_name || "Community Workflow"}
                  </p>
                  <p className="text-sm text-muted-foreground">Premium Template</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${selectedTemplate.price}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-primary/20">
                <div>
                  <p className="font-medium flex items-center gap-1 text-primary">
                    <CheckCircle className="h-4 w-4" /> Available to Use
                  </p>
                  <p className="text-sm text-muted-foreground">You have access to this workflow.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Workflow Configuration Preview</Label>
              <div className="p-4 bg-muted/30 rounded-lg border font-mono text-sm max-h-60 overflow-y-auto">
                <p className="whitespace-pre-wrap">
                  {selectedTemplate?.isOwned || (selectedTemplate?.price === 0)
                    ? selectedTemplate?.template_prompt
                    : "🔒 Full workflow configuration is hidden. \n\nPurchase this workflow to unlock the complete multi-agent system, tools, and prompts."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
              {selectedTemplate?.price !== undefined && selectedTemplate.price > 0 && !selectedTemplate.isOwned ? (
                <Button
                  className="w-full gap-2 h-12 text-base font-bold text-white bg-gradient-to-r from-primary to-primary/80 hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all"
                  onClick={() => {
                    setShowPreviewDialog(false);
                    setShowPurchaseDialog(true);
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Buy for ${selectedTemplate.price}
                </Button>
              ) : (
                <Button
                  className="w-full gap-2 h-12 text-base font-bold bg-white text-black hover:bg-zinc-200 transition-all font-sans"
                  onClick={() => {
                    setShowPreviewDialog(false);
                    navigate('/workflow', { state: { initialPrompt: selectedTemplate?.template_prompt } });
                  }}
                >
                  <Sparkles className="h-5 w-5" />
                  Use Workflow
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
