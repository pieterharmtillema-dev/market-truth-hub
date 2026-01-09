/**
 * Alpaca Sync Edge Function
 *
 * Syncs filled orders and executions from Alpaca to the positions table.
 * Uses FIFO matching to pair buy/sell orders into completed trades.
 *
 * IMPORTANT: Alpaca is NOT long-only!
 * - BUY order: closes SHORT positions (FIFO), then opens LONG for remainder
 * - SELL order: closes LONG positions (FIFO), then opens SHORT for remainder
 *
 * POST /alpaca-sync
 * Response: { imported: number, skipped_duplicates: number, newest_cursor: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/crypto.ts';
import {
  getFilledOrdersWithExecutions,
  extractBracketData,
  type AlpacaEnvironment,
  type AlpacaOrder,
  type BracketData,
} from '../_shared/alpaca-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Exit reason type for tracking how positions are closed
 */
type ExitReason = 'stop_loss' | 'take_profit' | 'market' | 'manual' | null;

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
 * 
 * @param closeSide - The side of positions to close ('long' or 'short')
 *   - To close a SHORT position, you BUY (so closeSide = 'short')
 *   - To close a LONG position, you SELL (so closeSide = 'long')
 * @param exitReason - How the position was closed (stop_loss, take_profit, market, manual)
 */
async function closeOppositePositions(
  supabase: SupabaseClient,
  userId: string,
  symbol: string,
  exitPrice: number,
  exitQuantity: number,
  exitTimestamp: string,
  closeSide: 'long' | 'short',
  isPaperTrading: boolean,
  exitReason: ExitReason = 'market'
): Promise<{ closed: number; remaining: number; error?: string }> {
  console.log(`  [FIFO] Looking for ${closeSide.toUpperCase()} positions to close for ${symbol} (qty: ${exitQuantity})`);
  
  // Fetch open positions for this symbol (FIFO order) - only Alpaca positions
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
    console.error('  [FIFO] Failed to fetch open positions:', fetchError);
    return { closed: 0, remaining: exitQuantity, error: fetchError.message };
  }

  if (!openPositions || openPositions.length === 0) {
    console.log(`  [FIFO] No open ${closeSide} positions found`);
    return { closed: 0, remaining: exitQuantity, error: 'no_open_positions' };
  }

  console.log(`  [FIFO] Found ${openPositions.length} open ${closeSide} position(s)`);

  let remainingQuantity = exitQuantity;
  let closedCount = 0;

  for (const position of openPositions) {
    if (remainingQuantity <= 0) break;

    const positionQty = Number(position.quantity);
    if (positionQty <= 0) continue;

    console.log(`  [FIFO] Processing position ID ${position.id}: qty=${positionQty}, entry=${position.entry_price}`);

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
          exit_reason: exitReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`  [FIFO] Failed to close position ${position.id}:`, updateError);
        continue;
      }

      console.log(`  [FIFO] FULL CLOSE position ${position.id}: pnl=${pnl}`);
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

      // Update original position with remaining quantity (stays open)
      const { error: updateError } = await supabase
        .from('positions')
        .update({
          quantity: remainingQty,
          quantity_lots: remainingLots,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`  [FIFO] Failed to update position ${position.id}:`, updateError);
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
          exit_reason: exitReason,
          is_exchange_verified: true,
          is_simulation: isPaperTrading,
          exchange_source: 'alpaca',
          trade_source: 'api',
          platform: 'Alpaca',
          asset_class: position.asset_class,
        });

      if (insertError) {
        console.error('  [FIFO] Failed to create closed position:', insertError);
      } else {
        console.log(`  [FIFO] PARTIAL CLOSE: closed ${closedQty} of ${positionQty}, remaining ${remainingQty} stays open, pnl=${pnl}`);
        closedCount++;
      }

      remainingQuantity = 0;
    }
  }

  console.log(`  [FIFO] Result: closed ${closedCount} position(s), remaining qty: ${remainingQuantity}`);
  return { closed: closedCount, remaining: remainingQuantity };
}

/**
 * Normalize Alpaca order symbol (format crypto pairs properly)
 */
function normalizeAlpacaSymbol(order: AlpacaOrder): { symbol: string; assetClass: string } {
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

  return { symbol, assetClass };
}

/**
 * Detect exit reason from order type and bracket data
 * 
 * For bracket orders, checks if:
 * - Stop-loss leg was filled (exit_reason = 'stop_loss')
 * - Take-profit leg was filled (exit_reason = 'take_profit')
 * 
 * For regular orders:
 * - Stop orders -> 'stop_loss' 
 * - Limit orders that close positions -> 'take_profit' or 'market'
 */
function detectExitReason(
  order: AlpacaOrder,
  bracketData: BracketData | null,
  isClosingPosition: boolean
): ExitReason {
  // If this order has bracket legs, check if it's an exit order from a bracket
  if (bracketData) {
    // Check if take-profit was filled
    if (bracketData.take_profit?.status === 'filled' && bracketData.take_profit.filled_qty > 0) {
      return 'take_profit';
    }
    // Check if stop-loss was filled
    if (bracketData.stop_loss?.status === 'filled' && bracketData.stop_loss.filled_qty > 0) {
      return 'stop_loss';
    }
  }

  // If this order itself IS a stop order (has stop_price), it's a stop-loss exit
  if (order.stop_price && isClosingPosition) {
    return 'stop_loss';
  }

  // If this order is a limit order closing a position, check if it could be a take-profit
  if (order.limit_price && isClosingPosition && !order.stop_price) {
    // This is a limit order being used to exit - likely take-profit
    return 'take_profit';
  }

  // Default market order exit
  if (isClosingPosition) {
    return 'market';
  }

  return null;
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

    console.log(`========================================`);
    console.log(`Starting Alpaca sync for user ${user.id}`);
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

    console.log(
      `Fetching filled orders from Alpaca ${environment} (after: ${lastSyncCursor || 'beginning'})`
    );

    // Fetch filled orders and activities (also gets ALL closed orders for bracket data)
    const { orders, allOrders, error: fetchError, newCursor } =
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

    console.log(`Fetched ${orders.length} filled orders and ${allOrders.length} total closed orders from Alpaca`);

    // Build a map of all orders by ID for bracket leg lookups
    // This helps us find TP/SL status even when the parent order was filled
    const orderMap = new Map<string, AlpacaOrder>();
    const parentChildMap = new Map<string, AlpacaOrder[]>(); // parent_order_id -> child orders
    
    for (const o of allOrders) {
      orderMap.set(o.id, o);
      // Also map by client_order_id if available
      if (o.client_order_id) {
        orderMap.set(o.client_order_id, o);
      }
    }

    // Store ALL closed orders to alpaca_orders table for bracket data visibility
    console.log(`Storing ${allOrders.length} orders to alpaca_orders table...`);
    let allOrdersStored = 0;
    
    for (const order of allOrders) {
      const { symbol: orderSymbol, assetClass: orderAssetClass } = normalizeAlpacaSymbol(order);
      const bracketData = extractBracketData(order);
      
      const { error: upsertError } = await supabase
        .from('alpaca_orders')
        .upsert({
          user_id: user.id,
          order_id: order.id,
          client_order_id: order.client_order_id,
          symbol: orderSymbol,
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
          asset_class: orderAssetClass,
          environment: environment,
          bracket_data: bracketData,
          raw: order as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'order_id',
          ignoreDuplicates: false,
        });
      
      if (!upsertError) {
        allOrdersStored++;
      } else {
        console.warn(`  [ORDER] Failed to store order ${order.id}:`, upsertError);
      }
    }
    
    console.log(`Stored ${allOrdersStored} orders to alpaca_orders table`);

    // Sort FILLED orders by filled_at timestamp (earliest first) for correct FIFO processing
    const sortedOrders = orders.sort((a, b) => {
      const aTime = new Date(a.filled_at || a.updated_at).getTime();
      const bTime = new Date(b.filled_at || b.updated_at).getTime();
      return aTime - bTime;
    });

    console.log(`Processing ${sortedOrders.length} filled orders in chronological order`);
    console.log(`----------------------------------------`);

    // Process and insert orders
    let imported = 0;
    let skippedDuplicates = 0;
    let closedPositions = 0;

    for (const order of sortedOrders) {
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

      console.log(`\n[ORDER] ${orderSide.toUpperCase()} ${symbol}: ${quantity} @ ${avgPrice}`);
      console.log(`  Order ID: ${order.id}`);
      console.log(`  Order Class: ${order.order_class || 'simple'}`);
      console.log(`  Timestamp: ${timestamp}`);

      // Extract bracket data if this is a bracket order
      const bracketData = extractBracketData(order);
      if (bracketData) {
        console.log(`  [BRACKET] Found bracket data:`, JSON.stringify(bracketData));
      }
      
      // Note: Order already stored to alpaca_orders earlier in bulk processing

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
    console.log(`Sync complete:`);
    console.log(`  - New positions opened: ${imported}`);
    console.log(`  - Positions closed: ${closedPositions}`);
    console.log(`  - Total orders stored: ${allOrdersStored}`);
    console.log(`  - Duplicates skipped: ${skippedDuplicates}`);
    console.log(`========================================`);

    // Update connection with sync status
    const updateData: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      verified_trades_count: (connection.verified_trades_count || 0) + imported + closedPositions,
      error_message: null,
    };

    if (newCursor) {
      updateData.last_sync_cursor = newCursor;
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
        orders_stored: allOrdersStored,
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
