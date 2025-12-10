import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2, ChevronDown, ChevronUp, Filter, PenLine, Save, X, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface TradeJournalListProps {
  refreshTrigger?: number;
}

export function TradeJournalList({ refreshTrigger }: TradeJournalListProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const { toast } = useToast();

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPositions([]);
        return;
      }

      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch positions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPositions();
  }, [refreshTrigger, fetchPositions]);

  // Get unique symbols for filter
  const symbols = [...new Set(positions.map(p => p.symbol))].sort();

  // Filter positions
  const filteredPositions = filterSymbol === 'all' 
    ? positions 
    : positions.filter(p => p.symbol === filterSymbol);

  // Calculate summary stats
  const totalPnL = filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const wins = filteredPositions.filter(p => (p.pnl || 0) > 0).length;
  const closedCount = filteredPositions.filter(p => !p.open).length;
  const winRate = closedCount > 0 ? (wins / closedCount) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No positions yet. Connect your extension to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
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
      </div>

      {/* Position Cards */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3 pr-2">
          {filteredPositions.map((position) => (
            <Collapsible 
              key={position.id} 
              open={expandedTrade === position.id} 
              onOpenChange={(open) => setExpandedTrade(open ? position.id : null)}
            >
              <Card className="border-border/50 bg-card/50 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={position.side === 'long' ? 'default' : 'destructive'} 
                          className="gap-1"
                        >
                          {position.side === 'long' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {position.side}
                        </Badge>
                        <span className="font-mono font-medium">{position.symbol}</span>
                        {position.open && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400">OPEN</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${(position.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(position.pnl || 0) >= 0 ? '+' : ''}${(position.pnl || 0).toFixed(2)}
                        </span>
                        {expandedTrade === position.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Entry: ${position.entry_price.toLocaleString()}</span>
                      <span>Exit: {position.exit_price ? `$${position.exit_price.toLocaleString()}` : '—'}</span>
                      <span>{format(new Date(position.entry_timestamp), 'MMM d, yy')}</span>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t border-border/50 p-3 bg-muted/20 space-y-3">
                    {/* Position Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>{' '}
                        <span className="font-medium">{position.quantity}</span>
                      </div>
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
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
