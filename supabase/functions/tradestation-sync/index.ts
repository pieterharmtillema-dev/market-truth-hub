/**
 * TradeStation Trade Sync Edge Function
 *
 * Syncs trade executions from TradeStation brokerage accounts.
 * Handles token refresh, fetches executions, normalizes data, and stores in positions table.
 *
 * Endpoint: POST /tradestation-sync
 * Auth: Required (Supabase JWT)
 * Body: { connectionId?: string } (optional: sync specific connection)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { decryptToken, encryptToken } from '../_shared/crypto.ts';
import {
  getAccounts,
  getExecutions,
  refreshAccessToken,
  determineAssetClass,
  normalizeSide,
  type TradestationExecution,
} from '../_shared/tradestation-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExchangeConnection {
  id: string;
  user_id: string;
  exchange: string;
  auth_type: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  status: string;
  last_sync_cursor: string | null;
  verified_trades_count: number;
}

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
    const body = await req.json().catch(() => ({}));
    const { connectionId } = body;

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch TradeStation connections
    let query = supabaseAdmin
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'tradestation')
      .eq('auth_type', 'oauth2');

    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    const { data: connections, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch connections:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No TradeStation connection found. Please connect your account first.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    let totalSynced = 0;

    // Process each connection
    for (const connection of connections as ExchangeConnection[]) {
      try {
        console.log(`Syncing TradeStation connection ${connection.id} for user ${user.id}`);

        // Ensure token is valid (refresh if needed)
        const accessToken = await ensureValidToken(connection, supabaseAdmin);

        // Fetch accounts
        const accounts = await getAccounts(accessToken);
        console.log(`Found ${accounts.length} TradeStation accounts`);

        let connectionSynced = 0;

        // Sync executions for each account
        for (const account of accounts) {
          console.log(`Fetching executions for account ${account.AccountID}`);

          const executions = await getExecutions(
            accessToken,
            account.AccountID,
            connection.last_sync_cursor || undefined
          );

          console.log(`Fetched ${executions.Executions.length} executions`);

          // Normalize and insert executions
          for (const execution of executions.Executions) {
            try {
              await insertExecution(execution, user.id, supabaseAdmin);
              connectionSynced++;
            } catch (error) {
              console.error(
                `Failed to insert execution ${execution.ExecutionID}:`,
                error
              );
              // Continue with other executions
            }
          }

          // Update last_sync_cursor with latest execution timestamp
          if (executions.Executions.length > 0) {
            const latestTimestamp = executions.Executions.reduce(
              (latest, exec) => {
                return new Date(exec.TradeDate) > new Date(latest)
                  ? exec.TradeDate
                  : latest;
              },
              executions.Executions[0].TradeDate
            );

            await supabaseAdmin
              .from('exchange_connections')
              .update({
                last_sync_cursor: latestTimestamp,
                last_sync_at: new Date().toISOString(),
                verified_trades_count:
                  connection.verified_trades_count + connectionSynced,
              })
              .eq('id', connection.id);
          }
        }

        totalSynced += connectionSynced;
        results.push({
          connection_id: connection.id,
          synced: connectionSynced,
          success: true,
        });
      } catch (error) {
        console.error(`Error syncing connection ${connection.id}:`, error);

        // Check if token was revoked
        if (
          error instanceof Error &&
          error.message === 'REFRESH_TOKEN_REVOKED'
        ) {
          await supabaseAdmin
            .from('exchange_connections')
            .update({
              status: 'revoked',
              error_message: 'Token revoked. Please reconnect your account.',
            })
            .eq('id', connection.id);
        }

        results.push({
          connection_id: connection.id,
          synced: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in tradestation-sync:', error);
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

/**
 * Ensures the access token is valid, refreshing if needed
 */
async function ensureValidToken(
  connection: ExchangeConnection,
  supabaseAdmin: any
): Promise<string> {
  const encryptionKey = Deno.env.get('OAUTH_TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('Missing OAUTH_TOKEN_ENCRYPTION_KEY');
  }

  const expiresAt = new Date(connection.token_expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  // Token still valid
  if (expiresAt > fiveMinutesFromNow) {
    return await decryptToken(connection.access_token_encrypted, encryptionKey);
  }

  // Token expiring soon, refresh
  console.log(`Token expiring soon for connection ${connection.id}, refreshing...`);

  const clientId = Deno.env.get('TRADESTATION_CLIENT_ID');
  const clientSecret = Deno.env.get('TRADESTATION_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing TradeStation OAuth credentials');
  }

  const refreshToken = await decryptToken(
    connection.refresh_token_encrypted,
    encryptionKey
  );

  const tokens = await refreshAccessToken(refreshToken, clientId, clientSecret);

  // Encrypt new tokens
  const newAccessTokenEncrypted = await encryptToken(
    tokens.access_token,
    encryptionKey
  );
  const newRefreshTokenEncrypted = await encryptToken(
    tokens.refresh_token || refreshToken, // TradeStation may not return new refresh token
    encryptionKey
  );

  const newExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  // Update database
  await supabaseAdmin
    .from('exchange_connections')
    .update({
      access_token_encrypted: newAccessTokenEncrypted,
      refresh_token_encrypted: newRefreshTokenEncrypted,
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id);

  console.log(`Token refreshed successfully for connection ${connection.id}`);

  return tokens.access_token;
}

/**
 * Normalizes and inserts a TradeStation execution into the positions table
 */
async function insertExecution(
  execution: TradestationExecution,
  userId: string,
  supabaseAdmin: any
): Promise<void> {
  const side = normalizeSide(execution.ExecutionType);
  const assetClass = determineAssetClass(execution.Symbol);

  const position = {
    user_id: userId,
    symbol: execution.Symbol,
    side,
    quantity: execution.Quantity,
    entry_price: execution.Price,
    entry_timestamp: execution.TradeDate,
    exit_price: null, // Will be matched later with FIFO logic
    exit_timestamp: null,
    pnl: 0,
    pnl_pct: 0,
    open: true, // Mark as open until matched with opposite side
    is_exchange_verified: true,
    exchange_source: 'tradestation',
    trade_source: 'api',
    fees_total: execution.CommissionFee,
    platform: 'TradeStation',
    asset_class: assetClass,
    external_id: execution.ExecutionID, // For deduplication
  };

  // Insert with conflict handling (skip if external_id already exists)
  const { error } = await supabaseAdmin
    .from('positions')
    .insert(position)
    .select()
    .single();

  // Ignore conflict errors (duplicate external_id)
  if (error && !error.message.includes('duplicate key')) {
    throw error;
  }
}
