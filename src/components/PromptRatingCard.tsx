import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Rating {
  id: string;
  user_id: string;
  rating: number;
  review: string;
  created_at: string;
  helpful_count: number;
  not_helpful_count: number;
  profiles?: {
    username: string;
  };
}

interface PromptRatingCardProps {
  promptId: string;
  userId: string | null;
}

export const PromptRatingCard = ({ promptId, userId }: PromptRatingCardProps) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [userReview, setUserReview] = useState("");
  const [hasStarred, setHasStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRatings();
    if (userId) {
      checkUserStar();
    }
  }, [promptId, userId]);

  const fetchRatings = async () => {
    try {
      const [ratingsRes, starsRes] = await Promise.all([
        supabase
          .from('prompt_ratings')
          .select('*')
          .eq('prompt_id', promptId)
          .order('created_at', { ascending: false }),
        supabase
          .from('prompt_stars')
          .select('*', { count: 'exact', head: true })
          .eq('prompt_id', promptId)
      ]);

      if (ratingsRes.data) {
        // Fetch usernames separately
        const userIds = ratingsRes.data.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const ratingsWithProfiles = ratingsRes.data.map(r => ({
          ...r,
          profiles: profiles?.find(p => p.id === r.user_id) || { username: 'Anonymous' }
        }));

        setRatings(ratingsWithProfiles);
        const avg = ratingsRes.data.reduce((sum, r) => sum + r.rating, 0) / ratingsRes.data.length;
        setAvgRating(avg || 0);
      }

      setStarCount(starsRes.count || 0);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserStar = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('prompt_stars')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('user_id', userId)
      .maybeSingle();

    setHasStarred(!!data);
  };

  const toggleStar = async () => {
    if (!userId) {
      toast.error('Please login to star prompts');
      return;
    }

    try {
      if (hasStarred) {
        await supabase
          .from('prompt_stars')
          .delete()
          .eq('prompt_id', promptId)
          .eq('user_id', userId);
        
        setHasStarred(false);
        setStarCount(prev => prev - 1);
        toast.success('Star removed');
      } else {
        await supabase
          .from('prompt_stars')
          .insert({ prompt_id: promptId, user_id: userId });
        
        setHasStarred(true);
        setStarCount(prev => prev + 1);
        toast.success('Starred!');
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('Failed to update star');
    }
  };

  const submitRating = async () => {
    if (!userId) {
      toast.error('Please login to rate');
      return;
    }

    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('prompt_ratings')
        .insert({
          prompt_id: promptId,
          user_id: userId,
          rating: userRating,
          review: userReview,
        });

      if (error) throw error;

      toast.success('Rating submitted!');
      setUserRating(0);
      setUserReview('');
      fetchRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const voteOnRating = async (ratingId: string, isHelpful: boolean) => {
    if (!userId) {
      toast.error('Please login to vote');
      return;
    }

    try {
      const { error } = await supabase
        .from('rating_votes')
        .upsert({
          rating_id: ratingId,
          user_id: userId,
          is_helpful: isHelpful,
        });

      if (error) throw error;

      // Update local count
      setRatings(prev => prev.map(r => {
        if (r.id === ratingId) {
          return {
            ...r,
            helpful_count: isHelpful ? r.helpful_count + 1 : r.helpful_count,
            not_helpful_count: !isHelpful ? r.not_helpful_count + 1 : r.not_helpful_count,
          };
        }
        return r;
      }));

      toast.success('Vote recorded');
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const StarRating = ({ value, onChange, readonly = false }: any) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-6 h-6 ${
            star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          } ${!readonly ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => !readonly && onChange?.(star)}
        />
      ))}
    </div>
  );

  if (loading) {
    return <Card><CardContent className="py-8 text-center">Loading ratings...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                {avgRating.toFixed(1)} / 5.0
              </CardTitle>
              <CardDescription>{ratings.length} reviews</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant={hasStarred ? "default" : "outline"}
                size="sm"
                onClick={toggleStar}
                className="gap-2"
              >
                <Star className={`w-4 h-4 ${hasStarred ? 'fill-current' : ''}`} />
                {starCount} Stars
              </Button>
            </div>
          </div>
        </CardHeader>
        {userId && (
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Rating</label>
              <StarRating value={userRating} onChange={setUserRating} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Review (optional)</label>
              <Textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Share your experience with this prompt..."
                rows={3}
              />
            </div>
            <Button onClick={submitRating} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Reviews List */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Community Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratings.map((rating) => (
              <div key={rating.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {rating.profiles?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {rating.profiles?.username || 'Anonymous'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <StarRating value={rating.rating} readonly />
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    {rating.review && (
                      <p className="text-sm mb-2">{rating.review}</p>
                    )}
                    {userId && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => voteOnRating(rating.id, true)}
                          className="gap-1 h-8"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {rating.helpful_count}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => voteOnRating(rating.id, false)}
                          className="gap-1 h-8"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          {rating.not_helpful_count}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
