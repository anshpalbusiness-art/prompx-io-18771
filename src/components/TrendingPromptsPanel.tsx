import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Star, 
  Download, 
  Eye, 
  Award,
  Flame
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TrendingPrompt {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  downloads: number;
  views: number;
  created_at?: string;
  avg_rating: number;
  rating_count: number;
  star_count: number;
  trending_score?: number;
}

export const TrendingPromptsPanel = () => {
  const [trendingPrompts, setTrendingPrompts] = useState<TrendingPrompt[]>([]);
  const [topRatedPrompts, setTopRatedPrompts] = useState<TrendingPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const [trendingRes, topRatedRes] = await Promise.all([
        supabase
          .from('trending_prompts')
          .select('*')
          .limit(10),
        supabase
          .from('top_rated_prompts')
          .select('*')
          .limit(10)
      ]);

      if (trendingRes.data) setTrendingPrompts(trendingRes.data);
      if (topRatedRes.data) setTopRatedPrompts(topRatedRes.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const PromptCard = ({ prompt, rank }: { prompt: TrendingPrompt; rank: number }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                #{rank}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {prompt.category}
              </Badge>
            </div>
            <CardTitle className="text-lg">{prompt.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {prompt.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{prompt.avg_rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({prompt.rating_count})</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span>{prompt.star_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{prompt.downloads}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{prompt.views}</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {prompt.price === 0 ? 'FREE' : `$${prompt.price.toFixed(2)}`}
          </div>
          <Button size="sm">View Details</Button>
        </div>

        {/* Time */}
        {prompt.created_at && (
          <div className="text-xs text-muted-foreground">
            Added {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">Loading trending prompts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          <CardTitle>Trending & Top Rated</CardTitle>
        </div>
        <CardDescription>
          Discover the most popular and highest-rated prompts in the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trending">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="top-rated">
              <Award className="w-4 h-4 mr-2" />
              Top Rated
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-6 space-y-4">
            {trendingPrompts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No trending prompts yet
              </p>
            ) : (
              trendingPrompts.map((prompt, idx) => (
                <PromptCard key={prompt.id} prompt={prompt} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          <TabsContent value="top-rated" className="mt-6 space-y-4">
            {topRatedPrompts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No rated prompts yet
              </p>
            ) : (
              topRatedPrompts.map((prompt, idx) => (
                <PromptCard key={prompt.id} prompt={prompt} rank={idx + 1} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
