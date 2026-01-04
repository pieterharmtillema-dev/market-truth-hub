#!/bin/bash
# Deploy Alpaca Edge Functions to Supabase
# This script deploys the alpaca-connect, alpaca-disconnect, and alpaca-sync functions

set -e  # Exit on error

echo "🚀 Deploying Alpaca Edge Functions to Supabase..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase"
    echo "Login with: supabase login"
    exit 1
fi

# Deploy the three Alpaca functions
echo "📦 Deploying alpaca-connect..."
supabase functions deploy alpaca-connect --no-verify-jwt

echo ""
echo "📦 Deploying alpaca-disconnect..."
supabase functions deploy alpaca-disconnect --no-verify-jwt

echo ""
echo "📦 Deploying alpaca-sync..."
supabase functions deploy alpaca-sync --no-verify-jwt

echo ""
echo "✅ All Alpaca functions deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Make sure you have set the EXCHANGE_ENCRYPTION_KEY secret in your Supabase dashboard:"
echo "   Settings → Edge Functions → Secrets"
echo ""
echo "   Generate a secure key with: openssl rand -base64 32"
echo ""
echo "🔗 Test the deployment:"
echo "   - Go to your app and try connecting an Alpaca account"
echo "   - Check function logs in Supabase Dashboard → Edge Functions"
echo ""
