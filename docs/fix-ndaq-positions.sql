-- Fix NDAQ positions from incorrect sync
-- Run this in your Supabase SQL Editor

-- Step 1: Check current NDAQ positions
SELECT
  id,
  symbol,
  side,
  open,
  quantity,
  entry_price,
  exit_price,
  pnl,
  exit_reason,
  entry_timestamp,
  exit_timestamp,
  created_at
FROM positions
WHERE symbol = 'NDAQ'
  AND user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com') -- Replace with your email
ORDER BY entry_timestamp DESC;

-- Step 2: Option A - Delete and resync (Recommended)
-- This will clean slate and let the fixed sync recreate them correctly
DELETE FROM positions
WHERE symbol = 'NDAQ'
  AND user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com'); -- Replace with your email

-- Then click "Sync" button in UI to recreate them correctly

-- Step 2: Option B - Manual fix (if you want to keep the data)
-- Find the two position IDs first, then:

-- Close the LONG position with correct P&L and exit_reason
UPDATE positions
SET
  open = false,
  exit_price = 99.38,
  exit_timestamp = '2026-01-09T19:44:00Z', -- Adjust to actual time
  pnl = 0.10, -- Corrected: (99.38 - 99.37) * 10 = $0.10 profit
  pnl_pct = 0.10, -- ((99.38 - 99.37) / 99.37) * 100 = 0.10%
  exit_reason = 'market', -- Or 'manual', 'take_profit', 'stop_loss' if you know which
  updated_at = NOW()
WHERE id = 123 -- Replace with the actual position ID of the entry
  AND symbol = 'NDAQ';

-- Delete the duplicate "closed" position
DELETE FROM positions
WHERE id = 456 -- Replace with the ID of the duplicate closed position
  AND symbol = 'NDAQ';

-- Step 3: Verify the fix
SELECT
  id,
  symbol,
  side,
  open,
  quantity,
  entry_price,
  exit_price,
  pnl,
  exit_reason,
  entry_timestamp,
  exit_timestamp
FROM positions
WHERE symbol = 'NDAQ'
  AND user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com') -- Replace with your email
ORDER BY entry_timestamp DESC;

-- Expected result:
-- One closed LONG position:
-- - Entry: 99.37
-- - Exit: 99.38
-- - P&L: +0.10
-- - Exit Reason: market (or appropriate reason)
