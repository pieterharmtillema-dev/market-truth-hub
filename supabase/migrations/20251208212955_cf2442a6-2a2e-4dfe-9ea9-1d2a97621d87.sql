-- Add api_key column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN api_key text UNIQUE;