import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Search, TrendingUp, ShoppingCart, Star, Eye, Download, Plus, DollarSign, Tag, Heart, Share2, Filter, Sparkles, Crown, Flame, BarChart3, CheckCircle, Award, Copy } from "lucide-react";
import SocialShare from "@/components/SocialShare";

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  downloads: number;
  views: number;
  seller_id: string;
  seller_name?: string;
  seller_verified?: boolean;
  seller_avatar?: string;
  prompt_content: string;
  preview_content?: string;
  created_at: string;
  rating?: number;
  review_count?: number;
  purchased?: boolean;
  is_workflow?: boolean;
  workflow_steps?: any;
  is_featured?: boolean;
  is_trending?: boolean;
  revenue?: number;
}

interface PromptMarketplaceProps {
  user: User | null;
}

export const PromptMarketplace = ({ user }: PromptMarketplaceProps) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const [newListing, setNewListing] = useState({
    title: "",
    description: "",
    prompt_content: "",
    preview_content: "",
    category: "marketing",
    price: 0,
    tags: ""
  });

  useEffect(() => {
    loadListings();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, selectedCategory, priceRange, minRating, sortBy, activeTab]);

  const loadListings = async () => {
    try {
      const { data: listingsData, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch seller profiles
      const sellerIds = [...new Set(listingsData?.map(l => l.seller_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", sellerIds);

      // Fetch ratings
      const listingIds = listingsData?.map(l => l.id) || [];
      const { data: ratingsData } = await supabase
        .from("prompt_ratings")
        .select("prompt_id, rating")
        .in("prompt_id", listingIds);

      // Fetch purchase counts
      const { data: purchaseData } = await supabase
        .from("prompt_purchases")
        .select("listing_id")
        .in("listing_id", listingIds);

      // Fetch user purchases
      let userPurchases: any[] = [];
      if (user) {
        const { data } = await supabase
          .from("prompt_purchases")
          .select("listing_id")
          .eq("buyer_id", user.id);
        userPurchases = data || [];
      }

      const enrichedListings = listingsData?.map((listing) => {
        const seller = profiles?.find(p => p.id === listing.seller_id);
        const listingRatings = ratingsData?.filter(r => r.prompt_id === listing.id) || [];
        const avgRating = listingRatings.length > 0
          ? listingRatings.reduce((sum, r) => sum + r.rating, 0) / listingRatings.length
          : 0;
        const purchases = purchaseData?.filter(p => p.listing_id === listing.id).length || 0;
        
        return {
          ...listing,
          seller_name: seller?.username || "Anonymous",
          seller_verified: purchases > 10,
          seller_avatar: seller?.avatar_url,
          rating: Math.round(avgRating * 10) / 10,
          review_count: listingRatings.length,
          downloads: purchases,
          purchased: userPurchases.some(p => p.listing_id === listing.id),
          is_trending: purchases > 5 && listing.views > 100,
          is_featured: purchases > 20 || avgRating >= 4.5,
          revenue: purchases * listing.price,
        };
      }) || [];

      setListings(enrichedListings);
    } catch (error: any) {
      console.error("Error loading listings:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace listings",
        variant: "destructive",
      });
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("user_activity")
        .select("metadata")
        .eq("user_id", user.id)
        .eq("activity_type", "favorite_listing");
      
      const favIds = data?.map(d => {
        const metadata = d.metadata as any;
        return metadata?.listing_id;
      }).filter(Boolean) || [];
      setFavorites(new Set(favIds));
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const filterListings = () => {
    let filtered = listings;

    if (activeTab === "featured") {
      filtered = filtered.filter(l => l.is_featured);
    } else if (activeTab === "trending") {
      filtered = filtered.filter(l => l.is_trending);
    } else if (activeTab === "purchased") {
      filtered = filtered.filter(l => l.purchased);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((l) => l.category === selectedCategory);
    }

    filtered = filtered.filter((l) => l.price >= priceRange[0] && l.price <= priceRange[1]);

    if (minRating > 0) {
      filtered = filtered.filter((l) => (l.rating || 0) >= minRating);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          l.seller_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => (b.downloads + b.views) - (a.downloads + a.views));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredListings(filtered);
  };

  const toggleFavorite = async (listingId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    const newFavorites = new Set(favorites);
    if (favorites.has(listingId)) {
      newFavorites.delete(listingId);
    } else {
      newFavorites.add(listingId);
      await supabase.from("user_activity").insert({
        user_id: user.id,
        activity_type: "favorite_listing",
        metadata: { listing_id: listingId },
      });
    }
    setFavorites(newFavorites);
    toast({
      title: favorites.has(listingId) ? "Removed from favorites" : "Added to favorites",
    });
  };

  const createListing = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to list prompts",
        variant: "destructive",
      });
      return;
    }

    if (!newListing.title || !newListing.prompt_content) {
      toast({
        title: "Missing information",
        description: "Please fill in title and prompt content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("marketplace_listings").insert({
        seller_id: user.id,
        title: newListing.title,
        description: newListing.description,
        prompt_content: newListing.prompt_content,
        preview_content: newListing.preview_content,
        category: newListing.category,
        price: newListing.price,
        tags: newListing.tags.split(",").map(t => t.trim()).filter(Boolean),
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your prompt is now listed in the marketplace",
      });

      setNewListing({
        title: "",
        description: "",
        prompt_content: "",
        preview_content: "",
        category: "marketing",
        price: 0,
        tags: ""
      });
      setShowCreateDialog(false);
      loadListings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const purchaseListing = async (listing: MarketplaceListing) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase",
        variant: "destructive",
      });
      return;
    }

    if (listing.seller_id === user.id) {
      toast({
        title: "Cannot purchase",
        description: "You cannot purchase your own listing",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("prompt_purchases").insert({
        listing_id: listing.id,
        buyer_id: user.id,
        price: listing.price,
      });

      if (error) throw error;

      await supabase
        .from("marketplace_listings")
        .update({ downloads: (listing.downloads || 0) + 1 })
        .eq("id", listing.id);

      toast({
        title: "Purchase successful!",
        description: "You can now access the full prompt",
      });

      setShowPurchaseDialog(false);
      loadListings();
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const incrementViews = async (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      await supabase
        .from("marketplace_listings")
        .update({ views: (listing.views || 0) + 1 })
        .eq("id", listingId);
    }
  };

  const copyPrompt = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Marketplace</h2>
            <p className="text-sm text-muted-foreground">
              {filteredListings.length} prompts • {listings.filter(l => l.is_featured).length} featured • {listings.filter(l => l.is_trending).length} trending
            </p>
          </div>
        </div>
        {user && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                List Your Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>List Your Prompt</DialogTitle>
                <DialogDescription>
                  Share your best prompts with the community and earn
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newListing.title}
                    onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                    placeholder="E.g., Advanced Marketing Campaign Generator"
                  />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={newListing.description}
                    onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                    placeholder="Describe what makes your prompt unique and valuable..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={newListing.category} onValueChange={(value) => setNewListing({ ...newListing, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="trading">Trading</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price (USD) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newListing.price}
                      onChange={(e) => setNewListing({ ...newListing, price: parseFloat(e.target.value) || 0 })}
                      placeholder="9.99"
                    />
                  </div>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={newListing.tags}
                    onChange={(e) => setNewListing({ ...newListing, tags: e.target.value })}
                    placeholder="marketing, social media, conversion"
                  />
                </div>
                <div>
                  <Label>Preview Content</Label>
                  <Textarea
                    value={newListing.preview_content}
                    onChange={(e) => setNewListing({ ...newListing, preview_content: e.target.value })}
                    placeholder="A short preview that buyers can see before purchasing..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Full Prompt Content *</Label>
                  <Textarea
                    value={newListing.prompt_content}
                    onChange={(e) => setNewListing({ ...newListing, prompt_content: e.target.value })}
                    placeholder="Your complete prompt (only visible after purchase)..."
                    rows={6}
                  />
                </div>
                <Button onClick={createListing} className="w-full" size="lg">
                  Create Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-2xl bg-muted/50">
          <TabsTrigger value="all" className="flex-1 gap-2">
            <Sparkles className="h-4 w-4" />
            All Prompts
          </TabsTrigger>
          <TabsTrigger value="featured" className="flex-1 gap-2">
            <Crown className="h-4 w-4" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex-1 gap-2">
            <Flame className="h-4 w-4" />
            Trending
          </TabsTrigger>
          {user && (
            <TabsTrigger value="purchased" className="flex-1 gap-2">
              <CheckCircle className="h-4 w-4" />
              Purchased
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts, sellers, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "marketing", "trading", "coding", "design", "content", "education", "business"].map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="rounded-full"
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>

        {showFilters && (
          <Card className="p-4 space-y-4 bg-muted/30">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Price Range: ${priceRange[0]} - ${priceRange[1]}</span>
              </Label>
              <Slider
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                min={0}
                max={500}
                step={10}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={minRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinRating(rating)}
                    className="gap-1"
                  >
                    <Star className={`h-3 w-3 ${rating <= minRating ? 'fill-current' : ''}`} />
                    {rating > 0 && `${rating}+`}
                    {rating === 0 && "All"}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prompts found matching your criteria</p>
              <Button variant="outline" className="mt-4" onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setPriceRange([0, 500]);
                setMinRating(0);
                setActiveTab("all");
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredListings.map((listing) => (
            <Card key={listing.id} className="group hover:shadow-xl transition-all duration-300 hover:border-primary/50 relative overflow-hidden">
              {listing.is_featured && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1">
                    <Crown className="h-3 w-3" />
                    Featured
                  </Badge>
                </div>
              )}
              {listing.is_trending && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white gap-1">
                    <Flame className="h-3 w-3" />
                    Trending
                  </Badge>
                </div>
              )}

              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2 pt-8">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {listing.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => toggleFavorite(listing.id)}
                  >
                    <Heart className={`h-5 w-5 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2">{listing.description}</CardDescription>

                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {listing.seller_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {listing.seller_name}
                    {listing.seller_verified && (
                      <CheckCircle className="h-3 w-3 text-blue-500" />
                    )}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {listing.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs rounded-full">
                      {tag}
                    </Badge>
                  ))}
                  {listing.tags.length > 4 && (
                    <Badge variant="outline" className="text-xs rounded-full">
                      +{listing.tags.length - 4}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {listing.views}
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                      {listing.downloads}
                    </div>
                  </div>
                  {listing.rating && listing.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{listing.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({listing.review_count})</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      ${listing.price}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {listing.category}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowPreviewDialog(true);
                      }}
                      className="gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        incrementViews(listing.id);
                        setSelectedListing(listing);
                        setShowPurchaseDialog(true);
                      }}
                      disabled={listing.purchased}
                      className="gap-1"
                    >
                      {listing.purchased ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Owned
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{selectedListing?.title}</DialogTitle>
                <DialogDescription>{selectedListing?.description}</DialogDescription>
              </div>
              <Badge variant="secondary">{selectedListing?.category}</Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedListing?.seller_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium flex items-center gap-1">
                    {selectedListing?.seller_name}
                    {selectedListing?.seller_verified && (
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Verified Seller</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">${selectedListing?.price}</p>
                <p className="text-xs text-muted-foreground">{selectedListing?.downloads} sales</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prompt Preview</Label>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedListing?.preview_content || selectedListing?.prompt_content?.substring(0, 200) + "..."}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Full prompt available after purchase
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedListing?.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{selectedListing?.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div className="text-center">
                <Download className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{selectedListing?.downloads}</p>
                <p className="text-xs text-muted-foreground">Sales</p>
              </div>
              <div className="text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-yellow-400 fill-yellow-400" />
                <p className="text-sm font-medium">{selectedListing?.rating?.toFixed(1) || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="text-center">
                <Award className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{selectedListing?.review_count || 0}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => toggleFavorite(selectedListing?.id || "")}
              >
                <Heart className={`h-4 w-4 ${favorites.has(selectedListing?.id || "") ? 'fill-red-500 text-red-500' : ''}`} />
                {favorites.has(selectedListing?.id || "") ? "Saved" : "Save"}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  setShowPreviewDialog(false);
                  setShowPurchaseDialog(true);
                }}
                disabled={selectedListing?.purchased}
              >
                <ShoppingCart className="h-4 w-4" />
                {selectedListing?.purchased ? "Already Owned" : `Buy for $${selectedListing?.price}`}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <SocialShare
                title={`Check out "${selectedListing?.title}" on Prompt Marketplace`}
                description={`${selectedListing?.description} - Only $${selectedListing?.price}!`}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Prompt</DialogTitle>
            <DialogDescription>
              You're about to purchase "{selectedListing?.title}"
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <Card className="p-4 bg-muted/30">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prompt</span>
                    <span className="font-medium">{selectedListing.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Seller</span>
                    <span className="font-medium flex items-center gap-1">
                      {selectedListing.seller_name}
                      {selectedListing.seller_verified && (
                        <CheckCircle className="h-3 w-3 text-blue-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold text-primary">${selectedListing.price}</span>
                  </div>
                </div>
              </Card>

              {selectedListing.purchased ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    <CheckCircle className="inline h-4 w-4 mr-2" />
                    You own this prompt! Here's the full content:
                  </p>
                  <div className="p-3 bg-background rounded border">
                    <p className="text-sm whitespace-pre-wrap font-mono">{selectedListing.prompt_content}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => copyPrompt(selectedListing.prompt_content)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Prompt
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 After purchase, you'll have lifetime access to this prompt and can use it unlimited times.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowPurchaseDialog(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 gap-2" onClick={() => purchaseListing(selectedListing)}>
                      <ShoppingCart className="h-4 w-4" />
                      Confirm Purchase ${selectedListing.price}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};