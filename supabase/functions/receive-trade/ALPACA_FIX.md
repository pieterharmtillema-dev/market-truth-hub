# Alpaca Trade Matching Fix

## Overview

This document describes fixes for Alpaca trade matching issues. There are TWO separate paths for Alpaca trades:

1. **Webhook Path** (`receive-trade` function) - For real-time trade webhooks
2. **Sync Path** (`alpaca-sync` function) - For batch syncing historical trades

## Problem 1: Webhook Path

Alpaca sends all order fills as `type: "TRADE_ENTRY"`, including both opening and closing fills. This caused:
- Buy fills to always create new long positions ✓
- Sell fills to always create new short positions ✗ (should close existing longs!)
- Result: Each trade showed up twice (one open, one separate "short" position)

The webhook router only looked at `type`/`event_type` and never examined `side`, so the FIFO close logic in `handleTradeExit` was never invoked.

## Solution

Added `normalizeEventTypeForPlatform()` helper function that:
1. Detects when a `TRADE_ENTRY` from Alpaca should actually be treated as `TRADE_EXIT`
2. Checks if there are open positions with the **opposite side**
3. Converts `TRADE_ENTRY` → `TRADE_EXIT` to trigger FIFO close logic

### Logic Flow

```
Alpaca webhook arrives:
├─ type: "TRADE_ENTRY"
├─ side: "sell" (or "short")
└─ symbol: "AAPL"

normalizeEventTypeForPlatform checks:
├─ Platform is "Alpaca"? YES
├─ Event type is "TRADE_ENTRY"? YES
├─ Query: Any open "long" positions for AAPL? YES
└─ Convert to "TRADE_EXIT" ✓

Switch statement routes to:
└─ handleTradeExit() → FIFO close logic
```

## Test Scenarios

### Scenario 1: Normal Long Entry (First Buy)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "Alpaca",
  "symbol": "AAPL",
  "side": "buy",
  "quantity": 100,
  "price": 150.00
}
```
**Expected**: No open positions exist → stays as `TRADE_ENTRY` → creates new long position

---

### Scenario 2: Close Long Position (Sell after Buy)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "Alpaca",
  "symbol": "AAPL",
  "side": "sell",
  "quantity": 100,
  "price": 155.00
}
```
**Expected**: Open long position exists → converts to `TRADE_EXIT` → closes long via FIFO

---

### Scenario 3: Normal Short Entry (First Sell)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "Alpaca",
  "symbol": "TSLA",
  "side": "sell",
  "quantity": 50,
  "price": 200.00
}
```
**Expected**: No open positions exist → stays as `TRADE_ENTRY` → creates new short position

---

### Scenario 4: Close Short Position (Buy after Sell)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "Alpaca",
  "symbol": "TSLA",
  "side": "buy",
  "quantity": 50,
  "price": 190.00
}
```
**Expected**: Open short position exists → converts to `TRADE_EXIT` → closes short via FIFO

---

### Scenario 5: Add to Long Position (Buy when already long)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "Alpaca",
  "symbol": "AAPL",
  "side": "buy",
  "quantity": 50,
  "price": 152.00
}
```
**Expected**: Only long positions open (no opposite) → stays as `TRADE_ENTRY` → adds to position

---

### Scenario 6: TradingView (No Platform Logic)
```json
{
  "type": "TRADE_ENTRY",
  "platform": "TradingView",
  "symbol": "AAPL",
  "side": "sell",
  "quantity": 100,
  "price": 155.00
}
```
**Expected**: Platform is not "Alpaca" → no normalization → stays as `TRADE_ENTRY`

## Code Location

- Helper function: [receive-trade/index.ts:831-891](../receive-trade/index.ts#L831-L891)
- Integration point: [receive-trade/index.ts:1006-1011](../receive-trade/index.ts#L1006-L1011)
- Switch statement: [receive-trade/index.ts:1014](../receive-trade/index.ts#L1014)

## Future Extensions

This pattern makes it easy to add similar logic for other brokers:

```typescript
async function normalizeEventTypeForPlatform(...) {
  // Alpaca logic
  if (eventType === "TRADE_ENTRY" && payload.platform === "Alpaca") {
    // ... existing logic
  }

  // Future: TradeStation logic
  if (eventType === "FILL" && payload.platform === "TradeStation") {
    // ... TradeStation-specific rules
  }

  // Future: Interactive Brokers logic
  if (payload.platform === "InteractiveBrokers") {
    // ... IB-specific rules
  }

  return eventType;
}
```

## Problem 2: Sync Path

The `alpaca-sync` function processes historical orders in batch. Issues:

1. **Timing**: If you sync immediately after trading, the buy and sell orders might arrive in the API response in unpredictable order
2. **Duplicate Syncs**: Running sync multiple times can create duplicate positions if deduplication fails
3. **No Open Position**: If the sell order is processed before the buy order is inserted, it fails silently

### Current Sync Behavior

```typescript
for (const order of orders) {
  if (order.side === 'sell') {
    // Try to close open positions via FIFO
    await closeSellOrder(...)
    continue; // Don't insert sell as position
  }

  if (order.side === 'buy') {
    // Check for duplicates, then insert as open position
    await insert(position);
  }
}
```

**Problem**: If orders array has `[SELL, BUY]`, the sell fails because no open position exists yet.

### Solution

The `alpaca-sync` function should:
1. **Sort orders by timestamp** before processing (earliest first)
2. **Separate buy/sell orders** and process buys first, then sells
3. **Better error handling** when no open position exists for a sell

## Verification

### For Webhook Path

Check Supabase logs for Alpaca webhook calls:
```
[Alpaca] Checking if short fill should close opposite position for AAPL...
[Alpaca] Found opposite open position - converting to TRADE_EXIT
```

### For Sync Path

Check Supabase logs for alpaca-sync calls:
```
Processing SELL order for AAPL: 100 @ 150.50
Closed 1 position(s) for AAPL
```

### Database Check

Check `positions` table:
- Each completed trade should have ONE position record (not two)
- Position should have both `entry_price` and `exit_price` filled
- `open` should be `false` after close
- `pnl` should be calculated correctly

### Common Issues

**Seeing duplicate positions?**
1. Check if they're from same sync (look at `created_at` timestamps)
2. Check Supabase logs - are sell orders finding open positions?
3. Verify `exchange_source = 'alpaca'` on all positions
4. Check if orders are being sorted by timestamp

**Seeing SHORT positions when you only went long?**
- This shouldn't happen with current code (line 224 hardcodes `side = 'long'`)
- Check your frontend - it might be inferring side from something else
- Verify the actual `side` column value in database
