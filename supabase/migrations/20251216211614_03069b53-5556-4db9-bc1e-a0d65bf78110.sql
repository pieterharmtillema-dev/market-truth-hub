-- Add explanation fields to predictions
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS explanation text,
ADD COLUMN IF NOT EXISTS explanation_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS source_position_id bigint REFERENCES public.positions(id) ON DELETE SET NULL;

-- Add streak tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS total_predictions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_hits integer DEFAULT 0;

-- Create index for position lookups
CREATE INDEX IF NOT EXISTS idx_predictions_source_position_id ON public.predictions(source_position_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_status ON public.predictions(user_id, status);

-- Function to update user streaks when a prediction resolves
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_hit boolean;
BEGIN
  -- Only process when status changes to 'hit' or 'missed'
  IF NEW.status NOT IN ('hit', 'missed') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already processed (status didn't change)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  is_hit := NEW.status = 'hit';
  
  -- Update profile stats
  UPDATE public.profiles
  SET 
    total_predictions = total_predictions + 1,
    total_hits = total_hits + CASE WHEN is_hit THEN 1 ELSE 0 END,
    current_streak = CASE 
      WHEN is_hit AND streak_type = 'hit' THEN current_streak + 1
      WHEN is_hit THEN 1
      WHEN NOT is_hit AND streak_type = 'miss' THEN current_streak + 1
      WHEN NOT is_hit THEN 1
      ELSE 1
    END,
    streak_type = CASE WHEN is_hit THEN 'hit' ELSE 'miss' END,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS update_streak_on_prediction_resolve ON public.predictions;
CREATE TRIGGER update_streak_on_prediction_resolve
  AFTER UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streak();

-- Update public_profiles view to include streak info
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  bio,
  created_at,
  current_streak,
  streak_type,
  total_predictions,
  total_hits
FROM public.profiles;