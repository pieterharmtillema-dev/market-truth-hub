import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BracketDetailsPanel, BracketData, ExitReasonBadge, OrderDetails } from './BracketDetailsPanel';

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
  exchange_source?: string | null;
  exit_reason?: string | null;
}

// Alpaca order with bracket data
interface AlpacaOrderWithBracket {
  id: string;
  order_id: string;
  symbol: string;
  side: string;
  order_type: string;
  qty: number;
  filled_qty: number;
  filled_avg_price: number | null;
  limit_price: number | null;
  stop_price: number | null;
  order_class: string | null;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  canceled_at: string | null;
  bracket_data: BracketData | null;
}

interface TradeHistoryTableProps {
  refreshTrigger?: number;
}

export function TradeHistoryTable({ refreshTrigger }: TradeHistoryTableProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [alpacaOrders, setAlpacaOrders] = useState<Map<string, AlpacaOrderWithBracket>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  // Fetch Alpaca orders with bracket data for expansion
  const fetchAlpacaOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('alpaca_orders')
        .select('id, order_id, symbol, side, order_type, qty, filled_qty, filled_avg_price, limit_price, stop_price, order_class, status, submitted_at, filled_at, canceled_at, bracket_data')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(500);

      if (error) {
        console.warn('Failed to fetch Alpaca orders:', error);
        return;
      }

      const ordersMap = new Map<string, AlpacaOrderWithBracket>();
      for (const order of data || []) {
        // Parse bracket_data from JSON
        const bracketData = order.bracket_data 
          ? (order.bracket_data as unknown as BracketData)
          : null;
        
        const orderWithBracket: AlpacaOrderWithBracket = {
          ...order,
          bracket_data: bracketData,
        };

        // Key by order_id for direct lookup
        ordersMap.set(order.order_id, orderWithBracket);
        
        // Key by symbol + side + timestamp for position matching
        // Format: SYMBOL-buy-2024-01-09T18:00:00Z (truncated to hour for window matching)
        if (order.filled_at) {
          const timestamp = new Date(order.filled_at);
          const hourKey = `${order.symbol}-${order.side}-${timestamp.toISOString().slice(0, 13)}`;
          ordersMap.set(hourKey, orderWithBracket);
        }
        
        // Also key by symbol-side for fallback
        const symbolSideKey = `${order.symbol}-${order.side}`;
        // Only use symbol-side if no better match exists
        if (!ordersMap.has(symbolSideKey)) {
          ordersMap.set(symbolSideKey, orderWithBracket);
        }
      }
      setAlpacaOrders(ordersMap);
    } catch (err) {
      console.warn('Error fetching Alpaca orders:', err);
    }
  };

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      let query = supabase
        .from('positions')
        .select('*, exit_reason')
        .order('entry_timestamp', { ascending: false })
        .limit(100);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPositions(data || []);
      
      // Also fetch Alpaca orders for bracket data
      if (user?.id) {
        await fetchAlpacaOrders(user.id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch positions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Get bracket data and entry order for a position (if it's from Alpaca)
  const getAlpacaDataForPosition = (position: Position): { 
    bracketData: BracketData | null; 
    orderClass: string | null;
    entryOrder: OrderDetails | null;
  } => {
    if (position.platform !== 'Alpaca' && position.exchange_source !== 'alpaca') {
      return { bracketData: null, orderClass: null, entryOrder: null };
    }
    
    // Determine the alpaca order side for entry (long = buy, short = sell)
    const entrySide = position.side === 'long' ? 'buy' : 'sell';
    
    // Try to find matching order by timestamp window first (most accurate)
    if (position.entry_timestamp) {
      const timestamp = new Date(position.entry_timestamp);
      const hourKey = `${position.symbol}-${entrySide}-${timestamp.toISOString().slice(0, 13)}`;
      const order = alpacaOrders.get(hourKey);
      if (order) {
        return buildOrderDetails(order);
      }
    }
    
    // Fallback to symbol + side
    const symbolSideKey = `${position.symbol}-${entrySide}`;
    const order = alpacaOrders.get(symbolSideKey);
    if (order) {
      return buildOrderDetails(order);
    }
    
    return { bracketData: null, orderClass: null, entryOrder: null };
  };
  
  // Helper to build order details from an Alpaca order
  const buildOrderDetails = (order: AlpacaOrderWithBracket) => {
    const entryOrder: OrderDetails = {
      order_id: order.order_id,
      order_type: order.order_type,
      status: order.status,
      submitted_at: order.submitted_at,
      filled_at: order.filled_at,
      canceled_at: order.canceled_at,
      limit_price: order.limit_price,
      stop_price: order.stop_price,
      filled_avg_price: order.filled_avg_price,
      qty: order.qty,
      filled_qty: order.filled_qty,
    };
    return { bracketData: order.bracket_data, orderClass: order.order_class, entryOrder };
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total P/L</p>
          <p className={`text-2xl font-bold tabular-nums ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
          <p className={`text-2xl font-bold tabular-nums ${winRate >= 50 ? 'text-green-400' : 'text-amber-400'}`}>
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Positions</p>
          <p className="text-2xl font-bold tabular-nums text-primary">{filteredPositions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-4 text-center hover:shadow-lg transition-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Open</p>
          <p className="text-2xl font-bold tabular-nums text-amber-400">{filteredPositions.filter(p => p.open).length}</p>
        </div>
      </div>

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
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <ScrollArea className="h-[calc(100vh-32rem)] min-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-10 pl-4"></TableHead>
                <TableHead className="w-[120px]">Symbol</TableHead>
                <TableHead className="w-[100px]">Side</TableHead>
                <TableHead className="w-[120px] text-right">Entry</TableHead>
                <TableHead className="w-[120px] text-right">Exit</TableHead>
                <TableHead className="w-[80px] text-right">Qty</TableHead>
                <TableHead className="w-[120px] text-right">P/L</TableHead>
                <TableHead className="w-[140px]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => (
                <Collapsible key={position.id} open={expandedRow === position.id} onOpenChange={(open) => setExpandedRow(open ? position.id : null)}>
                  <TableRow className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="w-10 pl-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10">
                          {expandedRow === position.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="w-[120px]">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-base">{position.symbol}</span>
                          {position.open && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400 bg-amber-500/10 px-1.5 py-0">OPEN</Badge>
                          )}
                        </div>
                        {!position.open && position.exit_reason && (
                          <ExitReasonBadge exitReason={position.exit_reason} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <Badge
                        variant={position.side === 'long' ? 'default' : 'destructive'}
                        className={`gap-1 ${position.side === 'long' ? 'bg-green-500/15 text-green-400 hover:bg-green-500/20' : 'bg-red-500/15 text-red-400 hover:bg-red-500/20'}`}
                      >
                        {position.side === 'long' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {position.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[120px] font-mono text-sm text-right">
                      ${position.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="w-[120px] font-mono text-sm text-right">
                      {position.exit_price ? `$${position.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </TableCell>
                    <TableCell className="w-[80px] text-right font-medium">{position.quantity}</TableCell>
                    <TableCell className="w-[120px] text-right font-mono font-semibold">
                      {position.pnl != null ? (
                        <span className={`${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="w-[140px] text-muted-foreground text-sm">
                      {format(new Date(position.entry_timestamp), 'MMM d, yy HH:mm')}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={8} className="py-4 px-6">
                        <div className="space-y-4 max-w-5xl">
                          {/* Basic position info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {position.platform && (
                              <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs">Platform</span>
                                <span className="font-medium">{position.platform}</span>
                              </div>
                            )}
                            {position.exit_timestamp && (
                              <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs">Exit Time</span>
                                <span className="font-medium">{format(new Date(position.exit_timestamp), 'MMM d, yy HH:mm')}</span>
                              </div>
                            )}
                          </div>

                          {/* Bracket Details (for Alpaca orders) */}
                          {(position.platform === 'Alpaca' || position.exchange_source === 'alpaca') && (
                            <BracketDetailsPanel
                              {...getAlpacaDataForPosition(position)}
                              exitReason={position.exit_reason}
                              isAlpacaTrade={true}
                            />
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
