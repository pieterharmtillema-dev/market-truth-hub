import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, TrendingDown, Activity, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Position {
  id: number;
  pnl: number | null;
  entry_timestamp: string;
  open: boolean;
}

interface StreakCardProps {
  positions: Position[];
}

interface StreakMetrics {
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgStreakLength: number;
  isCurrentlyWinning: boolean;
}

export function StreakCard({ positions }: StreakCardProps) {
  const metrics = useMemo((): StreakMetrics => {
    // Filter to closed positions only, sorted by entry time
    const closed = positions
      .filter(p => !p.open && p.pnl !== null && p.pnl !== 0)
      .sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime());

    if (closed.length === 0) {
      return {
        currentWinStreak: 0,
        currentLossStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        avgStreakLength: 0,
        isCurrentlyWinning: false
      };
    }

    let longestWin = 0;
    let longestLoss = 0;
    let currentStreak = 0;
    let currentIsWin = false;
    let streakLengths: number[] = [];
    let lastResult: 'win' | 'loss' | null = null;

    for (const position of closed) {
      const isWin = (position.pnl || 0) > 0;
      const result = isWin ? 'win' : 'loss';

      if (lastResult === result) {
        currentStreak++;
      } else {
        // Streak broken, record previous
        if (lastResult !== null && currentStreak > 0) {
          streakLengths.push(currentStreak);
          if (lastResult === 'win') {
            longestWin = Math.max(longestWin, currentStreak);
          } else {
            longestLoss = Math.max(longestLoss, currentStreak);
          }
        }
        currentStreak = 1;
        currentIsWin = isWin;
      }
      lastResult = result;
    }

    // Handle final streak
    if (currentStreak > 0) {
      streakLengths.push(currentStreak);
      if (lastResult === 'win') {
        longestWin = Math.max(longestWin, currentStreak);
      } else {
        longestLoss = Math.max(longestLoss, currentStreak);
      }
    }

    const avgStreak = streakLengths.length > 0 
      ? streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length 
      : 0;

    return {
      currentWinStreak: currentIsWin ? currentStreak : 0,
      currentLossStreak: !currentIsWin ? currentStreak : 0,
      longestWinStreak: longestWin,
      longestLossStreak: longestLoss,
      avgStreakLength: avgStreak,
      isCurrentlyWinning: currentIsWin
    };
  }, [positions]);

  const hasData = metrics.longestWinStreak > 0 || metrics.longestLossStreak > 0;

  return (
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
        {!hasData ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Not enough closed trades to calculate streaks
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Current Streak */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {metrics.isCurrentlyWinning ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">Current</span>
              </div>
              <p className={`text-2xl font-bold ${metrics.isCurrentlyWinning ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.isCurrentlyWinning ? metrics.currentWinStreak : metrics.currentLossStreak}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.isCurrentlyWinning ? 'Win Streak' : 'Loss Streak'}
              </p>
            </div>

            {/* Longest Win Streak */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Best</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{metrics.longestWinStreak}</p>
              <p className="text-xs text-muted-foreground">Longest Win</p>
            </div>

            {/* Longest Loss Streak */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Worst</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{metrics.longestLossStreak}</p>
              <p className="text-xs text-muted-foreground">Longest Loss</p>
            </div>

            {/* Average Streak */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Avg</span>
              </div>
              <p className="text-2xl font-bold">{metrics.avgStreakLength.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Streak Length</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}