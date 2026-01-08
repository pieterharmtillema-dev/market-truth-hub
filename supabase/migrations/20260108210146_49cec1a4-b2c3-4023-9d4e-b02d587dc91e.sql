-- Add bracket_data column to store TP/SL leg information for future R:R calculation
ALTER TABLE public.alpaca_orders 
ADD COLUMN IF NOT EXISTS bracket_data jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.alpaca_orders.bracket_data IS 'Stores bracket leg details: { take_profit: { limit_price, status, filled_qty, filled_avg_price }, stop_loss: { stop_price, limit_price, status, filled_qty, filled_avg_price }, entry_side, entry_filled_avg_price, qty }';

-- Create index for faster bracket order queries
CREATE INDEX IF NOT EXISTS idx_alpaca_orders_order_class ON public.alpaca_orders(order_class) WHERE order_class IS NOT NULL;