-- Create trade source enum
CREATE TYPE public.trade_source AS ENUM ('api', 'extension', 'csv', 'manual');

-- Create trader category enum
CREATE TYPE public.trader_category AS ENUM (
  'scalper',
  'day_trader', 
  'swing_trader',
  'position_trader',
  'investor'
);

-- Add trade_source column to positions table
ALTER TABLE public.positions 
ADD COLUMN trade_source public.trade_source DEFAULT 'manual';

-- Add categorization columns to profiles
ALTER TABLE public.profiles
ADD COLUMN trader_category public.trader_category DEFAULT NULL,
ADD COLUMN is_verified boolean DEFAULT false,
ADD COLUMN verified_at timestamp with time zone DEFAULT NULL;

-- Create function to auto-update verified status when exchange is connected
CREATE OR REPLACE FUNCTION public.update_verified_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new exchange connection is added with status 'connected'
  IF NEW.status = 'connected' THEN
    UPDATE public.profiles
    SET is_verified = true,
        verified_at = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-verification
CREATE TRIGGER on_exchange_connected
  AFTER INSERT OR UPDATE ON public.exchange_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verified_status();

-- Update existing users with exchange connections to be verified
UPDATE public.profiles p
SET is_verified = true,
    verified_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.exchange_connections ec 
  WHERE ec.user_id = p.user_id 
  AND ec.status = 'connected'
);