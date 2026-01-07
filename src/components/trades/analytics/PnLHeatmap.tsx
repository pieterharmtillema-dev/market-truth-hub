import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, subDays, eachDayOfInterval, eachWeekOfInterval, startOfYear, endOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, HelpCircle, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

const viewModeOptions: { value: ViewMode; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

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
  tags?: string[] | null;
}

interface PnLHeatmapProps {
  positions: Position[];
  onPeriodClick?: (date: Date) => void;
}

interface PeriodData {
  date: Date;
  key: string;
  displayLabel: string;
  displaySub?: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
}

function getTitle(viewMode: ViewMode): string {
  switch (viewMode) {
    case 'daily':
      return 'Daily P&L Heatmap';
    case 'weekly':
      return 'Weekly P&L Heatmap';
    case 'monthly':
      return 'Monthly P&L Heatmap';
    case 'yearly':
      return 'Yearly P&L Heatmap';
  }
}

function getHeatmapColor(pnl: number, maxAbsPnl: number, hasTrades: boolean): string {
  if (!hasTrades) return 'bg-muted/30';
  if (maxAbsPnl === 0) return 'bg-muted/50';
  
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
  
  if (pnl === 0) return 'bg-muted/50';
  
  if (pnl > 0) {
    if (intensity > 0.75) return 'bg-green-500/80';
    if (intensity > 0.5) return 'bg-green-500/60';
    if (intensity > 0.25) return 'bg-green-500/40';
    return 'bg-green-500/20';
  } else {
    if (intensity > 0.75) return 'bg-red-500/80';
    if (intensity > 0.5) return 'bg-red-500/60';
    if (intensity > 0.25) return 'bg-red-500/40';
    return 'bg-red-500/20';
  }
}

export function PnLHeatmap({ positions, onPeriodClick }: PnLHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const navigate = useNavigate();

  const heatmapData = useMemo(() => {
    const closedPositions = positions.filter(p => !p.open && p.exit_timestamp);
    const now = new Date();

    // Group positions by period
    const byPeriod: Record<string, { pnl: number; trades: number; wins: number }> = {};
    
    closedPositions.forEach(p => {
      const exitDate = new Date(p.exit_timestamp!);
      let periodKey: string;
      
      if (viewMode === 'daily') {
        periodKey = format(exitDate, 'yyyy-MM-dd');
      } else if (viewMode === 'weekly') {
        periodKey = format(startOfWeek(exitDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (viewMode === 'monthly') {
        periodKey = format(exitDate, 'yyyy-MM');
      } else {
        // yearly
        periodKey = format(exitDate, 'yyyy');
      }
      
      if (!byPeriod[periodKey]) byPeriod[periodKey] = { pnl: 0, trades: 0, wins: 0 };
      byPeriod[periodKey].pnl += p.pnl || 0;
      byPeriod[periodKey].trades += 1;
      if ((p.pnl || 0) > 0) byPeriod[periodKey].wins += 1;
    });

    // Generate periods based on view mode
    const periods: PeriodData[] = [];

    if (viewMode === 'daily') {
      // Show last 30 days
      const days = eachDayOfInterval({
        start: subDays(now, 29),
        end: now
      });
      
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        const data = byPeriod[key] || { pnl: 0, trades: 0, wins: 0 };
        periods.push({
          date: day,
          key,
          displayLabel: format(day, 'd'),
          displaySub: format(day, 'EEE'),
          pnl: data.pnl,
          trades: data.trades,
          wins: data.wins,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
        });
      });
    } else if (viewMode === 'weekly') {
      // Show last 12 weeks
      const weeks = eachWeekOfInterval(
        { start: subWeeks(now, 11), end: now },
        { weekStartsOn: 1 }
      );
      
      weeks.forEach(weekStart => {
        const key = format(weekStart, 'yyyy-MM-dd');
        const data = byPeriod[key] || { pnl: 0, trades: 0, wins: 0 };
        periods.push({
          date: weekStart,
          key,
          displayLabel: `W${format(weekStart, 'w')}`,
          displaySub: format(weekStart, 'MMM'),
          pnl: data.pnl,
          trades: data.trades,
          wins: data.wins,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
        });
      });
    } else if (viewMode === 'monthly') {
      // Show last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(now, i));
        const key = format(monthDate, 'yyyy-MM');
        const data = byPeriod[key] || { pnl: 0, trades: 0, wins: 0 };
        
        periods.push({
          date: monthDate,
          key,
          displayLabel: format(monthDate, 'MMM'),
          displaySub: format(monthDate, 'yy'),
          pnl: data.pnl,
          trades: data.trades,
          wins: data.wins,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
        });
      }
    } else {
      // Yearly - show last 5 years
      for (let i = 4; i >= 0; i--) {
        const yearDate = new Date(now.getFullYear() - i, 0, 1);
        const key = format(yearDate, 'yyyy');
        const data = byPeriod[key] || { pnl: 0, trades: 0, wins: 0 };
        
        periods.push({
          date: yearDate,
          key,
          displayLabel: format(yearDate, 'yyyy'),
          pnl: data.pnl,
          trades: data.trades,
          wins: data.wins,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
        });
      }
    }

    return periods;
  }, [positions, viewMode]);

  const handlePeriodClick = (period: PeriodData) => {
    if (period.trades === 0) return;
    
    // Build date range based on view mode
    let startDate: string;
    let endDate: string;
    
    if (viewMode === 'daily') {
      startDate = format(period.date, 'yyyy-MM-dd');
      endDate = format(period.date, 'yyyy-MM-dd');
    } else if (viewMode === 'weekly') {
      const weekStart = startOfWeek(period.date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(period.date, { weekStartsOn: 1 });
      startDate = format(weekStart, 'yyyy-MM-dd');
      endDate = format(weekEnd, 'yyyy-MM-dd');
    } else if (viewMode === 'monthly') {
      const monthStart = startOfMonth(period.date);
      const monthEnd = endOfMonth(period.date);
      startDate = format(monthStart, 'yyyy-MM-dd');
      endDate = format(monthEnd, 'yyyy-MM-dd');
    } else {
      const yearStart = startOfYear(period.date);
      const yearEnd = endOfYear(period.date);
      startDate = format(yearStart, 'yyyy-MM-dd');
      endDate = format(yearEnd, 'yyyy-MM-dd');
    }
    
    navigate(`/journal?from=${startDate}&to=${endDate}`);
    onPeriodClick?.(period.date);
  };

  if (heatmapData.every(p => p.trades === 0)) {
    return null;
  }

  const maxAbsPnl = Math.max(...heatmapData.filter(p => p.trades > 0).map(p => Math.abs(p.pnl)), 1);
  
  // Grid columns based on view mode
  const gridCols = viewMode === 'daily' 
    ? 'grid-cols-7' 
    : viewMode === 'weekly' 
      ? 'grid-cols-4 md:grid-cols-6' 
      : viewMode === 'yearly'
        ? 'grid-cols-5'
        : 'grid-cols-4 md:grid-cols-6 lg:grid-cols-12';

  const selectedViewModeLabel = viewModeOptions.find(o => o.value === viewMode)?.label || 'Monthly';

  return (
    <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {getTitle(viewMode)}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Observed {viewMode} performance. Click to view trades. Based on logged trades.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    {selectedViewModeLabel}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {viewModeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setViewMode(option.value)}
                      className={cn(viewMode === option.value && 'bg-accent')}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${gridCols} gap-2`}>
            {heatmapData.map((period) => (
              <TooltipProvider key={period.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handlePeriodClick(period)}
                      className={`
                        rounded-lg p-2 md:p-3 text-center transition-all
                        ${period.trades > 0 ? 'hover:ring-2 hover:ring-primary/50 cursor-pointer' : 'cursor-default'}
                        ${getHeatmapColor(period.pnl, maxAbsPnl, period.trades > 0)}
                      `}
                    >
                      <p className="text-xs font-medium">{period.displayLabel}</p>
                      {period.displaySub && (
                        <p className="text-[10px] text-muted-foreground">{period.displaySub}</p>
                      )}
                      {period.trades > 0 ? (
                        <p className={`text-xs font-bold ${period.pnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                          {period.pnl >= 0 ? '+' : ''}${Math.abs(period.pnl) >= 1000 ? `${(period.pnl / 1000).toFixed(1)}k` : period.pnl.toFixed(0)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">—</p>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="space-y-1">
                    <p className="font-medium">
                      {viewMode === 'daily' && format(period.date, 'EEEE, MMM d, yyyy')}
                      {viewMode === 'weekly' && `Week of ${format(period.date, 'MMM d, yyyy')}`}
                      {viewMode === 'monthly' && format(period.date, 'MMMM yyyy')}
                      {viewMode === 'yearly' && format(period.date, 'yyyy')}
                    </p>
                    {period.trades > 0 ? (
                      <>
                        <p className={period.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          P/L: {period.pnl >= 0 ? '+' : ''}${period.pnl.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {period.trades} trade{period.trades !== 1 ? 's' : ''} • Click to view
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {period.winRate.toFixed(0)}% win rate
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
