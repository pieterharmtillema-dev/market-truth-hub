import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2
} from 'lucide-react';

interface Trade {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  profit_loss: number | null;
  commission?: number | null;
}

interface TradeJournalSummaryProps {
  refreshTrigger?: number;
}

interface DailySummary {
  date: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface SymbolSummary {
  symbol: string;
  trades: number;
  pnl: number;
  wins: number;
  winRate: number;
}

export function TradeJournalSummary({ refreshTrigger }: TradeJournalSummaryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTrades([]);
        return;
      }

      const { data, error } = await supabase
        .from('trader_trades')
        .select('id, asset, direction, entry_price, exit_price, entry_date, profit_loss, commission')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch trades', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrades();
  }, [refreshTrigger, fetchTrades]);

  // Calculate summaries
  const { totalPnL, totalCommission, wins, losses, winRate, avgPnL, bestTrade, worstTrade } = useMemo(() => {
    const pnlValues = trades.map(t => t.profit_loss || 0);
    const total = pnlValues.reduce((sum, v) => sum + v, 0);
    const commission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const w = trades.filter(t => (t.profit_loss || 0) > 0).length;
    const l = trades.filter(t => (t.profit_loss || 0) < 0).length;
    const rate = trades.length > 0 ? (w / trades.length) * 100 : 0;
    const avg = trades.length > 0 ? total / trades.length : 0;
    const best = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const worst = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
    
    return { 
      totalPnL: total, 
      totalCommission: commission,
      wins: w, 
      losses: l, 
      winRate: rate, 
      avgPnL: avg,
      bestTrade: best,
      worstTrade: worst
    };
  }, [trades]);

  // Daily summaries
  const dailySummaries = useMemo((): DailySummary[] => {
    const byDate: Record<string, Trade[]> = {};
    trades.forEach(trade => {
      const date = format(new Date(trade.entry_date), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(trade);
    });

    return Object.entries(byDate)
      .map(([date, dayTrades]) => {
        const pnl = dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
        const w = dayTrades.filter(t => (t.profit_loss || 0) > 0).length;
        const l = dayTrades.filter(t => (t.profit_loss || 0) < 0).length;
        return {
          date,
          trades: dayTrades.length,
          pnl,
          wins: w,
          losses: l,
          winRate: dayTrades.length > 0 ? (w / dayTrades.length) * 100 : 0
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14); // Last 14 days
  }, [trades]);

  // Symbol summaries
  const symbolSummaries = useMemo((): SymbolSummary[] => {
    const bySymbol: Record<string, Trade[]> = {};
    trades.forEach(trade => {
      if (!bySymbol[trade.asset]) bySymbol[trade.asset] = [];
      bySymbol[trade.asset].push(trade);
    });

    return Object.entries(bySymbol)
      .map(([symbol, symbolTrades]) => {
        const pnl = symbolTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
        const w = symbolTrades.filter(t => (t.profit_loss || 0) > 0).length;
        return {
          symbol,
          trades: symbolTrades.length,
          pnl,
          wins: w,
          winRate: symbolTrades.length > 0 ? (w / symbolTrades.length) * 100 : 0
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No trades to analyze. Import some trades first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Summary */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">{trades.length}</p>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Net P/L</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={`text-3xl font-bold ${avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {avgPnL >= 0 ? '+' : ''}${avgPnL.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Avg P/L</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Wins:</span>
              <span className="font-medium">{wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Losses:</span>
              <span className="font-medium">{losses}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Commission:</span>
              <span className="font-medium">${totalCommission.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Best:</span>
              <span className="font-medium text-green-500">+${bestTrade.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Worst:</span>
              <span className="font-medium text-red-500">${worstTrade.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {dailySummaries.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Trades</TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummaries.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {format(new Date(day.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">{day.trades}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={day.winRate >= 50 ? 'default' : 'secondary'}>
                          {day.winRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${day.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* By Symbol */}
      {symbolSummaries.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performance by Symbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {symbolSummaries.slice(0, 10).map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{item.symbol}</Badge>
                    <span className="text-sm text-muted-foreground">{item.trades} trades</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={item.winRate >= 50 ? 'default' : 'secondary'}>
                      {item.winRate.toFixed(0)}% win
                    </Badge>
                    <span className={`font-medium ${item.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
