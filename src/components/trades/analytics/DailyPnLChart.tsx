import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface Position {
  id: number;
  exit_timestamp: string | null;
  entry_timestamp: string;
  pnl: number | null;
  open: boolean;
}

interface DailyPnLChartProps {
  positions: Position[];
}

type ViewMode = 'absolute' | 'cumulative';

export function DailyPnLChart({ positions }: DailyPnLChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('absolute');

  const chartData = useMemo(() => {
    const closedPositions = positions.filter(p => !p.open && p.exit_timestamp);
    
    if (closedPositions.length === 0) return [];

    // Group by date
    const byDate: Record<string, { pnl: number; trades: number }> = {};
    
    closedPositions.forEach(p => {
      const date = format(new Date(p.exit_timestamp!), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = { pnl: 0, trades: 0 };
      byDate[date].pnl += p.pnl || 0;
      byDate[date].trades += 1;
    });

    // Sort by date ascending
    const sorted = Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        pnl: data.pnl,
        trades: data.trades
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative if needed
    if (viewMode === 'cumulative') {
      let cumulative = 0;
      return sorted.map(day => {
        cumulative += day.pnl;
        return { ...day, pnl: cumulative };
      });
    }

    return sorted;
  }, [positions, viewMode]);

  if (chartData.length === 0) {
    return null;
  }

  const chartConfig = {
    pnl: {
      label: viewMode === 'absolute' ? 'Daily P/L' : 'Cumulative P/L',
    }
  };

  const maxValue = Math.max(...chartData.map(d => Math.abs(d.pnl)));
  const yAxisDomain = viewMode === 'cumulative' 
    ? [Math.min(...chartData.map(d => d.pnl), 0), Math.max(...chartData.map(d => d.pnl), 0)]
    : [-maxValue * 1.1, maxValue * 1.1];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Daily Profit & Loss
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Observed performance by day based on recorded trades.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="ml-auto flex gap-1">
            <Button
              variant={viewMode === 'absolute' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setViewMode('absolute')}
            >
              Daily
            </Button>
            <Button
              variant={viewMode === 'cumulative' ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setViewMode('cumulative')}
            >
              Cumulative
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={yAxisDomain}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              width={50}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    return (
                      <div className="space-y-1">
                        <p className="font-medium">{format(new Date(data.date), 'MMM d, yyyy')}</p>
                        <p className={data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.trades} trade{data.trades !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl >= 0 ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Based on logged trades
        </p>
      </CardContent>
    </Card>
  );
}
