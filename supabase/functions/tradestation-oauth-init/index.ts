/**
 * TradeStation OAuth Init Edge Function
 *
 * Initializes the OAuth 2.0 authorization flow by generating a secure state parameter
 * and returning the authorization URL for user redirect.
 *
 * Endpoint: POST /tradestation-oauth-init
 * Auth: Required (Supabase JWT)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { generateOAuthState } from '../_shared/crypto.ts';
import { buildAuthorizationUrl } from '../_shared/tradestation-api.ts';

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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const clientId = Deno.env.get('TRADESTATION_CLIENT_ID');
    const redirectUri = Deno.env.get('TRADESTATION_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      console.error('Missing TradeStation OAuth configuration');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error. Please contact support.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure state parameter
    const state = generateOAuthState();

    // Create Supabase client with service role for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Clean up expired states first
    await supabaseAdmin.rpc('cleanup_expired_oauth_states');

    // Store state in database with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const { error: insertError } = await supabaseAdmin
      .from('oauth_state')
      .insert({
        state,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OAuth state:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize OAuth flow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(clientId, redirectUri, state);

    console.log(`OAuth flow initialized for user ${user.id}`);

    return new Response(
      JSON.stringify({
        authUrl,
        state, // Return state for client-side storage (double verification)
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in tradestation-oauth-init:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
