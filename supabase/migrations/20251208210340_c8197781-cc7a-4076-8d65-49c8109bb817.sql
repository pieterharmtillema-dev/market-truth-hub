-- Fix DEFINER_OR_RPC_BYPASS: Remove overly permissive policy
-- The edge function uses service_role_key which bypasses RLS anyway,
-- so this USING(true) policy is unnecessary and creates security risk

-- Only drop if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trader_activity') THEN
    DROP POLICY IF EXISTS "Service can manage activity" ON public.trader_activity;
  END IF;
END $$;