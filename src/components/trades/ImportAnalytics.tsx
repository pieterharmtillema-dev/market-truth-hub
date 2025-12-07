import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, BarChart3 } from 'lucide-react';

interface Trade {
  symbol: string;
  strategy?: string;
  profit_loss?: number;
  commission?: number;
  side: string;
  entry_price: number;
  exit_price: number;
  quantity?: number;
}

interface ImportAnalyticsProps {
  trades: Trade[];
}

export function ImportAnalytics({ trades }: ImportAnalyticsProps) {
  const analytics = useMemo(() => {
    if (!trades.length) return null;

    // Calculate totals
    let totalPnL = 0;
    let totalCommission = 0;
    let winCount = 0;
    let lossCount = 0;
    
    const bySymbol: Record<string, { pnl: number; count: number; wins: number }> = {};
    const byStrategy: Record<string, { pnl: number; count: number; wins: number }> = {};

    trades.forEach(trade => {
      const pnl = trade.profit_loss ?? 
        ((trade.exit_price - trade.entry_price) * (trade.quantity || 1) * 
        (trade.side === 'long' || trade.side === 'buy' ? 1 : -1) - (trade.commission || 0));
      
      totalPnL += pnl;
      totalCommission += trade.commission || 0;
      
      if (pnl >= 0) winCount++;
      else lossCount++;

      // Group by symbol
      if (!bySymbol[trade.symbol]) {
        bySymbol[trade.symbol] = { pnl: 0, count: 0, wins: 0 };
      }
      bySymbol[trade.symbol].pnl += pnl;
      bySymbol[trade.symbol].count++;
      if (pnl >= 0) bySymbol[trade.symbol].wins++;

      // Group by strategy
      const strategy = trade.strategy || 'No Strategy';
      if (!byStrategy[strategy]) {
        byStrategy[strategy] = { pnl: 0, count: 0, wins: 0 };
      }
      byStrategy[strategy].pnl += pnl;
      byStrategy[strategy].count++;
      if (pnl >= 0) byStrategy[strategy].wins++;
    });

    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
    
    // Sort by P/L
    const topSymbols = Object.entries(bySymbol)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 5);
    
    const topStrategies = Object.entries(byStrategy)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 5);

    return {
      totalPnL,
      totalCommission,
      winCount,
      lossCount,
      winRate,
      topSymbols,
      topStrategies,
      tradeCount: trades.length,
    };
  }, [trades]);

  if (!analytics) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import Analytics</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${analytics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-xs text-muted-foreground">Total P/L</span>
            </div>
            <p className={`text-xl font-bold ${analytics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${analytics.totalPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-xl font-bold">{analytics.winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Trades</span>
            </div>
            <p className="text-xl font-bold">
              <span className="text-green-500">{analytics.winCount}W</span>
              {' / '}
              <span className="text-red-500">{analytics.lossCount}L</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Commission</span>
            </div>
            <p className="text-xl font-bold text-orange-500">
              ${analytics.totalCommission.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              P/L by Symbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topSymbols.map(([symbol, data]) => (
                <div key={symbol} className="flex justify-between items-center">
                  <div>
                    <span className="font-mono text-sm">{symbol}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({data.count} trades, {((data.wins / data.count) * 100).toFixed(0)}% win)
                    </span>
                  </div>
                  <span className={`font-medium ${data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${data.pnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              P/L by Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topStrategies.map(([strategy, data]) => (
                <div key={strategy} className="flex justify-between items-center">
                  <div>
                    <span className="text-sm">{strategy}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({data.count} trades, {((data.wins / data.count) * 100).toFixed(0)}% win)
                    </span>
                  </div>
                  <span className={`font-medium ${data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${data.pnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
