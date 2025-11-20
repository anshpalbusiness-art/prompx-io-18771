import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Medal, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  weekly_score: number;
  monthly_score: number;
  total_score: number;
}

interface LeaderboardProps {
  userId?: string;
}

const Leaderboard = ({ userId }: LeaderboardProps) => {
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [monthlyLeaders, setMonthlyLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      // Load weekly leaderboard
      const { data: weeklyData } = await supabase
        .from("leaderboard")
        .select("*, profiles(username)")
        .eq("category", "weekly")
        .order("rank", { ascending: true })
        .limit(10);

      // Load monthly leaderboard
      const { data: monthlyData } = await supabase
        .from("leaderboard")
        .select("*, profiles(username)")
        .eq("category", "monthly")
        .order("monthly_score", { ascending: false })
        .limit(10);

      // Load all-time leaderboard
      const { data: allTimeData } = await supabase
        .from("leaderboard")
        .select("*, profiles(username)")
        .eq("category", "overall")
        .order("total_score", { ascending: false })
        .limit(10);

      setWeeklyLeaders(formatLeaderboardData(weeklyData));
      setMonthlyLeaders(formatLeaderboardData(monthlyData));
      setAllTimeLeaders(formatLeaderboardData(allTimeData));
    } catch (error) {
      console.error("Error loading leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatLeaderboardData = (data: any[]): LeaderboardEntry[] => {
    if (!data) return [];
    return data.map((entry, index) => ({
      rank: entry.rank || index + 1,
      user_id: entry.user_id,
      username: entry.profiles?.username || "Anonymous",
      weekly_score: entry.weekly_score || 0,
      monthly_score: entry.monthly_score || 0,
      total_score: entry.total_score || 0,
    }));
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="w-6 text-center font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const renderLeaderboardList = (entries: LeaderboardEntry[], scoreType: "weekly" | "monthly" | "total") => {
    const scoreKey = scoreType === "weekly" ? "weekly_score" : scoreType === "monthly" ? "monthly_score" : "total_score";
    
    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card
            key={entry.user_id}
            className={`transition-all hover:shadow-lg ${
              entry.user_id === userId ? "border-primary bg-primary/5" : ""
            }`}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(entry.rank)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                    {entry.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{entry.username}</p>
                  {entry.user_id === userId && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xl font-bold">{entry[scoreKey].toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Leaderboards
          </CardTitle>
          <CardDescription>
            Compete with the best prompt engineers and climb the ranks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">📅 Weekly</TabsTrigger>
              <TabsTrigger value="monthly">📆 Monthly</TabsTrigger>
              <TabsTrigger value="alltime">🌟 All Time</TabsTrigger>
            </TabsList>
            
            <TabsContent value="weekly" className="space-y-4 mt-6">
              {weeklyLeaders.length > 0 ? (
                renderLeaderboardList(weeklyLeaders, "weekly")
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No weekly data yet. Be the first to compete!
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="monthly" className="space-y-4 mt-6">
              {monthlyLeaders.length > 0 ? (
                renderLeaderboardList(monthlyLeaders, "monthly")
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No monthly data yet. Start earning points!
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="alltime" className="space-y-4 mt-6">
              {allTimeLeaders.length > 0 ? (
                renderLeaderboardList(allTimeLeaders, "total")
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No all-time data yet. Make history!
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
