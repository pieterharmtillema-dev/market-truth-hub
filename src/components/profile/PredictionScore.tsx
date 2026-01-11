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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Target, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PredictionAccuracyData {
  value: number | null;
  correct: number;
  incorrect: number;
  totalResolved: number;
  hasSufficientData: boolean;
}

interface PredictionScoreProps {
  predictionAccuracy: PredictionAccuracyData | null | undefined;
  className?: string;
  compact?: boolean;
}

/**
 * Format prediction accuracy for display
 */
function formatPredictionScore(predictionAccuracy: PredictionAccuracyData | null | undefined): {
  displayValue: string;
  subtext: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  // Handle null/undefined
  if (!predictionAccuracy) {
    return {
      displayValue: '—',
      subtext: 'No data',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
    };
  }

  // Insufficient data
  if (!predictionAccuracy.hasSufficientData || predictionAccuracy.value === null) {
    return {
      displayValue: '—',
      subtext: 'Not enough data',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
    };
  }

  // Format as percentage
  const percentage = Math.round(predictionAccuracy.value * 100);
  const displayValue = `${percentage}%`;
  const subtext = `${predictionAccuracy.correct} right • ${predictionAccuracy.incorrect} wrong`;

  // Color based on accuracy (matches backend caps: 40-70%)
  let color: string;
  let bgColor: string;
  let borderColor: string;

  if (predictionAccuracy.value >= 0.60) {
    // Green for ≥60%
    color = 'text-green-400';
    bgColor = 'bg-gradient-to-br from-green-500/20 to-emerald-500/20';
    borderColor = 'border-green-500/50';
  } else if (predictionAccuracy.value >= 0.50) {
    // Yellow for 50-59%
    color = 'text-yellow-400';
    bgColor = 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20';
    borderColor = 'border-yellow-500/50';
  } else {
    // Red for <50%
    color = 'text-red-400';
    bgColor = 'bg-gradient-to-br from-red-500/20 to-rose-500/20';
    borderColor = 'border-red-500/50';
  }

  return {
    displayValue,
    subtext,
    color,
    bgColor,
    borderColor,
  };
}

/**
 * PredictionScore Component
 *
 * Displays user's prediction accuracy score (separate from Trade Score/TRAX).
 * Shows percentage of correct long-term predictions with time-decay weighting.
 */
export function PredictionScore({ predictionAccuracy, className, compact = false }: PredictionScoreProps) {
  const formatted = formatPredictionScore(predictionAccuracy);
  const hasData = predictionAccuracy?.hasSufficientData && predictionAccuracy?.value !== null;

  // Compact version for hero card - uses Dialog for clickable explanation
  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className={cn(
              'relative overflow-hidden rounded-lg border p-2 cursor-pointer transition-all hover:border-primary/50 hover:scale-[1.02]',
              formatted.bgColor,
              formatted.borderColor
            )}>
              <div className="flex items-center justify-between gap-2">
                {/* Left: Score */}
                <div className="flex items-center gap-2">
                  <Target className={cn('h-3 w-3', formatted.color)} />
                  <span className={cn('text-xl font-black', formatted.color)}>
                    {formatted.displayValue}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    PRED
                  </span>
                </div>

                {/* Right: Data badge */}
                {!hasData && (
                  <Badge
                    variant="outline"
                    className={cn('text-[8px] px-1.5 py-0 h-4 bg-muted/15 text-muted-foreground border-border/30')}
                  >
                    N/A
                  </Badge>
                )}
              </div>

              {/* Warning for insufficient data */}
              {!hasData && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/30">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[8px] text-amber-400 line-clamp-1">
                    Need 5+ predictions
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
                    formatted.bgColor,
                    formatted.borderColor
                  )}>
                    <Target className={cn('h-5 w-5', formatted.color)} />
                  </div>
                  <div>
                    <p className="font-semibold">Prediction Score</p>
                    <p className="text-xs text-muted-foreground">
                      {hasData ? formatted.displayValue : 'Insufficient data'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Metrics */}
              {hasData && predictionAccuracy && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Stats</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Correct</span>
                      <span className="font-medium text-xs text-green-400">{predictionAccuracy.correct}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Incorrect</span>
                      <span className="font-medium text-xs text-red-400">{predictionAccuracy.incorrect}</span>
                    </div>
                    <div className="flex justify-between items-center col-span-2">
                      <span className="text-muted-foreground text-xs">Total Resolved</span>
                      <span className="font-medium text-xs">{predictionAccuracy.totalResolved}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* How It's Calculated */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3" />
                  How It's Calculated
                </p>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p>
                    Prediction Score is your historical prediction accuracy: <strong>correct predictions ÷ (correct + incorrect)</strong>, using only predictions with resolved outcomes.
                  </p>
                  <p className="mt-2">
                    <strong>Time Decay:</strong> Recent predictions (last 90 days) are weighted more heavily than older ones to reflect your current skill level.
                  </p>
                  <p className="mt-2">
                    <strong>Stability Caps:</strong> Scores are clamped between 40%-70% to prevent early lucky streaks or bad starts from dominating.
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requirements</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold">•</span>
                    <span>Minimum 5 resolved predictions (hit or missed)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold">•</span>
                    <span>Only counts long-term predictions (not trades)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-semibold">•</span>
                    <span>Active/expired predictions are excluded</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  This is a historical metric, not a guarantee of future results. Past performance doesn't predict future accuracy. Always do your own research.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full version (for standalone display)
  return (
    <div className={cn('relative', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'relative overflow-hidden rounded-xl border-2 p-4 sm:p-6 cursor-help transition-all hover:scale-105',
              formatted.bgColor,
              formatted.borderColor
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
                    <Target className={cn('h-5 w-5', formatted.color)} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Prediction Score
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                          <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] max-h-[80vh] overflow-y-auto" side="bottom" align="start">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                            <div>
                              <h3 className="text-sm font-bold">What is Prediction Score?</h3>
                              <p className="text-xs text-muted-foreground">Historical Prediction Accuracy</p>
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Prediction Score is your historical prediction accuracy: <strong>correct predictions ÷ (correct + incorrect)</strong>, using only predictions with resolved outcomes.
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Recent predictions (last 90 days) are weighted more heavily than older ones to reflect your current skill level.
                            </p>
                          </div>

                          {/* Requirements */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold">Requirements:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                              <li>Minimum 5 resolved predictions</li>
                              <li>Only long-term predictions (not trades)</li>
                              <li>Hit or missed status required</li>
                            </ul>
                          </div>

                          {/* Disclaimer */}
                          <div className="pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                              This is a historical metric, not a guarantee. Past performance doesn't predict future results.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Score Display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <span className={cn(
                      'text-6xl sm:text-7xl font-black tracking-tight',
                      formatted.color
                    )}>
                      {formatted.displayValue}
                    </span>
                  </div>
                </div>

                {/* Subtext */}
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatted.subtext}
                  </span>
                </div>

                {/* Warning for insufficient data */}
                {!hasData && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    <span className="text-[10px] text-amber-400">
                      Need at least 5 resolved predictions for accuracy score.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>

          <TooltipContent className="max-w-[280px] p-4" side="bottom">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold mb-1">Prediction Accuracy</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {hasData ? formatted.subtext : 'Need 5+ resolved predictions'}
                </p>
              </div>

              {hasData && predictionAccuracy && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Correct:</span>
                    <span className="font-medium text-green-400">{predictionAccuracy.correct}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Incorrect:</span>
                    <span className="font-medium text-red-400">{predictionAccuracy.incorrect}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{predictionAccuracy.totalResolved}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground">
                  Reflects historical prediction accuracy with time-decay weighting. Not a guarantee of future performance.
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
