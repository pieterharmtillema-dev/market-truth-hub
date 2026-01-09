# Supabase Edge Functions

Real-time trade processing and sync functions for Market Truth Hub.

## Functions Overview

### 🔔 alpaca-webhook (Real-Time Handler)
**Path**: `alpaca-webhook/index.ts`
**Trigger**: HTTP POST from Alpaca webhooks
**Purpose**: Instant position closing when TP/SL orders fill

**Events Handled**:
- `fill` - Order completely filled
- `partial_fill` - Order partially filled

**Features**:
- ✅ HMAC-SHA256 signature verification
- ✅ Real-time position closing with FIFO matching
- ✅ Intelligent exit reason detection (stop_loss, take_profit, market)
- ✅ Updates alpaca_orders table with latest state
- ✅ <400ms latency from Alpaca fill to position close

**Setup**: See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md)

---

### 🔄 alpaca-sync (Fallback Sync)
**Path**: `alpaca-sync/index.ts`
**Trigger**: Manual HTTP POST (Sync button in UI)
**Purpose**: Catch-up sync for missed orders, historical imports

**Features**:
- ✅ Incremental sync using cursor timestamps
- ✅ FIFO position matching (same logic as webhook)
- ✅ Bracket order data extraction
- ✅ Duplicate detection
- ✅ Supports both paper and live trading

**When to Use**:
- Initial account connection (historical import)
- Webhook delivery failures
- Manual verification/debugging
- Bulk historical data imports

---

## Shared Modules

### 📦 _shared/position-closing.ts
Reusable position closing logic used by both webhook and sync:

**Exports**:
- `closeOppositePositions()` - FIFO matching for longs/shorts
- `detectExitReason()` - Smart exit reason detection
- `calculatePnL()` - P&L calculation
- `normalizeAlpacaSymbol()` - Symbol formatting

### 📦 _shared/alpaca-api.ts
Alpaca API client with retry logic and rate limiting:

**Exports**:
- `getAccount()` - Verify credentials
- `getOrders()` - Fetch orders with filters
- `getActivities()` - Fetch fill activities
- `getFilledOrdersWithExecutions()` - Combined order + activity fetch
- `extractBracketData()` - Parse TP/SL legs from bracket orders

### 📦 _shared/crypto.ts
Token encryption/decryption for secure credential storage:

**Exports**:
- `encryptToken()` - Encrypt API credentials
- `decryptToken()` - Decrypt API credentials

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Alpaca Trading                           │
│  (Paper Trading / Live Trading)                             │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │ Real-Time Webhook        │ Manual Sync Request
               │ (Order Fills)            │ (User clicks button)
               ▼                          ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ alpaca-webhook   │        │  alpaca-sync     │
    │  (Real-Time)     │        │   (Fallback)     │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             │ Both use shared modules:  │
             │ ┌─────────────────────┐  │
             └─┤ position-closing.ts ├──┘
               │ alpaca-api.ts       │
               │ crypto.ts           │
               └──────────┬──────────┘
                          ▼
              ┌───────────────────────┐
              │  Supabase Database    │
              │                       │
              │  Tables:              │
              │  • positions          │
              │  • alpaca_orders      │
              │  • exchange_connections│
              └───────────┬───────────┘
                          │
                          │ Realtime Broadcast
                          ▼
              ┌───────────────────────┐
              │   Frontend UI         │
              │  (Past Trades Page)   │
              │                       │
              │  • Auto-refresh       │
              │  • Toast notifications│
              │  • Exit reason badges │
              └───────────────────────┘
```

## Deployment

### Quick Deploy

```bash
# Deploy both functions
supabase functions deploy alpaca-webhook
supabase functions deploy alpaca-sync

# Set webhook secret
supabase secrets set ALPACA_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```

### Full Setup Guide

See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for:
- Step-by-step deployment
- Alpaca webhook configuration
- Testing procedures
- Troubleshooting guide

### Environment Variables

**Required** (set via `supabase secrets set`):
- `ALPACA_WEBHOOK_SECRET` - Webhook signature verification secret
- `EXCHANGE_ENCRYPTION_KEY` - API credential encryption key

**Auto-configured** by Supabase:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

## Development

### Local Testing

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve alpaca-webhook
supabase functions serve alpaca-sync

# Test webhook with curl
curl -X POST http://localhost:54321/functions/v1/alpaca-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"fill","order":{"id":"test123"}}'
```

### Testing with Mock Data

See [alpaca-webhook-setup.md](../../docs/alpaca-webhook-setup.md) for:
- Mock webhook payloads
- Signature generation examples
- Test order scenarios

### Debugging

```bash
# View logs in real-time
supabase functions logs alpaca-webhook --tail
supabase functions logs alpaca-sync --tail

# Filter for errors
supabase functions logs alpaca-webhook | grep ERROR

# Check specific time range
supabase functions logs alpaca-webhook --since 1h
```

## Performance Metrics

### alpaca-webhook
- **Latency**: <100ms (Alpaca → Supabase)
- **Processing**: ~200ms (signature verify + position close)
- **Total**: <400ms (fill → UI update)
- **Throughput**: Handles concurrent fills gracefully

### alpaca-sync
- **Initial Sync**: ~2-5s for 100 orders
- **Incremental**: ~500ms for new orders only
- **Rate Limit**: Respects Alpaca limits (200 req/min)

## Error Handling

Both functions include:
- ✅ Retry logic with exponential backoff (3 attempts)
- ✅ Rate limit handling (429 responses)
- ✅ Detailed error logging
- ✅ Graceful degradation (activities optional)
- ✅ Connection error recovery

## Security

### Authentication
- `alpaca-webhook`: Signature verification (HMAC-SHA256)
- `alpaca-sync`: User JWT token (Supabase Auth)

### Data Protection
- API credentials encrypted at rest (AES-256-GCM)
- HTTPS-only endpoints
- Row Level Security on database tables
- Service role key for database access

### Signature Verification
Webhook signatures verified using:
1. Parse `X-Alpaca-Signature: {timestamp}.{signature}`
2. Verify timestamp within 5 minutes (replay protection)
3. Compute HMAC-SHA256(webhook_secret, timestamp + body)
4. Compare signatures (timing-safe)

## Monitoring

### Health Checks

```sql
-- Check recent webhook activity
SELECT
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as last_hour
FROM alpaca_orders
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check position closing latency
SELECT
  exit_reason,
  AVG(EXTRACT(EPOCH FROM (exit_timestamp::timestamp - updated_at::timestamp))) as avg_latency_seconds
FROM positions
WHERE exit_timestamp > NOW() - INTERVAL '24 hours'
  AND exit_reason IS NOT NULL
GROUP BY exit_reason;
```

### Alerts

Consider monitoring:
- Function error rate (>5% errors)
- Webhook delivery failures (Alpaca dashboard)
- Position closing latency (>1 second)
- Signature verification failures (potential security issue)

## Troubleshooting

### Common Issues

**Webhook not receiving events**
- ✓ Check webhook is active in Alpaca dashboard
- ✓ Verify URL is correct
- ✓ Check function logs for errors

**Signature verification failing**
- ✓ Secrets match between Alpaca and Supabase
- ✓ Server time synchronized
- ✓ Signature header present

**Position not closing**
- ✓ Order exists in alpaca_orders table
- ✓ Open positions exist with matching symbol
- ✓ FIFO matching logic succeeded
- ✓ Check function logs for errors

See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md#troubleshooting) for detailed troubleshooting.

## Contributing

When modifying functions:

1. **Update shared modules first** (`_shared/*`)
2. **Test locally** with `supabase functions serve`
3. **Update both functions** if shared logic changes
4. **Add tests** for new exit reason detection
5. **Update docs** with API changes

## References

- [Alpaca Trading API](https://alpaca.markets/docs/api-references/trading-api/)
- [Alpaca Webhooks](https://alpaca.markets/docs/api-references/trading-api/webhooks/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Questions?** Check [alpaca-webhook-setup.md](../../docs/alpaca-webhook-setup.md) or [DEPLOYMENT.md](../../docs/DEPLOYMENT.md)
