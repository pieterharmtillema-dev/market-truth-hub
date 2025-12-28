import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3, HelpCircle, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradingMetrics } from "@/hooks/useTradingMetrics";
import { WinRateCalculationModal } from "./WinRateCalculationModal";

interface TradingMetricsCardProps {
  metrics: TradingMetrics | null;
  loading?: boolean;
  calculating?: boolean;
  onRecalculate?: () => void;
}

export function TradingMetricsCard({
  metrics,
  loading = false,
}: TradingMetricsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  const isVerified = metrics?.is_verified && metrics.api_status === "connected";
  const totalTrades = metrics?.total_verified_trades ?? 0;
  const isQualified = totalTrades >= 30;
  const winRate = metrics?.win_rate ?? 0;
  const wins = metrics?.total_wins ?? 0;
  const losses = metrics?.total_losses ?? 0;
  const avgR = metrics?.average_r ?? 0;
  const plusRRate = metrics?.positive_r_percentage ?? 0;

  // Calculate progress percentage
  const progressPercentage = Math.min((totalTrades / 30) * 100, 100);
  const tradesRemaining = Math.max(30 - totalTrades, 0);

  // Animate progress bar on mount
  useEffect(() => {
    if (!isQualified) {
      const timer = setTimeout(() => {
        setProgressWidth(progressPercentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progressPercentage, isQualified]);

  // Calculate best streak (simplified - you may want to calculate this from actual data)
  const bestStreak = 8; // Placeholder - should come from backend calculation

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "bg-card border-border",
          "relative overflow-hidden"
        )}
      >
        {/* Top gradient border */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px]",
            isQualified
              ? "bg-gradient-to-r from-[#10b981] to-[#4dd4ac]"
              : "bg-[#4dd4ac]"
          )}
        />

        <CardHeader className="pb-3">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#4dd4ac]" />
              <h3 className="text-base font-semibold text-white">Trading Metrics</h3>
            </div>
            {!isVerified && (
              <Badge variant="outline" className="text-muted-foreground border-border">
                Unverified
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Card Header with Title */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Win Rate Performance</h4>
              <p className="text-xs text-muted-foreground">Based on risk-adjusted returns</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-[#4dd4ac] hover:bg-[#4dd4ac]/10 h-auto py-1 px-2"
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              How it's calculated
            </Button>
          </div>

          {/* Win Rate Display */}
          <div className="flex items-baseline gap-3">
            <span className={cn(
              "text-[56px] font-bold leading-none",
              winRate >= 50 ? "text-[#10b981]" : "text-[#ef4444]"
            )}>
              {winRate.toFixed(1)}%
            </span>
            <div className="text-sm font-medium mb-2">
              <span className="text-[#10b981]">{wins}W</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-[#ef4444]">{losses}L</span>
            </div>
          </div>

          {/* Conditional Section: Pre-Rating or Verified */}
          {!isQualified ? (
            // PRE-QUALIFICATION STATE
            <div className="space-y-3">
              {/* Pre-Rating Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#4dd4ac] text-[#0f1419] font-semibold hover:bg-[#4dd4ac]">
                    PRE-RATING
                  </Badge>
                  <span className="text-xs text-white font-medium">Qualification Progress</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {totalTrades}/30 trades
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-1.5 bg-[#4dd4ac]/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4dd4ac] to-[#34d399] transition-all duration-[800ms] ease-out"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete{" "}
                  <span className="text-[#10b981] font-semibold">
                    {tradesRemaining} more {tradesRemaining === 1 ? 'trade' : 'trades'}
                  </span>{" "}
                  to unlock your official rating
                </p>
              </div>

              {/* Metrics Grid - 2 columns */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <MetricCard
                  label="Avg R"
                  value={avgR !== 0 ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "--"}
                  valueColor={avgR > 0 ? "text-[#10b981]" : avgR < 0 ? "text-[#ef4444]" : "text-muted-foreground"}
                  tooltip="Average R-multiple across all trades. Positive means you're gaining more than you risk on average."
                />
                <MetricCard
                  label="+R Rate"
                  value={plusRRate !== 0 ? `${plusRRate.toFixed(0)}%` : "--"}
                  valueColor={plusRRate > 0 ? "text-[#10b981]" : "text-muted-foreground"}
                  tooltip="Percentage of trades with positive R-multiples (gained more than risked)."
                />
              </div>
            </div>
          ) : (
            // QUALIFIED STATE
            <div className="space-y-3">
              {/* Verified Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981]/15 border border-[#10b981]/20">
                <CheckCircle className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="text-xs font-semibold text-[#10b981]">Verified Rating</span>
              </div>

              {/* Best Streak Display */}
              <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg p-4 text-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  BEST STREAK
                </div>
                <div className="text-3xl font-bold text-[#3b82f6] mb-0.5">
                  {bestStreak}
                </div>
                <div className="text-xs text-muted-foreground">
                  Consecutive wins
                </div>
              </div>

              {/* Metrics Grid - 4 columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <MetricCard
                  label="Avg R"
                  value={avgR !== 0 ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "--"}
                  valueColor={avgR > 0 ? "text-[#10b981]" : avgR < 0 ? "text-[#ef4444]" : "text-muted-foreground"}
                  tooltip="Average R-multiple across all trades."
                />
                <MetricCard
                  label="+R Rate"
                  value={plusRRate !== 0 ? `${plusRRate.toFixed(0)}%` : "--"}
                  valueColor={plusRRate > 0 ? "text-[#10b981]" : "text-muted-foreground"}
                  tooltip="Percentage of trades with positive R-multiples."
                />
                <MetricCard
                  label="Avg Time"
                  value="4.2h"
                  valueColor="text-muted-foreground"
                  tooltip="Average time you hold positions before closing."
                />
                <MetricCard
                  label="Trades"
                  value={totalTrades.toString()}
                  valueColor="text-white"
                  tooltip="Total number of verified trades."
                />
              </div>
            </div>
          )}

          {/* Unverified Warning - only show if not verified */}
          {!isVerified && (
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mt-4">
              <p className="text-xs text-muted-foreground">
                Connect your exchange API to get verified metrics and unlock leaderboard eligibility.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <WinRateCalculationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string;
  valueColor?: string;
  tooltip: string;
}

function MetricCard({ label, value, valueColor = "text-white", tooltip }: MetricCardProps) {
  return (
    <div className="bg-background/50 rounded-lg p-3 border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground">
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-[#4dd4ac]/20">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className={cn("font-mono font-semibold text-sm", valueColor)}>
        {value}
      </div>
    </div>
  );
}
