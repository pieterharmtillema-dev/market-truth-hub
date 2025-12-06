import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeaderboardCard } from "@/components/leaderboard/LeaderboardCard";
import { mockLeaders, tradingStyleLabels, marketFocusLabels, TradingStyle, MarketFocus } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const Leaderboard = () => {
  const [styleFilter, setStyleFilter] = useState<TradingStyle | "all">("all");
  const [marketFilter, setMarketFilter] = useState<MarketFocus | "all">("all");

  const filteredLeaders = mockLeaders.filter((leader) => {
    if (styleFilter !== "all" && leader.user.traderType?.style !== styleFilter) return false;
    if (marketFilter !== "all" && !leader.user.traderType?.markets.includes(marketFilter)) return false;
    return true;
  });

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

        {/* Trading Style Filter */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Trading Style</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Badge 
              variant={styleFilter === "all" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setStyleFilter("all")}
            >
              All Styles
            </Badge>
            {(Object.entries(tradingStyleLabels) as [TradingStyle, typeof tradingStyleLabels[TradingStyle]][]).map(([key, value]) => (
              <span
                key={key}
                onClick={() => setStyleFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-all whitespace-nowrap",
                  styleFilter === key ? value.color : "border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                {value.icon} {value.label}
              </span>
            ))}
          </div>
        </div>

        {/* Market Focus Filter */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Market Focus</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Badge 
              variant={marketFilter === "all" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setMarketFilter("all")}
            >
              All Markets
            </Badge>
            {(Object.entries(marketFocusLabels) as [MarketFocus, typeof marketFocusLabels[MarketFocus]][])
              .filter(([key]) => key !== "all")
              .map(([key, value]) => (
              <span
                key={key}
                onClick={() => setMarketFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-all whitespace-nowrap",
                  marketFilter === key ? value.color : "border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                {value.icon} {value.label}
              </span>
            ))}
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
            {filteredLeaders.length > 0 ? (
              filteredLeaders.map((leader, index) => (
                <LeaderboardCard key={leader.rank} leader={{ ...leader, rank: index + 1 }} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No traders match your filters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="month" className="mt-4 space-y-3">
            {[...filteredLeaders].reverse().map((leader, index) => (
              <LeaderboardCard key={leader.rank} leader={{ ...leader, rank: index + 1 }} />
            ))}
          </TabsContent>

          <TabsContent value="week" className="mt-4 space-y-3">
            {filteredLeaders.slice(0, 3).map((leader) => (
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
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
