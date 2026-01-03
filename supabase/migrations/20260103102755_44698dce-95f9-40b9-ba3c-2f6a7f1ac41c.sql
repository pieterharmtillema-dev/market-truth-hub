-- Drop existing view first
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate public_profiles view with trading_session from trader_profiles
CREATE VIEW public.public_profiles AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  p.total_hits,
  p.total_predictions,
  p.current_streak,
  p.streak_type,
  tp.trading_session
FROM profiles p
LEFT JOIN trader_profiles tp ON p.user_id = tp.user_id;

-- Grant access to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Add comment
COMMENT ON VIEW public.public_profiles IS 'Public view of user profiles with trading session info';