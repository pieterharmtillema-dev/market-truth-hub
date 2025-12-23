import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tags, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Position {
  id: number;
  pnl: number | null;
  tags: string[] | null;
  open: boolean;
}

interface SetupPerformanceCardProps {
  positions: Position[];
}

interface SetupStats {
  tag: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export function SetupPerformanceCard({ positions }: SetupPerformanceCardProps) {
  const setupStats = useMemo((): SetupStats[] => {
    // Filter to closed positions with tags
    const closedWithTags = positions.filter(p => !p.open && p.tags && p.tags.length > 0);
    
    // Group by tag
    const tagMap: Record<string, { pnls: number[] }> = {};
    
    for (const position of closedWithTags) {
      for (const tag of position.tags || []) {
        if (!tagMap[tag]) {
          tagMap[tag] = { pnls: [] };
        }
        tagMap[tag].pnls.push(position.pnl || 0);
      }
    }

    // Calculate stats for each tag
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

  return (
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
        {setupStats.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tagged trades yet</p>
            <p className="text-xs mt-1">Add setup tags to your trades to see performance by strategy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {setupStats.map((setup) => (
              <div 
                key={setup.tag} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-medium">
                    {setup.tag}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {setup.trades} trade{setup.trades !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={setup.winRate >= 50 ? 'default' : 'secondary'}>
                      {setup.winRate.toFixed(0)}% WR
                    </Badge>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <span className={`font-medium ${setup.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {setup.pnl >= 0 ? '+' : ''}${setup.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}