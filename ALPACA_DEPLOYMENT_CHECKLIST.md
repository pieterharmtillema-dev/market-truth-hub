# Alpaca Integration - Deployment Checklist

Use this checklist to ensure successful deployment of the Alpaca broker integration.

## Pre-Deployment

- [ ] Read `ALPACA_IMPLEMENTATION_SUMMARY.md` for overview
- [ ] Review `supabase/ALPACA_DEPLOYMENT.md` for detailed steps
- [ ] Ensure you have Supabase CLI installed and authenticated
- [ ] Verify database is accessible (can run migrations)
- [ ] Check that existing `EXCHANGE_ENCRYPTION_KEY` is set (or generate new one)

## Database Migration

- [ ] Review migration file: `supabase/migrations/20260104000001_add_alpaca_support.sql`
- [ ] Run migration: `supabase db push`
- [ ] Verify migration succeeded (no errors)
- [ ] Check `alpaca` is in exchange_type enum:
  ```sql
  SELECT unnest(enum_range(NULL::exchange_type));
  ```
- [ ] Verify `environment` column exists:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'exchange_connections' AND column_name = 'environment';
  ```

## Environment Variables

- [ ] Open Supabase Dashboard → Settings → Edge Functions → Secrets
- [ ] Verify `EXCHANGE_ENCRYPTION_KEY` exists (or add it):
  ```bash
  # Generate if needed:
  openssl rand -base64 32
  ```
- [ ] If creating new key, save it securely (password manager)
- [ ] Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected

## Edge Functions Deployment

- [ ] Review edge function code for any issues
- [ ] Deploy alpaca-connect:
  ```bash
  supabase functions deploy alpaca-connect
  ```
- [ ] Deploy alpaca-disconnect:
  ```bash
  supabase functions deploy alpaca-disconnect
  ```
- [ ] Deploy alpaca-sync:
  ```bash
  supabase functions deploy alpaca-sync
  ```
- [ ] Verify all three functions appear in Supabase Dashboard → Edge Functions
- [ ] Check function logs for any startup errors

## Configuration

- [ ] Verify `supabase/config.toml` includes Alpaca functions
- [ ] Check `verify_jwt = false` is set (matches existing pattern)
- [ ] If using different auth, update accordingly

## Testing (Paper Account)

- [ ] Sign up for free Alpaca paper trading account: https://alpaca.markets/
- [ ] Generate paper trading API keys (View Only permissions)
- [ ] Save API Key ID and Secret securely
- [ ] Test alpaca-connect endpoint:
  ```bash
  curl -X POST "$SUPABASE_URL/functions/v1/alpaca-connect" \
    -H "Authorization: Bearer $USER_JWT" \
    -H "Content-Type: application/json" \
    -d '{
      "environment": "paper",
      "apiKeyId": "YOUR_KEY_ID",
      "apiSecret": "YOUR_SECRET"
    }'
  ```
- [ ] Verify response shows `"connected": true`
- [ ] Check database for connection:
  ```sql
  SELECT * FROM exchange_connections WHERE exchange = 'alpaca';
  ```
- [ ] Verify credentials are encrypted (not plaintext!)

## Sync Testing

- [ ] Place a test trade in Alpaca paper dashboard (e.g., buy 1 share of AAPL)
- [ ] Wait for order to fill (usually instant for market orders)
- [ ] Run sync:
  ```bash
  curl -X POST "$SUPABASE_URL/functions/v1/alpaca-sync" \
    -H "Authorization: Bearer $USER_JWT"
  ```
- [ ] Verify response shows `"imported": 1` or more
- [ ] Check database for imported position:
  ```sql
  SELECT * FROM positions WHERE exchange_source = 'alpaca';
  ```
- [ ] Verify `external_id` is populated (Alpaca order ID)
- [ ] Run sync again - should show `"skipped_duplicates": 1` (no new imports)

## Disconnect Testing

- [ ] Test disconnect endpoint:
  ```bash
  curl -X POST "$SUPABASE_URL/functions/v1/alpaca-disconnect" \
    -H "Authorization: Bearer $USER_JWT"
  ```
- [ ] Verify response shows `"success": true`
- [ ] Check connection is removed:
  ```sql
  SELECT * FROM exchange_connections WHERE exchange = 'alpaca';
  ```
- [ ] Verify positions remain (not deleted):
  ```sql
  SELECT COUNT(*) FROM positions WHERE exchange_source = 'alpaca';
  ```

## Frontend Integration

- [ ] Review `supabase/functions/alpaca-connect/FRONTEND_INTEGRATION.tsx`
- [ ] Add Alpaca logo to assets (e.g., `src/assets/alpaca-logo.svg`)
- [ ] Implement connection modal (or use example component)
- [ ] Add environment toggle (paper/live)
- [ ] Add API Key ID and Secret input fields
- [ ] Implement sync button
- [ ] Add disconnect button
- [ ] Test connection flow end-to-end from UI
- [ ] Test sync from UI
- [ ] Test disconnect from UI
- [ ] Add loading states and error handling
- [ ] Style to match app design

## Security Verification

- [ ] Verify credentials are encrypted in database (run query, check it's not plaintext)
- [ ] Check edge function logs - no secrets logged
- [ ] Verify RLS policies work (user can only see their connections)
- [ ] Test with different user accounts (isolation)
- [ ] Ensure frontend doesn't expose secrets in DevTools
- [ ] Verify HTTPS is used (not HTTP)

## Monitoring Setup

- [ ] Set up log monitoring for Alpaca functions
- [ ] Create dashboard query for connection status:
  ```sql
  SELECT
    COUNT(*) as total_connections,
    SUM(verified_trades_count) as total_trades,
    MAX(last_sync_at) as latest_sync
  FROM exchange_connections
  WHERE exchange = 'alpaca';
  ```
- [ ] Set up alerts for errors (if available)
- [ ] Monitor rate limit issues (429 responses)
- [ ] Track sync success rate

## Documentation

- [ ] Update main app documentation to mention Alpaca support
- [ ] Create user guide for connecting Alpaca
- [ ] Add FAQ for common issues
- [ ] Document paper vs live environment
- [ ] Include screenshots of connection flow

## Production Launch

- [ ] Announce Alpaca support to users (email, in-app notification)
- [ ] Monitor for first day of real usage
- [ ] Check error rates and respond quickly
- [ ] Gather user feedback
- [ ] Plan improvements based on feedback

## Post-Launch

- [ ] Monitor daily active connections
- [ ] Track sync frequency and success rate
- [ ] Collect user feedback on UX
- [ ] Plan future enhancements (see ALPACA_IMPLEMENTATION_SUMMARY.md)
- [ ] Consider adding:
  - [ ] Automatic daily sync schedule
  - [ ] Real-time updates via webhooks
  - [ ] Position reconstruction (match buy/sell)
  - [ ] Enhanced P&L calculation
  - [ ] Tax reporting features

## Rollback Plan (If Needed)

If critical issues arise:

- [ ] Stop accepting new connections (disable UI)
- [ ] Investigate issue in edge function logs
- [ ] Fix and redeploy if possible
- [ ] If not fixable quickly:
  - [ ] Delete edge functions: `supabase functions delete alpaca-connect alpaca-disconnect alpaca-sync`
  - [ ] Create rollback migration (see ALPACA_DEPLOYMENT.md)
  - [ ] Notify affected users
  - [ ] Fix issues offline
  - [ ] Redeploy when ready

## Success Metrics

Track these metrics after launch:

- [ ] Number of Alpaca connections (target: ___)
- [ ] Sync success rate (target: >95%)
- [ ] Average trades imported per user (track over time)
- [ ] Error rate (target: <5%)
- [ ] User satisfaction (collect feedback)

---

## Quick Commands Reference

```bash
# Deploy all functions at once
supabase functions deploy alpaca-connect alpaca-disconnect alpaca-sync

# View logs in real-time
supabase functions logs alpaca-connect --follow
supabase functions logs alpaca-sync --follow

# Check database
supabase db pull  # Download current schema
supabase db push  # Apply migrations

# Rollback (delete functions)
supabase functions delete alpaca-connect
supabase functions delete alpaca-disconnect
supabase functions delete alpaca-sync
```

---

## Completion

Once all items are checked:

- [ ] Mark implementation as **DEPLOYED** in project tracker
- [ ] Archive deployment notes
- [ ] Schedule follow-up review in 1 week
- [ ] Plan next iteration improvements

**Date Deployed**: ___________________

**Deployed By**: ___________________

**Status**: [ ] Testing [ ] Staged [ ] Production

---

🎉 **Congratulations on deploying Alpaca integration!** 🎉
