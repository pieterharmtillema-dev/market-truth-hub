/**
 * Alpaca Orders Edge Function
 * 
 * Fetches and syncs ALL orders (not just filled) from Alpaca.
 * Supports polling and real-time updates via websocket.
 * 
 * GET /alpaca-orders - Fetch orders from DB with optional filters
 * POST /alpaca-orders - Sync orders from Alpaca API to DB
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptToken } from '../_shared/crypto.ts';
import { getAlpacaBaseUrl, type AlpacaEnvironment } from '../_shared/alpaca-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlpacaOrderRaw {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: unknown[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

interface NormalizedOrder {
  order_id: string;
  client_order_id: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'other';
  limit_price: number | null;
  stop_price: number | null;
  qty: number;
  filled_qty: number;
  filled_avg_price: number | null;
  status: string;
  submitted_at: string;
  updated_at: string;
  filled_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  time_in_force: string | null;
  extended_hours: boolean;
  asset_class: string | null;
  environment: 'paper' | 'live';
  raw: AlpacaOrderRaw;
}

/**
 * Normalize order type from Alpaca format
 */
function normalizeOrderType(type: string): NormalizedOrder['order_type'] {
  switch (type.toLowerCase()) {
    case 'market':
      return 'market';
    case 'limit':
      return 'limit';
    case 'stop':
      return 'stop';
    case 'stop_limit':
      return 'stop_limit';
    case 'trailing_stop':
      return 'trailing_stop';
    default:
      return 'other';
  }
}

/**
 * Parse numeric string safely
 */
function parseNumeric(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize Alpaca order to our format
 */
function normalizeOrder(order: AlpacaOrderRaw, environment: AlpacaEnvironment): NormalizedOrder {
  return {
    order_id: order.id,
    client_order_id: order.client_order_id || null,
    symbol: order.symbol,
    side: order.side,
    order_type: normalizeOrderType(order.type || order.order_type),
    limit_price: parseNumeric(order.limit_price),
    stop_price: parseNumeric(order.stop_price),
    qty: parseNumeric(order.qty || order.notional) || 0,
    filled_qty: parseNumeric(order.filled_qty) || 0,
    filled_avg_price: parseNumeric(order.filled_avg_price),
    status: order.status,
    submitted_at: order.submitted_at,
    updated_at: order.updated_at,
    filled_at: order.filled_at,
    canceled_at: order.canceled_at,
    expired_at: order.expired_at,
    replaced_at: order.replaced_at,
    replaced_by: order.replaced_by,
    replaces: order.replaces,
    time_in_force: order.time_in_force,
    extended_hours: order.extended_hours,
    asset_class: order.asset_class,
    environment,
    raw: order,
  };
}

/**
 * Fetch all orders from Alpaca API
 */
async function fetchAlpacaOrders(
  apiKeyId: string,
  apiSecret: string,
  environment: AlpacaEnvironment,
  params: {
    status?: string;
    limit?: number;
    after?: string;
    until?: string;
    direction?: string;
    nested?: boolean;
  } = {}
): Promise<{ orders?: AlpacaOrderRaw[]; error?: string }> {
  const baseUrl = getAlpacaBaseUrl(environment);
  
  const queryParams = new URLSearchParams({
    status: params.status || 'all',
    limit: (params.limit || 200).toString(),
    direction: params.direction || 'desc',
    nested: (params.nested ?? true).toString(),
  });

  if (params.after) queryParams.set('after', params.after);
  if (params.until) queryParams.set('until', params.until);

  try {
    const response = await fetch(`${baseUrl}/v2/orders?${queryParams.toString()}`, {
      headers: {
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return { error: errorBody.message || `API error: ${response.status}` };
    }

    const orders = await response.json();
    return { orders };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Upsert orders to database
 */
async function upsertOrders(
  supabase: SupabaseClient,
  userId: string,
  orders: NormalizedOrder[]
): Promise<{ upserted: number; error?: string }> {
  if (orders.length === 0) return { upserted: 0 };

  const records = orders.map(order => ({
    user_id: userId,
    order_id: order.order_id,
    client_order_id: order.client_order_id,
    symbol: order.symbol,
    side: order.side,
    order_type: order.order_type,
    limit_price: order.limit_price,
    stop_price: order.stop_price,
    qty: order.qty,
    filled_qty: order.filled_qty,
    filled_avg_price: order.filled_avg_price,
    status: order.status,
    submitted_at: order.submitted_at,
    updated_at: order.updated_at,
    filled_at: order.filled_at,
    canceled_at: order.canceled_at,
    expired_at: order.expired_at,
    replaced_at: order.replaced_at,
    replaced_by: order.replaced_by,
    replaces: order.replaces,
    time_in_force: order.time_in_force,
    extended_hours: order.extended_hours,
    asset_class: order.asset_class,
    environment: order.environment,
    raw: order.raw,
  }));

  const { error } = await supabase
    .from('alpaca_orders')
    .upsert(records, { 
      onConflict: 'user_id,order_id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('Upsert error:', error);
    return { upserted: 0, error: error.message };
  }

  return { upserted: records.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('EXCHANGE_ENCRYPTION_KEY')!;

    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - Fetch orders from database
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const symbol = url.searchParams.get('symbol');
      const status = url.searchParams.get('status');
      const orderType = url.searchParams.get('order_type');
      const since = url.searchParams.get('since');
      const limit = parseInt(url.searchParams.get('limit') || '200');

      let query = supabase
        .from('alpaca_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      if (symbol) query = query.eq('symbol', symbol);
      if (status) {
        if (status === 'open') {
          query = query.in('status', ['new', 'accepted', 'pending_new', 'accepted_for_bidding', 'partially_filled']);
        } else if (status === 'closed') {
          query = query.in('status', ['filled', 'canceled', 'expired', 'replaced', 'rejected', 'stopped', 'suspended']);
        } else {
          query = query.eq('status', status);
        }
      }
      if (orderType) query = query.eq('order_type', orderType);
      if (since) query = query.gte('submitted_at', since);

      const { data: orders, error: fetchError } = await query;

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ orders: orders || [], count: orders?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Sync orders from Alpaca
    if (req.method === 'POST') {
      // Get user's Alpaca connection
      const { data: connection, error: connError } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('exchange', 'alpaca')
        .eq('status', 'connected')
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: 'No connected Alpaca account found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKeyId = await decryptToken(connection.api_key_encrypted, encryptionKey);
      const apiSecret = await decryptToken(connection.api_secret_encrypted, encryptionKey);
      const environment = (connection.label ?? 'paper') as AlpacaEnvironment;

      // Parse request body for optional params
      let requestParams: { limit?: number; after?: string; until?: string } = {};
      try {
        const body = await req.json();
        requestParams = body || {};
      } catch {
        // No body or invalid JSON, use defaults
      }

      console.log(`Fetching orders from Alpaca ${environment}...`);

      const { orders: rawOrders, error: fetchError } = await fetchAlpacaOrders(
        apiKeyId,
        apiSecret,
        environment,
        {
          status: 'all',
          limit: requestParams.limit || 200,
          after: requestParams.after,
          until: requestParams.until,
          direction: 'desc',
        }
      );

      if (fetchError) {
        console.error('Alpaca API error:', fetchError);
        return new Response(
          JSON.stringify({ error: fetchError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!rawOrders || rawOrders.length === 0) {
        return new Response(
          JSON.stringify({ success: true, synced: 0, total: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetched ${rawOrders.length} orders, normalizing...`);

      const normalizedOrders = rawOrders.map(order => normalizeOrder(order, environment));

      const { upserted, error: upsertError } = await upsertOrders(supabase, user.id, normalizedOrders);

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: upsertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Upserted ${upserted} orders successfully`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: upserted, 
          total: rawOrders.length,
          environment 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});