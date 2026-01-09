/**
 * Alpaca Webhook Handler
 *
 * Receives real-time order updates from Alpaca via webhooks.
 * Closes positions immediately when TP/SL orders are filled.
 *
 * Webhook URL: https://your-project.supabase.co/functions/v1/alpaca-webhook
 *
 * Configure in Alpaca Dashboard:
 * - Events to subscribe: trade_updates
 * - Webhook URL: your deployment URL
 * - Include signature for verification
 *
 * POST /alpaca-webhook
 * Body: Alpaca webhook payload with order update events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/crypto.ts';
import {
  extractBracketData,
  type AlpacaEnvironment,
  type AlpacaOrder,
} from '../_shared/alpaca-api.ts';
import {
  closeOppositePositions,
  detectExitReason,
  normalizeAlpacaSymbol,
  type ExitReason,
} from '../_shared/position-closing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Alpaca webhook event types
 */
interface AlpacaWebhookEvent {
  event: 'fill' | 'partial_fill' | 'canceled' | 'expired' | 'rejected' | 'new' | 'accepted';
  order: AlpacaOrder;
  timestamp: string;
  execution_id?: string;
  position_qty?: string;
  price?: string;
  qty?: string;
}

/**
 * Verify Alpaca webhook signature using HMAC-SHA256
 *
 * Alpaca sends signature in 'X-Alpaca-Signature' header
 * Format: timestamp.signature
 *
 * To verify:
 * 1. Split header into timestamp and signature
 * 2. Construct signed_payload = timestamp + '.' + raw_body
 * 3. Compute HMAC-SHA256(webhook_secret, signed_payload)
 * 4. Compare with provided signature
 */
async function verifyWebhookSignature(
  request: Request,
  body: string,
  webhookSecret: string
): Promise<{ valid: boolean; error?: string }> {
  const signature = request.headers.get('X-Alpaca-Signature');

  if (!signature) {
    return { valid: false, error: 'Missing X-Alpaca-Signature header' };
  }

  try {
    // Parse timestamp and signature from header
    const [timestamp, providedSignature] = signature.split('.');

    if (!timestamp || !providedSignature) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp is recent (within 5 minutes to prevent replay attacks)
    const signatureAge = Date.now() - parseInt(timestamp) * 1000;
    if (signatureAge > 5 * 60 * 1000) {
      return { valid: false, error: 'Signature timestamp too old' };
    }

    // Construct signed payload
    const signedPayload = `${timestamp}.${body}`;

    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures (timing-safe comparison)
    if (computedSignature !== providedSignature) {
      return { valid: false, error: 'Signature mismatch' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, error: 'Signature verification failed' };
  }
}

/**
 * Process a single order update event
 */
async function processOrderUpdate(
  supabase: ReturnType<typeof createClient>,
  event: AlpacaWebhookEvent,
  userId: string,
  environment: AlpacaEnvironment,
  isPaperTrading: boolean
): Promise<{ success: boolean; closed?: number; error?: string }> {
  const order = event.order;

  // Only process filled or partial_fill events
  if (event.event !== 'fill' && event.event !== 'partial_fill') {
    console.log(`[SKIP] Event type '${event.event}' - not a fill`);
    return { success: true };
  }

  // Only process orders with filled quantity
  const quantity = parseFloat(order.filled_qty || '0');
  const avgPrice = parseFloat(order.filled_avg_price || '0');

  if (quantity === 0 || avgPrice === 0) {
    console.warn(`[SKIP] Order ${order.id} - invalid quantity (${quantity}) or price (${avgPrice})`);
    return { success: true };
  }

  const { symbol, assetClass } = normalizeAlpacaSymbol(order);
  const timestamp = order.filled_at || order.updated_at || event.timestamp;
  const orderSide = order.side; // 'buy' or 'sell'

  console.log(`\n[WEBHOOK] ${event.event.toUpperCase()}: ${orderSide.toUpperCase()} ${symbol}: ${quantity} @ ${avgPrice}`);
  console.log(`  Order ID: ${order.id}`);
  console.log(`  Order Class: ${order.order_class || 'simple'}`);
  console.log(`  Status: ${order.status}`);
  console.log(`  Timestamp: ${timestamp}`);

  // Extract bracket data if this is a bracket order
  const bracketData = extractBracketData(order);
  if (bracketData) {
    console.log(`  [BRACKET] Found bracket data:`, JSON.stringify(bracketData));
  }

  // Update alpaca_orders table with latest order state
  const { error: upsertError } = await supabase
    .from('alpaca_orders')
    .upsert(
      {
        user_id: userId,
        order_id: order.id,
        client_order_id: order.client_order_id,
        symbol: symbol,
        side: orderSide,
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
      },
      {
        onConflict: 'order_id',
        ignoreDuplicates: false,
      }
    );

  if (upsertError) {
    console.warn(`  [ERROR] Failed to store order:`, upsertError);
  } else {
    console.log(`  [STORED] Order ${order.id} in alpaca_orders table`);
  }

  // Determine closing side and opening side
  const closeSide: 'long' | 'short' = orderSide === 'buy' ? 'short' : 'long';
  const openSide: 'long' | 'short' = orderSide === 'buy' ? 'long' : 'short';

  // Check if there are positions to close
  const { data: existingPositions } = await supabase
    .from('positions')
    .select('id')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('exchange_source', 'alpaca')
    .eq('side', closeSide)
    .eq('open', true)
    .limit(1);

  const hasPositionsToClose = !!(existingPositions && existingPositions.length > 0);

  // Detect exit reason
  const exitReason = detectExitReason(order, bracketData, hasPositionsToClose);

  console.log(`  Action: Close ${closeSide.toUpperCase()} first, then open ${openSide.toUpperCase()} for remainder`);
  if (exitReason) {
    console.log(`  Exit Reason: ${exitReason}`);
  }

  // Try to close opposite-side positions using FIFO
  const { closed, remaining, error: closeError } = await closeOppositePositions(
    supabase,
    userId,
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
    return { success: false, error: closeError };
  }

  if (closed > 0) {
    console.log(`  [RESULT] Closed ${closed} ${closeSide} position(s) with exit_reason=${exitReason}`);
  }

  // If all quantity was used to close positions, we're done
  if (remaining <= 0) {
    console.log(`  [RESULT] All quantity used to close positions, no new position opened`);
    return { success: true, closed };
  }

  // Open a new position for the remaining quantity
  console.log(`  [RESULT] Remaining qty: ${remaining} - opening ${openSide.toUpperCase()} position`);

  // Check for duplicates
  const { data: existing } = await supabase
    .from('positions')
    .select('id')
    .eq('user_id', userId)
    .eq('exchange_source', 'alpaca')
    .eq('symbol', symbol)
    .eq('side', openSide)
    .eq('entry_price', avgPrice)
    .eq('entry_timestamp', timestamp)
    .eq('quantity', remaining)
    .eq('open', true)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`  [SKIP] Duplicate position found`);
    return { success: true, closed };
  }

  // Insert new position
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('positions').insert({
    user_id: userId,
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
  });

  if (insertError) {
    console.error(`  [ERROR] Failed to insert position:`, insertError);
    return { success: false, error: insertError.message };
  }

  console.log(`  [SUCCESS] Opened ${openSide.toUpperCase()} position: ${remaining} @ ${avgPrice}`);
  return { success: true, closed };
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
    const webhookSecret = Deno.env.get('ALPACA_WEBHOOK_SECRET');

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

    // Read raw body for signature verification
    const body = await req.text();

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const { valid, error } = await verifyWebhookSignature(req, body, webhookSecret);
      if (!valid) {
        console.error('Webhook signature verification failed:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      console.log('[VERIFIED] Webhook signature is valid');
    } else {
      console.warn('[WARNING] ALPACA_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    // Parse webhook payload
    let event: AlpacaWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`========================================`);
    console.log(`Alpaca Webhook Event: ${event.event}`);
    console.log(`Order ID: ${event.order?.id}`);
    console.log(`========================================`);

    // Get order ID to find which user this belongs to
    const orderId = event.order?.id;
    if (!orderId) {
      console.error('No order ID in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing order ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by checking existing order or by environment matching
    // First, try to find existing order
    const { data: existingOrder } = await supabase
      .from('alpaca_orders')
      .select('user_id, environment')
      .eq('order_id', orderId)
      .single();

    let userId: string;
    let environment: AlpacaEnvironment;

    if (existingOrder) {
      // Found existing order, use that user
      userId = existingOrder.user_id;
      environment = existingOrder.environment as AlpacaEnvironment;
      console.log(`[FOUND] Existing order for user ${userId} in ${environment} environment`);
    } else {
      // New order - need to determine which user's connection this is
      // This is challenging since Alpaca doesn't include account info in webhooks
      // We'll try to match by checking all active Alpaca connections
      // In production, consider using a dedicated webhook per user or account mapping

      console.warn('[WARNING] No existing order found - cannot determine user');
      console.warn('[SOLUTION] Consider implementing order tracking or per-user webhook URLs');

      return new Response(
        JSON.stringify({
          error: 'Cannot determine user for order',
          order_id: orderId,
          suggestion: 'Ensure orders are synced before webhooks arrive, or use per-user webhook URLs'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's Alpaca connection for credentials (needed for environment check)
    const { data: connection } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange', 'alpaca')
      .eq('status', 'connected')
      .single();

    if (!connection) {
      console.error(`No connected Alpaca account for user ${userId}`);
      return new Response(
        JSON.stringify({ error: 'No connected Alpaca account' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isPaperTrading = environment === 'paper';
    console.log(`Environment: ${environment} (isPaperTrading: ${isPaperTrading})`);

    // Process the order update
    const result = await processOrderUpdate(
      supabase,
      event,
      userId,
      environment,
      isPaperTrading
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`========================================`);
    console.log(`Webhook processed successfully`);
    if (result.closed && result.closed > 0) {
      console.log(`  - Positions closed: ${result.closed}`);
    }
    console.log(`========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        event: event.event,
        order_id: orderId,
        closed: result.closed || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Alpaca webhook error:', error);
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
