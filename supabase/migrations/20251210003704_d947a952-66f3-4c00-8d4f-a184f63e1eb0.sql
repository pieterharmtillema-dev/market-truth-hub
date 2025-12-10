-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'developer', 'user');

-- Create user_roles table (roles stored separately for security)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = _user_id ORDER BY 
      CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'developer' THEN 2 
        WHEN 'user' THEN 3 
      END 
    LIMIT 1),
    'user'
  )
$$;

-- Add new columns to past_trades for trade mode tracking
ALTER TABLE public.past_trades 
ADD COLUMN IF NOT EXISTS trade_mode text DEFAULT 'real',
ADD COLUMN IF NOT EXISTS pnl numeric,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS raw jsonb,
ADD COLUMN IF NOT EXISTS order_type text,
ADD COLUMN IF NOT EXISTS position_id text,
ADD COLUMN IF NOT EXISTS user_role text DEFAULT 'user';

-- Insert developer roles for the specified emails
-- First get user IDs from auth.users, then insert roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'developer'::app_role
FROM auth.users 
WHERE LOWER(email) IN ('pieterharmtillema@gmail.com', 'pietertillema06@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;