-- Add new columns to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS asset_class text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS pnl_pct numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS pip_size numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS pip_value numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS pips numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS tick_size numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS tick_value numeric;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS ticks numeric;

-- Add new columns to trade_log table
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS asset_class text;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS pip_size numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS pip_value numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS tick_size numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS tick_value numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS pnl numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS pnl_pct numeric;