-- Create instrument type enum
CREATE TYPE public.instrument_type AS ENUM ('stock', 'crypto', 'forex', 'futures', 'options', 'other');

-- Create trade side enum
CREATE TYPE public.trade_side AS ENUM ('buy', 'sell', 'long', 'short');

-- Add new columns to trader_trades table
ALTER TABLE public.trader_trades
ADD COLUMN IF NOT EXISTS broker_id TEXT,
ADD COLUMN IF NOT EXISTS account_id TEXT,
ADD COLUMN IF NOT EXISTS strategy TEXT,
ADD COLUMN IF NOT EXISTS instrument_type public.instrument_type DEFAULT 'other',
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC,
ADD COLUMN IF NOT EXISTS take_profit NUMERIC,
ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS leverage NUMERIC,
ADD COLUMN IF NOT EXISTS margin NUMERIC,
ADD COLUMN IF NOT EXISTS entry_datetime_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exit_datetime_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS group_symbol TEXT,
ADD COLUMN IF NOT EXISTS group_strategy TEXT,
ADD COLUMN IF NOT EXISTS raw_row JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trader_trades_symbol ON public.trader_trades(asset);
CREATE INDEX IF NOT EXISTS idx_trader_trades_strategy ON public.trader_trades(strategy);
CREATE INDEX IF NOT EXISTS idx_trader_trades_instrument_type ON public.trader_trades(instrument_type);
CREATE INDEX IF NOT EXISTS idx_trader_trades_broker_id ON public.trader_trades(broker_id);
CREATE INDEX IF NOT EXISTS idx_trader_trades_account_id ON public.trader_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trader_trades_entry_datetime ON public.trader_trades(entry_datetime_utc);

-- Create unique index for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_trader_trades_duplicate_check 
ON public.trader_trades(user_id, broker_id, account_id, asset, entry_datetime_utc, entry_price)
WHERE broker_id IS NOT NULL AND account_id IS NOT NULL;