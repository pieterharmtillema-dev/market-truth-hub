import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart as LineChartIcon, HelpCircle, ChevronDown } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ChartTimeFrame = '7d' | '30d' | '90d' | '1y' | 'all';

const timeFrameOptions: { value: ChartTimeFrame; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

interface Position {
  pnl: number | null;
  open: boolean;
  exit_timestamp: string | null;
  entry_timestamp: string;
}

interface EquityCurveProps {
  positions: Position[];
  currency?: string;
}

export function EquityCurve({ positions, currency = '€' }: EquityCurveProps) {
  const [viewMode, setViewMode] = useState<'line' | 'area'>('area');
  const [chartTimeFrame, setChartTimeFrame] = useState<ChartTimeFrame>('all');

  const getTimeFilterStartDate = (tf: ChartTimeFrame): Date | null => {
    const now = new Date();
    switch (tf) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      case '1y': return subMonths(now, 12);
      case 'all': return null;
    }
  };
  
  const chartData = useMemo(() => {
    const startDate = getTimeFilterStartDate(chartTimeFrame);
    const closedTrades = positions
      .filter(p => {
        if (p.open || p.pnl === null || !p.exit_timestamp) return false;
        if (startDate && new Date(p.exit_timestamp) < startDate) return false;
        return true;
      })
      .sort((a, b) => new Date(a.exit_timestamp!).getTime() - new Date(b.exit_timestamp!).getTime());
    
    let cumulative = 0;
    let maxEquity = 0;
    let drawdowns: number[] = [];
    
    return closedTrades.map((trade, index) => {
      cumulative += trade.pnl || 0;
      maxEquity = Math.max(maxEquity, cumulative);
      const drawdown = maxEquity > 0 ? ((maxEquity - cumulative) / maxEquity) * 100 : 0;
      drawdowns.push(drawdown);
      
      return {
        index: index + 1,
        date: trade.exit_timestamp,
        pnl: trade.pnl,
        cumulative,
        maxEquity,
        drawdown,
      };
    });
  }, [positions, chartTimeFrame]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const finalEquity = chartData[chartData.length - 1].cumulative;
    const maxDrawdown = Math.max(...chartData.map(d => d.drawdown));
    const highWaterMark = Math.max(...chartData.map(d => d.cumulative));
    
    return {
      finalEquity,
      maxDrawdown,
      highWaterMark,
    };
  }, [chartData]);

  const isPositive = stats ? stats.finalEquity >= 0 : true;

  const ExplanationContent = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This equity curve shows your cumulative profit and loss from your trades over time.
      </p>
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium">Reading the chart:</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• <span className="text-green-500">Green area</span> = Profitable equity</li>
          <li>• <span className="text-red-500">Red area</span> = Negative equity</li>
          <li>• Steeper climbs = Larger winning trades</li>
          <li>• Drops = Losing trades or drawdowns</li>
        </ul>
      </div>
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Key metrics:</p>
        <p>• <strong>High Water Mark:</strong> Peak equity reached</p>
        <p>• <strong>Max Drawdown:</strong> Largest peak-to-trough decline</p>
      </div>
    </div>
  );

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No closed trades to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedTimeFrameLabel = timeFrameOptions.find(o => o.value === chartTimeFrame)?.label || 'All Time';

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" />
          Equity Curve
          <div className="flex items-center gap-1 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  {selectedTimeFrameLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {timeFrameOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setChartTimeFrame(option.value)}
                    className={cn(chartTimeFrame === option.value && 'bg-accent')}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={viewMode === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('area')}
              className="h-7 text-xs"
            >
              Area
            </Button>
            <Button
              variant={viewMode === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('line')}
              className="h-7 text-xs"
            >
              Line
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Understanding Your Equity Curve</DialogTitle>
                </DialogHeader>
                <ExplanationContent />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cumulative P/L from your trades
        </p>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className={cn(
                "text-lg font-bold",
                stats.finalEquity >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {stats.finalEquity >= 0 ? '+' : ''}{currency}{stats.finalEquity.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Net P/L</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-500">
                {currency}{stats.highWaterMark.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">High Water Mark</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-500">
                {stats.maxDrawdown.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis 
                dataKey="index" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `#${value}`}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${currency}${value}`}
                width={60}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          Trade #{data.index}
                        </p>
                        <p className={cn(
                          "font-medium",
                          data.cumulative >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {currency}{data.cumulative.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(data.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              
              {viewMode === 'area' ? (
                <Area 
                  type="monotone" 
                  dataKey="cumulative"
                  stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                  fill={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} 
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Based on {chartData.length} closed trades
        </p>
      </CardContent>
    </Card>
  );
}
