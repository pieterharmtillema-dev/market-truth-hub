import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Position {
  pnl: number | null;
  open: boolean;
  stop_price?: number | null;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  side: string;
  entry_timestamp: string;
  exit_timestamp?: string | null;
}

interface TraxRatingProps {
  positions: Position[];
  className?: string;
}

type RatingGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
type Reliability = 'high' | 'medium' | 'low' | 'insufficient';

interface RatingResult {
  grade: RatingGrade;
  score: number; // 0-100
  reliability: Reliability;
  expectancy: number;
  winRate: number;
  profitFactor: number;
  sampleSize: number;
  hasStopData: boolean;
  reason: string;
}

/**
 * Calculate TRAX Rating
 *
 * TRAX = TRAding eXcellence rating
 *
 * Scoring criteria:
 * - Expectancy (R/trade): 40% weight
 * - Profit Factor: 30% weight
 * - Win Rate: 20% weight
 * - Risk Management (stops respected): 10% weight
 *
 * Grades:
 * S: 90-100 (Elite)
 * A: 80-89 (Excellent)
 * B: 70-79 (Good)
 * C: 60-69 (Average)
 * D: 50-59 (Below Average)
 * F: 0-49 (Poor)
 * N/A: Insufficient data
 */
function calculateTraxRating(positions: Position[]): RatingResult {
  const closedTrades = positions.filter(p => !p.open && p.pnl !== null && p.exit_price !== null);

  // Check if we have enough data
  if (closedTrades.length === 0) {
    return {
      grade: 'N/A',
      score: 0,
      reliability: 'insufficient',
      expectancy: 0,
      winRate: 0,
      profitFactor: 0,
      sampleSize: 0,
      hasStopData: false,
      reason: 'No closed trades to analyze'
    };
  }

  // Calculate basic metrics
  const wins = closedTrades.filter(p => (p.pnl || 0) > 0);
  const losses = closedTrades.filter(p => (p.pnl || 0) < 0);
  const winRate = (wins.length / closedTrades.length) * 100;

  // Calculate profit factor (total wins / total losses)
  const totalWinPnL = wins.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalLossPnL = Math.abs(losses.reduce((sum, p) => sum + (p.pnl || 0), 0));
  const profitFactor = totalLossPnL === 0
    ? (totalWinPnL > 0 ? 10 : 0) // Cap at 10 for no losses
    : totalWinPnL / totalLossPnL;

  // Try to calculate R-based metrics if stop data is available
  const tradesWithStops = closedTrades.filter(p => p.stop_price != null);
  const hasStopData = tradesWithStops.length >= closedTrades.length * 0.5; // At least 50% have stops

  let expectancy = 0;
  let riskManagementScore = 50; // Default neutral score

  if (hasStopData && tradesWithStops.length > 0) {
    // Calculate R-multiples
    const rValues = tradesWithStops.map(trade => {
      const stopDistance = Math.abs(trade.entry_price - (trade.stop_price || 0));
      const initialRisk = stopDistance * trade.quantity;
      if (initialRisk === 0) return 0;
      return (trade.pnl || 0) / initialRisk;
    });

    expectancy = rValues.reduce((sum, r) => sum + r, 0) / rValues.length;

    // Risk management: check if stops are respected
    const stopsNotRespected = rValues.filter(r => r < -1.5).length;
    const stopsRespectedRate = 1 - (stopsNotRespected / rValues.length);
    riskManagementScore = stopsRespectedRate * 100;
  } else {
    // Fallback: use PnL-based expectancy
    const avgWin = wins.length > 0 ? wins.reduce((sum, p) => sum + (p.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, p) => sum + (p.pnl || 0), 0) / losses.length) : 0;

    // Normalize to R-like values (assume average risk is 1% of position size)
    const avgPositionSize = closedTrades.reduce((sum, p) => sum + (p.entry_price * p.quantity), 0) / closedTrades.length;
    const avgRisk = avgPositionSize * 0.01;

    expectancy = avgRisk > 0
      ? ((winRate / 100) * (avgWin / avgRisk)) - ((1 - winRate / 100) * (avgLoss / avgRisk))
      : 0;
  }

  // Calculate component scores (0-100)

  // 1. Expectancy score (40% weight)
  // Map expectancy to 0-100 scale
  // -0.5R or worse = 0, 0R = 50, 2R or better = 100
  const expectancyScore = Math.max(0, Math.min(100,
    50 + (expectancy * 25)
  ));

  // 2. Profit Factor score (30% weight)
  // 0 = 0, 1.0 = 50, 3.0+ = 100
  const pfScore = Math.max(0, Math.min(100,
    (profitFactor / 3.0) * 100
  ));

  // 3. Win Rate score (20% weight)
  // Note: win rate alone doesn't indicate profitability, but it's a factor
  // 0% = 0, 50% = 50, 100% = 100
  const wrScore = winRate;

  // 4. Risk Management score (10% weight) - already calculated above

  // Weighted total score
  const totalScore =
    (expectancyScore * 0.40) +
    (pfScore * 0.30) +
    (wrScore * 0.20) +
    (riskManagementScore * 0.10);

  // Assign grade
  let grade: RatingGrade;
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 50) grade = 'D';
  else grade = 'F';

  // Determine reliability based on sample size
  let reliability: Reliability;
  if (closedTrades.length >= 200) reliability = 'high';
  else if (closedTrades.length >= 50) reliability = 'medium';
  else if (closedTrades.length >= 20) reliability = 'low';
  else reliability = 'insufficient';

  // Generate reason
  let reason = '';
  if (reliability === 'insufficient') {
    reason = `Small sample size (${closedTrades.length} trades). Rating may not be reliable.`;
  } else if (reliability === 'low') {
    reason = `Limited data (${closedTrades.length} trades). Rating reliability is improving.`;
  } else if (!hasStopData) {
    reason = 'Rating based on PnL analysis. No stop loss data available for R-based metrics.';
  } else {
    reason = `Based on ${closedTrades.length} verified trades with documented risk management.`;
  }

  return {
    grade,
    score: Math.round(totalScore),
    reliability,
    expectancy,
    winRate,
    profitFactor,
    sampleSize: closedTrades.length,
    hasStopData,
    reason
  };
}

/**
 * Get color scheme for rating grade
 */
function getGradeColors(grade: RatingGrade): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (grade) {
    case 'S':
      return {
        bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50',
        icon: 'text-yellow-400'
      };
    case 'A':
      return {
        bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
        text: 'text-green-400',
        border: 'border-green-500/50',
        icon: 'text-green-400'
      };
    case 'B':
      return {
        bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/50',
        icon: 'text-blue-400'
      };
    case 'C':
      return {
        bg: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500/50',
        icon: 'text-purple-400'
      };
    case 'D':
      return {
        bg: 'bg-gradient-to-br from-orange-500/20 to-amber-600/20',
        text: 'text-orange-400',
        border: 'border-orange-500/50',
        icon: 'text-orange-400'
      };
    case 'F':
      return {
        bg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
        text: 'text-red-400',
        border: 'border-red-500/50',
        icon: 'text-red-400'
      };
    case 'N/A':
      return {
        bg: 'bg-muted/50',
        text: 'text-muted-foreground',
        border: 'border-border',
        icon: 'text-muted-foreground'
      };
  }
}

/**
 * Get reliability badge styling
 */
function getReliabilityBadge(reliability: Reliability): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  switch (reliability) {
    case 'high':
      return {
        label: 'High Reliability',
        variant: 'default',
        className: 'bg-green-500/15 text-green-400 border-green-500/30'
      };
    case 'medium':
      return {
        label: 'Medium Reliability',
        variant: 'secondary',
        className: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      };
    case 'low':
      return {
        label: 'Low Reliability',
        variant: 'outline',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      };
    case 'insufficient':
      return {
        label: 'Insufficient Data',
        variant: 'destructive',
        className: 'bg-red-500/15 text-red-400 border-red-500/30'
      };
  }
}

/**
 * TraxRating Component
 *
 * Displays a letter grade (S, A, B, C, D, F, N/A) representing overall trading performance
 * with reliability indicators and detailed breakdown on hover.
 */
export function TraxRating({ positions, className }: TraxRatingProps) {
  const rating = useMemo(() => calculateTraxRating(positions), [positions]);
  const colors = getGradeColors(rating.grade);
  const reliabilityBadge = getReliabilityBadge(rating.reliability);

  return (
    <div className={cn('relative', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'relative overflow-hidden rounded-xl border-2 p-4 sm:p-6 cursor-help transition-all hover:scale-105',
              colors.bg,
              colors.border
            )}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }} />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className={cn('h-5 w-5', colors.icon)} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      TRAX Rating
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p className="text-xs font-semibold mb-1">TRAding eXcellence Rating</p>
                          <p className="text-xs text-muted-foreground">
                            Composite score based on expectancy, profit factor, win rate, and risk management.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <Badge
                    variant={reliabilityBadge.variant}
                    className={cn('text-[9px] px-2 py-0', reliabilityBadge.className)}
                  >
                    {reliabilityBadge.label}
                  </Badge>
                </div>

                {/* Grade Display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className={cn(
                      'text-6xl sm:text-7xl font-black tracking-tight',
                      colors.text
                    )}>
                      {rating.grade}
                    </span>
                    <div className="flex flex-col">
                      <span className={cn('text-2xl font-bold', colors.text)}>
                        {rating.score}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /100
                      </span>
                    </div>
                  </div>

                  {/* Trend indicator */}
                  {rating.grade !== 'N/A' && (
                    <div className="flex flex-col items-end gap-1">
                      {rating.expectancy > 0 ? (
                        <TrendingUp className={cn('h-6 w-6', colors.icon)} />
                      ) : rating.expectancy < 0 ? (
                        <TrendingDown className="h-6 w-6 text-red-400" />
                      ) : (
                        <Minus className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {rating.sampleSize} trades
                      </span>
                    </div>
                  )}
                </div>

                {/* Warning for small sample */}
                {rating.reliability === 'insufficient' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    <span className="text-[10px] text-amber-400">
                      {rating.reason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>

          <TooltipContent className="max-w-[280px] p-4" side="bottom">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold mb-1">Rating Breakdown</p>
                <p className="text-xs text-muted-foreground mb-2">{rating.reason}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expectancy:</span>
                  <span className={cn(
                    'font-medium',
                    rating.expectancy > 0 ? 'text-green-400' : rating.expectancy < 0 ? 'text-red-400' : 'text-muted-foreground'
                  )}>
                    {rating.expectancy >= 0 ? '+' : ''}{rating.expectancy.toFixed(2)}R
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Profit Factor:</span>
                  <span className="font-medium">{rating.profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-medium">{rating.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sample Size:</span>
                  <span className="font-medium">{rating.sampleSize} trades</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground">
                  <strong>Grade Scale:</strong> S (Elite), A (Excellent), B (Good), C (Average), D (Below Avg), F (Poor)
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
