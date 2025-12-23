-- Add tags column to positions table for setup tagging
ALTER TABLE public.positions 
ADD COLUMN tags text[] DEFAULT NULL;

-- Create trade_attachments table for screenshot storage
CREATE TABLE public.trade_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id bigint NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on trade_attachments
ALTER TABLE public.trade_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_attachments
CREATE POLICY "Users can view their own attachments"
ON public.trade_attachments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
ON public.trade_attachments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.trade_attachments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_trade_attachments_position_id ON public.trade_attachments(position_id);
CREATE INDEX idx_trade_attachments_user_id ON public.trade_attachments(user_id);

-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots',
  'trade-screenshots', 
  false,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Storage policies for trade-screenshots bucket
CREATE POLICY "Users can view their own trade screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own trade screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);