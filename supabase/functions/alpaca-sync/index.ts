/**
 * Alpaca Sync Edge Function
 *
 * Syncs filled orders and executions from Alpaca to the positions table.
 * Uses FIFO matching to pair buy/sell orders into completed trades.
 *
 * IMPORTANT: This is now a FALLBACK mechanism. Real-time updates should
 * come via alpaca-webhook. This function catches any missed orders.
 *
 * IMPORTANT: Alpaca is NOT long-only!
 * - BUY order: closes SHORT positions (FIFO), then opens LONG for remainder
 * - SELL order: closes LONG positions (FIFO), then opens SHORT for remainder
 *
 * POST /alpaca-sync
 * Response: { imported: number, skipped_duplicates: number, newest_cursor: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/crypto.ts';
import {
  getFilledOrdersWithExecutions,
  extractBracketData,
  type AlpacaEnvironment,
} from '../_shared/alpaca-api.ts';
import {
  closeOppositePositions,
  detectExitReason,
  normalizeAlpacaSymbol,
} from '../_shared/position-closing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

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

    console.log(`========================================`);
    console.log(`Starting Alpaca sync (FALLBACK) for user ${user.id}`);
    console.log(`========================================`);

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
    const isPaperTrading = environment === 'paper';

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

    console.log(`Environment: ${environment} (isPaperTrading: ${isPaperTrading})`);

    // Get last sync cursor (ISO timestamp)
    const lastSyncCursor = connection.last_sync_cursor;

    // Add a 30-second lookback window to catch orders that filled just before the last cursor
    // This helps catch exit orders that might have filled shortly after entry orders
    let adjustedCursor = lastSyncCursor;
    if (lastSyncCursor) {
      const cursorDate = new Date(lastSyncCursor);
      cursorDate.setSeconds(cursorDate.getSeconds() - 30);
      adjustedCursor = cursorDate.toISOString();
    }

    console.log(
      `Fetching filled orders from Alpaca ${environment} (after: ${lastSyncCursor || 'beginning'}, lookback: 30s)`
    );

    // Fetch filled orders and activities
    const { orders, allOrders, error: fetchError, newCursor } =
      await getFilledOrdersWithExecutions(
        {
          apiKeyId,
          apiSecret,
          environment,
        },
        adjustedCursor || undefined
      );

    console.log(`DEBUG: orders length = ${orders.length}, allOrders length = ${allOrders.length}`);
    console.log(`DEBUG: First few orders:`, orders.slice(0, 3).map(o => ({ 
      id: o.id, 
      side: o.side, 
      symbol: o.symbol, 
      status: o.status,
      filled_at: o.filled_at,
      order_class: o.order_class 
    })));

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

    // Sort orders by filled_at timestamp (earliest first) for correct FIFO processing
    const sortedOrders = orders.sort((a, b) => {
      const aTime = new Date(a.filled_at || a.updated_at).getTime();
      const bTime = new Date(b.filled_at || b.updated_at).getTime();
      return aTime - bTime;
    });

    console.log(`Processing ${sortedOrders.length} orders in chronological order`);
    console.log(`----------------------------------------`);

    // First, store ALL orders (including canceled bracket legs) for complete bracket data
    console.log(`\n[BRACKET SYNC] Storing ${allOrders.length} total orders (including bracket legs)...`);
    for (const order of allOrders) {
      const { symbol, assetClass } = normalizeAlpacaSymbol(order);
      const bracketData = extractBracketData(order);

      const { error: upsertError } = await supabase
        .from('alpaca_orders')
        .upsert({
          user_id: user.id,
          order_id: order.id,
          client_order_id: order.client_order_id,
          symbol: symbol,
          side: order.side,
          order_type: order.order_type || order.type,
          order_class: order.order_class || 'simple',
          limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
          stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
          qty: parseFloat(order.qty || order.filled_qty || '0'),
          filled_qty: parseFloat(order.filled_qty || '0'),
          filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
          status: order.status,
          submitted_at: order.submitted_at,
          filled_at: order.filled_at,
          canceled_at: order.canceled_at,
          expired_at: order.expired_at,
          replaced_at: order.replaced_at,
          replaced_by: order.replaced_by || null,
          replaces: order.replaces || null,
          time_in_force: order.time_in_force,
          extended_hours: order.extended_hours,
          asset_class: assetClass,
          environment: environment,
          bracket_data: bracketData,
          raw: order as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'order_id,user_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.warn(`  [ORDER] Failed to store order ${order.id}:`, upsertError);
      } else if (bracketData) {
        console.log(`  [BRACKET] Stored order ${order.id} with bracket data`);
      }
    }
    console.log(`[BRACKET SYNC] Complete. All orders stored in alpaca_orders table.`);

    // Process and insert orders
    let imported = 0;
    let skippedDuplicates = 0;
    let closedPositions = 0;
    let bracketOrdersStored = 0;

    console.log(`\n[POSITION SYNC] Processing ${sortedOrders.length} filled orders for position matching...`);
    console.log(`----------------------------------------`);

    for (const order of sortedOrders) {
      // Skip replaced or canceled orders (they shouldn't be in filled orders, but just in case)
      if (order.status === 'replaced' || order.status === 'canceled' || order.status === 'expired') {
        console.log(`[SKIP] Order ${order.id} has status '${order.status}' - not processing`);
        continue;
      }

      // Parse quantities and prices
      const quantity = parseFloat(order.filled_qty || '0');
      const avgPrice = parseFloat(order.filled_avg_price || '0');

      if (quantity === 0 || avgPrice === 0) {
        console.warn(`Skipping order ${order.id} - invalid quantity (${quantity}) or price (${avgPrice})`);
        continue;
      }

      const { symbol, assetClass } = normalizeAlpacaSymbol(order);
      const timestamp = order.filled_at || order.updated_at;
      const orderSide = order.side; // 'buy' or 'sell' from Alpaca

      console.log(`\n[POSITION] ${orderSide.toUpperCase()} ${symbol}: ${quantity} @ ${avgPrice}`);
      console.log(`  Order ID: ${order.id}`);
      console.log(`  Order Class: ${order.order_class || 'simple'}`);
      console.log(`  Timestamp: ${timestamp}`);

      // Extract bracket data if this is a bracket order (already stored above)
      const bracketData = extractBracketData(order);
      if (bracketData) {
        console.log(
          `  [BRACKET] Bracket data: TP=${bracketData.take_profit?.status}, SL=${bracketData.stop_loss?.status}`
        );
        bracketOrdersStored++;

        // IMPORTANT:
        // Alpaca's /orders?status=filled can return the BRACKET PARENT order as 'filled'
        // while the exit leg (TP/SL) may not appear as a separate filled order.
        // In that case, we still need to close the position based on the filled leg.
        const tryCloseFromFilledLeg = async (leg: {
          status: string;
          filled_qty: number;
          filled_avg_price: number | null;
          filled_at?: string | null;
        }, reason: 'take_profit' | 'stop_loss') => {
          if (leg.status !== 'filled' || leg.filled_qty <= 0) return;

          const exitPrice = leg.filled_avg_price ?? avgPrice;
          const exitTimestamp = leg.filled_at ?? timestamp;

          // If entry side is BUY, the position is LONG and the exit leg is SELL (close LONG)
          // If entry side is SELL, the position is SHORT and the exit leg is BUY (close SHORT)
          const closeSideFromLeg: 'long' | 'short' =
            bracketData.entry_side === 'buy' ? 'long' : 'short';

          console.log(
            `  [BRACKET EXIT] Detected filled ${reason} leg -> closing ${closeSideFromLeg.toUpperCase()} @ ${exitPrice} (qty: ${leg.filled_qty})`
          );

          const { closed, error: legCloseError } = await closeOppositePositions(
            supabase,
            user.id,
            symbol,
            exitPrice,
            leg.filled_qty,
            exitTimestamp,
            closeSideFromLeg,
            isPaperTrading,
            reason
          );

          if (legCloseError && legCloseError !== 'no_open_positions') {
            console.error(`  [BRACKET EXIT] Failed to close from leg: ${legCloseError}`);
          } else if (closed > 0) {
            closedPositions += closed;
            console.log(`  [BRACKET EXIT] Closed ${closed} position(s) from ${reason} leg`);
          }
        };

        if (bracketData.take_profit) {
          await tryCloseFromFilledLeg(bracketData.take_profit, 'take_profit');
        }
        if (bracketData.stop_loss) {
          await tryCloseFromFilledLeg(bracketData.stop_loss, 'stop_loss');
        }
      }

      // ========================================
      // CRITICAL LOGIC: Alpaca supports both longs AND shorts!
      // ========================================
      // BUY order:
      //   1. First, close any open SHORT positions (FIFO)
      //   2. Then, open LONG for any remaining quantity
      //
      // SELL order:
      //   1. First, close any open LONG positions (FIFO)
      //   2. Then, open SHORT for any remaining quantity
      // ========================================

      let remaining = quantity;
      const closeSide: 'long' | 'short' = orderSide === 'buy' ? 'short' : 'long';
      const openSide: 'long' | 'short' = orderSide === 'buy' ? 'long' : 'short';

      // Check if there are open positions to close (to determine if this is a closing order)
      const { data: existingPositions } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .eq('exchange_source', 'alpaca')
        .eq('side', closeSide)
        .eq('open', true)
        .limit(1);

      const hasPositionsToClose = !!(existingPositions && existingPositions.length > 0);

      // Detect exit reason for this order
      const exitReason = detectExitReason(order, bracketData, hasPositionsToClose);

      console.log(`  Action: Close ${closeSide.toUpperCase()} first, then open ${openSide.toUpperCase()} for remainder`);
      if (exitReason) {
        console.log(`  Exit Reason: ${exitReason}`);
      }

      // Step 1: Try to close opposite-side positions
      const { closed, remaining: leftover, error: closeError } = await closeOppositePositions(
        supabase,
        user.id,
        symbol,
        avgPrice,
        quantity,
        timestamp,
        closeSide,
        isPaperTrading,
        exitReason
      );

      if (closeError && closeError !== 'no_open_positions') {
        console.error(`  [ERROR] Failed to close positions: ${closeError}`);
        continue;
      }

      if (closed > 0) {
        closedPositions += closed;
        console.log(`  [RESULT] Closed ${closed} ${closeSide} position(s)`);
      }

      remaining = leftover;

      // Step 2: If all quantity was used to close positions, we're done with this order
      if (remaining <= 0) {
        console.log(`  [RESULT] All quantity used to close positions, no new position opened`);
        continue;
      }

      // Step 3: Open a new position for the remaining quantity
      console.log(`  [RESULT] Remaining qty: ${remaining} - opening ${openSide.toUpperCase()} position`);

      // Check for duplicates before inserting
      // Include order ID if we want external_id support in future
      const { data: existing, error: existingError } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', user.id)
        .eq('exchange_source', 'alpaca')
        .eq('symbol', symbol)
        .eq('side', openSide)
        .eq('entry_price', avgPrice)
        .eq('entry_timestamp', timestamp)
        .eq('quantity', remaining)
        .eq('open', true)
        .limit(1);

      if (existingError) {
        console.warn(`  [WARN] Dedup check failed:`, existingError);
      }

      if (existing && existing.length > 0) {
        skippedDuplicates++;
        console.log(`  [SKIP] Duplicate position found, skipping`);
        continue;
      }

      // Insert the new position
      const now = new Date().toISOString();
      const positionToInsert = {
        user_id: user.id,
        symbol,
        side: openSide,
        quantity: remaining,
        quantity_lots: remaining,
        entry_price: avgPrice,
        entry_timestamp: timestamp,
        open: true,
        is_exchange_verified: true,
        is_simulation: isPaperTrading,
        exchange_source: 'alpaca',
        trade_source: 'api',
        fees_total: 0,
        platform: 'Alpaca',
        asset_class: assetClass,
        created_at: now,
        updated_at: now,
      };

      const { error: insertError } = await supabase.from('positions').insert(positionToInsert);

      if (insertError) {
        console.error(`  [ERROR] Failed to insert position:`, insertError);
      } else {
        imported++;
        console.log(`  [SUCCESS] Opened ${openSide.toUpperCase()} position: ${remaining} @ ${avgPrice}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`Sync complete (FALLBACK):`);
    console.log(`  - Total orders stored: ${allOrders.length}`);
    console.log(`  - Filled orders processed: ${orders.length}`);
    console.log(`  - New positions opened: ${imported}`);
    console.log(`  - Positions closed: ${closedPositions}`);
    console.log(`  - Bracket orders with TP/SL data: ${bracketOrdersStored}`);
    console.log(`  - Duplicates skipped: ${skippedDuplicates}`);
    console.log(`========================================`);

    // Update connection with sync status
    const updateData: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      verified_trades_count: (connection.verified_trades_count || 0) + imported + closedPositions,
      error_message: null,
    };

    // Only update cursor if we got new orders after the ORIGINAL cursor (not adjusted)
    // This prevents the lookback window from resetting progress
    if (newCursor && (!lastSyncCursor || newCursor > lastSyncCursor)) {
      updateData.last_sync_cursor = newCursor;
      console.log(`Updating cursor from ${lastSyncCursor} to ${newCursor}`);
    } else if (lastSyncCursor) {
      console.log(`Keeping cursor at ${lastSyncCursor} (no new orders beyond current cursor)`);
    }

    await supabase
      .from('exchange_connections')
      .update(updateData)
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        closed: closedPositions,
        bracket_orders_stored: bracketOrdersStored,
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
