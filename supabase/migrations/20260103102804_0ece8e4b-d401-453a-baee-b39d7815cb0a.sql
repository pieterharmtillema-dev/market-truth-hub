-- Fix the security invoker issue for the view
ALTER VIEW public.public_profiles SET (security_invoker = on);