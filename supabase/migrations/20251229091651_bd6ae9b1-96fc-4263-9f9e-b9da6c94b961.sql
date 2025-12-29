-- Add column to track sync cursor/progress
ALTER TABLE public.exchange_connections 
ADD COLUMN IF NOT EXISTS last_sync_cursor text NULL;