import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, HelpCircle, Lock, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, AreaChart, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

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
  hero?: boolean; // Full hero card with more info
}

const MINIMUM_TRADES_FOR_TREND = 10;

export function PerformanceTrend({ positions, isPublic = true, showCard = true, compact = false, hero = false }: PerformanceTrendProps) {
  const chartData = useMemo(() => {
    const closedTrades = positions
      .filter(p => !p.open && p.pnl !== null && p.exit_timestamp)
      .sort((a, b) => new Date(a.exit_timestamp!).getTime() - new Date(b.exit_timestamp!).getTime());
    
    let cumulative = 0;
    let maxEquity = 0;
    return closedTrades.map((trade, index) => {
      cumulative += trade.pnl || 0;
      maxEquity = Math.max(maxEquity, cumulative);
      const drawdown = maxEquity > 0 ? ((maxEquity - cumulative) / maxEquity) * 100 : 0;
      return {
        index: index + 1,
        date: trade.exit_timestamp,
        pnl: trade.pnl,
        cumulative,
        maxEquity,
        drawdown,
      };
    });
  }, [positions]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const finalValue = chartData[chartData.length - 1].cumulative;
    const highWaterMark = Math.max(...chartData.map(d => d.cumulative));
    const maxDrawdown = Math.max(...chartData.map(d => d.drawdown));
    const winningTrades = chartData.filter(d => (d.pnl || 0) > 0).length;
    const winRate = (winningTrades / chartData.length) * 100;
    
    return {
      finalValue,
      highWaterMark,
      maxDrawdown,
      winRate,
      totalTrades: chartData.length,
    };
  }, [chartData]);

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

  // Hero version - full card with stats and full-size chart
  if (hero) {
    if (!meetsMinimum) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-3">
          <Lock className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            {chartData.length}/{MINIMUM_TRADES_FOR_TREND} trades
          </p>
          <div className="w-full max-w-24 bg-muted/50 rounded-full h-1.5 mt-2">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min((chartData.length / MINIMUM_TRADES_FOR_TREND) * 100, 100)}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Stats row at top */}
        <div className="flex items-center justify-between px-2 py-1.5 gap-2">
          {/* Net P/L */}
          <div className="flex items-center gap-1">
            {isPositive ? (
              <ArrowUp className="h-3 w-3" style={{ color: 'hsl(var(--gain))' }} />
            ) : (
              <ArrowDown className="h-3 w-3" style={{ color: 'hsl(var(--loss))' }} />
            )}
            <span 
              className="text-xs font-semibold"
              style={{ color: isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))' }}
            >
              {isPublic ? (isPositive ? '+' : '-') : `${isPositive ? '+' : ''}$${stats?.finalValue.toFixed(0)}`}
            </span>
          </div>

          {/* Max Drawdown */}
          {stats && stats.maxDrawdown > 0 && (
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-destructive/70" />
              <span className="text-[10px] text-muted-foreground">
                {stats.maxDrawdown.toFixed(0)}% DD
              </span>
            </div>
          )}

          {/* Trade count */}
          <span className="text-[10px] text-muted-foreground">
            {chartData.length} trades
          </span>
        </div>

        {/* Full chart area */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="heroGradientPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gain))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--gain))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="heroGradientNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.3} />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} 
                strokeWidth={2}
                fill={isPositive ? 'url(#heroGradientPositive)' : 'url(#heroGradientNegative)'}
              />
              {!isPublic && (
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '10px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
                  labelFormatter={(label) => `Trade #${label}`}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

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
