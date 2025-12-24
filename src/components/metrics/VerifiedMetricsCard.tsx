import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, TrendingUp, Target, RefreshCw, HelpCircle, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { TradingMetrics } from "@/hooks/useTradingMetrics";

interface VerifiedMetricsCardProps {
  metrics: TradingMetrics | null;
  loading?: boolean;
  calculating?: boolean;
  onRecalculate?: () => void;
  compact?: boolean;
}

export function VerifiedMetricsCard({
  metrics,
  loading = false,
  calculating = false,
  onRecalculate,
  compact = false,
}: VerifiedMetricsCardProps) {
  if (loading) {
    return (
      <Card className={cn("bg-card/50 backdrop-blur-sm", compact && "p-3")}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isVerified = metrics?.is_verified && metrics.api_status === "connected";
  const hasEnoughTrades = (metrics?.total_verified_trades ?? 0) >= 30;
  const winRate = metrics?.win_rate;
  const accuracyScore = metrics?.accuracy_score;

  return (
    <Card
      className={cn(
        "bg-gradient-to-br border",
        isVerified ? "from-gain/10 to-gain/5 border-gain/30" : "from-muted/30 to-muted/10 border-border",
        compact && "p-0",
      )}
    >
      <CardHeader className={cn("pb-2", compact && "p-3 pb-1")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", compact && "text-sm")}>
            <Target className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
            Trading Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            {isVerified ? (
              <Badge variant="default" className="bg-gain/20 text-gain border-gain/30 gap-1">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <ShieldAlert className="h-3 w-3" />
                Unverified
              </Badge>
            )}
          </div>
        </div>
        {metrics?.last_api_sync_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last sync: {formatDistanceToNow(new Date(metrics.last_api_sync_at), { addSuffix: true })}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "p-3 pt-2")}>
        {/* Main Metrics Grid */}
        <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2")}>
          {/* Win Rate Card */}
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Win Rate</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Win Rate</p>
                    <p className="text-xs mb-2">
                      Percentage of your closed trades that were profitable, based on verified exchange data (after
                      fees).
                    </p>
                    <p className="text-xs text-muted-foreground">All stats are based on verified exchange data.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-mono font-bold",
                  compact ? "text-xl" : "text-2xl",
                  winRate != null && winRate >= 50 ? "text-gain" : "text-loss",
                )}
              >
                {winRate != null ? `${winRate.toFixed(1)}%` : "--"}
              </span>
            </div>
            {metrics && (
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.total_wins}W / {metrics.total_losses}L
              </div>
            )}
          </div>

          {/* Accuracy Score Card */}
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Accuracy Score</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Accuracy Score</p>
                    <p className="text-xs mb-2">
                      Your Accuracy Score measures how efficiently you convert risk into profit — not how often you
                      trade or how long you hold positions.
                    </p>
                    <p className="text-xs mb-2 text-muted-foreground">
                      <strong>Risk Estimation:</strong> We estimate risk based on your position size and how much the
                      asset typically moves. This allows fair comparison between different trading styles — even when
                      stop-loss data isn't available.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Risk is estimated conservatively to prevent overstating performance.
                    </p>
                    {!hasEnoughTrades && (
                      <p className="text-xs text-warning mt-2">Requires 30+ verified trades to display.</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-baseline gap-1">
              {accuracyScore != null && hasEnoughTrades ? (
                <>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      compact ? "text-xl" : "text-2xl",
                      accuracyScore >= 60 ? "text-gain" : accuracyScore >= 40 ? "text-warning" : "text-loss",
                    )}
                  >
                    {accuracyScore.toFixed(0)}
                  </span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </>
              ) : (
                <span className={cn("font-mono font-bold text-muted-foreground", compact ? "text-xl" : "text-2xl")}>
                  --
                </span>
              )}
            </div>
            {!hasEnoughTrades && metrics && (
              <div className="text-xs text-muted-foreground mt-1">{metrics.total_verified_trades}/30 trades needed</div>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        {metrics && !compact && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Avg R</div>
              <div className={cn("font-mono font-semibold", (metrics.average_r ?? 0) > 0 ? "text-gain" : "text-loss")}>
                {metrics.average_r != null
                  ? `${metrics.average_r >= 0 ? "+" : ""}${metrics.average_r.toFixed(2)}R`
                  : "--"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">+R Rate</div>
              <div className="font-mono font-semibold text-foreground">
                {metrics.positive_r_percentage != null ? `${metrics.positive_r_percentage.toFixed(0)}%` : "--"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Trades</div>
              {metrics.total_verified_trades > 0 && (
                <div className="font-mono font-semibold text-foreground">{metrics.total_verified_trades}</div>
              )}
            </div>
          </div>
        )}

        {/* Recalculate Button */}
        {onRecalculate && !compact && (
          <Button variant="outline" size="sm" className="w-full" onClick={onRecalculate} disabled={calculating}>
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate Metrics
              </>
            )}
          </Button>
        )}

        {/* Verification Notice */}
        {!isVerified && !compact && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground">
              <ShieldAlert className="h-3 w-3 inline mr-1" />
              Connect your exchange API to get verified metrics. Unverified accounts cannot appear on the leaderboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for leaderboard
export function MetricsBadges({ metrics }: { metrics: TradingMetrics | null }) {
  if (!metrics) return null;

  const isVerified = metrics.is_verified && metrics.api_status === "connected";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isVerified && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="default" className="bg-gain/20 text-gain border-gain/30 gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Exchange-verified trading history</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {metrics.win_rate != null && (
        <Badge variant="outline" className="gap-1 text-xs">
          <TrendingUp className="h-3 w-3" />
          {metrics.win_rate.toFixed(0)}% WR
        </Badge>
      )}
      {metrics.accuracy_score != null && metrics.total_verified_trades >= 30 && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Target className="h-3 w-3" />
          {metrics.accuracy_score.toFixed(0)} Score
        </Badge>
      )}
    </div>
  );
}
