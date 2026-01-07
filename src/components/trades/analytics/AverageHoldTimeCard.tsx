import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Position {
  id: number;
  entry_timestamp: string;
  exit_timestamp: string | null;
  open: boolean;
}

interface AverageHoldTimeCardProps {
  positions: Position[];
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  return `${minutes}m`;
}

export function AverageHoldTimeCard({ positions }: AverageHoldTimeCardProps) {
  const holdTimeMetrics = useMemo(() => {
    // Only include closed trades with valid timestamps
    const validTrades = positions.filter(
      p => !p.open && p.entry_timestamp && p.exit_timestamp
    );
    
    if (validTrades.length === 0) {
      return { average: 0, shortest: 0, longest: 0, count: 0 };
    }
    
    const durations = validTrades.map(p => {
      const entry = new Date(p.entry_timestamp).getTime();
      const exit = new Date(p.exit_timestamp!).getTime();
      return Math.max(0, exit - entry);
    });
    
    const total = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      average: total / durations.length,
      shortest: Math.min(...durations),
      longest: Math.max(...durations),
      count: validTrades.length
    };
  }, [positions]);

  if (holdTimeMetrics.count === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Average Hold Time
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Average duration between entry and exit for closed trades. Based on logged trades.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {formatDuration(holdTimeMetrics.average)}
            </p>
            <p className="text-sm text-muted-foreground">Average</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {formatDuration(holdTimeMetrics.shortest)}
            </p>
            <p className="text-sm text-muted-foreground">Shortest</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {formatDuration(holdTimeMetrics.longest)}
            </p>
            <p className="text-sm text-muted-foreground">Longest</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Based on {holdTimeMetrics.count} closed trade{holdTimeMetrics.count !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
