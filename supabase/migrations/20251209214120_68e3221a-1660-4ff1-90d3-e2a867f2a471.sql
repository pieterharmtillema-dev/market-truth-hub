-- Drop the view with SECURITY DEFINER and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT user_id, display_name, avatar_url, bio, created_at
FROM profiles;