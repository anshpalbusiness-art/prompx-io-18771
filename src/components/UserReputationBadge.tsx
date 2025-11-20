import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Star, TrendingUp } from "lucide-react";

interface UserReputationBadgeProps {
  userId: string;
  showDetails?: boolean;
}

export const UserReputationBadge = ({ userId, showDetails = false }: UserReputationBadgeProps) => {
  const [reputation, setReputation] = useState({
    score: 0,
    avgRating: 0,
    totalRatings: 0,
  });

  useEffect(() => {
    fetchReputation();
  }, [userId]);

  const fetchReputation = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('reputation_score, avg_prompt_rating, total_prompt_ratings')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setReputation({
        score: data.reputation_score || 0,
        avgRating: data.avg_prompt_rating || 0,
        totalRatings: data.total_prompt_ratings || 0,
      });
    }
  };

  const getTier = () => {
    if (reputation.score >= 1000) return { name: 'Elite', color: 'bg-purple-500', icon: '👑' };
    if (reputation.score >= 500) return { name: 'Expert', color: 'bg-blue-500', icon: '💎' };
    if (reputation.score >= 200) return { name: 'Pro', color: 'bg-green-500', icon: '⭐' };
    if (reputation.score >= 50) return { name: 'Rising', color: 'bg-yellow-500', icon: '🌟' };
    return { name: 'Newcomer', color: 'bg-gray-400', icon: '✨' };
  };

  const tier = getTier();

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={tier.color}>
              {tier.icon} {tier.name}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <div>Reputation: {reputation.score}</div>
              <div>Avg Rating: {reputation.avgRating.toFixed(1)} ⭐</div>
              <div>Total Ratings: {reputation.totalRatings}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Badge className={`${tier.color} text-white`}>
        {tier.icon} {tier.name}
      </Badge>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Award className="w-4 h-4 text-primary" />
          <span>{reputation.score}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <span>{reputation.avgRating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span>{reputation.totalRatings} ratings</span>
        </div>
      </div>
    </div>
  );
};
