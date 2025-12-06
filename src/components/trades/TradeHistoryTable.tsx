import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

interface TradeHistoryTableProps {
  refreshTrigger?: number;
}

export function TradeHistoryTable({ refreshTrigger }: TradeHistoryTableProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from('trader_trades')
        .select('*')
        .order('entry_date', { ascending: false })
        .limit(50);

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
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Asset</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>P/L</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="font-medium">{trade.asset}</TableCell>
              <TableCell>
                <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'} className="gap-1">
                  {trade.direction === 'long' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {trade.direction}
                </Badge>
              </TableCell>
              <TableCell>${trade.entry_price.toLocaleString()}</TableCell>
              <TableCell>
                {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : '—'}
              </TableCell>
              <TableCell>
                {trade.profit_loss != null ? (
                  <span className={trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toLocaleString()}
                    {trade.profit_loss_percent != null && (
                      <span className="text-xs ml-1">({trade.profit_loss_percent.toFixed(1)}%)</span>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(trade.entry_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                {currentUserId === trade.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(trade.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
