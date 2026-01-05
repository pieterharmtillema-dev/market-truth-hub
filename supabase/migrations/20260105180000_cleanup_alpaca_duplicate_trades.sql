-- Clean up existing duplicate Alpaca trades and reset sync cursor
-- This migration removes old Alpaca trades that were imported before FIFO matching
-- was implemented, so they can be re-imported with proper buy/sell pairing

-- Delete all existing Alpaca positions
-- They will be re-imported with the new FIFO matching logic
DELETE FROM positions
WHERE exchange_source = 'alpaca';

-- Reset the sync cursor for Alpaca connections
-- This will cause the next sync to fetch all trades from the beginning
UPDATE exchange_connections
SET last_sync_cursor = NULL,
    verified_trades_count = 0
WHERE exchange = 'alpaca';

-- Add a comment to document this cleanup
COMMENT ON TABLE positions IS 'Trading positions. Alpaca trades cleaned up on 2026-01-05 to implement FIFO matching.';
