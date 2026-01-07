/**
 * Alpaca Connect Edge Function
 *
 * Handles connecting user's Alpaca trading account via API keys.
 * Validates credentials, encrypts them with AES-256-GCM, and stores in database.
 *
 * POST /alpaca-connect
 * Request body: { environment: 'paper' | 'live', apiKeyId: string, apiSecret: string }
 * Response: { connected: true, environment: string, account: {...} }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptToken } from '../_shared/crypto.ts';
import { getAccount, type AlpacaEnvironment } from '../_shared/alpaca-api.ts';
import { getCorsHeaders, handleCorsPreflightRequest, jsonResponse, errorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('EXCHANGE_ENCRYPTION_KEY')!;

    if (!encryptionKey) {
      console.error('EXCHANGE_ENCRYPTION_KEY not configured');
      return errorResponse(req, 'Server configuration error', 500);
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(req, 'Missing authorization header', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return errorResponse(req, 'Invalid authentication', 401);
    }

    // Parse request body
    const body = await req.json();
    const { environment, apiKeyId, apiSecret } = body;

    // Validate inputs (never log secrets!)
    if (!environment || !apiKeyId || !apiSecret) {
      return errorResponse(req, 'Missing required fields: environment, apiKeyId, apiSecret', 400);
    }

    // Validate environment
    if (environment !== 'paper' && environment !== 'live') {
      return errorResponse(req, 'Invalid environment. Must be "paper" or "live".', 400);
    }

    // Validate API key format (basic check)
    if (apiKeyId.length < 10 || apiSecret.length < 10) {
      return errorResponse(req, 'Invalid API key format. Keys appear too short.', 400);
    }

    console.log(
      `Validating Alpaca ${environment} credentials for user ${user.id}`
    );

    // Verify credentials with Alpaca API
    const { account, error: validationError } = await getAccount({
      apiKeyId,
      apiSecret,
      environment: environment as AlpacaEnvironment,
    });

    if (validationError || !account) {
      console.log(`Alpaca validation failed: ${validationError}`);
      return errorResponse(req, validationError || 'Failed to validate Alpaca credentials', 400);
    }

    console.log(
      `Alpaca credentials validated successfully. Account status: ${account.status}`
    );

    // Encrypt credentials using AES-256-GCM (not legacy XOR!)
    const encryptedApiKeyId = await encryptToken(apiKeyId, encryptionKey);
    const encryptedApiSecret = await encryptToken(apiSecret, encryptionKey);

    // Store in database (upsert to handle reconnection)
    const { data, error: dbError } = await supabase
      .from('exchange_connections')
      .upsert(
        {
          user_id: user.id,
          exchange: 'alpaca',
          api_key_encrypted: encryptedApiKeyId,
          api_secret_encrypted: encryptedApiSecret,
          label: environment, // 'paper' or 'live'
          status: 'connected',
          last_sync_at: new Date().toISOString(),
          error_message: null,
        },
        {
          onConflict: 'user_id,exchange',
        }
      )
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return errorResponse(req, 'Failed to save connection', 500);
    }

    console.log(`Successfully connected Alpaca ${environment} for user ${user.id}`);

    // Return success (never include secrets in response!)
    return jsonResponse(req, {
      connected: true,
      environment,
      account: {
        id: account.id,
        account_number: account.account_number,
        status: account.status,
        currency: account.currency,
        buying_power: account.buying_power,
        portfolio_value: account.portfolio_value,
        pattern_day_trader: account.pattern_day_trader,
      },
      connection: {
        id: data.id,
        exchange: data.exchange,
        status: data.status,
        last_sync_at: data.last_sync_at,
      },
    });
  } catch (error) {
    console.error('Alpaca connect error:', error);
    return errorResponse(
      req,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
