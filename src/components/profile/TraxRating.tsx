import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  compact?: boolean;
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
 * NEW ROBUST SCORING ALGORITHM:
 * - Expectancy (R/trade): 40% weight - with diminishing returns after 0.5R
 * - Profit Factor: 30% weight - plateau after 2.5
 * - Win Rate: 10% weight - de-emphasized, penalizes extreme win rates
 * - Risk Management: 20% weight - loss frequency + worst loss + outlier dependency
 *
 * Hard Rules:
 * - Expectancy ≤ 0 → capped at 49 (F grade)
 * - N < 20 → N/A (insufficient data)
 * - Outlier penalties if top1 > 30% or top5 > 60%
 * - Risk discipline penalties for losses ≤ -2R
 *
 * Reliability Adjustment:
 * - 20-49 trades: ×0.75
 * - 50-199 trades: ×0.90
 * - 200+ trades: ×1.00
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

  // Hard Rule: N < 20 → N/A
  if (closedTrades.length < 20) {
    return {
      grade: 'N/A',
      score: 0,
      reliability: 'insufficient',
      expectancy: 0,
      winRate: 0,
      profitFactor: 0,
      sampleSize: closedTrades.length,
      hasStopData: false,
      reason: closedTrades.length === 0
        ? 'No closed trades to analyze'
        : `Insufficient data (${closedTrades.length}/20 trades). Need at least 20 trades for reliable rating.`
    };
  }

  // Calculate basic metrics
  const wins = closedTrades.filter(p => (p.pnl || 0) > 0);
  const losses = closedTrades.filter(p => (p.pnl || 0) < 0);
  const winRate = (wins.length / closedTrades.length) * 100;

  // Try to calculate R-based metrics if stop data is available
  const tradesWithStops = closedTrades.filter(p => p.stop_price != null);
  const hasStopData = tradesWithStops.length >= closedTrades.length * 0.5; // At least 50% have stops

  let expectancy = 0;
  let profitFactor = 0;
  let rValues: number[] = [];
  let pct_below_minus_1R = 0;
  let pct_below_minus_2R = 0;
  let worst_loss_R = 0;
  let top1_R_pct = 0;
  let top5_R_pct = 0;

  if (hasStopData && tradesWithStops.length > 0) {
    // Calculate R-multiples
    rValues = tradesWithStops.map(trade => {
      const stopDistance = Math.abs(trade.entry_price - (trade.stop_price || 0));
      const initialRisk = stopDistance * trade.quantity;
      if (initialRisk === 0) return 0;
      return (trade.pnl || 0) / initialRisk;
    });

    expectancy = rValues.reduce((sum, r) => sum + r, 0) / rValues.length;

    // R-based profit factor
    const totalWinR = rValues.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
    const totalLossR = Math.abs(rValues.filter(r => r < 0).reduce((sum, r) => sum + r, 0));
    profitFactor = totalLossR === 0 ? (totalWinR > 0 ? 10 : 0) : totalWinR / totalLossR;

    // Risk discipline metrics
    pct_below_minus_1R = (rValues.filter(r => r <= -1.0).length / rValues.length) * 100;
    pct_below_minus_2R = (rValues.filter(r => r <= -2.0).length / rValues.length) * 100;
    worst_loss_R = Math.min(...rValues, 0);

    // Outlier metrics
    const winningR = rValues.filter(r => r > 0).sort((a, b) => b - a);
    const totalWinningR = winningR.reduce((sum, r) => sum + r, 0);
    const top1_R = winningR[0] || 0;
    const top5_R = winningR.slice(0, 5).reduce((sum, r) => sum + r, 0);
    top1_R_pct = totalWinningR > 0 ? (top1_R / totalWinningR) * 100 : 0;
    top5_R_pct = totalWinningR > 0 ? (top5_R / totalWinningR) * 100 : 0;
  } else {
    // Fallback: use PnL-based metrics
    const totalWinPnL = wins.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const totalLossPnL = Math.abs(losses.reduce((sum, p) => sum + (p.pnl || 0), 0));
    profitFactor = totalLossPnL === 0 ? (totalWinPnL > 0 ? 10 : 0) : totalWinPnL / totalLossPnL;

    const avgWin = wins.length > 0 ? totalWinPnL / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossPnL / losses.length : 0;
    const avgPositionSize = closedTrades.reduce((sum, p) => sum + (p.entry_price * p.quantity), 0) / closedTrades.length;
    const avgRisk = avgPositionSize * 0.01;

    expectancy = avgRisk > 0
      ? ((winRate / 100) * (avgWin / avgRisk)) - ((1 - winRate / 100) * (avgLoss / avgRisk))
      : 0;
  }

  // ===== STEP 1: Calculate Component Subscores (0-100 each) =====

  // 1.1 Expectancy Subscore (40% weight) - Diminishing returns after 0.5R
  let expectancyScore = 0;
  if (expectancy <= 0) {
    expectancyScore = 0;
  } else if (expectancy <= 0.5) {
    expectancyScore = (expectancy / 0.5) * 85;
  } else {
    // Logarithmic plateau for E > 0.5
    expectancyScore = 85 + 15 * (1 - Math.exp(-2 * (expectancy - 0.5)));
  }
  expectancyScore = Math.min(100, Math.max(0, expectancyScore));

  // 1.2 Profit Factor Subscore (30% weight) - Plateau after 2.5
  let pfScore = 0;
  if (profitFactor < 1.0) {
    pfScore = 0;
  } else if (profitFactor <= 2.5) {
    pfScore = ((profitFactor - 1.0) / 1.5) * 90;
  } else {
    // Diminishing returns
    pfScore = 90 + 10 * (1 - Math.exp(-0.5 * (profitFactor - 2.5)));
  }
  pfScore = Math.min(100, Math.max(0, pfScore));

  // 1.3 Win Rate Subscore (10% weight) - De-emphasized, penalizes extremes
  let wrScore = 0;
  if (winRate < 30) {
    wrScore = (winRate / 30) * 50;
  } else if (winRate <= 65) {
    wrScore = 50 + ((winRate - 30) / 35) * 50;
  } else {
    // Penalize extremely high WR
    wrScore = 100 - ((winRate - 65) * 0.5);
    wrScore = Math.max(70, wrScore); // Floor at 70
  }
  wrScore = Math.min(100, Math.max(0, wrScore));

  // 1.4 Risk Management Subscore (20% weight) - Three sub-components

  // A) Loss Frequency Control
  const penalty_1R = Math.min(pct_below_minus_1R / 15, 1.0) * 30;
  const penalty_2R = Math.min(pct_below_minus_2R / 5, 1.0) * 40;
  const frequencyScore = 100 - penalty_1R - penalty_2R;

  // B) Worst Loss Control
  let worstLossScore = 100;
  if (worst_loss_R >= -1.0) {
    worstLossScore = 100;
  } else if (worst_loss_R >= -2.0) {
    worstLossScore = 100 - (Math.abs(worst_loss_R) - 1.0) * 40;
  } else {
    worstLossScore = Math.max(20 - (Math.abs(worst_loss_R) - 2.0) * 20, 0);
  }

  // C) Outlier Dependency Penalty
  let outlierScore = 100;
  if (top1_R_pct > 30) {
    outlierScore -= (top1_R_pct - 30) * 1.5;
  }
  if (top5_R_pct > 60) {
    outlierScore -= (top5_R_pct - 60) * 0.8;
  }
  outlierScore = Math.max(0, outlierScore);

  const riskMgmtScore = (frequencyScore + worstLossScore + outlierScore) / 3;

  // ===== STEP 2: Calculate Raw TRAX Score =====
  let rawTraxScore =
    (expectancyScore * 0.40) +
    (pfScore * 0.30) +
    (wrScore * 0.10) +
    (riskMgmtScore * 0.20);

  // ===== STEP 3: Apply Hard Fail Rules =====
  if (expectancy <= 0) {
    rawTraxScore = Math.min(rawTraxScore, 49); // Force F grade
  }

  // ===== STEP 4: Apply Reliability Adjustment =====
  let reliability: Reliability;
  let reliabilityMultiplier = 1.0;

  if (closedTrades.length >= 200) {
    reliability = 'high';
    reliabilityMultiplier = 1.00;
  } else if (closedTrades.length >= 50) {
    reliability = 'medium';
    reliabilityMultiplier = 0.90;
  } else {
    reliability = 'low';
    reliabilityMultiplier = 0.75;
  }

  const finalTraxScore = rawTraxScore * reliabilityMultiplier;

  // ===== STEP 5: Assign Grade =====
  let grade: RatingGrade;
  if (finalTraxScore >= 90) grade = 'S';
  else if (finalTraxScore >= 80) grade = 'A';
  else if (finalTraxScore >= 70) grade = 'B';
  else if (finalTraxScore >= 60) grade = 'C';
  else if (finalTraxScore >= 50) grade = 'D';
  else grade = 'F';

  // Generate reason
  let reason = '';
  if (reliability === 'low') {
    reason = `Limited data (${closedTrades.length} trades). Score reduced by 25% due to sample size.`;
  } else if (reliability === 'medium') {
    reason = `Moderate data (${closedTrades.length} trades). Score reduced by 10% due to sample size.`;
  } else if (!hasStopData) {
    reason = `Based on ${closedTrades.length} trades. Rating uses PnL analysis (no stop data available).`;
  } else {
    reason = `Based on ${closedTrades.length} verified trades with documented risk management.`;
  }

  if (expectancy <= 0) {
    reason += ' Warning: Negative expectancy detected.';
  }

  return {
    grade,
    score: Math.round(finalTraxScore * 10) / 10, // One decimal place
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
export function TraxRating({ positions, className, compact = false }: TraxRatingProps) {
  const rating = useMemo(() => calculateTraxRating(positions), [positions]);
  const colors = getGradeColors(rating.grade);
  const reliabilityBadge = getReliabilityBadge(rating.reliability);

  // Compact version for hero card - uses Dialog for clickable explanation
  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className={cn(
              'relative overflow-hidden rounded-lg border p-2 cursor-pointer transition-all hover:border-primary/50 hover:scale-[1.02]',
              colors.bg,
              colors.border
            )}>
              <div className="flex items-center justify-between gap-2">
                {/* Left: Grade */}
                <div className="flex items-center gap-2">
                  <Shield className={cn('h-3 w-3', colors.icon)} />
                  <span className={cn('text-xl font-black', colors.text)}>
                    {rating.grade}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    TRADE
                  </span>
                </div>

                {/* Right: Reliability badge */}
                <Badge
                  variant={reliabilityBadge.variant}
                  className={cn('text-[8px] px-1.5 py-0 h-4', reliabilityBadge.className)}
                >
                  {rating.reliability === 'high' ? 'High' :
                   rating.reliability === 'medium' ? 'Med' :
                   rating.reliability === 'low' ? 'Low' : 'N/A'}
                </Badge>
              </div>

              {/* Warning for insufficient data */}
              {rating.reliability === 'insufficient' && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/30">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[8px] text-amber-400 line-clamp-1">
                    Small sample ({rating.sampleSize})
                  </span>
                </div>
              )}
            </div>
          </DialogTrigger>

          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
            <div className="p-4 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center border',
                    colors.bg,
                    colors.border
                  )}>
                    <span className={cn('text-2xl font-black', colors.text)}>{rating.grade}</span>
                  </div>
                  <div>
                    <p className="font-semibold">Trade Score</p>
                    <p className="text-xs text-muted-foreground">Score: {rating.score}/100</p>
                  </div>
                </div>
                <Badge className={cn('text-xs', reliabilityBadge.className)}>
                  {reliabilityBadge.label}
                </Badge>
              </div>

              {/* Current Metrics */}
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Metrics</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Expectancy</span>
                    <span className={cn(
                      'font-medium text-xs',
                      rating.expectancy > 0 ? 'text-green-400' : rating.expectancy < 0 ? 'text-red-400' : 'text-muted-foreground'
                    )}>
                      {rating.expectancy >= 0 ? '+' : ''}{rating.expectancy.toFixed(2)}R
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Profit Factor</span>
                    <span className="font-medium text-xs">{rating.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Win Rate</span>
                    <span className="font-medium text-xs">{rating.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Sample Size</span>
                    <span className="font-medium text-xs">{rating.sampleSize} trades</span>
                  </div>
                </div>
              </div>

              {/* How It's Calculated */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3" />
                  How It's Calculated
                </p>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold w-8">40%</span>
                    <span><strong>Expectancy</strong> — Average R-multiple per trade (diminishing returns after 0.5R)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold w-8">30%</span>
                    <span><strong>Profit Factor</strong> — Gross profits ÷ gross losses (plateaus after 2.5)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold w-8">20%</span>
                    <span><strong>Risk Mgmt</strong> — Loss control, worst loss, and outlier dependency</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold w-8">10%</span>
                    <span><strong>Win Rate</strong> — Penalizes extreme values, optimal 40-60%</span>
                  </div>
                </div>
              </div>

              {/* Grade Scale */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade Scale</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center">
                  {[
                    { grade: 'S', range: '90+', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
                    { grade: 'A', range: '80-89', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
                    { grade: 'B', range: '70-79', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                    { grade: 'C', range: '60-69', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
                    { grade: 'D', range: '50-59', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
                    { grade: 'F', range: '<50', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
                  ].map(({ grade, range, color }) => (
                    <div key={grade} className={cn('rounded-md border p-1.5', color, rating.grade === grade && 'ring-2 ring-primary')}>
                      <span className="text-sm font-bold block">{grade}</span>
                      <span className="text-[9px] opacity-70">{range}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reliability Note */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  <strong>Reliability:</strong> Score adjusted by sample size.
                  200+ trades = 100%, 50-199 = 90%, 20-49 = 75%.
                  Minimum 20 trades required.
                </p>
              </div>

              {rating.reason && (
                <p className="text-[10px] text-amber-400/80 italic">{rating.reason}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full version
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
                      Trade Score
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                          <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] max-h-[80vh] overflow-y-auto" side="bottom" align="start">
                        <div className="space-y-3">
                          {/* Header with close button */}
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                            <div>
                              <h3 className="text-sm font-bold">What is Trade Score?</h3>
                              <p className="text-xs text-muted-foreground">Performance Based on Executed Trades</p>
                            </div>
                          </div>

                          {/* Current Rating */}
                          <div className="p-3 rounded-lg bg-muted/30 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">Your Rating:</span>
                              <div className="flex items-center gap-2">
                                <span className={cn('text-2xl font-black', colors.text)}>{rating.grade}</span>
                                <span className="text-sm text-muted-foreground">({rating.score}/100)</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{rating.reason}</p>
                          </div>

                          {/* How it works */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Trade Score reflects performance based on the trades you have executed. It does not include predictions.
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Trade Score measures a trader's skill using <strong>risk-adjusted performance</strong>—not raw profits or win rate.
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Every trade is measured in <strong>R-multiples</strong> (risk units): if you risk $100 and make $300, that's +3R. This lets us compare traders fairly regardless of account size.
                            </p>
                          </div>

                          {/* What TRAX rewards */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold">What Trade Score rewards:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                              <li className="flex items-start gap-1.5">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong>Positive expectancy</strong> — Winning more R than you lose over many trades</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong>Controlled losses</strong> — Cutting bad trades quickly instead of letting them balloon</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong>Consistency</strong> — Results that don't depend on one or two lucky trades</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong>Sample size</strong> — More trades = more confidence the score reflects true skill</span>
                              </li>
                            </ul>
                          </div>

                          {/* What TRAX ignores */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold">What Trade Score ignores:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                              <li className="flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong>Win rate alone</strong> — A trader can win 70% of trades and still lose money if losses are 2× the size of wins</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong>Hot streaks</strong> — We penalize profiles where most profit came from a few outlier trades</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong>Account size</strong> — $500 or $500,000 doesn't matter; only risk-adjusted results do</span>
                              </li>
                            </ul>
                          </div>

                          {/* How it's calculated */}
                          <div className="space-y-1.5 pt-2 border-t border-border">
                            <p className="text-xs font-semibold">How it's calculated:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between items-center">
                                <span>Expectancy (avg R/trade)</span>
                                <span className="font-medium">40%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Profit Factor (wins/losses)</span>
                                <span className="font-medium">30%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Risk Management</span>
                                <span className="font-medium">20%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Win Rate</span>
                                <span className="font-medium">10%</span>
                              </div>
                            </div>
                          </div>

                          {/* Reliability badges */}
                          <div className="space-y-1.5 pt-2 border-t border-border">
                            <p className="text-xs font-semibold">Reliability levels:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between items-center">
                                <span><strong>Low (20–49 trades):</strong></span>
                                <span>Score ×0.75</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span><strong>Medium (50–199 trades):</strong></span>
                                <span>Score ×0.90</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span><strong>High (200+ trades):</strong></span>
                                <span>Full score</span>
                              </div>
                            </div>
                          </div>

                          {/* Disclaimer */}
                          <div className="pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                              Trade Score is educational, not a guarantee. Past performance doesn't predict future returns. Always do your own research.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
