-- Create trader_activity view for backward compatibility
CREATE OR REPLACE VIEW public.trader_activity AS
SELECT
  id,
  user_id,
  platform,
  is_active,
  timestamp AS last_activity_at
FROM public.user_activity;