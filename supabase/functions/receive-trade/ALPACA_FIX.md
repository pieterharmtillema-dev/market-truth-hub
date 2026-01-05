# Alpaca TRADE_ENTRY → TRADE_EXIT Auto-Detection Fix

## Problem

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

## Verification

Check Supabase logs for Alpaca webhook calls:
```
[Alpaca] Checking if short fill should close opposite position for AAPL...
[Alpaca] Found opposite open position - converting to TRADE_EXIT
```

Check `positions` table:
- Each trade should have ONE position record (not two)
- Position should have both `entry_price` and `exit_price` filled
- `open` should be `false` after close
- `pnl` should be calculated correctly
