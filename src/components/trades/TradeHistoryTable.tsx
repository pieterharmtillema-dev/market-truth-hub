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

interface Position {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  entry_timestamp: string;
  exit_price: number | null;
  exit_timestamp: string | null;
  pnl: number | null;
  platform: string | null;
  open: boolean;
}

interface TradeHistoryTableProps {
  refreshTrigger?: number;
}

export function TradeHistoryTable({ refreshTrigger }: TradeHistoryTableProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  
  const { 
    verificationResults, 
    summary: verificationSummary, 
    isVerifying, 
    progress, 
    verifyAllTrades, 
    getTradeVerification 
  } = useTradeVerification();

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      let query = supabase
        .from('positions')
        .select('*')
        .order('entry_timestamp', { ascending: false })
        .limit(100);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch positions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [refreshTrigger]);

  // Get unique symbols for filters
  const symbols = [...new Set(positions.map(p => p.symbol))].sort();

  // Filter positions
  const filteredPositions = positions.filter(position => {
    if (filterSymbol !== 'all' && position.symbol !== filterSymbol) return false;
    if (filterStatus === 'open' && !position.open) return false;
    if (filterStatus === 'closed' && position.open) return false;
    return true;
  });

  // Calculate summary stats
  const totalPnL = filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const wins = filteredPositions.filter(p => (p.pnl || 0) > 0).length;
  const winRate = filteredPositions.filter(p => !p.open).length > 0 
    ? (wins / filteredPositions.filter(p => !p.open).length) * 100 
    : 0;
  
  // Convert positions to verification format
  const tradesToVerify: TradeToVerify[] = useMemo(() => {
    return filteredPositions.filter(p => !p.open).map(position => ({
      id: String(position.id),
      symbol: position.symbol,
      side: position.side,
      entry_fill_price: position.entry_price,
      exit_fill_price: position.exit_price,
      entry_timestamp: new Date(position.entry_timestamp),
      exit_timestamp: position.exit_timestamp ? new Date(position.exit_timestamp) : null,
      quantity: position.quantity,
    }));
  }, [filteredPositions]);
  
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

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No positions yet. Connect your extension to start tracking.</p>
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
          <p className="text-xs text-muted-foreground">Positions</p>
          <p className="text-lg font-bold">{filteredPositions.length}</p>
        </div>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="text-lg font-bold text-amber-500">{filteredPositions.filter(p => p.open).length}</p>
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleVerifyTrades}
            disabled={isVerifying || tradesToVerify.length === 0}
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
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>P/L</TableHead>
                <TableHead>Verify</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => (
                <Collapsible key={position.id} open={expandedRow === position.id} onOpenChange={(open) => setExpandedRow(open ? position.id : null)}>
                  <TableRow className="group">
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedRow === position.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono font-medium">{position.symbol}</span>
                        {position.open && (
                          <Badge variant="outline" className="ml-2 text-[10px] border-amber-500/50 text-amber-400">OPEN</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.side === 'long' ? 'default' : 'destructive'} className="gap-1">
                        {position.side === 'long' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {position.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${position.entry_price.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">
                      {position.exit_price ? `$${position.exit_price.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell>{position.quantity}</TableCell>
                    <TableCell>
                      {position.pnl != null ? (
                        <span className={position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {position.pnl >= 0 ? '+' : ''}${position.pnl.toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const verification = getTradeVerification(String(position.id));
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
                      {format(new Date(position.entry_timestamp), 'MMM d, yy HH:mm')}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={9} className="py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {position.platform && (
                            <div>
                              <span className="text-muted-foreground">Platform:</span>{' '}
                              <span className="font-medium">{position.platform}</span>
                            </div>
                          )}
                          {position.exit_timestamp && (
                            <div>
                              <span className="text-muted-foreground">Exit Time:</span>{' '}
                              <span className="font-medium">{format(new Date(position.exit_timestamp), 'MMM d, yy HH:mm')}</span>
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
