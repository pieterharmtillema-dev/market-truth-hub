-- Add is_public column to predictions (default false = private, profile only)
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Update existing trade_sync predictions to be private by default
UPDATE public.predictions SET is_public = false WHERE data_source = 'trade_sync' AND is_public IS NULL;