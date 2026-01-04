-- Add Alpaca broker support to exchange_connections table
-- This migration adds Alpaca API key authentication and environment (paper/live) support

-- Add 'alpaca' to exchange_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'exchange_type' AND e.enumlabel = 'alpaca'
  ) THEN
    -- Add alpaca to the enum
    EXECUTE 'ALTER TYPE public.exchange_type ADD VALUE ''alpaca''';
  END IF;
END $$;

-- Add environment column to store paper/live trading environment
-- This is needed for brokers like Alpaca and TradeStation that have separate paper/live environments
ALTER TABLE public.exchange_connections
ADD COLUMN IF NOT EXISTS environment TEXT CHECK (environment IN ('paper', 'live'));

COMMENT ON COLUMN public.exchange_connections.environment IS 'Trading environment for brokers: paper (simulated) or live (real money). Used by Alpaca, TradeStation, etc.';

-- Note: external_id column and unique index already exist from TradeStation migration (20260104000000)
-- Note: auth_type column already exists from TradeStation migration
-- Note: Alpaca uses auth_type='api_key' with AES-256-GCM encryption (not OAuth like TradeStation)
