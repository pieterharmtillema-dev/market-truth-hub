# Alpaca Integration Deployment Guide

## Quick Start

Deploy the Alpaca broker integration to your Supabase project in 3 steps:

### 1. Run Database Migration

```bash
# Apply the migration to add Alpaca support
supabase db push
```

This will:
- Add `'alpaca'` to the `exchange_type` enum
- Add `environment` column to `exchange_connections` table

### 2. Set Environment Variables

In your Supabase dashboard (Settings → Edge Functions → Secrets), add:

```bash
EXCHANGE_ENCRYPTION_KEY=<your-base64-encoded-32-byte-key>
```

**Generate a secure key:**
```bash
openssl rand -base64 32
```

**⚠️ Important:** Use the same `EXCHANGE_ENCRYPTION_KEY` that your existing exchange functions use. Don't create a new one unless this is a fresh installation.

### 3. Deploy Edge Functions

```bash
# Deploy all three Alpaca functions
supabase functions deploy alpaca-connect
supabase functions deploy alpaca-disconnect
supabase functions deploy alpaca-sync
```

**Or deploy all at once:**
```bash
supabase functions deploy alpaca-connect alpaca-disconnect alpaca-sync
```

## Verification

### Test Connection Endpoint

```bash
# Get your Supabase project URL and anon key from dashboard
export SUPABASE_URL="https://your-project.supabase.co"
export USER_JWT="<user-jwt-token>"

# Test alpaca-connect
curl -X POST "$SUPABASE_URL/functions/v1/alpaca-connect" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "paper",
    "apiKeyId": "YOUR_ALPACA_API_KEY_ID",
    "apiSecret": "YOUR_ALPACA_API_SECRET"
  }'
```

Expected response (success):
```json
{
  "connected": true,
  "environment": "paper",
  "account": {
    "id": "...",
    "status": "ACTIVE",
    "buying_power": "100000.00",
    ...
  }
}
```

### Test Sync Endpoint

```bash
curl -X POST "$SUPABASE_URL/functions/v1/alpaca-sync" \
  -H "Authorization: Bearer $USER_JWT"
```

Expected response:
```json
{
  "success": true,
  "imported": 5,
  "skipped_duplicates": 0,
  "total_fetched": 5,
  "newest_cursor": "2024-01-04T12:00:00Z"
}
```

### Test Disconnect Endpoint

```bash
curl -X POST "$SUPABASE_URL/functions/v1/alpaca-disconnect" \
  -H "Authorization: Bearer $USER_JWT"
```

Expected response:
```json
{
  "success": true
}
```

## Database Verification

Check that the migration applied correctly:

```sql
-- Verify alpaca is in the enum
SELECT unnest(enum_range(NULL::exchange_type));

-- Check for environment column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exchange_connections'
  AND column_name = 'environment';

-- Verify unique index exists on positions
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'positions'
  AND indexname = 'idx_positions_external_id';
```

## Monitoring

### Check Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions** → Select function
2. Click **Logs** tab
3. Look for recent invocations

### Common Log Messages

**Success:**
```
✅ Validating Alpaca paper credentials for user <uuid>
✅ Alpaca credentials validated successfully. Account status: ACTIVE
✅ Successfully connected Alpaca paper for user <uuid>
```

**Errors:**
```
❌ Invalid API credentials
❌ Rate limit exceeded
❌ Account is blocked
```

### Database Queries for Monitoring

```sql
-- Count Alpaca connections
SELECT COUNT(*) FROM exchange_connections WHERE exchange = 'alpaca';

-- Check connection statuses
SELECT user_id, environment, status, last_sync_at, verified_trades_count
FROM exchange_connections
WHERE exchange = 'alpaca';

-- View imported Alpaca positions
SELECT symbol, side, quantity, entry_price, entry_timestamp
FROM positions
WHERE exchange_source = 'alpaca'
ORDER BY entry_timestamp DESC
LIMIT 10;

-- Check for errors
SELECT user_id, error_message, last_sync_at
FROM exchange_connections
WHERE exchange = 'alpaca' AND error_message IS NOT NULL;
```

## Rollback

If you need to rollback the deployment:

### 1. Remove Edge Functions

```bash
# Delete functions from Supabase
supabase functions delete alpaca-connect
supabase functions delete alpaca-disconnect
supabase functions delete alpaca-sync
```

### 2. Rollback Migration

Create a rollback migration:

```sql
-- supabase/migrations/XXXXXXXX_rollback_alpaca.sql

-- Remove environment column
ALTER TABLE public.exchange_connections DROP COLUMN IF EXISTS environment;

-- Note: Cannot remove enum value in PostgreSQL < 17
-- Instead, you can just leave it (it won't hurt) or recreate the enum:
-- ALTER TYPE exchange_type RENAME TO exchange_type_old;
-- CREATE TYPE exchange_type AS ENUM ('binance', 'bitvavo', 'coinbase', 'tradestation');
-- ALTER TABLE exchange_connections ALTER COLUMN exchange TYPE exchange_type USING exchange::text::exchange_type;
-- DROP TYPE exchange_type_old;

-- Delete Alpaca connections
DELETE FROM exchange_connections WHERE exchange = 'alpaca';

-- Delete Alpaca positions
DELETE FROM positions WHERE exchange_source = 'alpaca';
```

Then apply:
```bash
supabase db push
```

## Troubleshooting

### Issue: Migration Fails

**Error:** `enum value already exists`

**Solution:** The enum value was already added (maybe in a previous attempt). Safe to ignore.

**Error:** `column "environment" already exists`

**Solution:** Column was already added. Safe to ignore or use `ADD COLUMN IF NOT EXISTS`.

### Issue: Function Deployment Fails

**Error:** `Function already exists`

**Solution:** Redeploy with `--override` flag:
```bash
supabase functions deploy alpaca-connect --override
```

**Error:** `Invalid import map`

**Solution:** Ensure all imports use full URLs:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

### Issue: Connection Test Returns 500

**Possible Causes:**

1. **Missing encryption key:**
   - Check: `EXCHANGE_ENCRYPTION_KEY` is set in Supabase dashboard
   - Verify: Key is base64-encoded and 32+ bytes

2. **Wrong Supabase credentials:**
   - Check: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected
   - These should NOT be manually set (Supabase provides them automatically)

3. **Import errors:**
   - Check function logs for `Module not found` errors
   - Ensure `_shared/crypto.ts` and `_shared/alpaca-api.ts` are deployed

**Debug Steps:**
```bash
# View function logs in real-time
supabase functions logs alpaca-connect --follow

# Test locally (if supported)
supabase functions serve alpaca-connect
```

### Issue: Sync Returns "No connected Alpaca account"

**Solution:** User must connect first using `alpaca-connect` endpoint.

Check database:
```sql
SELECT * FROM exchange_connections
WHERE user_id = '<user-uuid>' AND exchange = 'alpaca';
```

### Issue: Credentials Invalid Error

**Possible Causes:**

1. **Wrong environment:** Paper keys won't work for live, and vice versa
2. **Revoked keys:** Check Alpaca dashboard if keys are still active
3. **IP restrictions:** Alpaca may have IP whitelist restrictions

**Solution:** Generate new API keys from Alpaca dashboard.

### Issue: Rate Limit Errors (429)

**Solution:**
- Alpaca has a 200 req/min limit
- The sync function includes automatic retry logic
- If it persists, reduce sync frequency or contact Alpaca support to increase limits

### Issue: Duplicate Trades Imported

**This should NOT happen** due to the unique index on `(user_id, exchange_source, external_id)`.

**If it does:**
```sql
-- Check for duplicates
SELECT external_id, COUNT(*)
FROM positions
WHERE exchange_source = 'alpaca'
GROUP BY external_id
HAVING COUNT(*) > 1;

-- Verify unique index exists
\d positions
```

If index is missing:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_external_id
ON public.positions(user_id, exchange_source, external_id)
WHERE external_id IS NOT NULL;
```

## Security Checklist

Before going to production:

- [ ] `EXCHANGE_ENCRYPTION_KEY` is cryptographically secure (32+ random bytes)
- [ ] Encryption key is stored in Supabase secrets (not in code)
- [ ] Edge functions have proper auth (check `verify_jwt` in config.toml)
- [ ] RLS policies are enabled on `exchange_connections` and `positions` tables
- [ ] API keys are never logged (search codebase for console.log of secrets)
- [ ] Test disconnect flow removes encrypted credentials
- [ ] Frontend validates environment selection (paper vs live)
- [ ] Users are warned about using read-only API keys

## Performance Optimization

For high-volume users:

1. **Batch Sync:**
   - Default: 500 orders per sync
   - Increase: Modify `limit` parameter in `alpaca-api.ts`

2. **Parallel Processing:**
   - Current: Sequential order processing
   - Future: Use `Promise.all()` for batch inserts

3. **Pagination:**
   - Alpaca supports `page_token` for large result sets
   - Implement if syncing thousands of orders

4. **Caching:**
   - Consider caching account info (reduces API calls)
   - Use Supabase Realtime for live updates

## Next Steps

After successful deployment:

1. **Update Frontend:**
   - Add Alpaca to exchange selection dropdown
   - Create Alpaca connection UI with environment toggle
   - Add Alpaca logo and branding
   - Show sync status and last sync time

2. **Add Scheduled Sync:**
   - Use Supabase Cron Jobs to auto-sync daily
   - Or implement webhook receiver for real-time updates

3. **Enhanced Features:**
   - Position reconstruction (match buy/sell pairs)
   - P&L calculation for open positions
   - Cost basis tracking
   - Performance metrics dashboard

4. **Testing:**
   - Create integration tests
   - Load testing with many orders
   - Error recovery testing (API failures)

## Resources

- **Full Documentation:** [supabase/functions/alpaca-connect/README.md](./alpaca-connect/README.md)
- **Alpaca API Docs:** https://alpaca.markets/docs/api-references/trading-api/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Deno Deploy:** https://docs.deno.com/deploy/

## Support

For issues:
1. Check edge function logs in Supabase dashboard
2. Review this troubleshooting guide
3. Check Alpaca API status: https://status.alpaca.markets/
4. Open issue in project repository with:
   - Error message
   - Function logs (redact secrets!)
   - Steps to reproduce
