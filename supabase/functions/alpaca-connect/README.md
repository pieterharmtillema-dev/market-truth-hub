# Alpaca Broker Integration

Complete implementation for connecting Alpaca trading accounts to the trading journal app.

## Overview

This integration allows users to connect their Alpaca brokerage account (paper or live) using API keys, then automatically sync their trade executions and orders into the journal for tracking and analysis.

## Architecture

### Files Created

1. **Migration**: `supabase/migrations/20260104000001_add_alpaca_support.sql`
   - Adds `'alpaca'` to `exchange_type` enum
   - Adds `environment` column to `exchange_connections` table

2. **Shared API Wrapper**: `supabase/functions/_shared/alpaca-api.ts`
   - Type-safe Alpaca API client
   - Handles authentication, rate limiting, retries
   - Functions: `getAccount()`, `getOrders()`, `getActivities()`, `getFilledOrdersWithExecutions()`

3. **Edge Functions**:
   - `alpaca-connect/index.ts` - Connect Alpaca account with API keys
   - `alpaca-disconnect/index.ts` - Disconnect Alpaca account
   - `alpaca-sync/index.ts` - Sync filled orders/executions to positions table

### Security Features

✅ **AES-256-GCM Encryption** - API keys encrypted at rest (not legacy XOR)
✅ **Never logs secrets** - Credentials never appear in logs
✅ **Credential validation** - Tests API keys before storing
✅ **Deduplication** - Uses `external_id` (order ID) to prevent duplicate imports
✅ **Rate limit handling** - Automatic retry with exponential backoff
✅ **RLS policies** - Users can only access their own connections

## Environment Variables

Required in Supabase Edge Functions:

```bash
EXCHANGE_ENCRYPTION_KEY=<base64-encoded-32-byte-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Generating Encryption Key

```bash
# Generate a secure 32-byte key
openssl rand -base64 32
```

## API Endpoints

### 1. Connect Alpaca Account

**Endpoint**: `POST /alpaca-connect`

**Request**:
```json
{
  "environment": "paper",  // or "live"
  "apiKeyId": "PKXXXXXXXXXXXXXXXX",
  "apiSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response**:
```json
{
  "connected": true,
  "environment": "paper",
  "account": {
    "id": "...",
    "account_number": "...",
    "status": "ACTIVE",
    "currency": "USD",
    "buying_power": "100000.00",
    "portfolio_value": "100000.00",
    "pattern_day_trader": false
  },
  "connection": {
    "id": "uuid",
    "exchange": "alpaca",
    "status": "connected",
    "last_sync_at": "2024-01-04T12:00:00Z"
  }
}
```

**Error Responses**:
- `400` - Invalid credentials, missing fields, or blocked account
- `401` - Authentication failed
- `429` - Rate limit exceeded
- `500` - Server error

### 2. Disconnect Alpaca Account

**Endpoint**: `POST /alpaca-disconnect`

**Response**:
```json
{
  "success": true
}
```

### 3. Sync Trades

**Endpoint**: `POST /alpaca-sync`

**Response**:
```json
{
  "success": true,
  "imported": 15,
  "skipped_duplicates": 3,
  "total_fetched": 18,
  "newest_cursor": "2024-01-04T12:00:00Z"
}
```

## Database Schema

### exchange_connections Table

```sql
{
  id: uuid,
  user_id: uuid,
  exchange: 'alpaca',
  auth_type: 'api_key',
  api_key_encrypted: text,        -- AES-256-GCM encrypted API Key ID
  api_secret_encrypted: text,     -- AES-256-GCM encrypted API Secret
  environment: 'paper' | 'live',  -- Trading environment
  status: 'connected' | 'error',
  last_sync_at: timestamp,
  last_sync_cursor: text,         -- ISO timestamp of last synced order
  verified_trades_count: integer,
  error_message: text
}
```

### positions Table (Normalized Trade Format)

```sql
{
  id: uuid,
  user_id: uuid,
  symbol: text,                    -- e.g., "AAPL" or "BTC/USD"
  side: 'long' | 'short',         -- buy=long, sell=short
  quantity: numeric,
  entry_price: numeric,
  entry_timestamp: timestamp,
  exit_price: numeric,
  exit_timestamp: timestamp,
  pnl: numeric,
  pnl_pct: numeric,
  open: boolean,
  is_exchange_verified: boolean,   -- true for Alpaca imports
  exchange_source: 'alpaca',
  trade_source: 'api',
  external_id: text,               -- Alpaca order ID (for deduplication)
  fees_total: numeric,
  platform: 'Alpaca',
  asset_class: 'stock' | 'crypto' | 'option',
  created_at: timestamp,
  updated_at: timestamp
}
```

**Unique Index**: `(user_id, exchange_source, external_id)` prevents duplicate imports.

## How It Works

### Connection Flow

1. User enters API Key ID, Secret, and selects environment (paper/live)
2. Backend validates credentials by calling Alpaca's `/v2/account` endpoint
3. Checks account is not blocked or restricted
4. Encrypts credentials using AES-256-GCM
5. Stores in `exchange_connections` table with `auth_type='api_key'`
6. Returns account info (no secrets) to frontend

### Sync Flow

1. User triggers sync (manual or automatic)
2. Backend loads connection and decrypts credentials
3. Fetches filled orders from Alpaca using cursor (last sync timestamp)
4. Fetches fill activities for execution-level details
5. Normalizes each order to positions table format
6. Inserts with `external_id` (order ID) for deduplication
7. Updates `last_sync_cursor` to latest order timestamp
8. Returns summary (imported, duplicates, cursor)

### Deduplication Strategy

- Each Alpaca order has a unique `id` (e.g., `"a1b2c3d4-..."`)
- Stored in `positions.external_id` field
- Unique index: `(user_id, exchange_source, external_id)` prevents duplicates
- On conflict: skip silently (already imported)

### Incremental Sync

- `last_sync_cursor` stores ISO timestamp of last synced order's `filled_at`
- Next sync uses `after` parameter to fetch only new orders
- Cursor updated only when new orders found
- Safe to run multiple times (idempotent)

## Alpaca API Details

### Base URLs

- **Paper Trading**: `https://paper-api.alpaca.markets`
- **Live Trading**: `https://api.alpaca.markets`

### Authentication Headers

```http
APCA-API-KEY-ID: <api-key-id>
APCA-API-SECRET-KEY: <api-secret>
```

### Key Endpoints Used

1. **GET /v2/account** - Validate credentials, get account info
2. **GET /v2/orders?status=filled** - Get filled orders (with pagination)
3. **GET /v2/account/activities?activity_type=FILL** - Get fill executions

### Rate Limits

- **200 requests per minute** per API key
- Implementation includes:
  - Automatic retry with exponential backoff
  - Respect `Retry-After` header on 429 responses
  - Max 3 retries per request

### Asset Classes

Alpaca supports:
- `us_equity` → normalized to `asset_class='stock'`
- `crypto` → normalized to `asset_class='crypto'`
- `us_option` → normalized to `asset_class='option'`

## Frontend Integration Guide

### 1. Add to Exchange Connection Modal

Update your exchange connection UI to include Alpaca:

```tsx
// In ExchangeConnectionModal.tsx or similar

const [environment, setEnvironment] = useState<'paper' | 'live'>('paper');
const [apiKeyId, setApiKeyId] = useState('');
const [apiSecret, setApiSecret] = useState('');

// Connect handler
const handleAlpacaConnect = async () => {
  const response = await fetch('/functions/v1/alpaca-connect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      environment,
      apiKeyId,
      apiSecret,
    }),
  });

  const data = await response.json();

  if (data.connected) {
    toast.success(`Alpaca ${environment} connected!`);
  } else {
    toast.error(data.error);
  }
};
```

### 2. UI Components Needed

**Environment Toggle**:
```tsx
<div>
  <label>Environment</label>
  <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
    <option value="paper">Paper Trading (Simulated)</option>
    <option value="live">Live Trading (Real Money)</option>
  </select>
</div>
```

**API Key Inputs**:
```tsx
<div>
  <label>API Key ID</label>
  <input
    type="text"
    value={apiKeyId}
    onChange={(e) => setApiKeyId(e.target.value)}
    placeholder="PKXXXXXXXXXXXXXXXX"
  />
</div>

<div>
  <label>API Secret</label>
  <input
    type="password"
    value={apiSecret}
    onChange={(e) => setApiSecret(e.target.value)}
    placeholder="Enter your API secret"
  />
</div>
```

**Sync Button**:
```tsx
const handleSync = async () => {
  const response = await fetch('/functions/v1/alpaca-sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();
  toast.success(`Imported ${data.imported} new trades`);
};
```

### 3. Getting Alpaca API Keys

Guide users to create API keys:

1. Go to [Alpaca Dashboard](https://app.alpaca.markets/paper/dashboard/overview) (paper) or [Live Dashboard](https://app.alpaca.markets/live/dashboard/overview)
2. Navigate to "API Keys" section
3. Click "Generate New Key"
4. **Important**: Select "View Only" permissions (no trading permissions for security)
5. Copy both the API Key ID and Secret Key
6. Store Secret Key securely (cannot be retrieved later)

## Testing

### Manual Testing with Paper Account

1. Create free Alpaca paper trading account: https://alpaca.markets/
2. Generate paper trading API keys (view-only permissions recommended)
3. Connect via frontend or curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/alpaca-connect \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "paper",
    "apiKeyId": "PKXXXXXXXXXXXXXXXX",
    "apiSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

4. Place some paper trades in Alpaca dashboard
5. Sync trades:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/alpaca-sync \
  -H "Authorization: Bearer $USER_JWT"
```

6. Verify trades appear in positions table

### Unit Testing

Test files to create:
- `alpaca-api.test.ts` - Test API wrapper functions
- `alpaca-connect.test.ts` - Test connection flow
- `alpaca-sync.test.ts` - Test sync logic and normalization

## Troubleshooting

### Common Issues

**"Invalid API credentials"**
- Check API Key ID and Secret are correct
- Verify environment matches (paper keys won't work for live)
- Ensure API key is active (not revoked)

**"Account is blocked"**
- Check Alpaca account status in dashboard
- Contact Alpaca support if blocked

**"Rate limit exceeded"**
- Wait 60 seconds and retry
- Reduce sync frequency
- Consider batching requests

**"No new trades imported"**
- Verify trades are filled (not pending)
- Check `last_sync_cursor` in database
- Ensure trades occurred after cursor timestamp

**Duplicate imports**
- Should not happen due to `external_id` unique index
- If duplicates found, check index exists: `\d positions` in psql

### Debug Mode

Enable verbose logging:

```typescript
// In alpaca-sync/index.ts
console.log('Orders fetched:', JSON.stringify(orders, null, 2));
console.log('Position normalized:', position);
```

## Production Checklist

Before deploying to production:

- [ ] Set strong `EXCHANGE_ENCRYPTION_KEY` (32+ random bytes)
- [ ] Run migration: `supabase db push`
- [ ] Deploy edge functions: `supabase functions deploy alpaca-connect alpaca-disconnect alpaca-sync`
- [ ] Test with paper account first
- [ ] Update frontend to include Alpaca in exchange list
- [ ] Add Alpaca logo/branding
- [ ] Document API key creation for users
- [ ] Set up monitoring for sync errors
- [ ] Configure automatic sync schedule (optional)
- [ ] Test disconnect flow
- [ ] Verify RLS policies working correctly

## Future Enhancements

Potential improvements:

1. **Position Reconstruction** - Match buy/sell pairs to calculate accurate PnL
2. **Real-time Sync** - Use Alpaca's streaming API or webhooks
3. **Options Support** - Enhanced normalization for options trades
4. **Fractional Shares** - Better handling of fractional quantities
5. **Cost Basis Tracking** - Track wash sales and tax lots
6. **Performance Metrics** - Calculate win rate, avg profit, etc.
7. **Multi-Account Support** - Support multiple Alpaca accounts per user

## Resources

- [Alpaca API Documentation](https://alpaca.markets/docs/api-references/trading-api/)
- [Alpaca Rate Limits](https://alpaca.markets/docs/api-references/trading-api/rate-limiting/)
- [Paper Trading Guide](https://alpaca.markets/docs/trading/paper-trading/)
- [API Key Management](https://alpaca.markets/docs/trading/getting-started/#api-keys)

## Support

For issues or questions:
1. Check error message in response
2. Review edge function logs in Supabase dashboard
3. Verify API keys in Alpaca dashboard
4. Check database connection status
5. Open issue in project repository
