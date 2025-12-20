-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'new_follower', 'follower_prediction', 'follower_trade'
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (for triggers)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Function to create follow notification
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  -- Get follower's display name
  SELECT COALESCE(display_name, 'A trader') INTO follower_name
  FROM public.profiles
  WHERE user_id = NEW.follower_id;

  -- Create notification for the followed user
  INSERT INTO public.notifications (user_id, type, actor_id, message)
  VALUES (
    NEW.following_id,
    'new_follower',
    NEW.follower_id,
    follower_name || ' started following you'
  );

  RETURN NEW;
END;
$$;

-- Trigger for new follows
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- Function to notify followers on new prediction
CREATE OR REPLACE FUNCTION public.notify_followers_on_prediction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trader_name text;
  follower_record RECORD;
  notif_type text;
  notif_message text;
BEGIN
  -- Only notify for public predictions or trade_sync predictions that are public
  IF NEW.data_source = 'user' OR (NEW.data_source = 'trade_sync' AND NEW.is_public = true) THEN
    -- Get trader's display name
    SELECT COALESCE(display_name, 'A trader') INTO trader_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    -- Determine notification type and message
    IF NEW.data_source = 'trade_sync' THEN
      notif_type := 'follower_trade';
      notif_message := trader_name || ' shared a ' || NEW.direction || ' trade on ' || NEW.asset;
    ELSE
      notif_type := 'follower_prediction';
      notif_message := trader_name || ' made a ' || NEW.direction || ' prediction on ' || NEW.asset;
    END IF;

    -- Notify all followers
    FOR follower_record IN 
      SELECT follower_id FROM public.follows WHERE following_id = NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, actor_id, prediction_id, message)
      VALUES (
        follower_record.follower_id,
        notif_type,
        NEW.user_id,
        NEW.id,
        notif_message
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new predictions (only on insert, not update)
CREATE TRIGGER on_new_prediction_notify
  AFTER INSERT ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_prediction();