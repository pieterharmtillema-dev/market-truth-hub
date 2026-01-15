import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ManualTradeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManualTradeEntryDialog({ open, onOpenChange, onSuccess }: ManualTradeEntryDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    symbol: '',
    side: 'long' as 'long' | 'short',
    quantity: '',
    entryPrice: '',
    entryTime: '',
    exitPrice: '',
    exitTime: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.symbol || !formData.quantity || !formData.entryPrice || !formData.entryTime) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        return;
      }

      const quantity = parseFloat(formData.quantity);
      const entryPrice = parseFloat(formData.entryPrice);
      const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : null;

      // Compute PnL if exit price provided
      let pnl = null;
      let pnlPct = null;
      const isOpen = !exitPrice;

      if (exitPrice !== null) {
        const priceChange = exitPrice - entryPrice;
        const multiplier = formData.side === 'long' ? 1 : -1;
        pnl = priceChange * quantity * multiplier;
        pnlPct = (priceChange / entryPrice) * 100 * multiplier;
      }

      const position = {
        user_id: user.id,
        symbol: formData.symbol.trim().toUpperCase(),
        side: formData.side,
        quantity,
        entry_price: entryPrice,
        entry_timestamp: new Date(formData.entryTime).toISOString(),
        exit_price: exitPrice,
        exit_timestamp: formData.exitTime ? new Date(formData.exitTime).toISOString() : null,
        pnl,
        pnl_pct: pnlPct,
        open: isOpen,
        platform: 'Manual Entry',
        trade_source: 'manual' as const,
        is_simulation: false,
      };

      const { error } = await supabase.from('positions').insert([position]);

      if (error) throw error;

      toast({
        title: 'Trade added',
        description: `Successfully added ${formData.side} position for ${formData.symbol}`,
      });

      // Reset form
      setFormData({
        symbol: '',
        side: 'long',
        quantity: '',
        entryPrice: '',
        entryTime: '',
        exitPrice: '',
        exitTime: '',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add trade',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Trade Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol *</Label>
            <Input
              id="symbol"
              placeholder="AAPL"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="side">Side *</Label>
            <Select value={formData.side} onValueChange={(value: 'long' | 'short') => setFormData({ ...formData, side: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              placeholder="100"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryPrice">Entry Price *</Label>
            <Input
              id="entryPrice"
              type="number"
              step="any"
              placeholder="150.00"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryTime">Entry Time *</Label>
            <Input
              id="entryTime"
              type="datetime-local"
              value={formData.entryTime}
              onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
              required
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Exit Information (optional)</p>

            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price</Label>
              <Input
                id="exitPrice"
                type="number"
                step="any"
                placeholder="155.00"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitTime">Exit Time</Label>
              <Input
                id="exitTime"
                type="datetime-local"
                value={formData.exitTime}
                onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Trade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
