import { useMemo } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Position {
  id: number;
  exit_timestamp: string | null;
  pnl: number | null;
  open: boolean;
}

interface MonthlyHeatmapProps {
  positions: Position[];
  onMonthClick?: (month: Date) => void;
}

interface MonthData {
  date: Date;
  monthKey: string;
  displayMonth: string;
  displayYear: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
}

function getHeatmapColor(pnl: number, maxAbsPnl: number): string {
  if (maxAbsPnl === 0) return 'bg-muted/50';
  
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
  
  if (pnl === 0) return 'bg-muted/50';
  
  if (pnl > 0) {
    // Green scale
    if (intensity > 0.75) return 'bg-green-500/80';
    if (intensity > 0.5) return 'bg-green-500/60';
    if (intensity > 0.25) return 'bg-green-500/40';
    return 'bg-green-500/20';
  } else {
    // Red scale
    if (intensity > 0.75) return 'bg-red-500/80';
    if (intensity > 0.5) return 'bg-red-500/60';
    if (intensity > 0.25) return 'bg-red-500/40';
    return 'bg-red-500/20';
  }
}

export function MonthlyHeatmap({ positions, onMonthClick }: MonthlyHeatmapProps) {
  const monthlyData = useMemo(() => {
    const closedPositions = positions.filter(p => !p.open && p.exit_timestamp);
    
    if (closedPositions.length === 0) return [];

    // Group by month - only months with actual trades from filtered positions
    const byMonth: Record<string, { pnl: number; trades: number; wins: number; date: Date }> = {};
    
    closedPositions.forEach(p => {
      const exitDate = new Date(p.exit_timestamp!);
      const monthKey = format(exitDate, 'yyyy-MM');
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { pnl: 0, trades: 0, wins: 0, date: startOfMonth(exitDate) };
      }
      byMonth[monthKey].pnl += p.pnl || 0;
      byMonth[monthKey].trades += 1;
      if ((p.pnl || 0) > 0) byMonth[monthKey].wins += 1;
    });

    // Only include months that have trades (respects the time period filter)
    const months: MonthData[] = Object.entries(byMonth)
      .map(([monthKey, data]) => ({
        date: data.date,
        monthKey,
        displayMonth: format(data.date, 'MMM'),
        displayYear: format(data.date, 'yyyy'),
        pnl: data.pnl,
        trades: data.trades,
        wins: data.wins,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return months;
  }, [positions]);

  if (monthlyData.length === 0) {
    return null;
  }

  const maxAbsPnl = Math.max(...monthlyData.map(m => Math.abs(m.pnl)));

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Monthly P&L Heatmap
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Observed monthly performance. Click a month to filter. Based on logged trades.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Heatmap grid - adapts to filtered data */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {monthlyData.map((month) => (
            <TooltipProvider key={month.monthKey}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onMonthClick?.(month.date)}
                    className={`
                      rounded-lg p-3 text-center transition-all
                      hover:ring-2 hover:ring-primary/50
                      ${getHeatmapColor(month.pnl, maxAbsPnl)}
                      ${onMonthClick ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <p className="text-xs font-medium">{month.displayMonth}</p>
                    <p className="text-[10px] text-muted-foreground">{month.displayYear}</p>
                    <p className={`text-xs font-bold ${month.pnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {month.pnl >= 0 ? '+' : ''}${month.pnl.toFixed(0)}
                    </p>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="space-y-1">
                  <p className="font-medium">{format(month.date, 'MMMM yyyy')}</p>
                  {month.trades > 0 ? (
                    <>
                      <p className={month.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        P/L: {month.pnl >= 0 ? '+' : ''}${month.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {month.trades} trade{month.trades !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {month.winRate.toFixed(0)}% win rate
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No trades recorded</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/60" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted/50" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/60" />
            <span>Profit</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Based on logged trades
        </p>
      </CardContent>
    </Card>
  );
}
