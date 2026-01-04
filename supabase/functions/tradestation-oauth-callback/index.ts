/**
 * TradeStation OAuth Callback Edge Function
 *
 * Handles the OAuth 2.0 callback by validating the state parameter,
 * exchanging the authorization code for tokens, encrypting and storing them.
 *
 * Endpoint: POST /tradestation-oauth-callback
 * Auth: Required (Supabase JWT)
 * Body: { code: string, state: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encryptToken } from '../_shared/crypto.ts';
import { exchangeCodeForTokens } from '../_shared/tradestation-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { code, state } = await req.json();

    // Validate input
    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate code format (basic check)
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization code format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate state format (43 characters for base64url-encoded 32 bytes)
    if (!/^[A-Za-z0-9_-]{43}$/.test(state)) {
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate state parameter against stored value
    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from('oauth_state')
      .select('*')
      .eq('state', state)
      .eq('user_id', user.id)
      .single();

    if (stateError || !stateRecord) {
      console.error('Invalid state parameter:', stateError);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired state parameter. Please try again.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if state has expired
    if (new Date() > new Date(stateRecord.expires_at)) {
      // Delete expired state
      await supabaseAdmin
        .from('oauth_state')
        .delete()
        .eq('id', stateRecord.id);

      return new Response(
        JSON.stringify({
          error: 'State parameter expired. Please try again.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete state (single-use)
    await supabaseAdmin.from('oauth_state').delete().eq('id', stateRecord.id);

    // Get OAuth credentials from environment
    const clientId = Deno.env.get('TRADESTATION_CLIENT_ID');
    const clientSecret = Deno.env.get('TRADESTATION_CLIENT_SECRET');
    const redirectUri = Deno.env.get('TRADESTATION_REDIRECT_URI');
    const encryptionKey = Deno.env.get('OAUTH_TOKEN_ENCRYPTION_KEY');

    if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
      console.error('Missing TradeStation OAuth configuration');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error. Please contact support.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Exchange authorization code for tokens
    console.log(`Exchanging code for tokens for user ${user.id}`);
    const tokens = await exchangeCodeForTokens(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Encrypt tokens
    const accessTokenEncrypted = await encryptToken(
      tokens.access_token,
      encryptionKey
    );
    const refreshTokenEncrypted = await encryptToken(
      tokens.refresh_token,
      encryptionKey
    );

    // Calculate token expiration time
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Upsert connection into database
    const { data: connection, error: upsertError } = await supabaseAdmin
      .from('exchange_connections')
      .upsert(
        {
          user_id: user.id,
          exchange: 'tradestation',
          auth_type: 'oauth2',
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: tokenExpiresAt,
          status: 'connected',
          error_message: null,
          last_sync_at: null,
          verified_trades_count: 0,
        },
        {
          onConflict: 'user_id,exchange',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to save connection:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection to database' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`TradeStation connected successfully for user ${user.id}`);

    // Return success with connection details (without tokens)
    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id,
          exchange: connection.exchange,
          status: connection.status,
          last_sync_at: connection.last_sync_at,
          verified_trades_count: connection.verified_trades_count,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in tradestation-oauth-callback:', error);

    // Check if error is from token exchange
    if (
      error instanceof Error &&
      error.message.includes('Token exchange failed')
    ) {
      return new Response(
        JSON.stringify({
          error: 'TradeStation authorization failed',
          details: error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
