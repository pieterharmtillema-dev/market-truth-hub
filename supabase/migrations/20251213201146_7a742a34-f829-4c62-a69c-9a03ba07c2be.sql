-- Create predictions table for user predictions
CREATE TABLE public.predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  asset text NOT NULL,
  asset_type text NOT NULL DEFAULT 'stock',
  direction text NOT NULL CHECK (direction IN ('long', 'short')),
  current_price numeric NOT NULL,
  target_price numeric NOT NULL,
  time_horizon text NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  rationale text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'success', 'fail', 'expired')),
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Users can view all predictions (public feed)
CREATE POLICY "Predictions are viewable by everyone"
ON public.predictions
FOR SELECT
USING (true);

-- Users can create their own predictions
CREATE POLICY "Users can create their own predictions"
ON public.predictions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update their own predictions"
ON public.predictions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own predictions
CREATE POLICY "Users can delete their own predictions"
ON public.predictions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();