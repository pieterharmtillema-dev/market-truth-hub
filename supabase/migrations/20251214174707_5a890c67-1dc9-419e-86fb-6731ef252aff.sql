-- Add columns for prediction lifecycle tracking
ALTER TABLE public.predictions 
  ADD COLUMN IF NOT EXISTS expiry_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_price NUMERIC,
  ADD COLUMN IF NOT EXISTS hit_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS timeframe_code TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'polygon',
  ADD COLUMN IF NOT EXISTS last_price_check TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_checked_price NUMERIC,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for efficient querying of active predictions
CREATE INDEX IF NOT EXISTS idx_predictions_active_status ON public.predictions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_predictions_user_status ON public.predictions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_predictions_expiry ON public.predictions(expiry_timestamp) WHERE status = 'active';