-- Add trading_session column to trader_profiles table
ALTER TABLE public.trader_profiles
ADD COLUMN IF NOT EXISTS trading_session text;

-- Add comment to document the field
COMMENT ON COLUMN public.trader_profiles.trading_session IS 'Primary trading session: asian, london, new_york, overlap, or all_sessions';
