import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Filter, TrendingUp, TrendingDown, Clock, Target, DollarSign, BarChart3 } from 'lucide-react';
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
        const bracketData = order.bracket_data 
          ? (order.bracket_data as unknown as BracketData)
          : null;
        
        const orderWithBracket: AlpacaOrderWithBracket = {
          ...order,
          bracket_data: bracketData,
        };

        ordersMap.set(order.order_id, orderWithBracket);
        
        if (order.filled_at) {
          const timestamp = new Date(order.filled_at);
          const hourKey = `${order.symbol}-${order.side}-${timestamp.toISOString().slice(0, 13)}`;
          ordersMap.set(hourKey, orderWithBracket);
        }
        
        const symbolSideKey = `${order.symbol}-${order.side}`;
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
      
      if (user?.id) {
        await fetchAlpacaOrders(user.id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch positions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getAlpacaDataForPosition = (position: Position): { 
    bracketData: BracketData | null; 
    orderClass: string | null;
    entryOrder: OrderDetails | null;
  } => {
    if (position.platform !== 'Alpaca' && position.exchange_source !== 'alpaca') {
      return { bracketData: null, orderClass: null, entryOrder: null };
    }
    
    const entrySide = position.side === 'long' ? 'buy' : 'sell';
    
    if (position.entry_timestamp) {
      const timestamp = new Date(position.entry_timestamp);
      const hourKey = `${position.symbol}-${entrySide}-${timestamp.toISOString().slice(0, 13)}`;
      const order = alpacaOrders.get(hourKey);
      if (order) {
        return buildOrderDetails(order);
      }
    }
    
    const symbolSideKey = `${position.symbol}-${entrySide}`;
    const order = alpacaOrders.get(symbolSideKey);
    if (order) {
      return buildOrderDetails(order);
    }
    
    return { bracketData: null, orderClass: null, entryOrder: null };
  };
  
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

  const symbols = [...new Set(positions.map(p => p.symbol))].sort();

  const filteredPositions = positions.filter(position => {
    if (filterSymbol !== 'all' && position.symbol !== filterSymbol) return false;
    if (filterStatus === 'open' && !position.open) return false;
    if (filterStatus === 'closed' && position.open) return false;
    return true;
  });

  const totalPnL = filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const wins = filteredPositions.filter(p => (p.pnl || 0) > 0).length;
  const closedTrades = filteredPositions.filter(p => !p.open).length;
  const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">No positions yet</p>
        <p className="text-sm mt-1">Connect your exchange to start tracking trades</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-card/80 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider font-medium">Total P/L</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-card/80 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Target className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider font-medium">Win Rate</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${winRate >= 50 ? 'text-green-400' : 'text-amber-400'}`}>
              {winRate.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-card/80 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/10 to-transparent blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider font-medium">Positions</span>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{filteredPositions.length}</p>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-card/80 p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-orange-500/10 to-transparent blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider font-medium">Open</span>
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-amber-400">{filteredPositions.filter(p => p.open).length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium">Filters</span>
        </div>
        <Select value={filterSymbol} onValueChange={setFilterSymbol}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
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
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trade Cards */}
      <ScrollArea className="h-[calc(100vh-28rem)] min-h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredPositions.map((position) => {
            const isExpanded = expandedRow === position.id;
            const pnlPositive = (position.pnl || 0) >= 0;
            
            return (
              <Collapsible 
                key={position.id} 
                open={isExpanded} 
                onOpenChange={(open) => setExpandedRow(open ? position.id : null)}
              >
                <div className={`
                  group relative overflow-hidden rounded-xl border transition-all duration-200
                  ${isExpanded 
                    ? 'border-primary/40 bg-card shadow-lg shadow-primary/5' 
                    : 'border-border bg-card/50 hover:border-border/80 hover:bg-card'}
                `}>
                  {/* Accent line based on P/L */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    position.open 
                      ? 'bg-amber-500' 
                      : pnlPositive 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                  }`} />
                  
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer p-4 pl-5">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: Symbol & Side */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`
                            flex items-center justify-center w-10 h-10 rounded-lg 
                            ${position.side === 'long' 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-red-500/10 text-red-400'}
                          `}>
                            {position.side === 'long' ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg tracking-tight">{position.symbol}</span>
                              {position.open && (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-5">
                                  OPEN
                                </Badge>
                              )}
                              {!position.open && position.exit_reason && (
                                <ExitReasonBadge exitReason={position.exit_reason} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="font-medium uppercase">{position.side}</span>
                              <span className="opacity-50">•</span>
                              <span>{position.quantity} shares</span>
                              <span className="opacity-50">•</span>
                              <span>{format(new Date(position.entry_timestamp), 'MMM d, HH:mm')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Center: Prices */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Entry</p>
                            <p className="font-mono font-semibold">${position.entry_price.toFixed(2)}</p>
                          </div>
                          <div className="text-muted-foreground/30">→</div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Exit</p>
                            <p className="font-mono font-semibold">
                              {position.exit_price ? `$${position.exit_price.toFixed(2)}` : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Right: P/L & Expand */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">P/L</p>
                            <p className={`font-mono font-bold text-lg ${
                              position.pnl != null 
                                ? pnlPositive ? 'text-green-400' : 'text-red-400'
                                : 'text-muted-foreground'
                            }`}>
                              {position.pnl != null ? (
                                <>
                                  {pnlPositive ? '+' : ''}${Math.abs(position.pnl).toFixed(2)}
                                </>
                              ) : '—'}
                            </p>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0 rounded-lg hover:bg-primary/10"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t border-border/50 bg-muted/20 p-4 pl-5">
                      <div className="space-y-4">
                        {/* Mobile: Show prices here */}
                        <div className="flex md:hidden items-center gap-4 text-sm">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Entry</p>
                            <p className="font-mono font-semibold">${position.entry_price.toFixed(2)}</p>
                          </div>
                          <div className="text-muted-foreground/30">→</div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Exit</p>
                            <p className="font-mono font-semibold">
                              {position.exit_price ? `$${position.exit_price.toFixed(2)}` : '—'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          {position.platform && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Platform</p>
                              <p className="font-medium">{position.platform}</p>
                            </div>
                          )}
                          {position.exit_timestamp && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Exit Time</p>
                              <p className="font-medium">{format(new Date(position.exit_timestamp), 'MMM d, HH:mm')}</p>
                            </div>
                          )}
                        </div>

                        {/* Bracket Details */}
                        {(position.platform === 'Alpaca' || position.exchange_source === 'alpaca') && (
                          <BracketDetailsPanel
                            {...getAlpacaDataForPosition(position)}
                            exitReason={position.exit_reason}
                            isAlpacaTrade={true}
                          />
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
