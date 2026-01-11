-- Update public_profiles view to include prediction accuracy for long-term predictions
-- This extends the existing view with the new prediction accuracy metrics

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
  NULL AS streak_type,
  tp.trading_session,
  -- Add prediction accuracy fields
  p.prediction_accuracy,
  p.prediction_accuracy_correct,
  p.prediction_accuracy_incorrect,
  p.prediction_accuracy_total,
  p.prediction_accuracy_last_calculated
FROM profiles p
LEFT JOIN predictions pred ON pred.user_id = p.user_id
LEFT JOIN trader_profiles tp ON tp.user_id = p.user_id
GROUP BY
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  tp.trading_session,
  p.prediction_accuracy,
  p.prediction_accuracy_correct,
  p.prediction_accuracy_incorrect,
  p.prediction_accuracy_total,
  p.prediction_accuracy_last_calculated;

-- Grant access to authenticated and anon users
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add comment
COMMENT ON VIEW public_profiles IS 'Public view of user profiles with prediction statistics, trading session, and long-term prediction accuracy';
