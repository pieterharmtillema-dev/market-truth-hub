import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, ShieldAlert, TrendingUp, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export interface BracketData {
  entry_side: 'buy' | 'sell';
  entry_filled_avg_price: number | null;
  qty: number;
  take_profit?: {
    limit_price: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
    filled_at?: string | null;
    canceled_at?: string | null;
  };
  stop_loss?: {
    stop_price: number;
    limit_price?: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
    filled_at?: string | null;
    canceled_at?: string | null;
  };
}

// Extended data for the expandable details panel
export interface OrderDetails {
  order_id: string;
  order_type: string;
  status: string;
  submitted_at: string;
  filled_at?: string | null;
  canceled_at?: string | null;
  limit_price?: number | null;
  stop_price?: number | null;
  filled_avg_price?: number | null;
  qty: number;
  filled_qty: number;
}

interface BracketDetailsPanelProps {
  bracketData: BracketData | null;
  orderClass?: string | null;
  entryOrder?: OrderDetails | null;
  exitReason?: string | null;
  isAlpacaTrade?: boolean;
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

/**
 * Get status icon based on order status
 */
function StatusIcon({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'filled':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'canceled':
    case 'expired':
    case 'rejected':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
  }
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  try {
    return format(new Date(timestamp), 'MMM d, HH:mm:ss');
  } catch {
    return timestamp;
  }
}

export function BracketDetailsPanel({ bracketData, orderClass, entryOrder, isAlpacaTrade = false }: BracketDetailsPanelProps) {
  const hasBracket = bracketData && (bracketData.take_profit || bracketData.stop_loss);
  const showBracketSection = hasBracket || isAlpacaTrade; // Always show for Alpaca trades

  return (
    <div className="space-y-4 py-2">
      {/* Entry Order Details */}
      {entryOrder && (
        <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-primary" />
            Entry Order
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Type</span>
              <p className="font-medium capitalize">{entryOrder.order_type}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Price</span>
              <p className="font-mono font-medium">
                ${entryOrder.filled_avg_price?.toLocaleString() || entryOrder.limit_price?.toLocaleString() || '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Quantity</span>
              <p className="font-medium">{entryOrder.filled_qty}/{entryOrder.qty}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <div className="flex items-center gap-1">
                <StatusIcon status={entryOrder.status} />
                <span className="capitalize">{entryOrder.status}</span>
              </div>
            </div>
            <div className="col-span-2 md:col-span-4">
              <span className="text-muted-foreground text-xs">Filled At</span>
              <p className="font-medium">{formatTime(entryOrder.filled_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Details Section */}
      {showBracketSection && (
        <>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                  <Target className="h-4 w-4" />
                  Take Profit
                </div>
                {bracketData?.take_profit && (
                  <Badge variant={getStatusVariant(bracketData.take_profit.status)} className="text-[10px]">
                    {bracketData.take_profit.status}
                  </Badge>
                )}
              </div>
              {bracketData?.take_profit ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limit Price:</span>
                    <span className="font-mono">${bracketData.take_profit.limit_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filled:</span>
                    <span className={getFillState(bracketData.take_profit.filled_qty, bracketData.qty).className}>
                      {bracketData.take_profit.filled_qty}/{bracketData.qty}
                      {bracketData.take_profit.filled_avg_price && ` @ $${bracketData.take_profit.filled_avg_price.toLocaleString()}`}
                    </span>
                  </div>
                  {bracketData.take_profit.filled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filled At:</span>
                      <span className="text-xs">{formatTime(bracketData.take_profit.filled_at)}</span>
                    </div>
                  )}
                  {bracketData.take_profit.canceled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Canceled At:</span>
                      <span className="text-xs text-red-400">{formatTime(bracketData.take_profit.canceled_at)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No take profit set</div>
              )}
            </div>

            {/* Stop Loss Leg */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-red-500">
                  <ShieldAlert className="h-4 w-4" />
                  Stop Loss
                </div>
                {bracketData?.stop_loss && (
                  <Badge variant={getStatusVariant(bracketData.stop_loss.status)} className="text-[10px]">
                    {bracketData.stop_loss.status}
                  </Badge>
                )}
              </div>
              {bracketData?.stop_loss ? (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Price:</span>
                    <span className="font-mono">${bracketData.stop_loss.stop_price.toLocaleString()}</span>
                  </div>
                  {bracketData.stop_loss.limit_price && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limit Price:</span>
                      <span className="font-mono">${bracketData.stop_loss.limit_price.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filled:</span>
                    <span className={getFillState(bracketData.stop_loss.filled_qty, bracketData.qty).className}>
                      {bracketData.stop_loss.filled_qty}/{bracketData.qty}
                      {bracketData.stop_loss.filled_avg_price && ` @ $${bracketData.stop_loss.filled_avg_price.toLocaleString()}`}
                    </span>
                  </div>
                  {bracketData.stop_loss.filled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filled At:</span>
                      <span className="text-xs">{formatTime(bracketData.stop_loss.filled_at)}</span>
                    </div>
                  )}
                  {bracketData.stop_loss.canceled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Canceled At:</span>
                      <span className="text-xs text-red-400">{formatTime(bracketData.stop_loss.canceled_at)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No stop loss set</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* No bracket data message - only show for non-Alpaca trades */}
      {!showBracketSection && !entryOrder && (
        <div className="text-sm text-muted-foreground py-2">
          No bracket (TP/SL) attached
        </div>
      )}

      {/* Risk:Reward Placeholder */}
      {hasBracket && bracketData?.entry_filled_avg_price && (bracketData.take_profit || bracketData.stop_loss) && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>📊 Risk:Reward (coming soon)</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Badge component to show exit reason in trade rows
 */
export function ExitReasonBadge({ exitReason }: { exitReason: string | null | undefined }) {
  if (!exitReason) return null;

  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    stop_loss: {
      label: 'Stop Loss Hit',
      className: 'bg-red-500/10 text-red-500 border-red-500/30',
      icon: <ShieldAlert className="h-3 w-3" />,
    },
    take_profit: {
      label: 'Take Profit Hit',
      className: 'bg-green-500/10 text-green-500 border-green-500/30',
      icon: <Target className="h-3 w-3" />,
    },
    market: {
      label: 'Market Exit',
      className: 'bg-muted text-muted-foreground border-border',
      icon: <DollarSign className="h-3 w-3" />,
    },
    manual: {
      label: 'Manual Exit',
      className: 'bg-muted text-muted-foreground border-border',
      icon: <Clock className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[exitReason] || config.market;

  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  );
}
