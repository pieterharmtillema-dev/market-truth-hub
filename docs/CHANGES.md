# Real-Time Trade Closing - Implementation Changes

## What Was Fixed

### Issue
The `alpaca-sync` function was updated to fetch `allOrders` (including canceled bracket legs) but wasn't utilizing this data properly.

### Solution
Updated `alpaca-sync/index.ts` to:

1. **Store ALL orders first** (lines 198-244)
   - Processes `allOrders` array which includes filled, canceled, and expired orders
   - Critical for capturing complete bracket data (TP/SL status even when canceled)
   - Uses upsert to update existing orders with latest status
   - Better logging: `[BRACKET SYNC] Storing X total orders...`

2. **Then process positions** (lines 252+)
   - Processes only `orders` (filled orders) for position matching
   - Removed duplicate order storage from this loop
   - Cleaner separation of concerns: orders → positions
   - Better logging: `[POSITION SYNC] Processing X filled orders...`

3. **Enhanced summary output** (lines 409-417)
   - Shows total orders stored (all)
   - Shows filled orders processed (subset)
   - Bracket orders with TP/SL data count
   - More informative for debugging

## Why This Matters

### Before
```typescript
// Only stored filled orders
const { orders } = await getFilledOrdersWithExecutions(...)

// Problem: If TP filled but SL was canceled, we'd miss the SL status
```

### After
```typescript
// Fetches both filled AND all closed orders
const { orders, allOrders } = await getFilledOrdersWithExecutions(...)

// Store ALL orders (including canceled TP/SL legs)
for (const order of allOrders) {
  // Full bracket data preserved
}

// Then process filled orders for positions
for (const order of orders) {
  // Position matching with accurate exit_reason
}
```

### Real-World Example

**Scenario**: Bracket order with TP at $155 and SL at $145

1. Entry fills at $150 ✅
2. TP fills at $155 ✅
3. SL gets canceled (one-cancels-other) ❌

**Before fix**: SL status unknown (not fetched)
**After fix**: Full bracket data stored:
```json
{
  "take_profit": {
    "status": "filled",
    "filled_at": "2026-01-09T12:00:00Z"
  },
  "stop_loss": {
    "status": "canceled",
    "canceled_at": "2026-01-09T12:00:01Z"
  }
}
```

This enables accurate `exit_reason` detection: **"take_profit"** instead of generic **"market"**

## Files Modified

### 1. `alpaca-sync/index.ts`
- Added `allOrders` processing loop before position matching
- Removed duplicate order storage from position loop
- Enhanced logging with `[BRACKET SYNC]` and `[POSITION SYNC]` prefixes
- Updated summary to show total orders vs filled orders

### 2. `_shared/alpaca-api.ts` (by user/linter)
- Added `allOrders` to `getFilledOrdersWithExecutions` return type
- Fetches both `status: 'filled'` and `status: 'closed'` orders
- Added `filled_at` and `canceled_at` to bracket leg types
- Better bracket data extraction

### 3. `PastTrades.tsx`
- Added `exit_reason` field to Position interface
- Added Supabase Realtime subscription
- Toast notifications for closed positions with exit reason

## Testing

After deploying, test with:

```bash
# Deploy updated sync function
supabase functions deploy alpaca-sync

# Trigger sync and check logs
supabase functions logs alpaca-sync --tail
```

Expected log output:
```
[BRACKET SYNC] Storing 15 total orders (including bracket legs)...
  [BRACKET] Stored order abc123 with bracket data
  [BRACKET] Stored order def456 with bracket data
[BRACKET SYNC] Complete. All orders stored in alpaca_orders table.

[POSITION SYNC] Processing 10 filled orders for position matching...
[POSITION] BUY AAPL: 10 @ 150.00
  [BRACKET] Bracket data: TP=filled, SL=canceled
  Exit Reason: take_profit
  [RESULT] Closed 1 LONG position(s)

========================================
Sync complete (FALLBACK):
  - Total orders stored: 15
  - Filled orders processed: 10
  - New positions opened: 5
  - Positions closed: 3
  - Bracket orders with TP/SL data: 7
  - Duplicates skipped: 2
========================================
```

## Database Verification

Check that bracket data is properly stored:

```sql
-- View bracket orders with complete TP/SL status
SELECT
  order_id,
  symbol,
  side,
  status,
  bracket_data->>'entry_side' as entry_side,
  bracket_data->'take_profit'->>'status' as tp_status,
  bracket_data->'take_profit'->>'filled_at' as tp_filled_at,
  bracket_data->'stop_loss'->>'status' as sl_status,
  bracket_data->'stop_loss'->>'canceled_at' as sl_canceled_at
FROM alpaca_orders
WHERE bracket_data IS NOT NULL
ORDER BY submitted_at DESC
LIMIT 10;
```

Expected results should show:
- ✅ Entry orders with nested leg data
- ✅ TP/SL status (filled, canceled, expired)
- ✅ Timestamps for fills and cancellations
- ✅ Complete bracket lifecycle

## Next Steps

1. **Deploy webhook function** for real-time closing
2. **Configure Alpaca webhook** in dashboard
3. **Test with paper trading** to verify end-to-end flow
4. **Monitor logs** for bracket data accuracy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Benefits

✅ **Accurate exit reason detection** - Knows if TP or SL was hit
✅ **Complete order history** - All orders stored, not just filled
✅ **Better analytics** - Can analyze which exits trigger most
✅ **Audit trail** - Full bracket lifecycle preserved
✅ **No data loss** - Canceled legs tracked alongside filled ones

---

**Last Updated**: 2026-01-09
**Status**: Ready to deploy
