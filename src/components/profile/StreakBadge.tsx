import { Flame, Snowflake, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streak: number;
  streakType: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ streak, streakType, className, size = "md" }: StreakBadgeProps) {
  if (streak < 2 || streakType === "none") return null;

  const isHotStreak = streakType === "hit";
  const isColdStreak = streakType === "miss" && streak >= 3;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (isHotStreak) {
    return (
      <div 
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30",
          sizeClasses[size],
          className
        )}
      >
        <Flame className={cn(iconSizes[size], "animate-pulse")} />
        <span>{streak} in a row</span>
      </div>
    );
  }

  if (isColdStreak) {
    return (
      <div 
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          "bg-blue-500/10 text-blue-400 border border-blue-500/30",
          sizeClasses[size],
          className
        )}
        title="High variance - recent miss streak"
      >
        <Snowflake className={iconSizes[size]} />
        <span>High Variance</span>
      </div>
    );
  }

  return null;
}

interface StatsDisplayProps {
  totalPredictions: number;
  totalHits: number;
  currentStreak: number;
  streakType: string;
  className?: string;
}

export function TraderStats({ totalPredictions, totalHits, currentStreak, streakType, className }: StatsDisplayProps) {
  const accuracy = totalPredictions > 0 ? Math.round((totalHits / totalPredictions) * 100) : 0;
  const winRate = totalPredictions > 0 ? `${totalHits}/${totalPredictions}` : "0/0";

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex items-center gap-1.5 text-sm">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">Accuracy:</span>
        <span className="font-medium text-foreground">{accuracy}%</span>
        <span className="text-xs text-muted-foreground">({winRate})</span>
      </div>
      
      <StreakBadge streak={currentStreak} streakType={streakType} size="sm" />
    </div>
  );
}
