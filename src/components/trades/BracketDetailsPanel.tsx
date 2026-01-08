import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, ShieldAlert, TrendingUp } from 'lucide-react';

export interface BracketData {
  entry_side: 'buy' | 'sell';
  entry_filled_avg_price: number | null;
  qty: number;
  take_profit?: {
    limit_price: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
  };
  stop_loss?: {
    stop_price: number;
    limit_price?: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
  };
}

interface BracketDetailsPanelProps {
  bracketData: BracketData | null;
  orderClass?: string;
}

/**
 * Get fill state display text based on filled vs total quantity
 */
function getFillState(filledQty: number, totalQty: number): { text: string; className: string } {
  if (filledQty <= 0) {
    return { text: 'Not filled', className: 'text-muted-foreground' };
  }
  if (filledQty < totalQty) {
    return { text: 'Partial', className: 'text-amber-500' };
  }
  return { text: 'Filled', className: 'text-green-500' };
}

/**
 * Format status badge variant based on Alpaca order status
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toLowerCase()) {
    case 'filled':
      return 'default';
    case 'canceled':
    case 'expired':
    case 'rejected':
      return 'destructive';
    case 'held':
    case 'new':
    case 'accepted':
    case 'pending_new':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function BracketDetailsPanel({ bracketData, orderClass }: BracketDetailsPanelProps) {
  // No bracket data or not a bracket order
  if (!bracketData || (!bracketData.take_profit && !bracketData.stop_loss)) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No bracket (TP/SL) attached
      </div>
    );
  }

  const { take_profit, stop_loss, qty } = bracketData;

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span>Bracket Details</span>
        {orderClass && (
          <Badge variant="outline" className="text-[10px] uppercase">
            {orderClass}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Take Profit Leg */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
            <Target className="h-4 w-4" />
            Take Profit
          </div>
          {take_profit ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Limit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limit Price:</span>
                <span className="font-mono">${take_profit.limit_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusVariant(take_profit.status)} className="text-[10px]">
                  {take_profit.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filled:</span>
                <span className={getFillState(take_profit.filled_qty, qty).className}>
                  {take_profit.filled_qty}/{qty}
                  {take_profit.filled_avg_price && ` @ $${take_profit.filled_avg_price.toLocaleString()}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No take profit set</div>
          )}
        </div>

        {/* Stop Loss Leg */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <ShieldAlert className="h-4 w-4" />
            Stop Loss
          </div>
          {stop_loss ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>{stop_loss.limit_price ? 'Stop Limit' : 'Stop'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stop Price:</span>
                <span className="font-mono">${stop_loss.stop_price.toLocaleString()}</span>
              </div>
              {stop_loss.limit_price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Limit Price:</span>
                  <span className="font-mono">${stop_loss.limit_price.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusVariant(stop_loss.status)} className="text-[10px]">
                  {stop_loss.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filled:</span>
                <span className={getFillState(stop_loss.filled_qty, qty).className}>
                  {stop_loss.filled_qty}/{qty}
                  {stop_loss.filled_avg_price && ` @ $${stop_loss.filled_avg_price.toLocaleString()}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No stop loss set</div>
          )}
        </div>
      </div>

      {/* Risk:Reward Placeholder */}
      <Separator className="my-2" />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>📊 Risk:Reward (coming soon)</span>
      </div>
    </div>
  );
}
