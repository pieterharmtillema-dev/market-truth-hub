import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// SYMBOL NORMALIZATION
// ============================================================================

/**
 * Normalize symbol by removing broker prefixes and converting to uppercase
 * Handles prefixes like: TICKMILL:, OANDA:, FX:, BINANCE:, etc.
 */
function normalizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Remove any prefix like "BROKER:" or "EXCHANGE:"
  const normalized = raw.replace(/^[A-Z0-9_]+:/i, "").toUpperCase().trim();
  return normalized || null;
}

// ============================================================================
// ASSET CLASS DETECTION
// ============================================================================

type AssetClass = "forex" | "crypto" | "stock" | "index" | "metal" | "commodity";

/**
 * Detect asset class from normalized symbol
 */
function getAssetClass(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  
  // Metals - XAU (Gold), XAG (Silver), XPT (Platinum), XPD (Palladium)
  if (s.startsWith("XAU") || s.startsWith("XAG") || s.startsWith("XPT") || s.startsWith("XPD")) {
    return "metal";
  }
  
  // Commodities - Oil, Natural Gas
  const commodityPatterns = ["USOIL", "UKOIL", "WTICOUSD", "BCOUSD", "NGAS", "NATGAS", "BRENT", "WTI"];
  if (commodityPatterns.some(p => s.includes(p))) {
    return "commodity";
  }
  
  // Indices - Major world indices
  const indexPatterns = [
    "SPX", "SPX500", "US500", 
    "NAS", "NAS100", "US100", "NDX", "USTEC",
    "DJI", "US30", "DJ30",
    "DAX", "GER30", "GER40", "DE30", "DE40",
    "UK100", "FTSE", "UK100",
    "JP225", "JPN225", "NIKKEI",
    "AUS200", "ASX200",
    "FRA40", "CAC40",
    "EU50", "EUSTX50",
    "HK50", "HSI"
  ];
  if (indexPatterns.some(p => s.includes(p))) {
    return "index";
  }
  
  // Crypto - ends with USDT, BTC, ETH or contains crypto base currencies
  const cryptoBases = ["BTC", "ETH", "XRP", "LTC", "ADA", "DOT", "SOL", "DOGE", "SHIB", "AVAX", "MATIC", "LINK", "UNI", "ATOM", "BNB", "XLM", "TRX", "NEAR", "APT", "ARB"];
  if (s.endsWith("USDT") || s.endsWith("BUSD") || s.endsWith("USDC")) {
    return "crypto";
  }
  if (cryptoBases.some(c => s.startsWith(c) && (s.endsWith("USD") || s.endsWith("USDT")))) {
    return "crypto";
  }
  
  // Forex - exactly 6 letters of major/minor currency pairs
  const forexCurrencies = ["EUR", "USD", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "SEK", "NOK", "DKK", "SGD", "HKD", "ZAR", "MXN", "TRY", "PLN", "CZK", "HUF"];
  if (s.length === 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    if (forexCurrencies.includes(base) && forexCurrencies.includes(quote)) {
      return "forex";
    }
  }
  
  // Default to stock
  return "stock";
}

// ============================================================================
// PIP / TICK SIZE
// ============================================================================

/**
 * Get pip/tick size for forex and metals
 */
function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  
  // JPY pairs have 2 decimal places
  if (s.endsWith("JPY")) return 0.01;
  
  // Gold (XAU) - 0.1 pip
  if (s.startsWith("XAU")) return 0.1;
  
  // Silver (XAG) - 0.01 pip
  if (s.startsWith("XAG")) return 0.01;
  
  // Default forex pip size (4 decimal places)
  return 0.0001;
}

// ============================================================================
// PNL CALCULATION
// ============================================================================

/**
 * Calculate PnL based on asset class and position details
 * Matches TradingView PaperTrading calculation exactly
 * 
 * Formula: (exit_price - entry_price) × units for longs
 *          (entry_price - exit_price) × units for shorts
 */
function calculatePnL(
  side: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  assetClass: AssetClass
): number {
  const isLong = side.toLowerCase() === "long" || side.toLowerCase() === "buy";
  const priceDiff = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;
  
  // TradingView PaperTrading uses contract size = 1 for all assets
  // PnL = price_difference × quantity
  const pnl = priceDiff * quantity;
  
  // Round to 2 decimal places
  return Math.round(pnl * 100) / 100;
}

// ============================================================================
// TIMESTAMP NORMALIZATION
// ============================================================================

/**
 * Normalize timestamp to ISO string
 */
function normalizeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  
  if (typeof ts === "string") {
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  
  if (typeof ts === "number") {
    // Handle unix seconds vs milliseconds
    const timestamp = ts > 9999999999 ? ts : ts * 1000;
    return new Date(timestamp).toISOString();
  }
  
  return new Date().toISOString();
}

// ============================================================================
// JSON RESPONSE HELPER
// ============================================================================

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Authenticate via x-api-key header
 * Looks up profiles.api_key and returns matching user_id
 */
async function authenticateRequest(
  serviceClient: SupabaseClient,
  apiKey: string | null
): Promise<AuthResult> {
  if (!apiKey) {
    return { success: false, error: "Missing x-api-key header" };
  }
  
  console.log("Authenticating via API key...");
  
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("user_id")
    .eq("api_key", apiKey)
    .maybeSingle();
  
  if (error) {
    console.error("API key lookup error:", error);
    return { success: false, error: "API key validation failed" };
  }
  
  if (!profile) {
    console.log("No profile found for API key");
    return { success: false, error: "Invalid API key" };
  }
  
  console.log("Authenticated user:", profile.user_id);
  return { success: true, userId: profile.user_id };
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

/**
 * Log every event to trade_log table for audit trail
 */
async function logEvent(
  serviceClient: SupabaseClient,
  userId: string,
  eventType: string,
  data: {
    symbol?: string | null;
    side?: string | null;
    price?: number | null;
    quantity?: number | null;
    quantityLots?: number | null;
    platform?: string | null;
    timestamp?: string;
    isSimulation?: boolean;
    raw?: unknown;
  }
): Promise<void> {
  try {
    const { error } = await serviceClient.from("trade_log").insert({
      user_id: userId,
      event_type: eventType,
      symbol: data.symbol,
      side: data.side,
      price: data.price,
      quantity: data.quantityLots, // Store lots in quantity field for compatibility
      raw_quantity: data.quantity, // Store raw units
      quantity_lots: data.quantityLots,
      platform: data.platform || "TradingView",
      timestamp: data.timestamp || new Date().toISOString(),
      is_simulation: data.isSimulation || false,
      raw: data.raw,
    });
    
    if (error) {
      console.error("Error logging event:", error);
    } else {
      console.log(`Event logged: ${eventType} ${data.symbol || ""}`);
    }
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

// ============================================================================
// TRADE ENTRY HANDLER
// ============================================================================

/**
 * Handle TRADE_ENTRY - create new open position
 * Allows multiple open positions per symbol (for scaling in)
 */
async function handleTradeEntry(
  serviceClient: SupabaseClient,
  userId: string,
  payload: {
    symbol: string;
    side: string;
    price: number;
    quantity: number;
    quantityLots?: number;
    platform: string;
    timestamp: string;
    isSimulation: boolean;
  }
): Promise<Response> {
  const { symbol, side, price, quantity, quantityLots, platform, timestamp, isSimulation } = payload;
  
  console.log("Processing TRADE_ENTRY:", { userId, symbol, side, price, quantity, quantityLots });
  
  // Validate and normalize side
  const normalizedSide = side.toLowerCase();
  if (!["long", "short", "buy", "sell"].includes(normalizedSide)) {
    return jsonResponse({
      success: false,
      status: "invalid_request",
      reason: "side must be 'long', 'short', 'buy', or 'sell'",
    }, 400);
  }
  
  // Normalize buy/sell to long/short
  const positionSide = normalizedSide === "buy" ? "long" : normalizedSide === "sell" ? "short" : normalizedSide;
  
  // Get asset class for reference
  const assetClass = getAssetClass(symbol);
  console.log(`Asset class detected: ${assetClass}`);
  
  // Insert new position
  const { data: position, error } = await serviceClient
    .from("positions")
    .insert({
      user_id: userId,
      symbol: symbol,
      platform: platform,
      side: positionSide,
      quantity: quantity,
      quantity_lots: quantityLots || quantity,
      entry_price: price,
      entry_timestamp: timestamp,
      open: true,
      is_simulation: isSimulation,
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("Position insert error:", error);
    return jsonResponse({
      success: false,
      status: "server_error",
      reason: error.message,
    }, 500);
  }
  
  console.log("Position created:", position.id);
  
  return jsonResponse({
    success: true,
    status: "position_created",
    position_id: position.id,
    asset_class: assetClass,
  });
}

// ============================================================================
// FIFO POSITION CLOSE HANDLER
// ============================================================================

interface OpenPosition {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  quantity_lots: number | null;
  entry_price: number;
  entry_timestamp: string;
  platform: string;
  is_simulation: boolean;
}

/**
 * Handle TRADE_EXIT - close positions using FIFO matching
 * Supports partial closes and multiple position closes
 */
async function handleTradeExit(
  serviceClient: SupabaseClient,
  userId: string,
  payload: {
    symbol: string;
    price: number;
    quantity: number;
    quantityLots?: number;
    platform: string;
    timestamp: string;
    isSimulation: boolean;
  }
): Promise<Response> {
  const { symbol, price: exitPrice, quantity: exitQuantity, quantityLots: exitLots, timestamp } = payload;
  
  console.log("Processing TRADE_EXIT:", { userId, symbol, exitPrice, exitQuantity, exitLots });
  
  // Get all open positions for this user + symbol, ordered by entry time (FIFO)
  const { data: openPositions, error: fetchError } = await serviceClient
    .from("positions")
    .select("id, symbol, side, quantity, quantity_lots, entry_price, entry_timestamp, platform, is_simulation")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .eq("open", true)
    .order("entry_timestamp", { ascending: true });
  
  if (fetchError) {
    console.error("Fetch positions error:", fetchError);
    return jsonResponse({
      success: false,
      status: "server_error",
      reason: fetchError.message,
    }, 500);
  }
  
  if (!openPositions || openPositions.length === 0) {
    console.log("No open positions found for symbol:", symbol);
    return jsonResponse({
      success: false,
      status: "no_open_position",
      reason: `No open position found for ${symbol}`,
    }, 404);
  }
  
  const assetClass = getAssetClass(symbol);
  let remainingQuantity = exitQuantity;
  let totalPnL = 0;
  const closedPositions: Array<{ id: number; pnl: number; quantity: number }> = [];
  let partialCloseCount = 0;
  
  console.log(`Found ${openPositions.length} open positions for ${symbol}, closing ${remainingQuantity} units (FIFO)`);
  
  for (const position of openPositions as OpenPosition[]) {
    if (remainingQuantity <= 0) break;
    
    const positionQty = Number(position.quantity) || 0;
    const positionLots = Number(position.quantity_lots) || positionQty;
    
    if (positionQty <= 0) {
      console.log(`Skipping position ${position.id} with zero quantity`);
      continue;
    }
    
    if (remainingQuantity >= positionQty) {
      // ========================================
      // FULL CLOSE - close entire position
      // ========================================
      const pnl = calculatePnL(position.side, position.entry_price, exitPrice, positionQty, assetClass);
      
      console.log(`Closing FULL position ${position.id}: qty=${positionQty}, entry=${position.entry_price}, exit=${exitPrice}, pnl=${pnl}`);
      
      const { error: updateError } = await serviceClient
        .from("positions")
        .update({
          exit_price: exitPrice,
          exit_timestamp: timestamp,
          pnl: pnl,
          open: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", position.id);
      
      if (updateError) {
        console.error(`Failed to close position ${position.id}:`, updateError);
        continue;
      }
      
      remainingQuantity -= positionQty;
      totalPnL += pnl;
      closedPositions.push({ id: position.id, pnl, quantity: positionQty });
      
    } else {
      // ========================================
      // PARTIAL CLOSE - close part of position
      // TradingView style: split into closed + remaining
      // ========================================
      const closedQty = remainingQuantity;
      const remainingPosQty = positionQty - closedQty;
      
      const pnl = calculatePnL(position.side, position.entry_price, exitPrice, closedQty, assetClass);
      
      // Calculate proportional lots
      const closedLots = positionLots > 0 ? (closedQty / positionQty) * positionLots : closedQty;
      const remainingLots = positionLots > 0 ? positionLots - closedLots : remainingPosQty;
      
      console.log(`PARTIAL close position ${position.id}: closing ${closedQty} units (${closedLots} lots), remaining ${remainingPosQty} units, pnl=${pnl}`);
      
      // Update original position with remaining quantity
      const { error: updateError } = await serviceClient
        .from("positions")
        .update({
          quantity: remainingPosQty,
          quantity_lots: remainingLots,
          updated_at: new Date().toISOString(),
        })
        .eq("id", position.id);
      
      if (updateError) {
        console.error(`Failed to update position ${position.id}:`, updateError);
        continue;
      }
      
      // Create a new closed position record for the closed portion
      const { data: closedPos, error: insertError } = await serviceClient
        .from("positions")
        .insert({
          user_id: userId,
          symbol: position.symbol,
          platform: position.platform,
          side: position.side,
          quantity: closedQty,
          quantity_lots: closedLots,
          entry_price: position.entry_price,
          entry_timestamp: position.entry_timestamp,
          exit_price: exitPrice,
          exit_timestamp: timestamp,
          pnl: pnl,
          open: false,
          is_simulation: position.is_simulation,
        })
        .select("id")
        .single();
      
      if (insertError) {
        console.error("Failed to create closed portion:", insertError);
      } else if (closedPos) {
        closedPositions.push({ id: closedPos.id, pnl, quantity: closedQty });
      }
      
      remainingQuantity = 0;
      totalPnL += pnl;
      partialCloseCount++;
    }
  }
  
  if (closedPositions.length === 0) {
    return jsonResponse({
      success: false,
      status: "close_failed",
      reason: "Failed to close any positions",
    }, 500);
  }
  
  const roundedTotalPnL = Math.round(totalPnL * 100) / 100;
  console.log(`Exit complete: ${closedPositions.length} positions closed, ${partialCloseCount} partial, total PnL: ${roundedTotalPnL}`);
  
  // Return response based on number of positions closed
  if (closedPositions.length === 1) {
    return jsonResponse({
      success: true,
      status: "position_closed",
      position_id: closedPositions[0].id,
      pnl: closedPositions[0].pnl,
      quantity_closed: closedPositions[0].quantity,
      asset_class: assetClass,
    });
  }
  
  return jsonResponse({
    success: true,
    status: "positions_closed",
    positions_closed: closedPositions.length,
    partial_closes: partialCloseCount,
    positions: closedPositions,
    pnl: roundedTotalPnL,
    asset_class: assetClass,
  });
}

// ============================================================================
// USER ACTIVITY HANDLER
// ============================================================================

/**
 * Handle USER_ACTIVITY - log platform activity status
 */
async function handleUserActivity(
  serviceClient: SupabaseClient,
  userId: string,
  payload: {
    platform: string;
    isActive: boolean;
    timestamp: string;
  }
): Promise<Response> {
  const { platform, isActive, timestamp } = payload;
  
  // Normalize platform name
  let normalizedPlatform = platform;
  if (platform.toLowerCase().includes("tradingview")) {
    normalizedPlatform = "TradingView";
  }
  
  console.log("Processing USER_ACTIVITY:", { userId, platform: normalizedPlatform, isActive });
  
  const { error } = await serviceClient
    .from("user_activity")
    .insert({
      user_id: userId,
      platform: normalizedPlatform,
      is_active: isActive,
      timestamp: timestamp,
    });
  
  if (error) {
    console.error("Activity insert error:", error);
    return jsonResponse({
      success: false,
      status: "server_error",
      reason: error.message,
    }, 500);
  }
  
  console.log("Activity recorded");
  return jsonResponse({
    success: true,
    status: "activity_logged",
  });
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return jsonResponse({
      success: false,
      status: "method_not_allowed",
      reason: "Only POST requests are accepted",
    }, 405);
  }
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return jsonResponse({
        success: false,
        status: "server_error",
        reason: "Server configuration error",
      }, 500);
    }
    
    // Create service client (bypasses RLS for privileged operations)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    // Authenticate via x-api-key header
    const apiKey = req.headers.get("x-api-key");
    const authResult = await authenticateRequest(serviceClient, apiKey);
    
    if (!authResult.success || !authResult.userId) {
      console.log("Authentication failed:", authResult.error);
      return jsonResponse({
        success: false,
        status: "unauthorized",
        reason: authResult.error || "Authentication failed",
      }, 401);
    }
    
    const userId = authResult.userId;
    
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        success: false,
        status: "invalid_request",
        reason: "Invalid JSON body",
      }, 400);
    }
    
    console.log("Received payload:", JSON.stringify(body));
    
    // Extract event type (support both 'type' and 'event_type')
    const rawType = body.type ?? body.event_type;
    const eventType = rawType ? String(rawType).toUpperCase() : null;
    
    if (!eventType) {
      return jsonResponse({
        success: false,
        status: "invalid_request",
        reason: "Missing type or event_type field",
      }, 400);
    }
    
    // Normalize symbol
    const rawSymbol = body.symbol as string | undefined;
    const symbol = normalizeSymbol(rawSymbol);
    
    // Extract and validate quantity (raw units)
    let quantity: number | null = null;
    if (body.quantity !== undefined && body.quantity !== null) {
      quantity = Number(body.quantity);
      if (isNaN(quantity)) {
        return jsonResponse({
          success: false,
          status: "invalid_quantity",
          reason: "Quantity must be a valid number",
        }, 400);
      }
    }
    
    // Extract quantity_lots (normalized lots)
    let quantityLots: number | null = null;
    if (body.quantity_lots !== undefined && body.quantity_lots !== null) {
      quantityLots = Number(body.quantity_lots);
      if (isNaN(quantityLots)) {
        quantityLots = quantity; // Fallback to raw quantity
      }
    } else {
      quantityLots = quantity; // Use raw quantity as lots if not provided
    }
    
    // Extract other common fields
    const timestamp = normalizeTimestamp(body.timestamp);
    const side = body.side as string | null;
    const price = body.price !== undefined ? Number(body.price) : null;
    const platform = (body.platform as string) || "TradingView";
    const isSimulation = Boolean(body.is_simulation || body.isSimulation);
    
    // Log every event to trade_log for audit trail
    await logEvent(serviceClient, userId, eventType, {
      symbol,
      side,
      price,
      quantity,
      quantityLots,
      platform,
      timestamp,
      isSimulation,
      raw: body,
    });
    
    // Route to appropriate handler based on event type
    switch (eventType) {
      case "TRADE_ENTRY": {
        if (!symbol || !side || price === null || quantity === null) {
          return jsonResponse({
            success: false,
            status: "invalid_request",
            reason: "TRADE_ENTRY requires symbol, side, price, and quantity",
          }, 400);
        }
        
        return await handleTradeEntry(serviceClient, userId, {
          symbol,
          side,
          price,
          quantity,
          quantityLots: quantityLots || quantity,
          platform,
          timestamp,
          isSimulation,
        });
      }
      
      case "TRADE_EXIT": {
        if (!symbol || price === null || quantity === null) {
          return jsonResponse({
            success: false,
            status: "invalid_request",
            reason: "TRADE_EXIT requires symbol, price, and quantity",
          }, 400);
        }
        
        return await handleTradeExit(serviceClient, userId, {
          symbol,
          price,
          quantity,
          quantityLots: quantityLots || quantity,
          platform,
          timestamp,
          isSimulation,
        });
      }
      
      case "USER_ACTIVITY": {
        // Handle nested data structure
        const activityData = (body.data as Record<string, unknown>) || body;
        const activityPlatform = (activityData.platform as string) || platform;
        const isActive = activityData.is_active !== undefined 
          ? Boolean(activityData.is_active) 
          : true;
        const activityTimestamp = normalizeTimestamp(activityData.timestamp || body.timestamp);
        
        return await handleUserActivity(serviceClient, userId, {
          platform: activityPlatform,
          isActive,
          timestamp: activityTimestamp,
        });
      }
      
      default: {
        console.log("Unknown event type:", eventType);
        return jsonResponse({
          success: false,
          status: "unknown_event_type",
          reason: `Unknown event type: ${eventType}`,
        }, 400);
      }
    }
    
  } catch (error) {
    console.error("Unhandled error:", error);
    return jsonResponse({
      success: false,
      status: "server_error",
      reason: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
