import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scale, HelpCircle } from 'lucide-react';

interface Position {
  side: string;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  open: boolean;
}

interface WinLossSizeRatioProps {
  positions: Position[];
  showCard?: boolean;
}

export function calculateNormalizedReturn(position: Position): number | null {
  if (!position.exit_price || position.exit_price === 0 || position.entry_price === 0) {
    return null;
  }
  
  const side = position.side?.toLowerCase();
  
  if (side === 'long' || side === 'buy') {
    // Long: (exit - entry) / entry
    return (position.exit_price - position.entry_price) / position.entry_price;
  } else if (side === 'short' || side === 'sell') {
    // Short: (entry - exit) / entry
    return (position.entry_price - position.exit_price) / position.entry_price;
  }
  
  return null;
}

export function WinLossSizeRatio({ positions, showCard = true }: WinLossSizeRatioProps) {
  const metrics = useMemo(() => {
    const closedTrades = positions.filter(p => !p.open && p.pnl !== null && p.exit_price);
    
    const winners: number[] = [];
    const losers: number[] = [];
    
    for (const position of closedTrades) {
      const normalizedReturn = calculateNormalizedReturn(position);
      if (normalizedReturn === null) continue;
      
      if ((position.pnl || 0) > 0) {
        winners.push(Math.abs(normalizedReturn));
      } else if ((position.pnl || 0) < 0) {
        losers.push(Math.abs(normalizedReturn));
      }
    }
    
    const avgWinnerSize = winners.length > 0 
      ? winners.reduce((a, b) => a + b, 0) / winners.length 
      : 0;
    const avgLoserSize = losers.length > 0 
      ? losers.reduce((a, b) => a + b, 0) / losers.length 
      : 0;
    
    const ratio = avgLoserSize > 0 ? avgWinnerSize / avgLoserSize : 0;
    
    return {
      avgWinnerSize: avgWinnerSize * 100, // Convert to percentage
      avgLoserSize: avgLoserSize * 100,
      ratio,
      winnerCount: winners.length,
      loserCount: losers.length,
      hasData: winners.length > 0 && losers.length > 0,
    };
  }, [positions]);

  const ExplanationContent = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This compares the average size of winning trades to losing trades, based on outcomes only.
      </p>
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium">Calculation:</p>
        <p className="text-xs font-mono">
          Long: (exit − entry) / entry
        </p>
        <p className="text-xs font-mono">
          Short: (entry − exit) / entry
        </p>
        <p className="text-xs font-mono mt-2">
          Ratio = Avg winner size ÷ Avg loser size
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        A ratio above 1.0 means your winners are typically larger than your losers.
        This is a public-safe alternative to Risk:Reward as it uses outcomes only.
      </p>
    </div>
  );

  if (!showCard) {
    // Compact display
    return (
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold ${metrics.ratio >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
          {metrics.hasData ? `${metrics.ratio.toFixed(2)}x` : '—'}
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Win / Loss Size Ratio</DialogTitle>
            </DialogHeader>
            <ExplanationContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Win / Loss Size Ratio
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How Win / Loss Size Ratio Works</DialogTitle>
              </DialogHeader>
              <ExplanationContent />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.hasData ? (
          <div className="text-center space-y-3">
            <p className={`text-4xl font-bold ${metrics.ratio >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
              {metrics.ratio.toFixed(2)}x
            </p>
            <p className="text-sm text-muted-foreground">
              Average size of winners vs losers
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-green-500 font-medium">{metrics.avgWinnerSize.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">Avg winner ({metrics.winnerCount})</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-red-500 font-medium">{metrics.avgLoserSize.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">Avg loser ({metrics.loserCount})</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Need both winning and losing trades to calculate ratio
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
