-- Recreate trader_activity view with SECURITY INVOKER (safer - uses querying user's permissions)
DROP VIEW IF EXISTS public.trader_activity;

CREATE VIEW public.trader_activity 
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  platform,
  is_active,
  timestamp AS last_activity_at
FROM public.user_activity;