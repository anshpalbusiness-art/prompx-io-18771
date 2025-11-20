import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Lock, CheckCircle2 } from "lucide-react";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  requirements: any;
  earned?: boolean;
  earned_at?: string;
  progress?: any;
}

interface BadgeShowcaseProps {
  userId?: string;
}

const BadgeShowcase = ({ userId }: BadgeShowcaseProps) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadBadges();
    }
  }, [userId]);

  const loadBadges = async () => {
    try {
      // Load all available badges
      const { data: allBadges } = await supabase
        .from("badges")
        .select("*")
        .order("tier", { ascending: true });

      // Load user's earned badges
      // Load user's earned badges
      const { data: userBadges } = await supabase
        .from("user_achievements")
        .select("badge_id, earned_at, progress")
        .eq("user_id", userId!);

      // Type helper to avoid 'unknown' when generated DB types are out of sync
      type UserAchievement = { badge_id: string; earned_at?: string; progress?: any };
      const userBadgesArr = (userBadges as UserAchievement[]) || [];

      // Merge the data
      const earnedBadgeIds = new Set(userBadgesArr.map((b) => b.badge_id));
      const badgeProgress = new Map<string, UserAchievement>(userBadgesArr.map((b) => [b.badge_id, b]));

      const mergedBadges = (allBadges as any[])?.map((badge: any) => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earned_at: badgeProgress.get(badge.id)?.earned_at,
        progress: badgeProgress.get(badge.id)?.progress,
      })) || [];

      setBadges(mergedBadges);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum":
        return "from-cyan-400 to-blue-500";
      case "gold":
        return "from-yellow-400 to-orange-500";
      case "silver":
        return "from-gray-300 to-gray-500";
      case "bronze":
        return "from-amber-600 to-amber-800";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tier) {
      case "platinum":
      case "gold":
        return "default";
      case "silver":
        return "secondary";
      default:
        return "outline";
    }
  };

  const calculateProgress = (badge: BadgeData): number => {
    if (badge.earned) return 100;
    if (!badge.progress) return 0;
    
    // Simple progress calculation based on requirements
    const requirements = badge.requirements;
    const progress = badge.progress;
    
    if (requirements.prompts_created) {
      return Math.min(100, (progress.prompts_created / requirements.prompts_created) * 100);
    }
    if (requirements.shares) {
      return Math.min(100, (progress.shares / requirements.shares) * 100);
    }
    
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.earned);
  const availableBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-8">
      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Your Achievements ({earnedBadges.length})
          </CardTitle>
          <CardDescription>
            Badges you've earned through your excellence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnedBadges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map((badge) => (
                <Card key={badge.id} className={`bg-gradient-to-br ${getTierColor(badge.tier)} text-white border-0`}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-4xl">{badge.icon}</div>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{badge.name}</h3>
                      <p className="text-sm text-white/90">{badge.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getTierBadgeVariant(badge.tier)} className="text-xs uppercase">
                        {badge.tier}
                      </Badge>
                      <span className="text-xs text-white/80">
                        {new Date(badge.earned_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No badges earned yet. Start creating prompts to unlock achievements!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-muted-foreground" />
            Available Badges ({availableBadges.length})
          </CardTitle>
          <CardDescription>
            Unlock these badges by meeting the requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableBadges.map((badge) => {
              const progress = calculateProgress(badge);
              return (
                <Card key={badge.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-4xl opacity-50">{badge.icon}</div>
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                    <Badge variant={getTierBadgeVariant(badge.tier)} className="text-xs uppercase">
                      {badge.tier}
                    </Badge>
                    {progress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BadgeShowcase;
