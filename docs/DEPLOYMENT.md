# 🚀 Deployment Guide - Real-Time Trade Closing

Quick guide to deploy the real-time webhook system.

## Prerequisites

✅ Supabase CLI installed (`npm install -g supabase` or `brew install supabase`)
✅ Logged into Supabase CLI (`supabase login`)
✅ Project linked (`supabase link --project-ref your-project-ref`)

## Step 1: Deploy Edge Functions

Deploy both functions (order matters for dependencies):

```bash
# Deploy the new webhook handler (handles real-time Alpaca events)
supabase functions deploy alpaca-webhook

# Deploy the updated sync function (fallback mechanism)
supabase functions deploy alpaca-sync
```

Expected output:
```
✓ Deployed Function alpaca-webhook
  URL: https://your-project.supabase.co/functions/v1/alpaca-webhook

✓ Deployed Function alpaca-sync
  URL: https://your-project.supabase.co/functions/v1/alpaca-sync
```

## Step 2: Configure Webhook Secret

Generate and set a secure webhook secret:

```bash
# Generate a cryptographically secure random secret (32 bytes = 64 hex chars)
SECRET=$(openssl rand -hex 32)
echo "Your webhook secret: $SECRET"

# Set it in Supabase (copy the secret from above)
supabase secrets set ALPACA_WEBHOOK_SECRET="paste_your_secret_here"
```

**⚠️ IMPORTANT**: Save this secret somewhere secure - you'll need it for Alpaca configuration!

## Step 3: Verify Environment Variables

Check that all required secrets are set:

```bash
supabase secrets list
```

You should see:
- ✅ `ALPACA_WEBHOOK_SECRET` (you just set this)
- ✅ `EXCHANGE_ENCRYPTION_KEY` (already exists)
- ✅ `SUPABASE_URL` (auto-configured)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-configured)

## Step 4: Configure Alpaca Webhooks

### Option A: Via Alpaca Dashboard (Recommended)

1. **Login to Alpaca**
   - Go to [https://app.alpaca.markets/](https://app.alpaca.markets/)
   - Login with your credentials

2. **Navigate to Webhooks**
   - Click **Account** (top-right menu)
   - Select **API Keys**
   - Click **Webhooks** tab

3. **Create Webhook**
   - Click **Add Webhook** button

4. **Configure Webhook Settings**
   ```
   Name: Market Truth Hub - Real-Time Trades
   URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/alpaca-webhook
   Events: ☑️ Trade Updates
   Secret: [paste your ALPACA_WEBHOOK_SECRET here]
   Active: ☑️ Enabled
   ```

5. **Save & Test**
   - Click **Save**
   - Click **Test** to send a test event
   - Should return `200 OK`

### Option B: Via Alpaca API

Replace placeholders and run:

```bash
# Set your credentials
ALPACA_KEY_ID="your_alpaca_key_id"
ALPACA_SECRET="your_alpaca_secret"
WEBHOOK_SECRET="your_webhook_secret_from_step_2"
SUPABASE_PROJECT_REF="your_project_ref"

# Create webhook
curl -X POST https://api.alpaca.markets/v2/webhooks \
  -H "APCA-API-KEY-ID: $ALPACA_KEY_ID" \
  -H "APCA-API-SECRET-KEY: $ALPACA_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/alpaca-webhook\",
    \"events\": [\"trade_updates\"],
    \"secret\": \"$WEBHOOK_SECRET\"
  }"
```

Expected response:
```json
{
  "id": "webhook_id_here",
  "url": "https://your-project.supabase.co/functions/v1/alpaca-webhook",
  "events": ["trade_updates"],
  "active": true
}
```

## Step 5: Verify Deployment

### Test Webhook Endpoint

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/alpaca-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected: `401` (missing signature - this is good! It means auth is working)

### Test Sync Endpoint (with auth)

```bash
# Get your access token from browser localStorage or Supabase dashboard
ACCESS_TOKEN="your_access_token_here"

curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/alpaca-sync" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Expected: `200 OK` with sync results

### Monitor Function Logs

```bash
# Watch webhook logs in real-time
supabase functions logs alpaca-webhook --tail

# Watch sync logs
supabase functions logs alpaca-sync --tail
```

## Step 6: Test Real-Time Closing

### Using Alpaca Paper Trading

1. **Open Your App**
   - Go to Past Trades page
   - Open browser DevTools Console

2. **Place a Bracket Order in Alpaca**
   ```python
   # Example using alpaca-py
   from alpaca.trading.client import TradingClient
   from alpaca.trading.requests import MarketOrderRequest
   from alpaca.trading.enums import OrderSide, TimeInForce

   client = TradingClient(api_key, secret_key, paper=True)

   # Buy with TP/SL
   order = client.submit_order(
       MarketOrderRequest(
           symbol="AAPL",
           qty=1,
           side=OrderSide.BUY,
           time_in_force=TimeInForce.DAY,
           order_class="bracket",
           take_profit={"limit_price": 155.0},  # Adjust to current price
           stop_loss={"stop_price": 145.0}
       )
   )
   ```

3. **Wait for Fill**
   - Entry order fills immediately (market order)
   - Watch console for: `[Realtime] Position update received`
   - Position should appear in table

4. **Trigger TP/SL**
   - Wait for price to move (or manually cancel one leg to simulate)
   - Watch for:
     - Webhook logs: `[WEBHOOK] fill: SELL AAPL...`
     - Console: `[Realtime] Position update received`
     - Toast notification: 🎯 Take Profit Hit or 🛑 Stop Loss Hit
     - Table updates with closed position

## Troubleshooting

### Webhook Not Receiving Events

**Check webhook is active:**
```bash
curl https://api.alpaca.markets/v2/webhooks \
  -H "APCA-API-KEY-ID: $ALPACA_KEY_ID" \
  -H "APCA-API-SECRET-KEY: $ALPACA_SECRET"
```

**Check function logs for errors:**
```bash
supabase functions logs alpaca-webhook --tail | grep ERROR
```

### Signature Verification Failing

**Verify secret matches:**
```bash
# Check Supabase secret
supabase secrets list | grep ALPACA_WEBHOOK_SECRET

# Check Alpaca webhook secret (via dashboard or API)
```

**Test with mock signature:**
```bash
WEBHOOK_SECRET="your_secret"
TIMESTAMP=$(date +%s)
PAYLOAD='{"event":"fill","order":{"id":"test"}}'
SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/alpaca-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Alpaca-Signature: ${TIMESTAMP}.${SIGNATURE}" \
  -d "$PAYLOAD"
```

### Position Not Closing

**Check if order exists in database:**
```sql
SELECT * FROM alpaca_orders
WHERE order_id = 'your_order_id'
ORDER BY updated_at DESC;
```

**Check open positions:**
```sql
SELECT * FROM positions
WHERE user_id = 'your_user_id'
  AND symbol = 'AAPL'
  AND open = true;
```

**Check function logs:**
```bash
supabase functions logs alpaca-webhook --tail
```

Look for:
- `[FIFO] Looking for LONG positions to close...`
- `[FIFO] FULL CLOSE position...`
- `[RESULT] Closed X position(s)`

### UI Not Updating

**Check Realtime subscription:**
- Open DevTools Console
- Look for: `[Realtime] Subscribing to position updates for user: ...`
- Should see: `[Realtime] Position update received` when positions change

**Verify Realtime is enabled:**
```sql
SELECT * FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename = 'positions';
```

**Check RLS policies:**
```sql
SELECT * FROM pg_policies
WHERE tablename = 'positions';
```

## Rollback Plan

If something goes wrong, you can quickly rollback:

### Disable Webhook (Keep Sync Working)

**Via Alpaca Dashboard:**
1. Go to Webhooks settings
2. Toggle webhook to **Inactive**
3. Manual sync still works via button

**Via API:**
```bash
curl -X DELETE https://api.alpaca.markets/v2/webhooks/YOUR_WEBHOOK_ID \
  -H "APCA-API-KEY-ID: $ALPACA_KEY_ID" \
  -H "APCA-API-SECRET-KEY: $ALPACA_SECRET"
```

### Redeploy Previous Version

```bash
# Redeploy from git history
git checkout HEAD~1 -- supabase/functions/alpaca-sync/index.ts
supabase functions deploy alpaca-sync
```

## Production Checklist

Before going live with real money:

- [ ] Webhook deployed and responding
- [ ] Webhook secret configured in both Alpaca and Supabase
- [ ] Signature verification working (test with curl)
- [ ] Tested full flow in paper trading
- [ ] Verified positions close with correct exit_reason
- [ ] UI updates in real-time
- [ ] Toast notifications appear
- [ ] Function logs show no errors
- [ ] Fallback sync still works manually
- [ ] Monitoring/alerts set up for webhook failures
- [ ] Documented how to check webhook health

## Monitoring & Maintenance

### Daily Health Checks

```bash
# Check recent webhook deliveries
supabase functions logs alpaca-webhook --limit 100 | grep "success: true"

# Check for errors
supabase functions logs alpaca-webhook --limit 100 | grep ERROR

# Verify positions are closing
psql $DATABASE_URL -c "
  SELECT
    exit_reason,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (exit_timestamp::timestamp - updated_at::timestamp))) as avg_close_latency_seconds
  FROM positions
  WHERE exit_timestamp > NOW() - INTERVAL '24 hours'
    AND exit_reason IS NOT NULL
  GROUP BY exit_reason;
"
```

### Set Up Alerts

Consider setting up alerts for:
- Webhook delivery failures (via Alpaca dashboard)
- Function errors (via Supabase alerts)
- Positions not closing within expected time
- Signature verification failures

## Need Help?

- 📖 **Full Documentation**: [alpaca-webhook-setup.md](./alpaca-webhook-setup.md)
- 🐛 **Troubleshooting**: See section above
- 📊 **Architecture**: Check webhook setup doc for diagrams
- 🔍 **Logs**: `supabase functions logs <function-name> --tail`

---

**Ready to deploy?** Run through steps 1-5 and you'll have real-time trade closing in minutes! ⚡
