-- Drop the old status check constraint
ALTER TABLE public.predictions DROP CONSTRAINT predictions_status_check;

-- Add new constraint that includes 'hit' and 'missed'
ALTER TABLE public.predictions ADD CONSTRAINT predictions_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'success'::text, 'fail'::text, 'expired'::text, 'hit'::text, 'missed'::text]));