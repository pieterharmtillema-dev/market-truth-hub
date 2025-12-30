-- Add character_config JSONB column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS character_config JSONB DEFAULT NULL;