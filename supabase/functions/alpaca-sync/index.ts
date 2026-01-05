/**
 * Alpaca Sync Edge Function
 *
 * Syncs filled orders and executions from Alpaca to the positions table.
 * Uses external_id (order ID) for deduplication and incremental sync cursor.
 *
 * POST /alpaca-sync
 * Response: { imported: number, skipped_duplicates: number, newest_cursor: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/crypto.ts';
import {
  getFilledOrdersWithExecutions,
  type AlpacaEnvironment,
  type AlpacaOrder,
} from '../_shared/alpaca-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Normalize Alpaca order to positions table format
 * Each filled order becomes one position record
 */
function normalizeAlpacaOrderToPosition(
  order: AlpacaOrder,
  userId: string
): any {
  const now = new Date().toISOString();

  // Parse quantities and prices
  const quantity = parseFloat(order.filled_qty || '0');
  const avgPrice = parseFloat(order.filled_avg_price || '0');

  if (quantity === 0 || avgPrice === 0) {
    console.warn(`Skipping order ${order.id} - invalid quantity or price`);
    return null;
  }

  // Determine asset class from Alpaca's asset_class field
  let assetClass = 'stock'; // default
  if (order.asset_class === 'crypto') {
    assetClass = 'crypto';
  } else if (order.asset_class === 'us_equity') {
    assetClass = 'stock';
  } else if (order.asset_class === 'us_option') {
    assetClass = 'option';
  }

  // Format symbol (Alpaca uses just ticker like "AAPL", we'll keep it as is)
  // For crypto, Alpaca uses symbols like "BTCUSD" - we'll format as "BTC/USD"
  let symbol = order.symbol;
  if (assetClass === 'crypto' && symbol.length > 3) {
    // Try to split crypto pairs (e.g., BTCUSD -> BTC/USD)
    const commonQuotes = ['USD', 'USDT', 'USDC'];
    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        symbol = `${base}/${quote}`;
        break;
      }
    }
  }

  // Determine side (Alpaca uses 'buy' or 'sell')
  // For journal purposes: buy = long entry, sell = short entry or long exit
  // We'll map: buy -> long, sell -> short (simplified)
  const side = order.side === 'buy' ? 'long' : 'short';

  // Use filled_at timestamp, fallback to updated_at
  const timestamp = order.filled_at || order.updated_at;

  return {
    user_id: userId,
    symbol,
    side,
    quantity,
    entry_price: avgPrice,
    entry_timestamp: timestamp,
    exit_price: avgPrice, // For immediate fills, entry = exit
    exit_timestamp: timestamp,
    pnl: 0, // Will be calculated later when matching buy/sell pairs
    pnl_pct: 0,
    open: false, // Treat each order as closed initially
    is_exchange_verified: true,
    is_simulation: false,
    exchange_source: 'alpaca',
    trade_source: 'api',
    fees_total: 0, // Alpaca doesn't charge commissions for stocks, minimal for crypto
    platform: 'Alpaca',
    asset_class: assetClass,
    created_at: now,
    updated_at: now,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('EXCHANGE_ENCRYPTION_KEY')!;

    if (!encryptionKey) {
      console.error('EXCHANGE_ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Authenticate user
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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting Alpaca sync for user ${user.id}`);

    // Get user's Alpaca connection
    const { data: connection, error: connError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'alpaca')
      .eq('status', 'connected')
      .single();

    if (connError || !connection) {
      console.log(`No connected Alpaca account found for user ${user.id}`);
      return new Response(
        JSON.stringify({
          error: 'No connected Alpaca account found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decrypt credentials
    const apiKeyId = await decryptToken(
      connection.api_key_encrypted,
      encryptionKey
    );
    const apiSecret = await decryptToken(
      connection.api_secret_encrypted,
      encryptionKey
    );
    const environment = (connection.label ?? connection.environment) as AlpacaEnvironment;

    if (!environment) {
      console.error('No environment specified in connection');
      return new Response(
        JSON.stringify({
          error: 'Connection missing environment configuration',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get last sync cursor (ISO timestamp)
    const lastSyncCursor = connection.last_sync_cursor;

    console.log(
      `Fetching filled orders from Alpaca ${environment} (after: ${lastSyncCursor || 'beginning'})`
    );

    // Fetch filled orders and activities
    const { orders, error: fetchError, newCursor } =
      await getFilledOrdersWithExecutions(
        {
          apiKeyId,
          apiSecret,
          environment,
        },
        lastSyncCursor || undefined
      );

    if (fetchError) {
      console.error(`Alpaca API error: ${fetchError}`);

      // Update connection with error
      await supabase
        .from('exchange_connections')
        .update({
          error_message: fetchError,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      return new Response(
        JSON.stringify({
          error: `Failed to fetch data from Alpaca: ${fetchError}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Fetched ${orders.length} filled orders from Alpaca`);

    // Process and insert orders
    let imported = 0;
    let skippedDuplicates = 0;

    for (const order of orders) {
      const position = normalizeAlpacaOrderToPosition(order, user.id);

      if (!position) {
        continue; // Skip invalid orders
      }

      // Deduplicate (positions table has no external_id column)
      const { data: existing, error: existingError } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', user.id)
        .eq('exchange_source', 'alpaca')
        .eq('symbol', position.symbol)
        .eq('side', position.side)
        .eq('entry_price', position.entry_price)
        .eq('exit_price', position.exit_price)
        .eq('entry_timestamp', position.entry_timestamp)
        .eq('quantity', position.quantity)
        .limit(1);

      if (existingError) {
        console.warn(`Dedup check failed for order ${order.id}:`, existingError);
      }

      if (existing && existing.length > 0) {
        skippedDuplicates++;
        continue;
      }

      const { error: insertError } = await supabase.from('positions').insert(position);

      if (insertError) {
        console.error(`Failed to insert order ${order.id}:`, insertError);
      } else {
        imported++;
      }
    }

    // Update connection with sync status
    const updateData: any = {
      last_sync_at: new Date().toISOString(),
      verified_trades_count: (connection.verified_trades_count || 0) + imported,
      error_message: null,
    };

    if (newCursor) {
      updateData.last_sync_cursor = newCursor;
    }

    await supabase
      .from('exchange_connections')
      .update(updateData)
      .eq('id', connection.id);

    console.log(
      `Sync complete: ${imported} imported, ${skippedDuplicates} duplicates skipped`
    );

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped_duplicates: skippedDuplicates,
        total_fetched: orders.length,
        newest_cursor: newCursor || lastSyncCursor,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Alpaca sync error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
