import { Trophy, Target, Award, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TraderType, tradingStyleLabels, marketFocusLabels } from "@/data/mockData";

export interface LeaderData {
  rank: number;
  user: {
    name: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
    tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
    traderType?: TraderType;
  };
  stats: {
    accuracy: number;
    totalPredictions: number;
    avgReturn: number;
    winStreak: number;
  };
  change: number;
}

interface LeaderboardCardProps {
  leader: LeaderData;
  onClick?: () => void;
}

const tierColors = {
  bronze: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  silver: "text-slate-300 border-slate-300/30 bg-slate-300/10",
  gold: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  platinum: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10",
  diamond: "text-violet-400 border-violet-400/30 bg-violet-400/10",
};

const rankColors = {
  1: "bg-gradient-to-br from-yellow-400 to-amber-600 text-primary-foreground shadow-[0_0_20px_rgba(251,191,36,0.3)]",
  2: "bg-gradient-to-br from-slate-300 to-slate-500 text-primary-foreground",
  3: "bg-gradient-to-br from-orange-400 to-orange-600 text-primary-foreground",
};

export function LeaderboardCard({ leader, onClick }: LeaderboardCardProps) {
  const isTopThree = leader.rank <= 3;
  const styleInfo = leader.user.traderType ? tradingStyleLabels[leader.user.traderType.style] : null;

  return (
    <Card 
      variant="interactive" 
      className={cn(
        "animate-fade-in",
        isTopThree && "border-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
            isTopThree 
              ? rankColors[leader.rank as 1 | 2 | 3]
              : "bg-muted text-muted-foreground"
          )}>
            {isTopThree ? (
              <Trophy className="w-5 h-5" />
            ) : (
              leader.rank
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={leader.user.avatar} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {leader.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{leader.user.name}</span>
                  {leader.user.isVerified && (
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">@{leader.user.username}</span>
                  <Badge className={cn("text-[10px] px-1.5 py-0 capitalize", tierColors[leader.user.tier])}>
                    {leader.user.tier}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Target className="w-3 h-3 text-primary" />
              <span className="font-mono font-bold text-lg text-primary">{leader.stats.accuracy}%</span>
            </div>
            <div className={cn(
              "text-xs font-mono",
              leader.change > 0 ? "text-gain" : leader.change < 0 ? "text-loss" : "text-muted-foreground"
            )}>
              {leader.change > 0 ? "↑" : leader.change < 0 ? "↓" : "−"} {Math.abs(leader.change)} spots
            </div>
          </div>
        </div>

        {/* Trader Type Tags */}
        {leader.user.traderType && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
            {styleInfo && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", styleInfo.color)}>
                {styleInfo.icon} {styleInfo.label}
              </span>
            )}
            {leader.user.traderType.markets.map((market) => {
              const marketInfo = marketFocusLabels[market];
              return (
                <span key={market} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", marketInfo.color)}>
                  {marketInfo.icon} {marketInfo.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Predictions</div>
            <div className="font-mono font-medium text-sm">{leader.stats.totalPredictions}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Return</div>
            <div className={cn(
              "font-mono font-medium text-sm",
              leader.stats.avgReturn >= 0 ? "text-gain" : "text-loss"
            )}>
              {leader.stats.avgReturn >= 0 ? "+" : ""}{leader.stats.avgReturn}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Streak</div>
            <div className="font-mono font-medium text-sm flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-warning" />
              {leader.stats.winStreak}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
