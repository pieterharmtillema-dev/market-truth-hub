-- Drop old tables
DROP TABLE IF EXISTS public.past_trades CASCADE;
DROP TABLE IF EXISTS public.trader_trades CASCADE;
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.trader_activity CASCADE;

-- Create positions table
CREATE TABLE public.positions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  platform text DEFAULT 'TradingView',
  side text NOT NULL CHECK (side IN ('long', 'short')),
  quantity numeric NOT NULL,
  entry_price numeric NOT NULL,
  entry_timestamp timestamptz NOT NULL,
  exit_price numeric,
  exit_timestamp timestamptz,
  pnl numeric,
  open boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trade_log table
CREATE TABLE public.trade_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  symbol text,
  side text,
  price numeric,
  quantity numeric,
  platform text,
  timestamp timestamptz NOT NULL,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user_activity table
CREATE TABLE public.user_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies for positions
CREATE POLICY "Users can view their own positions" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own positions" ON public.positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions" ON public.positions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for trade_log
CREATE POLICY "Users can view their own trade logs" ON public.trade_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade logs" ON public.trade_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_activity
CREATE POLICY "Users can view their own activity" ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON public.user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);