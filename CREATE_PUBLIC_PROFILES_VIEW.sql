-- Create public_profiles view (simplified version without predictions dependency)
-- This view provides a public-facing view of user profiles

CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  0 AS total_hits,
  0 AS total_predictions,
  0 AS current_streak,
  NULL AS streak_type
FROM profiles p;

-- Grant access to authenticated and anon users
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add comment
COMMENT ON VIEW public_profiles IS 'Public view of user profiles (simplified without prediction stats)';
