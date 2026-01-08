import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, subMonths, startOfWeek, startOfMonth, startOfYear, endOfDay, startOfDay, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Flame,
  Activity,
  Tags,
  HelpCircle,
  ChevronDown,
  Shield,
  BookOpen
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AverageHoldTimeCard, DailyPnLChart, PnLHeatmap } from './analytics';
import { EquityCurve, calculateAdjustedWinRate } from '@/components/analytics';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';

interface Position {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  entry_timestamp: string;
  exit_timestamp: string | null;
  pnl: number | null;
  open: boolean;
  tags: string[] | null;
  is_simulation: boolean;
}

interface TradeAnalyticsProps {
  refreshTrigger?: number;
}

type TimeFrame = 'today' | 'this_week' | 'this_month' | '30_days' | '90_days' | 'this_year' | 'all_time' | 'custom';

const timeFrameOptions: { value: TimeFrame; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: '30_days', label: 'Last 30 Days' },
  { value: '90_days', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

export function TradeAnalytics({ refreshTrigger }: TradeAnalyticsProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30_days');
  const [analyticsView, setAnalyticsView] = useState<'performance' | 'graphs' | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [showTimeFrameDropdown, setShowTimeFrameDropdown] = useState(false);
  const { isAdmin, isDeveloper } = useUserRole();

  // Handler for heatmap period click - sets custom date range
  const handlePeriodClick = useCallback((date: Date) => {
    // For simplicity, clicking any period sets it as a custom single-day filter
    setCustomDateFrom(startOfDay(date));
    setCustomDateTo(endOfDay(date));
    setTimeFrame('custom');
  }, []);

  const getDateRange = useCallback((tf: TimeFrame): { from: Date | null; to: Date } => {
    const now = new Date();
    const to = endOfDay(now);
    
    switch (tf) {
      case 'today':
        return { from: startOfDay(now), to };
      case 'this_week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to };
      case 'this_month':
        return { from: startOfMonth(now), to };
      case '30_days':
        return { from: subDays(now, 30), to };
      case '90_days':
        return { from: subDays(now, 90), to };
      case 'this_year':
        return { from: startOfYear(now), to };
      case 'all_time':
        return { from: null, to };
      case 'custom':
        return { 
          from: customDateFrom || subDays(now, 30), 
          to: customDateTo ? endOfDay(customDateTo) : to 
        };
      default:
        return { from: subDays(now, 30), to };
    }
  }, [customDateFrom, customDateTo]);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPositions([]);
        return;
      }

      const { from, to } = getDateRange(timeFrame);
      
      // Fetch closed positions (filtered by exit_timestamp)
      let closedQuery = supabase
        .from('positions')
        .select('id, symbol, side, entry_price, exit_price, entry_timestamp, exit_timestamp, pnl, open, tags, is_simulation')
        .eq('user_id', user.id)
        .eq('open', false);
      
      // Filter out simulation trades unless developer/admin
      if (!isDeveloper) {
        closedQuery = closedQuery.eq('is_simulation', false);
      }
      
      if (from) {
        closedQuery = closedQuery.gte('exit_timestamp', from.toISOString());
      }
      closedQuery = closedQuery.lte('exit_timestamp', to.toISOString());
      closedQuery = closedQuery.order('exit_timestamp', { ascending: false });

      // Fetch open positions (filtered by entry_timestamp for the selected period)
      let openQuery = supabase
        .from('positions')
        .select('id, symbol, side, entry_price, exit_price, entry_timestamp, exit_timestamp, pnl, open, tags, is_simulation')
        .eq('user_id', user.id)
        .eq('open', true);
      
      if (!isDeveloper) {
        openQuery = openQuery.eq('is_simulation', false);
      }
      
      if (from) {
        openQuery = openQuery.gte('entry_timestamp', from.toISOString());
      }
      openQuery = openQuery.lte('entry_timestamp', to.toISOString());
      openQuery = openQuery.order('entry_timestamp', { ascending: false });

      const [closedResult, openResult] = await Promise.all([closedQuery, openQuery]);

      if (closedResult.error) throw closedResult.error;
      if (openResult.error) throw openResult.error;
      
      // Combine closed and open positions
      const allPositions = [...(closedResult.data || []), ...(openResult.data || [])];
      setPositions(allPositions);
    } catch (error) {
      console.error('Failed to fetch positions', error);
    } finally {
      setLoading(false);
    }
  }, [timeFrame, getDateRange, isDeveloper]);

  useEffect(() => {
    fetchPositions();
  }, [refreshTrigger, fetchPositions]);

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    const pnlValues = positions.map(p => p.pnl || 0);
    const total = pnlValues.reduce((sum, v) => sum + v, 0);
    const wins = positions.filter(p => (p.pnl || 0) > 0).length;
    const losses = positions.filter(p => (p.pnl || 0) < 0).length;
    // Use Adjusted Win Rate formula: (Wins + 2) / (Wins + Losses + 4)
    const adjustedWinRate = calculateAdjustedWinRate(wins, losses);
    const avgPnl = positions.length > 0 ? total / positions.length : 0;
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
    
    return { totalPnL: total, wins, losses, winRate: adjustedWinRate, avgPnl, bestTrade, worstTrade };
  }, [positions]);

  // Calculate streak metrics
  const streakMetrics = useMemo(() => {
    const sorted = [...positions]
      .filter(p => p.pnl !== null && p.pnl !== 0)
      .sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime());

    if (sorted.length === 0) {
      return { currentWinStreak: 0, currentLossStreak: 0, longestWinStreak: 0, longestLossStreak: 0, avgStreakLength: 0, isCurrentlyWinning: false };
    }

    let longestWin = 0, longestLoss = 0, currentStreak = 0, currentIsWin = false;
    let streakLengths: number[] = [];
    let lastResult: 'win' | 'loss' | null = null;

    for (const position of sorted) {
      const isWin = (position.pnl || 0) > 0;
      const result = isWin ? 'win' : 'loss';

      if (lastResult === result) {
        currentStreak++;
      } else {
        if (lastResult !== null && currentStreak > 0) {
          streakLengths.push(currentStreak);
          if (lastResult === 'win') longestWin = Math.max(longestWin, currentStreak);
          else longestLoss = Math.max(longestLoss, currentStreak);
        }
        currentStreak = 1;
        currentIsWin = isWin;
      }
      lastResult = result;
    }

    if (currentStreak > 0) {
      streakLengths.push(currentStreak);
      if (lastResult === 'win') longestWin = Math.max(longestWin, currentStreak);
      else longestLoss = Math.max(longestLoss, currentStreak);
    }

    const avgStreak = streakLengths.length > 0 ? streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length : 0;

    return {
      currentWinStreak: currentIsWin ? currentStreak : 0,
      currentLossStreak: !currentIsWin ? currentStreak : 0,
      longestWinStreak: longestWin,
      longestLossStreak: longestLoss,
      avgStreakLength: avgStreak,
      isCurrentlyWinning: currentIsWin
    };
  }, [positions]);

  // Setup performance by tag
  const setupStats = useMemo(() => {
    const tagMap: Record<string, { pnls: number[] }> = {};
    
    for (const position of positions.filter(p => p.tags && p.tags.length > 0)) {
      for (const tag of position.tags || []) {
        if (!tagMap[tag]) tagMap[tag] = { pnls: [] };
        tagMap[tag].pnls.push(position.pnl || 0);
      }
    }

    return Object.entries(tagMap)
      .map(([tag, data]) => {
        const wins = data.pnls.filter(p => p > 0).length;
        const totalPnl = data.pnls.reduce((a, b) => a + b, 0);
        return {
          tag,
          trades: data.pnls.length,
          pnl: totalPnl,
          winRate: data.pnls.length > 0 ? (wins / data.pnls.length) * 100 : 0,
          avgPnl: data.pnls.length > 0 ? totalPnl / data.pnls.length : 0
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [positions]);

  // Daily summaries
  const dailySummaries = useMemo(() => {
    const byDate: Record<string, Position[]> = {};
    positions.forEach(position => {
      const date = format(new Date(position.exit_timestamp || position.entry_timestamp), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(position);
    });

    return Object.entries(byDate)
      .map(([date, dayPositions]) => {
        const pnl = dayPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
        const w = dayPositions.filter(p => (p.pnl || 0) > 0).length;
        return {
          date,
          trades: dayPositions.length,
          pnl,
          wins: w,
          losses: dayPositions.filter(p => (p.pnl || 0) < 0).length,
          winRate: dayPositions.length > 0 ? (w / dayPositions.length) * 100 : 0
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
  }, [positions]);

  // Symbol summaries
  const symbolSummaries = useMemo(() => {
    const bySymbol: Record<string, Position[]> = {};
    positions.forEach(position => {
      if (!bySymbol[position.symbol]) bySymbol[position.symbol] = [];
      bySymbol[position.symbol].push(position);
    });

    return Object.entries(bySymbol)
      .map(([symbol, symbolPositions]) => {
        const pnl = symbolPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
        const w = symbolPositions.filter(p => (p.pnl || 0) > 0).length;
        return {
          symbol,
          trades: symbolPositions.length,
          pnl,
          wins: w,
          winRate: symbolPositions.length > 0 ? (w / symbolPositions.length) * 100 : 0
        };
      })
      .sort((a, b) => b.pnl - a.pnl);
  }, [positions]);

  const selectedTimeFrameLabel = timeFrameOptions.find(o => o.value === timeFrame)?.label || 'Select';

  if (analyticsView === null) {
    return (
      <div className="space-y-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Choose Analytics View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto w-full justify-start p-4 text-left"
                onClick={() => setAnalyticsView('performance')}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-base font-semibold">Performance</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Overall performance, average hold time, streaks, daily performance, and performance by symbol.
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto w-full justify-start p-4 text-left"
                onClick={() => setAnalyticsView('graphs')}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="text-base font-semibold">Graphs</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Daily profit & loss, equity curve, and the monthly P&L heatmap.
                  </p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verified trades notice */}
      <div className="flex items-center justify-between gap-2 text-sm bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-primary">
            {isDeveloper ? 'Showing all trades (including paper)' : 'Analytics show verified trades only'}
          </span>
        </div>
        {!isDeveloper && (
          <Link to="/journal" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-xs">Paper trades in Journal</span>
          </Link>
        )}
      </div>

      {/* Time Frame Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time Period:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick select buttons */}
              <div className="flex gap-1 flex-wrap">
                {timeFrameOptions.slice(0, 6).map((option) => (
                  <Button
                    key={option.value}
                    variant={timeFrame === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFrame(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              
              {/* All Time button */}
              <Button
                variant={timeFrame === 'all_time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFrame('all_time')}
                className="text-xs"
              >
                All Time
              </Button>

              {/* Custom date range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={timeFrame === 'custom' ? 'default' : 'outline'} 
                    size="sm" 
                    className="text-xs gap-1"
                  >
                    Custom
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">From</p>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                              {customDateFrom ? format(customDateFrom, 'MMM d, yyyy') : 'Start date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">To</p>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                              {customDateTo ? format(customDateTo, 'MMM d, yyyy') : 'End date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={() => setTimeFrame('custom')}
                      disabled={!customDateFrom}
                    >
                      Apply Custom Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics View Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analytics View:</span>
            </div>
            <Tabs value={analyticsView} onValueChange={(value) => setAnalyticsView(value as 'performance' | 'graphs')} className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto bg-muted/30">
                <TabsTrigger value="performance" className="flex-1 gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="sm:hidden">Performance</span>
                  <span className="hidden sm:inline">Overall Performance</span>
                </TabsTrigger>
                <TabsTrigger value="graphs" className="flex-1 gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Graphs
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {positions.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No closed trades in this time period.</p>
            <p className="text-xs mt-1">Try selecting a different time range.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {analyticsView === 'performance' ? (
            <>
              {/* Overall Performance */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Overall Performance
                    <Badge variant="outline" className="ml-auto text-xs">
                      {positions.length} trade{positions.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{positions.length}</p>
                      <p className="text-sm text-muted-foreground">Trades</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className={`text-3xl font-bold ${overallMetrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {overallMetrics.totalPnL >= 0 ? '+' : ''}${overallMetrics.totalPnL.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Net P/L</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className={cn("text-3xl font-bold", overallMetrics.winRate >= 50 ? "text-green-500" : "text-red-500")}>
                        {overallMetrics.winRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Adj. Win Rate</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className={`text-3xl font-bold ${overallMetrics.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {overallMetrics.avgPnl >= 0 ? '+' : ''}${overallMetrics.avgPnl.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg P/L</p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Wins:</span>
                      <span className="font-medium">{overallMetrics.wins}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-muted-foreground">Losses:</span>
                      <span className="font-medium">{overallMetrics.losses}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Best:</span>
                      <span className="font-medium text-green-500">+${overallMetrics.bestTrade.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-muted-foreground">Worst:</span>
                      <span className="font-medium text-red-500">${overallMetrics.worstTrade.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Average Hold Time */}
              <AverageHoldTimeCard positions={positions} />

              {/* Streaks */}
              {(streakMetrics.longestWinStreak > 0 || streakMetrics.longestLossStreak > 0) && (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />
                      Streaks
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Streaks show patterns in consecutive wins or losses, helping you spot momentum or overtrading.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {streakMetrics.isCurrentlyWinning ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">Current</span>
                        </div>
                        <p className={`text-2xl font-bold ${streakMetrics.isCurrentlyWinning ? 'text-green-500' : 'text-red-500'}`}>
                          {streakMetrics.isCurrentlyWinning ? streakMetrics.currentWinStreak : streakMetrics.currentLossStreak}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {streakMetrics.isCurrentlyWinning ? 'Win Streak' : 'Loss Streak'}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Flame className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Best</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">{streakMetrics.longestWinStreak}</p>
                        <p className="text-xs text-muted-foreground">Longest Win</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-muted-foreground">Worst</span>
                        </div>
                        <p className="text-2xl font-bold text-red-500">{streakMetrics.longestLossStreak}</p>
                        <p className="text-xs text-muted-foreground">Longest Loss</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Avg</span>
                        </div>
                        <p className="text-2xl font-bold">{streakMetrics.avgStreakLength.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Streak Length</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Setup Performance */}
              {setupStats.length > 0 && (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tags className="h-5 w-5 text-primary" />
                      Performance by Setup
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>See how different trade setups perform over time based on your own tagging.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {setupStats.map((setup) => (
                        <div key={setup.tag} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-medium">{setup.tag}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {setup.trades} trade{setup.trades !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={setup.winRate >= 50 ? 'default' : 'secondary'}>
                              {setup.winRate.toFixed(0)}% WR
                            </Badge>
                            <span className={`font-medium min-w-[80px] text-right ${setup.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {setup.pnl >= 0 ? '+' : ''}${setup.pnl.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily Performance */}
              {dailySummaries.length > 0 && (
                <Card className="border-border/50 bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
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
            </>
          ) : (
            <>
              {/* Daily P/L Chart */}
              <DailyPnLChart positions={positions} />

              {/* Private Equity Curve - Shows numeric PnL values */}
              <EquityCurve positions={positions} currency="$" />

              {/* P&L Heatmap - has its own independent time filter */}
              <PnLHeatmap positions={positions} onPeriodClick={handlePeriodClick} />
            </>
          )}
        </>
      )}
    </div>
  );
}
