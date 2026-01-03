-- Add trading_session column to trader_profiles table
ALTER TABLE public.trader_profiles
ADD COLUMN trading_session text;

-- Add comment for documentation
COMMENT ON COLUMN public.trader_profiles.trading_session IS 'Primary trading session: asian, london, new_york, overlap, or all_sessions';