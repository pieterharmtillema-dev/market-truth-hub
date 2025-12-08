-- Fix DEFINER_OR_RPC_BYPASS: Remove overly permissive policy
-- The edge function uses service_role_key which bypasses RLS anyway,
-- so this USING(true) policy is unnecessary and creates security risk

DROP POLICY IF EXISTS "Service can manage activity" ON public.trader_activity;