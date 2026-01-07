import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, HelpCircle, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Position {
  pnl: number | null;
  open: boolean;
  exit_timestamp: string | null;
  entry_timestamp: string;
}

interface PerformanceTrendProps {
  positions: Position[];
  isPublic?: boolean; // If true, hide numeric values
  showCard?: boolean;
  compact?: boolean; // For mini version in hero
}

const MINIMUM_TRADES_FOR_TREND = 10;

export function PerformanceTrend({ positions, isPublic = true, showCard = true, compact = false }: PerformanceTrendProps) {
  const chartData = useMemo(() => {
    const closedTrades = positions
      .filter(p => !p.open && p.pnl !== null && p.exit_timestamp)
      .sort((a, b) => new Date(a.exit_timestamp!).getTime() - new Date(b.exit_timestamp!).getTime());
    
    let cumulative = 0;
    return closedTrades.map((trade, index) => {
      cumulative += trade.pnl || 0;
      return {
        index: index + 1,
        date: trade.exit_timestamp,
        pnl: trade.pnl,
        cumulative,
      };
    });
  }, [positions]);

  const meetsMinimum = chartData.length >= MINIMUM_TRADES_FOR_TREND;
  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].cumulative >= 0;

  const ExplanationContent = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This chart shows the direction and consistency of performance over time.
      </p>
      {isPublic && (
        <p className="text-xs text-muted-foreground">
          Monetary values are intentionally hidden for privacy.
        </p>
      )}
      <div className="bg-muted/50 rounded-lg p-3">
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Line trending up = consistent gains</li>
          <li>• Line trending down = drawdown period</li>
          <li>• Steep moves = larger trades or volatility</li>
          <li>• Flat line = breakeven period</li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Requires at least {MINIMUM_TRADES_FOR_TREND} closed trades to display.
      </p>
    </div>
  );

  // Mini version for hero card
  if (compact) {
    if (!meetsMinimum) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>{chartData.length}/{MINIMUM_TRADES_FOR_TREND} trades</span>
        </div>
      );
    }

    return (
      <div className="w-24 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} 
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (!showCard) {
    return (
      <div className="w-full h-24">
        {meetsMinimum ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} 
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.3} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            <Lock className="h-4 w-4 mr-2" />
            {chartData.length}/{MINIMUM_TRADES_FOR_TREND} trades
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Performance Trend
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Performance Trend Explained</DialogTitle>
              </DialogHeader>
              <ExplanationContent />
            </DialogContent>
          </Dialog>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {isPublic ? 'Relative performance (no monetary values)' : 'Cumulative P/L over time'}
        </p>
      </CardHeader>
      <CardContent>
        {meetsMinimum ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="index" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `#${value}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} 
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <Lock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {chartData.length} of {MINIMUM_TRADES_FOR_TREND} trades required
            </p>
            <div className="w-48 bg-muted rounded-full h-2 mt-3">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min((chartData.length / MINIMUM_TRADES_FOR_TREND) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Based on {chartData.length} closed trades
        </p>
      </CardContent>
    </Card>
  );
}
