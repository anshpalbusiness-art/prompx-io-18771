import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { History, Copy, Star, Clock, TrendingUp } from "lucide-react";
import { format } from 'date-fns';
import SocialShare from "@/components/SocialShare";

interface PromptHistoryItem {
  id: string;
  original_prompt: string;
  optimized_prompt: string;
  platform: string;
  rating: number | null;
  created_at: string;
}

interface PromptHistoryProps {
  userId: string;
  onPromptSelect: (prompt: string) => void;
}

export const PromptHistory = ({ userId, onPromptSelect }: PromptHistoryProps) => {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ratePrompt = async (id: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('prompt_history')
        .update({ rating })
        .eq('id', id);

      if (error) throw error;

      setHistory(history.map(item =>
        item.id === id ? { ...item, rating } : item
      ));

      toast({
        title: "✅ Rating Saved",
        description: "Thanks for the feedback! PromptX will learn from this.",
      });
    } catch (error: any) {
      toast({
        title: "Error Saving Rating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle>Prompt History & Learning</CardTitle>
        </div>
        <CardDescription>
          Your past prompts help PromptX learn your style and improve over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No history yet. Generate some prompts to start learning!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {history.map((item) => (
              <Card key={item.id} className="border-secondary/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), 'MMM d, yyyy - h:mm a')}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.platform}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Original:</p>
                        <p className="text-sm text-foreground/80 line-clamp-2">{item.original_prompt}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Optimized:</p>
                        <p className="text-sm line-clamp-3">{item.optimized_prompt}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => ratePrompt(item.id, star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-4 w-4 ${item.rating && star <= item.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                                }`}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(item.optimized_prompt)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPromptSelect(item.original_prompt)}
                        >
                          Reuse
                        </Button>
                        <SocialShare
                          title={`Check out my ${item.platform} prompt!`}
                          description={item.optimized_prompt.substring(0, 150) + "..."}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
