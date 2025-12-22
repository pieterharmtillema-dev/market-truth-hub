-- Price cache table for storing historical price data to minimize API calls
CREATE TABLE public.price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric,
  provider text NOT NULL DEFAULT 'polygon',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(symbol, date, provider)
);

-- Index for fast lookups
CREATE INDEX idx_price_cache_symbol_date ON public.price_cache(symbol, date);

-- Enable RLS
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read price cache (it's public market data)
CREATE POLICY "Price cache is publicly readable"
ON public.price_cache FOR SELECT
USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage price cache"
ON public.price_cache FOR ALL
USING (true)
WITH CHECK (true);

-- Add trade metrics columns to positions table
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS mae numeric,
ADD COLUMN IF NOT EXISTS mfe numeric,
ADD COLUMN IF NOT EXISTS r_multiple numeric,
ADD COLUMN IF NOT EXISTS estimated_risk numeric,
ADD COLUMN IF NOT EXISTS is_exchange_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exchange_source text,
ADD COLUMN IF NOT EXISTS fees_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS metrics_calculated_at timestamptz;

-- User trading metrics aggregate table
CREATE TABLE public.user_trading_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Core metrics
  total_verified_trades integer NOT NULL DEFAULT 0,
  total_wins integer NOT NULL DEFAULT 0,
  total_losses integer NOT NULL DEFAULT 0,
  total_breakeven integer NOT NULL DEFAULT 0,
  win_rate numeric,
  -- R-multiple metrics
  average_r numeric,
  total_r numeric,
  positive_r_percentage numeric,
  r_variance numeric,
  -- Accuracy score (0-100)
  accuracy_score numeric,
  -- Verification status
  is_verified boolean NOT NULL DEFAULT false,
  last_api_sync_at timestamptz,
  api_status text DEFAULT 'disconnected',
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_trading_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
CREATE POLICY "Users can view their own metrics"
ON public.user_trading_metrics FOR SELECT
USING (auth.uid() = user_id);

-- Public profiles can see other users' metrics (for leaderboard)
CREATE POLICY "Public metrics are viewable by authenticated users"
ON public.user_trading_metrics FOR SELECT
USING (
  is_verified = true 
  AND total_verified_trades >= 30
);

-- Service role can manage all metrics
CREATE POLICY "Service role can manage metrics"
ON public.user_trading_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_user_trading_metrics_updated_at
BEFORE UPDATE ON public.user_trading_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for leaderboard queries
CREATE INDEX idx_user_trading_metrics_verified ON public.user_trading_metrics(is_verified, accuracy_score DESC)
WHERE is_verified = true AND total_verified_trades >= 30;