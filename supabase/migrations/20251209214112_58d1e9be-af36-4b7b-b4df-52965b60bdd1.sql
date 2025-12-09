-- Drop the overly permissive SELECT policy that exposes API keys
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create a policy that only allows users to see their own profile (including api_key)
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Create a public view for non-sensitive profile data that others can see
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, display_name, avatar_url, bio, created_at
FROM profiles;