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
  strategy?: string | null;
  instrument_type?: string | null;
  commission?: number | null;
  leverage?: number | null;
  entry_datetime_utc?: string | null;
  exit_datetime_utc?: string | null;
}

interface TradeJournalListProps {
  refreshTrigger?: number;
}

export function TradeJournalList({ refreshTrigger }: TradeJournalListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const { toast } = useToast();

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTrades([]);
        return;
      }

      const { data, error } = await supabase
        .from('trader_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch trades', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrades();
  }, [refreshTrigger, fetchTrades]);

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

  const handleStartEditNotes = (trade: Trade) => {
    setEditingNotes(trade.id);
    setNotesValue(trade.notes || '');
  };

  const handleSaveNotes = async (tradeId: string) => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('trader_trades')
        .update({ notes: notesValue })
        .eq('id', tradeId);

      if (error) throw error;
      
      setTrades(trades.map(t => 
        t.id === tradeId ? { ...t, notes: notesValue } : t
      ));
      setEditingNotes(null);
      toast({ title: 'Notes saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save notes', variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  // Get unique symbols for filter
  const symbols = [...new Set(trades.map(t => t.asset))].sort();

  // Filter trades
  const filteredTrades = filterSymbol === 'all' 
    ? trades 
    : trades.filter(t => t.asset === filterSymbol);

  // Calculate summary stats
  const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const wins = filteredTrades.filter(t => (t.profit_loss || 0) > 0).length;
  const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No trades yet. Import a CSV to get started.</p>
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
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="text-lg font-bold">{filteredTrades.length}</p>
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

      {/* Trade Cards */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3 pr-2">
          {filteredTrades.map((trade) => (
            <Collapsible 
              key={trade.id} 
              open={expandedTrade === trade.id} 
              onOpenChange={(open) => setExpandedTrade(open ? trade.id : null)}
            >
              <Card className="border-border/50 bg-card/50 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={trade.direction === 'long' || trade.direction === 'buy' ? 'default' : 'destructive'} 
                          className="gap-1"
                        >
                          {trade.direction === 'long' || trade.direction === 'buy' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {trade.direction}
                        </Badge>
                        <span className="font-mono font-medium">{trade.asset}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${(trade.profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(trade.profit_loss || 0) >= 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                        </span>
                        {expandedTrade === trade.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Entry: ${trade.entry_price.toLocaleString()}</span>
                      <span>Exit: {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : '—'}</span>
                      <span>{format(new Date(trade.entry_datetime_utc || trade.entry_date), 'MMM d, yy')}</span>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t border-border/50 p-3 bg-muted/20 space-y-3">
                    {/* Trade Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {trade.quantity && (
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          <span className="font-medium">{trade.quantity}</span>
                        </div>
                      )}
                      {trade.commission && (
                        <div>
                          <span className="text-muted-foreground">Commission:</span>{' '}
                          <span className="font-medium text-orange-500">${trade.commission}</span>
                        </div>
                      )}
                      {trade.leverage && (
                        <div>
                          <span className="text-muted-foreground">Leverage:</span>{' '}
                          <span className="font-medium">{trade.leverage}x</span>
                        </div>
                      )}
                      {trade.strategy && (
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>{' '}
                          <Badge variant="secondary">{trade.strategy}</Badge>
                        </div>
                      )}
                    </div>

                    {/* Journal Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <PenLine className="h-3.5 w-3.5" />
                          Journal Notes
                        </span>
                        {editingNotes !== trade.id && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleStartEditNotes(trade)}
                            className="h-7 text-xs"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      
                      {editingNotes === trade.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="Add your thoughts, analysis, lessons learned..."
                            className="min-h-[100px] text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleCancelEdit}
                              disabled={savingNotes}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveNotes(trade.id)}
                              disabled={savingNotes}
                            >
                              {savingNotes ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-background/50 rounded-lg p-3 min-h-[60px]">
                          {trade.notes ? (
                            <p className="text-sm whitespace-pre-wrap">{trade.notes}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No notes yet. Click edit to add your thoughts.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(trade.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
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
