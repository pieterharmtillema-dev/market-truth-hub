-- Create function to generate a secure random API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'md_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
$$;

-- Create function to regenerate API key for a user
CREATE OR REPLACE FUNCTION public.regenerate_user_api_key(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  new_key := public.generate_api_key();
  
  UPDATE public.profiles 
  SET api_key = new_key, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN new_key;
END;
$$;

-- Generate API keys for existing users
UPDATE public.profiles 
SET api_key = 'md_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE api_key IS NULL;

-- Update the handle_new_user trigger to auto-generate API key
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, api_key)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'display_name', 
    'md_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
  RETURN new;
END;
$$;