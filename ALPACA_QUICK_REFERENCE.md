# Alpaca Integration - Quick Reference Card

Quick reference for developers working with the Alpaca broker integration.

---

## 📡 API Endpoints

### Connect Account
```bash
POST /functions/v1/alpaca-connect
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "environment": "paper" | "live",
  "apiKeyId": "PKXXXXXXXXXXXXXXXX",
  "apiSecret": "xxxxxxxxxxxxxxxxxxxxx"
}

→ 200: { connected: true, environment, account, connection }
→ 400: { error: "Invalid credentials" }
→ 401: { error: "Invalid authentication" }
```

### Sync Trades
```bash
POST /functions/v1/alpaca-sync
Authorization: Bearer <user-jwt>

→ 200: { success: true, imported: 5, skipped_duplicates: 0, total_fetched: 5, newest_cursor }
→ 404: { error: "No connected Alpaca account found" }
→ 500: { error: "Failed to fetch data from Alpaca" }
```

### Disconnect Account
```bash
POST /functions/v1/alpaca-disconnect
Authorization: Bearer <user-jwt>

→ 200: { success: true }
→ 401: { error: "Invalid authentication" }
```

---

## 🗄️ Database Tables

### exchange_connections
```sql
-- Check Alpaca connections
SELECT user_id, environment, status, last_sync_at, verified_trades_count
FROM exchange_connections
WHERE exchange = 'alpaca';

-- Check for errors
SELECT user_id, error_message, last_sync_at
FROM exchange_connections
WHERE exchange = 'alpaca' AND error_message IS NOT NULL;
```

### positions
```sql
-- View Alpaca trades
SELECT symbol, side, quantity, entry_price, entry_timestamp, external_id
FROM positions
WHERE exchange_source = 'alpaca'
ORDER BY entry_timestamp DESC
LIMIT 20;

-- Count trades by user
SELECT user_id, COUNT(*) as trade_count
FROM positions
WHERE exchange_source = 'alpaca'
GROUP BY user_id;

-- Check for duplicates (should return 0 rows)
SELECT external_id, COUNT(*)
FROM positions
WHERE exchange_source = 'alpaca'
GROUP BY external_id
HAVING COUNT(*) > 1;
```

---

## 🔐 Security

### Encryption
- **Algorithm**: AES-256-GCM (NOT XOR)
- **Key**: `EXCHANGE_ENCRYPTION_KEY` (32+ bytes, base64)
- **Functions**: `encryptToken()`, `decryptToken()` from `_shared/crypto.ts`

### Never Log Secrets
```typescript
// ❌ BAD
console.log('API Key:', apiKey);

// ✅ GOOD
console.log(`Validating Alpaca ${environment} credentials for user ${userId}`);
```

---

## 📁 File Locations

```
project/
├── supabase/
│   ├── migrations/
│   │   └── 20260104000001_add_alpaca_support.sql
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── crypto.ts (AES-256-GCM encryption)
│   │   │   └── alpaca-api.ts (API wrapper)
│   │   ├── alpaca-connect/
│   │   │   ├── index.ts
│   │   │   ├── README.md (full docs)
│   │   │   └── FRONTEND_INTEGRATION.tsx (examples)
│   │   ├── alpaca-disconnect/
│   │   │   └── index.ts
│   │   └── alpaca-sync/
│   │       └── index.ts
│   ├── config.toml (function config)
│   └── ALPACA_DEPLOYMENT.md (deployment guide)
└── ALPACA_IMPLEMENTATION_SUMMARY.md (overview)
```

---

## 🚀 Deployment Commands

```bash
# 1. Apply migration
supabase db push

# 2. Deploy functions
supabase functions deploy alpaca-connect alpaca-disconnect alpaca-sync

# 3. View logs
supabase functions logs alpaca-connect --follow

# 4. Test locally (if supported)
supabase functions serve alpaca-connect
```

---

## 🔍 Debugging

### Check Function Logs
```bash
# Real-time logs
supabase functions logs alpaca-connect --follow
supabase functions logs alpaca-sync --follow

# Recent logs
supabase functions logs alpaca-connect --limit 100
```

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API credentials` | Wrong API keys or environment | Check keys match environment (paper vs live) |
| `Account is blocked` | Alpaca account issue | Check Alpaca dashboard |
| `Rate limit exceeded` | Too many requests | Wait 60s, automatic retry included |
| `No connected Alpaca account` | User not connected | Connect first via alpaca-connect |
| `Server configuration error` | Missing encryption key | Set `EXCHANGE_ENCRYPTION_KEY` in Supabase |

### Test Connection
```bash
# Set variables
export SUPABASE_URL="https://hbmebifvlghmhuthofnq.supabase.co"
export USER_JWT="your-user-jwt-token"

# Test
curl -X POST "$SUPABASE_URL/functions/v1/alpaca-connect" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"environment":"paper","apiKeyId":"PKTEST","apiSecret":"test"}'
```

---

## 🎨 Frontend Integration

### Install Dependencies
```bash
npm install @supabase/auth-helpers-react @supabase/supabase-js
```

### Quick Example
```tsx
import { AlpacaConnectionCard } from '@/components/AlpacaConnectionCard';

function ConnectionsPage() {
  return (
    <div>
      <h1>Connected Exchanges</h1>
      <AlpacaConnectionCard />
    </div>
  );
}
```

See `FRONTEND_INTEGRATION.tsx` for complete examples.

---

## 📊 Monitoring Queries

### Connection Stats
```sql
SELECT
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE environment = 'paper') as paper_count,
  COUNT(*) FILTER (WHERE environment = 'live') as live_count,
  SUM(verified_trades_count) as total_trades_synced,
  MAX(last_sync_at) as latest_sync
FROM exchange_connections
WHERE exchange = 'alpaca' AND status = 'connected';
```

### Error Rate
```sql
SELECT
  DATE(last_sync_at) as date,
  COUNT(*) FILTER (WHERE error_message IS NULL) as success,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors
FROM exchange_connections
WHERE exchange = 'alpaca'
  AND last_sync_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(last_sync_at)
ORDER BY date DESC;
```

### Most Active Users
```sql
SELECT
  user_id,
  verified_trades_count,
  last_sync_at
FROM exchange_connections
WHERE exchange = 'alpaca'
ORDER BY verified_trades_count DESC
LIMIT 10;
```

---

## 🔗 Important Links

- **Alpaca API Docs**: https://alpaca.markets/docs/api-references/trading-api/
- **Alpaca Dashboard (Paper)**: https://app.alpaca.markets/paper/dashboard
- **Alpaca Dashboard (Live)**: https://app.alpaca.markets/live/dashboard
- **Alpaca Status**: https://status.alpaca.markets/
- **Supabase Dashboard**: https://app.supabase.com/

---

## 🎯 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All Alpaca API endpoints | 200 requests | per minute |

**Handling**: Automatic retry with exponential backoff implemented.

---

## 🧪 Test Credentials

### Get Paper Trading API Keys
1. Sign up: https://alpaca.markets/
2. Go to paper dashboard
3. API Keys → Generate New Key
4. **Permissions**: Select "View Only" (recommended)
5. Copy Key ID and Secret

### Test Data
- Paper account starts with $100,000
- Place test trades to verify sync
- Market orders fill instantly
- Free, unlimited paper trading

---

## ⚙️ Environment Variables

| Variable | Set By | Purpose |
|----------|--------|---------|
| `EXCHANGE_ENCRYPTION_KEY` | You (Supabase Dashboard) | Encrypts API keys |
| `SUPABASE_URL` | Supabase (auto) | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (auto) | Service auth |

---

## 📝 Code Snippets

### Fetch with Auth
```typescript
const session = await supabase.auth.getSession();

const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/alpaca-connect`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ environment, apiKeyId, apiSecret }),
  }
);

const data = await response.json();
```

### Check Connection Status
```typescript
const { data: connection } = await supabase
  .from('exchange_connections')
  .select('*')
  .eq('exchange', 'alpaca')
  .eq('status', 'connected')
  .single();

const isConnected = !!connection;
```

---

## 🎓 Learning Resources

- Full Documentation: `supabase/functions/alpaca-connect/README.md`
- Deployment Guide: `supabase/ALPACA_DEPLOYMENT.md`
- Implementation Summary: `ALPACA_IMPLEMENTATION_SUMMARY.md`
- Deployment Checklist: `ALPACA_DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: January 4, 2026

**Version**: 1.0.0

**Status**: Production Ready ✅
