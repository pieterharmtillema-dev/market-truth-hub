-- Update the streak trigger to ONLY process trade_sync predictions (not user-created)
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
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
  
  -- IMPORTANT: Only update streaks for trade_sync predictions (real trades)
  -- User-created long-term predictions do NOT affect streaks
  IF NEW.data_source IS DISTINCT FROM 'trade_sync' THEN
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