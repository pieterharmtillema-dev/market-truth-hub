/**
 * Alpaca API wrapper for broker integration
 *
 * Supports both paper and live trading environments
 * Documentation: https://alpaca.markets/docs/api-references/trading-api/
 */

export type AlpacaEnvironment = 'paper' | 'live';

export interface AlpacaCredentials {
  apiKeyId: string;
  apiSecret: string;
  environment: AlpacaEnvironment;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  crypto_status?: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
}

export interface AlpacaOrderLeg {
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
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  order_type: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
}

export interface AlpacaOrder {
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
  legs: AlpacaOrderLeg[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

/**
 * Extract bracket data from order legs for R:R calculation
 */
export interface BracketData {
  entry_side: 'buy' | 'sell';
  entry_filled_avg_price: number | null;
  qty: number;
  take_profit?: {
    limit_price: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
    filled_at?: string | null;
    canceled_at?: string | null;
  };
  stop_loss?: {
    stop_price: number;
    limit_price?: number;
    status: string;
    filled_qty: number;
    filled_avg_price: number | null;
    filled_at?: string | null;
    canceled_at?: string | null;
  };
}

/**
 * Parse bracket order legs and extract TP/SL data
 */
export function extractBracketData(order: AlpacaOrder): BracketData | null {
  if (order.order_class !== 'bracket' && order.order_class !== 'oto' && order.order_class !== 'oco') {
    if (!order.legs || order.legs.length === 0) {
      return null;
    }
  }

  const bracketData: BracketData = {
    entry_side: order.side,
    entry_filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
    qty: parseFloat(order.qty || order.filled_qty || '0'),
  };

  if (!order.legs) return bracketData;

  for (const leg of order.legs) {
    const filledQty = parseFloat(leg.filled_qty || '0');
    const filledAvgPrice = leg.filled_avg_price ? parseFloat(leg.filled_avg_price) : null;

    // Identify take-profit leg: has limit_price but NO stop_price
    if (leg.limit_price && !leg.stop_price) {
      bracketData.take_profit = {
        limit_price: parseFloat(leg.limit_price),
        status: leg.status,
        filled_qty: filledQty,
        filled_avg_price: filledAvgPrice,
        filled_at: leg.filled_at,
        canceled_at: leg.canceled_at,
      };
    }
    // Identify stop-loss leg: has stop_price (with optional limit_price for stop-limit)
    else if (leg.stop_price) {
      bracketData.stop_loss = {
        stop_price: parseFloat(leg.stop_price),
        limit_price: leg.limit_price ? parseFloat(leg.limit_price) : undefined,
        status: leg.status,
        filled_qty: filledQty,
        filled_avg_price: filledAvgPrice,
        filled_at: leg.filled_at,
        canceled_at: leg.canceled_at,
      };
    }
  }

  return bracketData;
}

export interface AlpacaActivity {
  id: string;
  activity_type: string;
  transaction_time: string;
  type: string;
  price: string;
  qty: string;
  side: 'buy' | 'sell';
  symbol: string;
  leaves_qty: string;
  order_id: string;
  cum_qty: string;
  order_status: string;
}

/**
 * Get base URL for Alpaca API based on environment
 */
export function getAlpacaBaseUrl(environment: AlpacaEnvironment): string {
  return environment === 'paper'
    ? 'https://paper-api.alpaca.markets'
    : 'https://api.alpaca.markets';
}

/**
 * Create headers for Alpaca API requests
 */
function createHeaders(apiKeyId: string, apiSecret: string): Record<string, string> {
  return {
    'APCA-API-KEY-ID': apiKeyId,
    'APCA-API-SECRET-KEY': apiSecret,
    'Content-Type': 'application/json',
  };
}

/**
 * Make an authenticated request to Alpaca API with retry logic
 */
async function alpacaRequest<T>(
  url: string,
  credentials: AlpacaCredentials,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; statusCode?: number }> {
  const baseUrl = getAlpacaBaseUrl(credentials.environment);
  const headers = createHeaders(credentials.apiKeyId, credentials.apiSecret);

  const maxRetries = 3;
  let lastError: string = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        const waitTime = Math.min(retryAfter * 1000, 60000); // Max 60 seconds

        if (attempt < maxRetries - 1) {
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        return {
          error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          statusCode: 429,
        };
      }

      // Handle authentication errors
      if (response.status === 401) {
        return {
          error: 'Invalid API credentials. Please check your API Key ID and Secret.',
          statusCode: 401,
        };
      }

      if (response.status === 403) {
        return {
          error: 'Access forbidden. Please check your API key permissions.',
          statusCode: 403,
        };
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        return {
          error: errorBody.message || `API request failed with status ${response.status}`,
          statusCode: response.status,
        };
      }

      // Success
      const data = await response.json();
      return { data: data as T };

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network request failed';

      // Retry on network errors with exponential backoff
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Network error, retrying in ${waitTime}ms: ${lastError}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  return { error: lastError || 'Request failed after multiple retries' };
}

/**
 * Verify account credentials and get account information
 * This is used during the connection flow to validate API keys
 */
export async function getAccount(
  credentials: AlpacaCredentials
): Promise<{ account?: AlpacaAccount; error?: string }> {
  const result = await alpacaRequest<AlpacaAccount>(
    '/v2/account',
    credentials
  );

  if (result.error) {
    return { error: result.error };
  }

  // Verify account is not blocked
  if (result.data?.account_blocked) {
    return { error: 'Account is blocked. Please contact Alpaca support.' };
  }

  if (result.data?.trading_blocked) {
    return { error: 'Trading is blocked on this account.' };
  }

  return { account: result.data };
}

/**
 * Get filled orders within a date range
 * Used for syncing historical trades
 *
 * @param credentials - Alpaca API credentials
 * @param params - Query parameters (status, after, until, limit, etc.)
 */
export async function getOrders(
  credentials: AlpacaCredentials,
  params: {
    status?: 'filled' | 'all' | 'open' | 'closed';
    after?: string; // RFC3339 timestamp
    until?: string; // RFC3339 timestamp
    limit?: number;
    direction?: 'asc' | 'desc';
    nested?: boolean; // Include bracket order legs
  } = {}
): Promise<{ orders?: AlpacaOrder[]; error?: string }> {
  // Default to filled orders only
  const queryParams = new URLSearchParams({
    status: params.status || 'filled',
    limit: (params.limit || 500).toString(),
    direction: params.direction || 'desc',
    nested: (params.nested ?? true).toString(), // Enable nested legs by default
  });

  if (params.after) {
    queryParams.set('after', params.after);
  }

  if (params.until) {
    queryParams.set('until', params.until);
  }

  const result = await alpacaRequest<AlpacaOrder[]>(
    `/v2/orders?${queryParams.toString()}`,
    credentials
  );

  if (result.error) {
    return { error: result.error };
  }

  return { orders: result.data || [] };
}

/**
 * Get account activities (fills, transactions, etc.)
 * This provides execution-level details for filled orders
 *
 * @param credentials - Alpaca API credentials
 * @param params - Query parameters
 */
export async function getActivities(
  credentials: AlpacaCredentials,
  params: {
    activity_type?: 'FILL' | 'TRANS' | 'DIV' | 'INT';
    after?: string; // RFC3339 timestamp
    until?: string;
    direction?: 'asc' | 'desc';
    page_size?: number;
  } = {}
): Promise<{ activities?: AlpacaActivity[]; error?: string }> {
  const queryParams = new URLSearchParams({
    direction: params.direction || 'desc',
    page_size: (params.page_size || 100).toString(),
  });

  if (params.activity_type) {
    queryParams.set('activity_type', params.activity_type);
  }

  if (params.after) {
    queryParams.set('after', params.after);
  }

  if (params.until) {
    queryParams.set('until', params.until);
  }

  const result = await alpacaRequest<AlpacaActivity[]>(
    `/v2/account/activities?${queryParams.toString()}`,
    credentials
  );

  if (result.error) {
    return { error: result.error };
  }

  return { activities: result.data || [] };
}

/**
 * Get filled orders and their executions for syncing
 * This combines orders and activities to get complete execution data
 * Also fetches all closed orders to capture bracket leg statuses (canceled TP/SL)
 *
 * @param credentials - Alpaca API credentials
 * @param afterTimestamp - ISO timestamp to fetch orders after (for incremental sync)
 */
export async function getFilledOrdersWithExecutions(
  credentials: AlpacaCredentials,
  afterTimestamp?: string
): Promise<{
  orders: AlpacaOrder[];
  allOrders: AlpacaOrder[]; // All orders including non-filled for bracket data
  activities: AlpacaActivity[];
  error?: string;
  newCursor?: string;
}> {
  // Fetch filled orders for position syncing
  const ordersResult = await getOrders(credentials, {
    status: 'filled',
    after: afterTimestamp,
    limit: 500,
    direction: 'asc', // Oldest first for proper cursor tracking
    nested: true,
  });

  if (ordersResult.error) {
    return { orders: [], allOrders: [], activities: [], error: ordersResult.error };
  }

  const orders = ordersResult.orders || [];

  // Also fetch ALL closed orders (includes canceled, filled, expired) to capture bracket legs
  // This ensures we get TP/SL status even when one leg was canceled
  const allOrdersResult = await getOrders(credentials, {
    status: 'closed', // Gets all closed orders: filled, canceled, expired
    after: afterTimestamp,
    limit: 500,
    direction: 'asc',
    nested: true,
  });

  const allOrders = allOrdersResult.orders || [];

  // Fetch fill activities for detailed execution data
  const activitiesResult = await getActivities(credentials, {
    activity_type: 'FILL',
    after: afterTimestamp,
    page_size: 100,
    direction: 'asc',
  });

  if (activitiesResult.error) {
    // If activities fail, we can still use orders (they have filled_avg_price)
    console.warn('Failed to fetch activities, using orders only:', activitiesResult.error);
  }

  const activities = activitiesResult.activities || [];

  // Calculate new cursor (latest filled_at timestamp from filled orders)
  let newCursor = afterTimestamp;
  for (const order of orders) {
    if (order.filled_at && (!newCursor || order.filled_at > newCursor)) {
      newCursor = order.filled_at;
    }
  }

  return {
    orders,
    allOrders,
    activities,
    newCursor: newCursor !== afterTimestamp ? newCursor : undefined,
  };
}
