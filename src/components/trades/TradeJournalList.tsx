import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Filter, Loader2, BookOpen, Camera, Save, Plug, Chrome, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TradeTagSelector } from './TradeTagSelector';
import { TradeScreenshots } from './TradeScreenshots';

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

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
  tags: string[] | null;
  exchange_source: string | null;
  is_exchange_verified: boolean | null;
}

interface TradeJournalListProps {
  refreshTrigger?: number;
}

export function TradeJournalList({ refreshTrigger }: TradeJournalListProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({});
  const [editingTags, setEditingTags] = useState<Record<number, string[]>>({});
  const [savingTags, setSavingTags] = useState<number | null>(null);
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

  const fetchAttachments = useCallback(async (positionId: number) => {
    try {
      const { data, error } = await supabase
        .from('trade_attachments')
        .select('id, file_path, file_name, created_at')
        .eq('position_id', positionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(prev => ({ ...prev, [positionId]: data || [] }));
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [refreshTrigger, fetchPositions]);

  // Fetch attachments when a trade is expanded
  useEffect(() => {
    if (expandedTrade && !attachments[expandedTrade]) {
      fetchAttachments(expandedTrade);
    }
  }, [expandedTrade, attachments, fetchAttachments]);

  const handleTagsChange = (positionId: number, tags: string[]) => {
    setEditingTags(prev => ({ ...prev, [positionId]: tags }));
  };

  const saveTags = async (positionId: number) => {
    const tags = editingTags[positionId];
    if (tags === undefined) return;

    setSavingTags(positionId);
    try {
      const { error } = await supabase
        .from('positions')
        .update({ tags: tags.length > 0 ? tags : null })
        .eq('id', positionId);

      if (error) throw error;

      // Update local state
      setPositions(prev => prev.map(p => 
        p.id === positionId ? { ...p, tags: tags.length > 0 ? tags : null } : p
      ));
      setEditingTags(prev => {
        const newState = { ...prev };
        delete newState[positionId];
        return newState;
      });
      toast({ title: 'Tags saved' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save tags', variant: 'destructive' });
    } finally {
      setSavingTags(null);
    }
  };

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

  // Check if position has attachments
  const hasAttachments = (positionId: number) => {
    return attachments[positionId]?.length > 0;
  };

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
          {filteredPositions.map((position) => {
            const currentTags = editingTags[position.id] ?? position.tags ?? [];
            const hasUnsavedTags = editingTags[position.id] !== undefined;
            
            return (
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
                          {/* Trade Source Badge */}
                          {position.exchange_source && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/50 text-primary">
                              <Plug className="h-2.5 w-2.5" />
                              API
                            </Badge>
                          )}
                          {!position.exchange_source && position.platform && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/50 text-muted-foreground">
                              <Chrome className="h-2.5 w-2.5" />
                              Extension
                            </Badge>
                          )}
                          {position.is_exchange_verified && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-green-500/50 text-green-500">
                              <Shield className="h-2.5 w-2.5" />
                              Verified
                            </Badge>
                          )}
                          {hasAttachments(position.id) && (
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
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
                      {/* Show tags inline */}
                      {position.tags && position.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {position.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t border-border/50 p-3 bg-muted/20 space-y-4">
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

                      {/* Tags Section */}
                      <div className="space-y-2">
                        <TradeTagSelector
                          selectedTags={currentTags}
                          onChange={(tags) => handleTagsChange(position.id, tags)}
                        />
                        {hasUnsavedTags && (
                          <Button
                            size="sm"
                            onClick={() => saveTags(position.id)}
                            disabled={savingTags === position.id}
                            className="w-full"
                          >
                            {savingTags === position.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Tags
                          </Button>
                        )}
                      </div>

                      {/* Screenshots Section */}
                      <TradeScreenshots
                        positionId={position.id}
                        attachments={attachments[position.id] || []}
                        onAttachmentsChange={() => fetchAttachments(position.id)}
                      />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}