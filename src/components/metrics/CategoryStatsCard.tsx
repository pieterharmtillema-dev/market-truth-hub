import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Target, TrendingUp } from "lucide-react";
import { useCategoryStats } from "@/hooks/useCategoryStats";
import { CategoryBadge, getCategoryConfig } from "@/components/profile/CategoryBadge";
import { cn } from "@/lib/utils";

interface CategoryStatsCardProps {
  userId: string | null | undefined;
  compact?: boolean;
}

export function CategoryStatsCard({ userId, compact = false }: CategoryStatsCardProps) {
  const { stats, loading } = useCategoryStats(userId);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className={cn("pb-2", compact && "p-3 pb-2")}>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className={cn("space-y-3", compact && "p-3 pt-2")}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no stats available
  if (!stats || stats.userCount === 0) {
    return null;
  }

  const config = getCategoryConfig(stats.category);
  const isTopPerformer = (stats.userPercentile ?? 0) >= 75;
  const isAboveAverage = (stats.userPercentile ?? 0) >= 50;

  const performanceBadgeText = isTopPerformer
    ? "Top performer!"
    : isAboveAverage
    ? "Above average"
    : "Building skills";

  const performanceBadgeVariant = isTopPerformer ? "default" : "outline";

  return (
    <Card
      className={cn(
        "bg-gradient-to-br border",
        isTopPerformer
          ? "from-green-500/10 to-green-500/5 border-green-500/30"
          : "from-muted/30 to-muted/10 border-border",
        compact && "p-0"
      )}
    >
      <CardHeader className={cn("pb-2", compact && "p-3 pb-2")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", compact && "text-sm")}>
            <Target className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
            Category Performance
          </CardTitle>
          <CategoryBadge category={stats.category} size={compact ? "sm" : "md"} />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-3", compact && "p-3 pt-2")}>
        {/* Rank Display */}
        {stats.userRank && stats.userCount > 1 && (
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy
                  className={cn(
                    "h-5 w-5",
                    isTopPerformer
                      ? "text-yellow-500"
                      : isAboveAverage
                      ? "text-blue-500"
                      : "text-muted-foreground"
                  )}
                />
                <div>
                  <div className="text-xs text-muted-foreground">Your Rank</div>
                  <div className="text-lg font-bold">
                    #{stats.userRank} <span className="text-sm text-muted-foreground">of {stats.userCount}</span>
                  </div>
                </div>
              </div>
              <Badge variant={performanceBadgeVariant} className={cn(isTopPerformer && "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30")}>
                {performanceBadgeText}
              </Badge>
            </div>
          </div>
        )}

        {/* Category Averages Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Traders Count */}
          <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground mb-0.5">Traders</div>
            <div className="text-lg font-bold">{stats.userCount}</div>
          </div>

          {/* Average Win Rate */}
          <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground mb-0.5">Avg Win %</div>
            <div className="text-lg font-bold">
              {stats.avgWinRate !== null ? `${stats.avgWinRate.toFixed(1)}%` : "N/A"}
            </div>
          </div>

          {/* Average Accuracy Score */}
          <div className="bg-background/50 rounded-lg p-3 border border-border/50 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground mb-0.5">Avg Score</div>
            <div className="text-lg font-bold">
              {stats.avgAccuracyScore !== null ? stats.avgAccuracyScore.toFixed(1) : "N/A"}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className={cn("pt-0 pb-3", compact && "px-3")}>
        <p className="text-xs text-muted-foreground text-center w-full">
          Compared to {stats.userCount} verified {config.label.toLowerCase()}
          {stats.userCount === 1 ? "" : "s"}
        </p>
      </CardFooter>
    </Card>
  );
}
