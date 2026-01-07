import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Target, HelpCircle, Lock } from 'lucide-react';

interface Position {
  pnl: number | null;
  open: boolean;
}

interface AdjustedWinRateProps {
  positions: Position[];
  traderCategory?: string | null;
  showCard?: boolean;
}

// Minimum closed trades by trader type
const MINIMUM_TRADES: Record<string, number> = {
  'scalper': 50,
  'day_trader': 30,
  'swing_trader': 15,
  'position_trader': 10,
  'investor': 8,
};

const CATEGORY_LABELS: Record<string, string> = {
  'scalper': 'Scalper',
  'day_trader': 'Day Trader',
  'swing_trader': 'Swing Trader',
  'position_trader': 'Position Trader',
  'investor': 'Long-term Trader',
};

export function calculateAdjustedWinRate(wins: number, losses: number): number {
  // Adjusted Win Rate = (Wins + 2) / (Wins + Losses + 4)
  return ((wins + 2) / (wins + losses + 4)) * 100;
}

export function getMinimumTrades(traderCategory?: string | null): number {
  if (!traderCategory) return 15; // Default to swing trader
  return MINIMUM_TRADES[traderCategory] || 15;
}

export function AdjustedWinRate({ positions, traderCategory, showCard = true }: AdjustedWinRateProps) {
  const metrics = useMemo(() => {
    const closedTrades = positions.filter(p => !p.open && p.pnl !== null);
    const wins = closedTrades.filter(p => (p.pnl || 0) > 0).length;
    const losses = closedTrades.filter(p => (p.pnl || 0) < 0).length;
    const totalClosed = wins + losses; // Exclude breakeven
    
    const adjustedWinRate = calculateAdjustedWinRate(wins, losses);
    const minimumTrades = getMinimumTrades(traderCategory);
    const meetsMinimum = totalClosed >= minimumTrades;
    
    return {
      wins,
      losses,
      totalClosed,
      adjustedWinRate,
      minimumTrades,
      meetsMinimum,
    };
  }, [positions, traderCategory]);

  const ExplanationContent = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Win rate is adjusted to reduce noise with small sample sizes using Bayesian smoothing.
      </p>
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-mono text-center">
          Adjusted Win Rate = (Wins + 2) / (Wins + Losses + 4)
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Minimum trades by style:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(MINIMUM_TRADES).map(([category, count]) => (
            <div key={category} className="flex justify-between">
              <span className="text-muted-foreground">{CATEGORY_LABELS[category]}:</span>
              <span className="font-medium">{count} trades</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Breakeven trades are excluded from the calculation.
      </p>
    </div>
  );

  if (!showCard) {
    // Compact display for hero card
    return (
      <div className="flex items-center gap-2">
        {metrics.meetsMinimum ? (
          <>
            <span className="text-2xl font-bold">{metrics.adjustedWinRate.toFixed(1)}%</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjusted Win Rate</DialogTitle>
                </DialogHeader>
                <ExplanationContent />
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {metrics.totalClosed}/{metrics.minimumTrades} trades
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Win Rate (Adjusted)
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How Adjusted Win Rate Works</DialogTitle>
              </DialogHeader>
              <ExplanationContent />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.meetsMinimum ? (
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold text-primary">
              {metrics.adjustedWinRate.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              Based on {metrics.totalClosed} closed trades
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="text-green-500">{metrics.wins} wins</span>
              <span className="text-red-500">{metrics.losses} losses</span>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {metrics.totalClosed} of {metrics.minimumTrades} trades required
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min((metrics.totalClosed / metrics.minimumTrades) * 100, 100)}%` }}
              />
            </div>
            <Badge variant="outline" className="text-xs">
              {traderCategory ? CATEGORY_LABELS[traderCategory] || traderCategory : 'Swing Trader'} minimum
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
