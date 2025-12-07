import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2, ChevronDown, ChevronUp, Filter, Shield, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useTradeVerification } from '@/hooks/useTradeVerification';
import { TradeVerificationBadge, VerificationSummaryCard } from './TradeVerificationBadge';
import { TradeToVerify } from '@/lib/tradeVerification';

interface Trade {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  exit_date: string | null;
  quantity: number | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  notes: string | null;
  user_id: string;
  broker_id?: string | null;
  account_id?: string | null;
  strategy?: string | null;
  instrument_type?: string | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  commission?: number | null;
  leverage?: number | null;
  margin?: number | null;
  entry_datetime_utc?: string | null;
  exit_datetime_utc?: string | null;
}

interface TradeHistoryTableProps {
  refreshTrigger?: number;
}

export function TradeHistoryTable({ refreshTrigger }: TradeHistoryTableProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');
  const { toast } = useToast();
  
  const { 
    verificationResults, 
    summary: verificationSummary, 
    isVerifying, 
    progress, 
    verifyAllTrades, 
    getTradeVerification 
  } = useTradeVerification();

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      let query = supabase
        .from('trader_trades')
        .select('*')
        .order('entry_date', { ascending: false })
        .limit(100);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch trades', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('trader_trades').delete().eq('id', id);
      if (error) throw error;
      setTrades(trades.filter(t => t.id !== id));
      toast({ title: 'Trade deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete trade', variant: 'destructive' });
    }
  };

  // Get unique symbols and strategies for filters
  const symbols = [...new Set(trades.map(t => t.asset))].sort();
  const strategies = [...new Set(trades.map(t => t.strategy).filter(Boolean))].sort();

  // Filter trades
  const filteredTrades = trades.filter(trade => {
    if (filterSymbol !== 'all' && trade.asset !== filterSymbol) return false;
    if (filterStrategy !== 'all' && trade.strategy !== filterStrategy) return false;
    return true;
  });

  // Calculate summary stats
  const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const totalCommission = filteredTrades.reduce((sum, t) => sum + (t.commission || 0), 0);
  const wins = filteredTrades.filter(t => (t.profit_loss || 0) > 0).length;
  const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;
  
  // Convert trades to verification format
  const tradesToVerify: TradeToVerify[] = useMemo(() => {
    return filteredTrades.map(trade => ({
      id: trade.id,
      symbol: trade.asset,
      side: trade.direction,
      entry_fill_price: trade.entry_price,
      exit_fill_price: trade.exit_price,
      entry_timestamp: new Date(trade.entry_datetime_utc || trade.entry_date),
      exit_timestamp: trade.exit_datetime_utc ? new Date(trade.exit_datetime_utc) : 
                      trade.exit_date ? new Date(trade.exit_date) : null,
      quantity: trade.quantity,
      instrument_type: trade.instrument_type
    }));
  }, [filteredTrades]);
  
  // Handle verify button click
  const handleVerifyTrades = () => {
    if (tradesToVerify.length === 0) return;
    verifyAllTrades(tradesToVerify);
    toast({
      title: 'Verification started',
      description: `Verifying ${tradesToVerify.length} trades against market data...`
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No trades yet. Upload a CSV to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total P/L</p>
          <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="text-lg font-bold">{filteredTrades.length}</p>
        </div>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Commission</p>
          <p className="text-lg font-bold text-orange-500">${totalCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Verification Summary */}
      {verificationSummary && (
        <VerificationSummaryCard
          total={verificationSummary.total_trades}
          verified={verificationSummary.verified_trades}
          impossible={verificationSummary.impossible_trades}
          suspicious={verificationSummary.suspicious_trades}
          averageScore={verificationSummary.average_score}
        />
      )}
      
      {/* Verification Progress */}
      {isVerifying && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying trades... {progress.completed}/{progress.total}</span>
          </div>
          <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
        </div>
      )}
      
      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterSymbol} onValueChange={setFilterSymbol}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Symbols" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {symbols.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStrategy} onValueChange={setFilterStrategy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Strategies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Strategies</SelectItem>
            {strategies.map(s => (
              <SelectItem key={s} value={s!}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleVerifyTrades}
            disabled={isVerifying || filteredTrades.length === 0}
            className="gap-2"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Verify Trades
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>P/L</TableHead>
                <TableHead>Verify</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <Collapsible key={trade.id} open={expandedRow === trade.id} onOpenChange={(open) => setExpandedRow(open ? trade.id : null)}>
                  <TableRow className="group">
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedRow === trade.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono font-medium">{trade.asset}</span>
                        {trade.strategy && (
                          <Badge variant="outline" className="ml-2 text-[10px]">{trade.strategy}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === 'long' || trade.direction === 'buy' ? 'default' : 'destructive'} className="gap-1">
                        {trade.direction === 'long' || trade.direction === 'buy' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {trade.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${trade.entry_price.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">
                      {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>{trade.quantity || '—'}</TableCell>
                    <TableCell>
                      {trade.profit_loss != null ? (
                        <span className={trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const verification = getTradeVerification(trade.id);
                        if (!verification) return <span className="text-muted-foreground text-xs">—</span>;
                        return (
                          <TradeVerificationBadge
                            verified={verification.verified}
                            authenticity_score={verification.authenticity_score}
                            suspicious_flag={verification.suspicious_flag}
                            impossible_flag={verification.impossible_flag}
                            verification_notes={verification.verification_notes}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(trade.entry_datetime_utc || trade.entry_date), 'MMM d, yy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {currentUserId === trade.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(trade.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={10} className="py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {trade.broker_id && (
                            <div>
                              <span className="text-muted-foreground">Broker:</span>{' '}
                              <span className="font-medium">{trade.broker_id}</span>
                            </div>
                          )}
                          {trade.account_id && (
                            <div>
                              <span className="text-muted-foreground">Account:</span>{' '}
                              <span className="font-medium">{trade.account_id}</span>
                            </div>
                          )}
                          {trade.instrument_type && (
                            <div>
                              <span className="text-muted-foreground">Type:</span>{' '}
                              <Badge variant="secondary">{trade.instrument_type}</Badge>
                            </div>
                          )}
                          {trade.stop_loss && (
                            <div>
                              <span className="text-muted-foreground">Stop Loss:</span>{' '}
                              <span className="font-mono text-red-500">${trade.stop_loss}</span>
                            </div>
                          )}
                          {trade.take_profit && (
                            <div>
                              <span className="text-muted-foreground">Take Profit:</span>{' '}
                              <span className="font-mono text-green-500">${trade.take_profit}</span>
                            </div>
                          )}
                          {trade.commission && (
                            <div>
                              <span className="text-muted-foreground">Commission:</span>{' '}
                              <span className="font-mono text-orange-500">${trade.commission}</span>
                            </div>
                          )}
                          {trade.leverage && (
                            <div>
                              <span className="text-muted-foreground">Leverage:</span>{' '}
                              <span className="font-medium">{trade.leverage}x</span>
                            </div>
                          )}
                          {trade.margin && (
                            <div>
                              <span className="text-muted-foreground">Margin:</span>{' '}
                              <span className="font-mono">${trade.margin}</span>
                            </div>
                          )}
                          {trade.notes && (
                            <div className="col-span-full">
                              <span className="text-muted-foreground">Notes:</span>{' '}
                              <span>{trade.notes}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
