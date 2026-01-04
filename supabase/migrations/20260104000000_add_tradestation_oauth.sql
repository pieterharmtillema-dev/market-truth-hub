-- Add TradeStation OAuth support to exchange_connections table
-- This migration adds OAuth 2.0 token storage and TradeStation exchange support

-- First, check if the enum type exists and add 'tradestation' value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'exchange_type' AND e.enumlabel = 'tradestation'
  ) THEN
    -- Note: In PostgreSQL 12+, ALTER TYPE ADD VALUE cannot run in a transaction block
    -- If this migration fails, run this command separately:
    -- ALTER TYPE public.exchange_type ADD VALUE 'tradestation';
    EXECUTE 'ALTER TYPE public.exchange_type ADD VALUE ''tradestation''';
  END IF;
END $$;

-- Add OAuth-specific columns to exchange_connections table
ALTER TABLE public.exchange_connections
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'api_key' CHECK (auth_type IN ('api_key', 'oauth2'));

-- Add comments for documentation
COMMENT ON COLUMN public.exchange_connections.access_token_encrypted IS 'AES-256-GCM encrypted OAuth access token (TradeStation only)';
COMMENT ON COLUMN public.exchange_connections.refresh_token_encrypted IS 'AES-256-GCM encrypted OAuth refresh token (TradeStation only)';
COMMENT ON COLUMN public.exchange_connections.token_expires_at IS 'Timestamp when OAuth access token expires';
COMMENT ON COLUMN public.exchange_connections.auth_type IS 'Authentication type: api_key for existing exchanges (Binance, etc.), oauth2 for TradeStation';

-- Add external_id column to positions table for deduplication
ALTER TABLE public.positions
ADD COLUMN IF NOT EXISTS external_id TEXT;

COMMENT ON COLUMN public.positions.external_id IS 'External execution/trade ID from broker API (e.g., TradeStation ExecutionID) for deduplication';

-- Create unique index to prevent duplicate imports using external_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_external_id
ON public.positions(user_id, exchange_source, external_id)
WHERE external_id IS NOT NULL;

-- Create oauth_state table for CSRF protection during OAuth flow
CREATE TABLE IF NOT EXISTS public.oauth_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '10 minutes')
);

-- Add index for efficient expiry checks and cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON public.oauth_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_state_user_id ON public.oauth_state(user_id);

COMMENT ON TABLE public.oauth_state IS 'Temporary storage for OAuth state parameter (CSRF protection). States expire after 10 minutes.';

-- Create cleanup function for expired OAuth states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.oauth_state WHERE expires_at < now();
$$;

COMMENT ON FUNCTION public.cleanup_expired_oauth_states IS 'Removes expired OAuth state records. Can be called manually or from edge functions.';

-- Enable Row Level Security on oauth_state table
ALTER TABLE public.oauth_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for oauth_state table
-- Users can only access their own OAuth states
CREATE POLICY "Users can insert their own OAuth states"
  ON public.oauth_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own OAuth states"
  ON public.oauth_state
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth states"
  ON public.oauth_state
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all states (for edge functions)
CREATE POLICY "Service role can manage all OAuth states"
  ON public.oauth_state
  FOR ALL
  USING (auth.role() = 'service_role');
