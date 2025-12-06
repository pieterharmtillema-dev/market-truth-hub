import { AppLayout } from "@/components/layout/AppLayout";
import { LeaderboardCard } from "@/components/leaderboard/LeaderboardCard";
import { mockLeaders } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Clock } from "lucide-react";

const Leaderboard = () => {
  return (
    <AppLayout title="Leaderboard">
      <div className="px-4 py-4 space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-yellow-400/20 to-amber-600/10 rounded-xl p-3 border border-yellow-400/20 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Top Accuracy</div>
            <div className="font-mono font-bold text-lg">89%</div>
          </div>
          <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-3 border border-primary/20 text-center">
            <Target className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Avg Accuracy</div>
            <div className="font-mono font-bold text-lg">72%</div>
          </div>
          <div className="bg-gradient-to-br from-gain/20 to-gain/10 rounded-xl p-3 border border-gain/20 text-center">
            <TrendingUp className="w-5 h-5 text-gain mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">Top Return</div>
            <div className="font-mono font-bold text-lg">+18.5%</div>
          </div>
        </div>

        {/* Time Filters */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              All Time
            </TabsTrigger>
            <TabsTrigger value="month" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Week
            </TabsTrigger>
            <TabsTrigger value="today" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Today
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {mockLeaders.map((leader) => (
              <LeaderboardCard key={leader.rank} leader={leader} />
            ))}
          </TabsContent>

          <TabsContent value="month" className="mt-4 space-y-3">
            {[...mockLeaders].reverse().map((leader, index) => (
              <LeaderboardCard key={leader.rank} leader={{ ...leader, rank: index + 1 }} />
            ))}
          </TabsContent>

          <TabsContent value="week" className="mt-4 space-y-3">
            {mockLeaders.slice(0, 3).map((leader) => (
              <LeaderboardCard key={leader.rank} leader={leader} />
            ))}
          </TabsContent>

          <TabsContent value="today" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Daily leaderboard updates at midnight UTC</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Asset Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge variant="default" className="cursor-pointer whitespace-nowrap">All Assets</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Crypto</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Stocks</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Forex</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Futures</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Options</Badge>
        </div>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
