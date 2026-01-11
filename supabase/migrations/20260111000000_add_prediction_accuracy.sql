-- Add prediction accuracy fields to profiles table
-- This stores the calculated prediction accuracy for long-term predictions (data_source='user')
-- Separate from TRAX score which is for trade-based predictions

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS prediction_accuracy numeric(4,2) CHECK (prediction_accuracy >= 0 AND prediction_accuracy <= 1),
ADD COLUMN IF NOT EXISTS prediction_accuracy_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prediction_accuracy_incorrect integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prediction_accuracy_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prediction_accuracy_last_calculated timestamptz;

-- Add comment to clarify purpose
COMMENT ON COLUMN public.profiles.prediction_accuracy IS 'Prediction accuracy score (0.00-1.00) for long-term predictions (data_source=user), clamped between 0.40-0.70. NULL if insufficient data (<5 resolved predictions).';
COMMENT ON COLUMN public.profiles.prediction_accuracy_correct IS 'Number of correct long-term predictions (status=hit)';
COMMENT ON COLUMN public.profiles.prediction_accuracy_incorrect IS 'Number of incorrect long-term predictions (status=missed)';
COMMENT ON COLUMN public.profiles.prediction_accuracy_total IS 'Total resolved long-term predictions (correct + incorrect)';
COMMENT ON COLUMN public.profiles.prediction_accuracy_last_calculated IS 'Timestamp of last accuracy calculation';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_prediction_accuracy ON public.profiles(prediction_accuracy) WHERE prediction_accuracy IS NOT NULL;
