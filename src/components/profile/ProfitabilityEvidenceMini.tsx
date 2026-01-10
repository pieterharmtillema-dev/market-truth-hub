import { useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, HelpCircle, TrendingUp, Target, Award } from 'lucide-react';
import {
  calculateRMetrics,
  formatR,
  formatProfitFactor,
  getExpectancyColor,
  getConfidenceBadgeStyle,
  type TradeWithRisk,
} from '@/lib/r-metrics';
import { cn } from '@/lib/utils';

interface Position {
  id?: number;
  pnl: number | null;
  pnl_pct?: number | null;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  side: string;
  entry_timestamp: string;
  exit_timestamp?: string | null;
  open: boolean;
}

interface ProfitabilityEvidenceMiniProps {
  positions: Position[];
  // Optional: bracket data with stop prices
  bracketData?: Map<string, { stop_price?: number }>;
  className?: string;
}

/**
 * ProfitabilityEvidenceMini
 *
 * Displays R-multiple based profitability evidence without showing raw PnL or account size.
 * Shows:
 * - Expectancy (R/trade) as primary metric
 * - Confidence badge based on sample size
 * - Profit Factor as secondary metric
 * - Win rate (de-emphasized)
 * - Date range and trade count
 * - Validation warnings (small sample, outliers, stops not respected)
 */
export function ProfitabilityEvidenceMini({
  positions,
  bracketData,
  className,
}: ProfitabilityEvidenceMiniProps) {
  const metrics = useMemo(() => {
    // Transform positions to TradeWithRisk format
    const trades: TradeWithRisk[] = positions.map((pos) => ({
      pnl: pos.pnl,
      entry_price: pos.entry_price,
      exit_price: pos.exit_price,
      quantity: pos.quantity,
      side: pos.side === 'long' || pos.side === 'buy' ? 'long' : 'short',
      entry_timestamp: pos.entry_timestamp,
      exit_timestamp: pos.exit_timestamp || null,
      open: pos.open,
      // Try to get stop price from bracket data if available
      // In practice, this would need to be passed in or fetched
      // For now, we'll calculate R using entry-exit distance as proxy
      stop_price: null, // TODO: Wire up actual bracket data if available
    }));

    return calculateRMetrics(trades);
  }, [positions, bracketData]);

  // If no verifiable data, show unverifiable state
  if (!metrics.verifiable || metrics.tradesWithStops === 0) {
    return (
      <div className={cn(
        'bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 sm:p-4',
        className
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Profitability Evidence
            </span>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-400/50" />
            <p className="text-sm text-muted-foreground">Not enough data to verify risk</p>
            <p className="text-xs text-muted-foreground">
              Trades need documented stop losses to calculate R-multiples
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { expectancy, profitFactor, winRate, confidence, warnings, dateRange, closedTrades } = metrics;

  return (
    <div className={cn(
      'bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-3 sm:p-4',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Profitability Evidence
          </span>
        </div>

        {/* Confidence Badge */}
        <Badge
          variant={getConfidenceBadgeStyle(confidence).variant}
          className={cn('text-[10px] px-2 py-0', getConfidenceBadgeStyle(confidence).className)}
        >
          {confidence.toUpperCase()} Confidence
        </Badge>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Expectancy - Primary Metric */}
        <div className="col-span-2 sm:col-span-1 bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Expectancy
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">
                    Average R gained or lost per trade. Positive expectancy = edge.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-baseline gap-1">
            <TrendingUp className={cn('h-4 w-4', getExpectancyColor(expectancy))} />
            <span className={cn('text-2xl sm:text-3xl font-bold tabular-nums', getExpectancyColor(expectancy))}>
              {formatR(expectancy, 2)}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">per trade</p>
        </div>

        {/* Profit Factor - Secondary Metric */}
        <div className="col-span-2 sm:col-span-1 bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Profit Factor
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">
                    Total winning R divided by total losing R. Above 1.0 means profitable.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-baseline gap-1">
            <Award className={cn('h-4 w-4', profitFactor >= 1.5 ? 'text-green-400' : profitFactor >= 1.0 ? 'text-primary' : 'text-orange-400')} />
            <span className={cn(
              'text-2xl sm:text-3xl font-bold tabular-nums',
              profitFactor >= 1.5 ? 'text-green-400' : profitFactor >= 1.0 ? 'text-primary' : 'text-orange-400'
            )}>
              {formatProfitFactor(profitFactor)}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">win/loss ratio</p>
        </div>

        {/* Win Rate - De-emphasized */}
        <div className="col-span-1 bg-muted/20 rounded-lg p-2.5 border border-border/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
              Win Rate
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">
                    How often trades win. Does not measure profitability by itself.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-lg font-bold text-muted-foreground tabular-nums">
            {winRate.toFixed(0)}%
          </span>
        </div>

        {/* Trade Count */}
        <div className="col-span-1 bg-muted/20 rounded-lg p-2.5 border border-border/20">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide block mb-1">
            Trades
          </span>
          <span className="text-lg font-bold text-muted-foreground tabular-nums">
            {closedTrades}
          </span>
        </div>
      </div>

      {/* Date Range */}
      {dateRange.first && dateRange.last && (
        <div className="text-[10px] text-muted-foreground text-center mb-2">
          {format(dateRange.first, 'MMM d, yyyy')} – {format(dateRange.last, 'MMM d, yyyy')}
        </div>
      )}

      {/* Warnings */}
      {(warnings.smallSample || warnings.outlierDependent || warnings.stopsNotRespected) && (
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          {warnings.smallSample && (
            <div className="flex items-center gap-2 text-[10px] text-amber-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>Small sample size – results may not be reliable</span>
            </div>
          )}
          {warnings.outlierDependent && (
            <div className="flex items-center gap-2 text-[10px] text-amber-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>Outlier-dependent – few large trades dominate results</span>
            </div>
          )}
          {warnings.stopsNotRespected && (
            <div className="flex items-center gap-2 text-[10px] text-red-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>Stops not respected – many losses exceed -1.5R</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
