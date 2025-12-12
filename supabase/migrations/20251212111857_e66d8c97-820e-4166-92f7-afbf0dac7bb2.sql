-- Add quantity_lots to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS quantity_lots numeric;

-- Add quantity_lots and raw_quantity to trade_log table
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS quantity_lots numeric;
ALTER TABLE public.trade_log ADD COLUMN IF NOT EXISTS raw_quantity numeric;