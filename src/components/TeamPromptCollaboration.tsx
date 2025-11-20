import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TeamPrompt {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  original_prompt: string;
  optimized_prompt: string;
  platform: string;
  category: string;
  created_at: string;
  creator_profile?: {
    username: string;
    email: string;
  };
  ratings?: Array<{ rating: number; review: string; user_id: string }>;
}

interface TeamPromptCollaborationProps {
  user: User;
  teamId: string;
}

export const TeamPromptCollaboration = ({ user, teamId }: TeamPromptCollaborationProps) => {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<TeamPrompt[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<TeamPrompt | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  
  const [newPrompt, setNewPrompt] = useState({
    title: "",
    original_prompt: "",
    optimized_prompt: "",
    platform: "chatgpt",
    category: "general"
  });

  useEffect(() => {
    loadPrompts();
    
    // Set up real-time subscription for team prompts
    const channel = supabase
      .channel('team-prompts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_prompts',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('Team prompt change:', payload);
          loadPrompts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const loadPrompts = async () => {
    const { data, error } = await supabase
      .from('team_prompts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading prompts:', error);
      return;
    }

    // Load creator profiles and ratings for each prompt
    const enrichedPrompts = await Promise.all(
      (data || []).map(async (prompt) => {
        // Get creator profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', prompt.created_by)
          .single();

        // Get ratings
        const { data: ratings } = await supabase
          .from('prompt_ratings')
          .select('*')
          .eq('prompt_id', prompt.id);

        return {
          ...prompt,
          creator_profile: profile,
          ratings: ratings || []
        };
      })
    );

    setPrompts(enrichedPrompts);
  };

  const createPrompt = async () => {
    if (!newPrompt.title || !newPrompt.original_prompt) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and prompt",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('team_prompts').insert({
      team_id: teamId,
      created_by: user.id,
      title: newPrompt.title,
      original_prompt: newPrompt.original_prompt,
      optimized_prompt: newPrompt.optimized_prompt,
      platform: newPrompt.platform,
      category: newPrompt.category
    });

    if (error) {
      toast({
        title: "Error creating prompt",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Prompt shared",
      description: "Your prompt has been shared with the team"
    });

    setNewPrompt({
      title: "",
      original_prompt: "",
      optimized_prompt: "",
      platform: "chatgpt",
      category: "general"
    });
    setIsCreateDialogOpen(false);
  };

  const submitRating = async () => {
    if (!selectedPrompt) return;

    const { error } = await supabase.from('prompt_ratings').upsert({
      prompt_id: selectedPrompt.id,
      user_id: user.id,
      rating,
      review
    });

    if (error) {
      toast({
        title: "Error submitting rating",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Rating submitted",
      description: "Thank you for your feedback"
    });

    setRating(5);
    setReview("");
    setSelectedPrompt(null);
    loadPrompts();
  };

  const getAverageRating = (ratings: any[]) => {
    if (!ratings || ratings.length === 0) return 0;
    return (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Team Prompts</h3>
          <p className="text-sm text-muted-foreground">Collaborate and share prompts with your team</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Share Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Share Prompt with Team</DialogTitle>
              <DialogDescription>
                Share your prompt for team collaboration and feedback
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newPrompt.title}
                  onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                  placeholder="Prompt title"
                />
              </div>
              <div>
                <Label>Original Prompt</Label>
                <Textarea
                  value={newPrompt.original_prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, original_prompt: e.target.value })}
                  placeholder="Your prompt..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Optimized Version (optional)</Label>
                <Textarea
                  value={newPrompt.optimized_prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, optimized_prompt: e.target.value })}
                  placeholder="Improved version..."
                  rows={4}
                />
              </div>
              <Button onClick={createPrompt} className="w-full">
                Share with Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team prompts yet</p>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="line-clamp-1">{prompt.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      by {prompt.creator_profile?.username || prompt.creator_profile?.email}
                    </p>
                  </div>
                  <Badge>{prompt.platform}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm line-clamp-3">{prompt.original_prompt}</p>
                </div>

                {prompt.optimized_prompt && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <Label className="text-xs text-primary mb-1 block">Optimized</Label>
                    <p className="text-sm line-clamp-3">{prompt.optimized_prompt}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {getAverageRating(prompt.ratings || [])}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({prompt.ratings?.length || 0} ratings)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Rate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={!!selectedPrompt} onOpenChange={() => setSelectedPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Prompt</DialogTitle>
            <DialogDescription>
              Share your feedback with the team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating (1-5 stars)</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant={rating >= star ? "default" : "outline"}
                    size="icon"
                    onClick={() => setRating(star)}
                  >
                    <Star className={`h-4 w-4 ${rating >= star ? 'fill-current' : ''}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Review (optional)</Label>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
            </div>
            <Button onClick={submitRating} className="w-full">
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
