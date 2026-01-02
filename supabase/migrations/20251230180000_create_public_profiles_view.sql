-- Create public_profiles view
-- This view combines profile data with prediction statistics for public display

-- Drop existing view if it exists to handle column order changes
DROP VIEW IF EXISTS public_profiles;

CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  COALESCE(COUNT(DISTINCT pred.id) FILTER (WHERE pred.status = 'success'), 0)::int AS total_hits,
  COALESCE(COUNT(DISTINCT pred.id), 0)::int AS total_predictions,
  0 AS current_streak,
  NULL AS streak_type
FROM profiles p
LEFT JOIN predictions pred ON pred.user_id = p.user_id
GROUP BY p.user_id, p.display_name, p.avatar_url, p.bio, p.created_at;

-- Grant access to authenticated and anon users
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add comment
COMMENT ON VIEW public_profiles IS 'Public view of user profiles with prediction statistics';
