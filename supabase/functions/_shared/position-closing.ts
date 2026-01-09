/**
 * Shared position closing logic for Alpaca trades
 * Used by both alpaca-sync (fallback) and alpaca-webhook (real-time) functions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AlpacaOrder, BracketData } from './alpaca-api.ts';

/**
 * Exit reason type for tracking how positions are closed
 */
export type ExitReason = 'stop_loss' | 'take_profit' | 'market' | 'manual' | null;

/**
 * Calculate PnL for a closed position
 */
export function calculatePnL(
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
export async function closeOppositePositions(
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

      console.log(`  [FIFO] FULL CLOSE position ${position.id}: pnl=${pnl}, exit_reason=${exitReason}`);
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
        console.log(`  [FIFO] PARTIAL CLOSE: closed ${closedQty} of ${positionQty}, remaining ${remainingQty} stays open, pnl=${pnl}, exit_reason=${exitReason}`);
        closedCount++;
      }

      remainingQuantity = 0;
    }
  }

  console.log(`  [FIFO] Result: closed ${closedCount} position(s), remaining qty: ${remainingQuantity}`);
  return { closed: closedCount, remaining: remainingQuantity };
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
export function detectExitReason(
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

/**
 * Normalize Alpaca order symbol (format crypto pairs properly)
 */
export function normalizeAlpacaSymbol(order: AlpacaOrder): { symbol: string; assetClass: string } {
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
