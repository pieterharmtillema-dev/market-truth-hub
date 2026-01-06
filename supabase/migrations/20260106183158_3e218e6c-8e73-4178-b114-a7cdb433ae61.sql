-- Clean up existing Alpaca positions and reset sync state for fresh sync
-- This ensures proper FIFO matching and no duplicate trades

-- Delete all existing Alpaca positions
DELETE FROM public.positions 
WHERE exchange_source = 'alpaca';

-- Reset the sync cursor and trade count for all Alpaca connections
UPDATE public.exchange_connections 
SET 
  last_sync_cursor = NULL,
  verified_trades_count = 0
WHERE exchange = 'alpaca';