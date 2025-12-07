import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BarChart3, Calendar, Target, DollarSign } from 'lucide-react';
import { TradeAnalysisResult, MatchedTrade, DailySummary } from '@/lib/tradeAnalyzer';

interface TradeAnalysisViewProps {
  analysis: TradeAnalysisResult;
}

function formatCurrency(value: number, decimals = 2): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${value.toFixed(decimals)}`;
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function TradeAnalysisView({ analysis }: TradeAnalysisViewProps) {
  const { matchedTrades, unmatchedOrders, summary, parseResult } = analysis;

  // Top performers by symbol
  const topSymbols = useMemo(() => {
    return Object.entries(summary.bySymbol)
      .sort((a, b) => b[1].pnl - a[1].pnl)
      .slice(0, 5);
  }, [summary.bySymbol]);

  return (
    <div className="space-y-6">
      {/* Global Summary */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">{summary.totalTrades}</p>
              <p className="text-sm text-muted-foreground">Matched Trades</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={`text-3xl font-bold ${summary.netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(summary.netPnL)}
              </p>
              <p className="text-sm text-muted-foreground">Net P/L</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{summary.winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={`text-3xl font-bold ${summary.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(summary.avgPnL)}
              </p>
              <p className="text-sm text-muted-foreground">Avg P/L per Trade</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Wins:</span>
              <span className="font-medium">{summary.wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Losses:</span>
              <span className="font-medium">{summary.losses}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Commission:</span>
              <span className="font-medium">${summary.totalCommission.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Best:</span>
              <span className="font-medium text-green-500">{formatCurrency(summary.bestTrade)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Worst:</span>
              <span className="font-medium text-red-500">{formatCurrency(summary.worstTrade)}</span>
            </div>
          </div>

          {/* Unmatched/Skipped info */}
          {(summary.unmatchedOrders > 0 || summary.skippedRows > 0) && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">Processing Notes</p>
                <p className="text-muted-foreground">
                  {summary.unmatchedOrders > 0 && `${summary.unmatchedOrders} unmatched orders. `}
                  {summary.skippedRows > 0 && `${summary.skippedRows} rows skipped due to missing data.`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {summary.dailySummaries.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily P/L Summary
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
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.dailySummaries.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-center">{day.trades}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={day.winRate >= 50 ? 'default' : 'secondary'}>
                          {day.winRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${day.totalCommission.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${day.netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(day.netPnL)}
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
      {topSymbols.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performance by Symbol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSymbols.map(([symbol, data]) => (
                <div key={symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{symbol}</Badge>
                    <span className="text-sm text-muted-foreground">{data.trades} trades</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={data.winRate >= 50 ? 'default' : 'secondary'}>
                      {data.winRate.toFixed(0)}% win
                    </Badge>
                    <span className={`font-medium ${data.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(data.pnl)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched Trades Detail */}
      {matchedTrades.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Matched Trades ({matchedTrades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net P/L</TableHead>
                    <TableHead>Entry Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-mono font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'long' ? 'default' : 'destructive'}>
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{trade.entryPrice.toFixed(5)}</TableCell>
                      <TableCell className="text-right font-mono">{trade.exitPrice.toFixed(5)}</TableCell>
                      <TableCell className="text-right">{trade.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${trade.totalCommission.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${trade.netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(trade.netPnL)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {trade.entryTime.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Field Mappings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Detected Field Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(parseResult.fieldMappings).map(([header, field]) => (
              <Badge key={header} variant="secondary" className="text-xs">
                {header} → {field}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
