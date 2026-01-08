-- Create alpaca_orders table for storing all order events
CREATE TABLE public.alpaca_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  client_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'other')),
  limit_price NUMERIC,
  stop_price NUMERIC,
  qty NUMERIC NOT NULL,
  filled_qty NUMERIC NOT NULL DEFAULT 0,
  filled_avg_price NUMERIC,
  status TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  filled_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  replaced_at TIMESTAMPTZ,
  replaced_by TEXT,
  replaces TEXT,
  time_in_force TEXT,
  extended_hours BOOLEAN DEFAULT FALSE,
  asset_class TEXT,
  environment TEXT CHECK (environment IN ('paper', 'live')),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.alpaca_orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view their own orders"
ON public.alpaca_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert their own orders"
ON public.alpaca_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update their own orders"
ON public.alpaca_orders
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own orders
CREATE POLICY "Users can delete their own orders"
ON public.alpaca_orders
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX idx_alpaca_orders_user_id ON public.alpaca_orders(user_id);
CREATE INDEX idx_alpaca_orders_symbol ON public.alpaca_orders(symbol);
CREATE INDEX idx_alpaca_orders_status ON public.alpaca_orders(status);
CREATE INDEX idx_alpaca_orders_submitted_at ON public.alpaca_orders(submitted_at DESC);
CREATE INDEX idx_alpaca_orders_client_order_id ON public.alpaca_orders(client_order_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.alpaca_orders;