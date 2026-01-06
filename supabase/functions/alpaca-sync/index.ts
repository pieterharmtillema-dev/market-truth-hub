/**
 * Alpaca Sync Edge Function
 *
 * Syncs filled orders and executions from Alpaca to the positions table.
 * Uses FIFO matching to pair buy/sell orders into completed trades.
 *
 * POST /alpaca-sync
 * Response: { imported: number, skipped_duplicates: number, newest_cursor: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
 * Calculate PnL for a closed position
 */
function calculatePnL(
  side: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number
): { pnl: number; pnl_pct: number } {
  let pnl = 0;
  let pnl_pct = 0;

  if (side === 'long') {
    pnl = (exitPrice - entryPrice) * quantity;
    pnl_pct = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;
  } else if (side === 'short') {
    pnl = (entryPrice - exitPrice) * quantity;
    pnl_pct = entryPrice > 0 ? ((entryPrice - exitPrice) / entryPrice) * 100 : 0;
  }

  return {
    pnl: Math.round(pnl * 100) / 100,
    pnl_pct: Math.round(pnl_pct * 100) / 100,
  };
}

/**
 * Close open positions using FIFO matching for an opposite-side order
 */
async function closeOppositePositions(
  supabase: SupabaseClient,
  userId: string,
  symbol: string,
  exitPrice: number,
  exitQuantity: number,
  exitTimestamp: string,
  closeSide: 'long' | 'short'
): Promise<{ closed: number; remaining: number; error?: string }> {
  // Fetch open positions for this symbol (FIFO order)
  const { data: openPositions, error: fetchError } = await supabase
    .from('positions')
    .select('id, side, quantity, quantity_lots, entry_price, entry_timestamp, asset_class')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('exchange_source', 'alpaca')
    .eq('side', closeSide)
    .eq('open', true)
    .order('entry_timestamp', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch open positions:', fetchError);
    return { closed: 0, remaining: exitQuantity, error: fetchError.message };
  }

  if (!openPositions || openPositions.length === 0) {
    return { closed: 0, remaining: exitQuantity, error: 'no_open_positions' };
  }

  let remainingQuantity = exitQuantity;
  let closedCount = 0;

  for (const position of openPositions) {
    if (remainingQuantity <= 0) break;

    const positionQty = Number(position.quantity);
    if (positionQty <= 0) continue;

    if (remainingQuantity >= positionQty) {
      // Full close
      const { pnl, pnl_pct } = calculatePnL(position.side, position.entry_price, exitPrice, positionQty);

      const { error: updateError } = await supabase
        .from('positions')
        .update({
          exit_price: exitPrice,
          exit_timestamp: exitTimestamp,
          pnl,
          pnl_pct,
          open: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`Failed to close position ${position.id}:`, updateError);
        continue;
      }

      remainingQuantity -= positionQty;
      closedCount++;
    } else {
      // Partial close - split the position
      const closedQty = remainingQuantity;
      const remainingQty = positionQty - closedQty;
      const { pnl, pnl_pct } = calculatePnL(position.side, position.entry_price, exitPrice, closedQty);

      // Calculate proportional lots if quantity_lots exists
      const positionLots = Number(position.quantity_lots) || positionQty;
      const closedLots = Number(((closedQty / positionQty) * positionLots).toFixed(8));
      const remainingLots = Number((positionLots - closedLots).toFixed(8));

      // Update original position with remaining quantity
      const { error: updateError } = await supabase
        .from('positions')
        .update({
          quantity: remainingQty,
          quantity_lots: remainingLots,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`Failed to update position ${position.id}:`, updateError);
        continue;
      }

      // Create closed portion as new record (required for FIFO tracking)
      const { error: insertError } = await supabase
        .from('positions')
        .insert({
          user_id: userId,
          symbol: symbol,
          side: position.side,
          quantity: closedQty,
          quantity_lots: closedLots,
          entry_price: position.entry_price,
          entry_timestamp: position.entry_timestamp,
          exit_price: exitPrice,
          exit_timestamp: exitTimestamp,
          pnl,
          pnl_pct,
          open: false,
          is_exchange_verified: true,
          is_simulation: false,
          exchange_source: 'alpaca',
          trade_source: 'api',
          platform: 'Alpaca',
          asset_class: position.asset_class,
        });

      if (insertError) {
        console.error('Failed to create closed position:', insertError);
      } else {
        closedCount++;
      }

      remainingQuantity = 0;
    }
  }

  return { closed: closedCount, remaining: remainingQuantity };
}

/**
 * Normalize Alpaca order to positions table format
 * Opposite-side closes are handled before inserting open positions
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

  // Determine entry side based on order side
  const side = order.side === 'buy' ? 'long' : 'short';

  // Use filled_at timestamp, fallback to updated_at
  const timestamp = order.filled_at || order.updated_at;

  return {
    user_id: userId,
    symbol,
    side,
    quantity,
    quantity_lots: quantity,
    entry_price: avgPrice,
    entry_timestamp: timestamp,
    open: true,
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

    // Sort orders by filled_at timestamp (earliest first) to ensure buy orders are processed before sells
    const sortedOrders = orders.sort((a, b) => {
      const aTime = new Date(a.filled_at || a.updated_at).getTime();
      const bTime = new Date(b.filled_at || b.updated_at).getTime();
      return aTime - bTime;
    });

    console.log(`Processing ${sortedOrders.length} orders in chronological order`);

    // Process and insert orders
    let imported = 0;
    let skippedDuplicates = 0;
    let closedPositions = 0;

    for (const order of sortedOrders) {
      const position = normalizeAlpacaOrderToPosition(order, user.id);

      if (!position) {
        continue; // Skip invalid orders
      }

      const symbol = position.symbol;
      const quantity = position.quantity;
      const price = position.entry_price;
      const timestamp = position.entry_timestamp;
      const entrySide = position.side as 'long' | 'short';
      const closeSide = entrySide === 'long' ? 'short' : 'long';

      console.log(`Processing ${order.side.toUpperCase()} order ${order.id} for ${symbol}: ${quantity} @ ${price} at ${timestamp}`);

      const { closed, remaining, error: closeError } = await closeOppositePositions(
        supabase,
        user.id,
        symbol,
        price,
        quantity,
        timestamp,
        closeSide
      );

      if (closeError && closeError !== 'no_open_positions') {
        console.error(`Failed to close positions for order ${order.id}: ${closeError}`);
        continue;
      }

      if (closeError === 'no_open_positions' && entrySide === 'short') {
        console.warn(`SELL order ${order.id} for ${symbol} has no matching long - opening short position`);
      }

      if (closed > 0) {
        closedPositions += closed;
        console.log(`✓ Closed ${closed} position(s) for ${symbol} via FIFO matching`);
      }

      if (remaining <= 0) {
        continue;
      }

      const baseLots = Number(position.quantity_lots) || position.quantity;
      const remainingLots =
        position.quantity > 0
          ? Number(((remaining / position.quantity) * baseLots).toFixed(8))
          : remaining;
      const positionToInsert = {
        ...position,
        quantity: remaining,
        quantity_lots: remainingLots,
      };

      // Check for duplicates and insert
      const { data: existing, error: existingError } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', user.id)
        .eq('exchange_source', 'alpaca')
        .eq('symbol', positionToInsert.symbol)
        .eq('side', positionToInsert.side)
        .eq('entry_price', positionToInsert.entry_price)
        .eq('entry_timestamp', positionToInsert.entry_timestamp)
        .eq('quantity', positionToInsert.quantity)
        .eq('open', true)
        .limit(1);

      if (existingError) {
        console.warn(`Dedup check failed for order ${order.id}:`, existingError);
      }

      if (existing && existing.length > 0) {
        skippedDuplicates++;
        continue;
      }

      const { error: insertError } = await supabase.from('positions').insert(positionToInsert);

      if (insertError) {
        console.error(`Failed to insert order ${order.id}:`, insertError);
      } else {
        imported++;
        console.log(`✓ Imported order ${order.id} for ${symbol}: ${remaining} @ ${price} at ${timestamp}`);
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
      `Sync complete: ${imported} entries imported, ${closedPositions} positions closed, ${skippedDuplicates} duplicates skipped`
    );

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        closed: closedPositions,
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
