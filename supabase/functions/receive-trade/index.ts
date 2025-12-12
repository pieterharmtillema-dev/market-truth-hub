import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// SYMBOL NORMALIZATION
// ============================================================================

function normalizeSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return (
    raw
      .replace(/^[A-Z0-9_]+:/i, "")
      .toUpperCase()
      .trim() || null
  );
}

// ============================================================================
// SIDE NORMALIZATION
// ============================================================================

function normalizeSide(raw: string | null | undefined): "long" | "short" | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "buy" || s === "long") return "long";
  if (s === "sell" || s === "short") return "short";
  return null;
}

// ============================================================================
// ASSET CLASS DETECTION
// ============================================================================

type AssetClass = "forex" | "crypto" | "stock" | "index" | "metal" | "commodity";

function getAssetClass(symbol: string): AssetClass {
  const s = symbol.toUpperCase();

  // Metals - XAU (Gold), XAG (Silver), XPT (Platinum), XPD (Palladium)
  if (s.startsWith("XAU") || s.startsWith("XAG") || s.startsWith("XPT") || s.startsWith("XPD")) {
    return "metal";
  }

  // Commodities - Oil, Natural Gas
  const commodityPatterns = ["USOIL", "UKOIL", "WTICOUSD", "BCOUSD", "NGAS", "NATGAS", "BRENT", "WTI"];
  if (commodityPatterns.some((p) => s.includes(p))) {
    return "commodity";
  }

  // Indices - Major world indices
  const indexPatterns = [
    "SPX",
    "SPX500",
    "US500",
    "NAS",
    "NAS100",
    "US100",
    "NDX",
    "USTEC",
    "DJI",
    "US30",
    "DJ30",
    "DAX",
    "GER30",
    "GER40",
    "DE30",
    "DE40",
    "UK100",
    "FTSE",
    "JP225",
    "JPN225",
    "NIKKEI",
    "AUS200",
    "ASX200",
    "FRA40",
    "CAC40",
    "EU50",
    "EUSTX50",
    "HK50",
    "HSI",
  ];
  if (indexPatterns.some((p) => s.includes(p))) {
    return "index";
  }

  // Crypto - ends with USDT, BTC, ETH or contains crypto base currencies
  const cryptoBases = [
    "BTC",
    "ETH",
    "XRP",
    "LTC",
    "ADA",
    "DOT",
    "SOL",
    "DOGE",
    "SHIB",
    "AVAX",
    "MATIC",
    "LINK",
    "UNI",
    "ATOM",
    "BNB",
    "XLM",
    "TRX",
    "NEAR",
    "APT",
    "ARB",
  ];
  if (s.endsWith("USDT") || s.endsWith("BUSD") || s.endsWith("USDC")) {
    return "crypto";
  }
  if (cryptoBases.some((c) => s.startsWith(c) && (s.endsWith("USD") || s.endsWith("USDT")))) {
    return "crypto";
  }

  // Forex - exactly 6 letters of major/minor currency pairs
  const forexCurrencies = [
    "EUR",
    "USD",
    "GBP",
    "JPY",
    "AUD",
    "NZD",
    "CAD",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "SGD",
    "HKD",
    "ZAR",
    "MXN",
    "TRY",
    "PLN",
    "CZK",
    "HUF",
  ];
  if (s.length === 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    if (forexCurrencies.includes(base) && forexCurrencies.includes(quote)) {
      return "forex";
    }
  }

  return "stock";
}

// ============================================================================
// PIP / TICK SIZE
// ============================================================================

function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.endsWith("JPY")) return 0.01;
  if (s.startsWith("XAU")) return 0.1;
  if (s.startsWith("XAG")) return 0.01;
  return 0.0001;
}

function getTickSize(assetClass: AssetClass, symbol: string): number {
  if (assetClass === "forex") return getPipSize(symbol);
  if (assetClass === "metal") {
    if (symbol.startsWith("XAU")) return 0.1;
    if (symbol.startsWith("XAG")) return 0.01;
    return 0.01;
  }
  if (assetClass === "index" || assetClass === "commodity") return 0.01;
  return 0.01; // stocks, crypto
}

// ============================================================================
// PNL CALCULATION - TradingView Accurate
// ============================================================================

interface PnLResult {
  pnl: number;
  pnlPct: number;
  pipSize: number | null;
  pipValue: number | null;
  pips: number | null;
  tickSize: number | null;
  tickValue: number | null;
  ticks: number | null;
}

function calculatePnL(
  side: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  assetClass: AssetClass,
  symbol?: string,
): PnLResult {
  const isLong = side === "long";
  const priceDiff = isLong ? exitPrice - entryPrice : entryPrice - exitPrice;

  let pnl = 0;
  let pipSize: number | null = null;
  let pipValuePerUnit: number | null = null;
  let pips: number | null = null;
  let tickSize: number | null = null;
  let tickValuePerUnit: number | null = null;
  let ticks: number | null = null;

  // FOREX
  if (assetClass === "forex") {
    pipSize = symbol?.endsWith("JPY")
      ? 0.01
      : symbol?.startsWith("XAU")
        ? 0.1
        : symbol?.startsWith("XAG")
          ? 0.01
          : 0.0001;

    pipValuePerUnit = pipSize; // 1 pip = pipSize per unit
    pips = priceDiff / pipSize;

    pnl = Math.round(pips * quantity * pipValuePerUnit * 100) / 100;
  }

  // METALS
  else if (assetClass === "metal") {
    tickSize = symbol?.startsWith("XAU") ? 0.1 : 0.01;
    tickValuePerUnit = 1; // 1 tick = 1 * quantity
    ticks = priceDiff / tickSize;
    pnl = Math.round(ticks * quantity * tickValuePerUnit * 100) / 100;
  }

  // INDICES / COMMODITIES
  else if (assetClass === "index" || assetClass === "commodity") {
    tickSize = 0.01;
    tickValuePerUnit = 1;
    ticks = priceDiff / tickSize;
    pnl = Math.round(ticks * quantity * tickValuePerUnit * 100) / 100;
  }

  // CRYPTO / STOCK
  else {
    pnl = Math.round(priceDiff * quantity * 100) / 100;
  }

  const cost = entryPrice * quantity;
  const pnlPct = cost > 0 ? Math.round((pnl / cost) * 10000) / 100 : 0;

  return {
    pnl,
    pnlPct,
    pipSize,
    pipValue: pipValuePerUnit ? pipValuePerUnit * quantity : null,
    pips,
    tickSize,
    tickValue: tickValuePerUnit ? tickValuePerUnit * quantity : null,
    ticks,
  };
}

// ============================================================================
// TIMESTAMP NORMALIZATION
// ============================================================================

function normalizeTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();

  if (typeof ts === "string") {
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  if (typeof ts === "number") {
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

function errorResponse(status: string, reason: string, httpCode = 400): Response {
  return jsonResponse({ success: false, status, reason }, httpCode);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

async function authenticateRequest(serviceClient: SupabaseClient, apiKey: string | null): Promise<AuthResult> {
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
    pnl?: number | null;
    pnlPct?: number | null;
  },
  nowIso: string,
): Promise<void> {
  try {
    const assetClass = data.symbol ? getAssetClass(data.symbol) : null;
    const pipSize = data.symbol ? getPipSize(data.symbol) : null;
    const tickSize = assetClass && data.symbol ? getTickSize(assetClass, data.symbol) : null;

    let pipValue: number | null = null;
    let tickValue: number | null = null;

    if (assetClass === "forex" && data.quantity && pipSize) {
      pipValue = data.quantity * pipSize;
    }
    if ((assetClass === "metal" || assetClass === "index" || assetClass === "commodity") && data.quantity) {
      tickValue = data.quantity;
    }

    const { error } = await serviceClient.from("trade_log").insert({
      user_id: userId,
      event_type: eventType,
      symbol: data.symbol,
      side: data.side,
      price: data.price,
      quantity: data.quantityLots,
      raw_quantity: data.quantity,
      quantity_lots: data.quantityLots,
      platform: data.platform || "TradingView",
      timestamp: data.timestamp || nowIso,
      is_simulation: data.isSimulation || false,
      raw: data.raw,
      asset_class: assetClass,
      pip_size: pipSize,
      pip_value: pipValue,
      tick_size: tickSize,
      tick_value: tickValue,
      pnl: data.pnl,
      pnl_pct: data.pnlPct,
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

async function handleTradeEntry(
  serviceClient: SupabaseClient,
  userId: string,
  payload: {
    symbol: string;
    side: "long" | "short";
    price: number;
    quantity: number;
    quantityLots?: number;
    platform: string;
    timestamp: string;
    isSimulation: boolean;
  },
  nowIso: string,
): Promise<Response> {
  const { symbol, side, price, quantity, quantityLots, platform, timestamp, isSimulation } = payload;

  console.log("Processing TRADE_ENTRY:", { userId, symbol, side, price, quantity, quantityLots });

  const assetClass = getAssetClass(symbol);
  const pipSize = getPipSize(symbol);
  const tickSize = getTickSize(assetClass, symbol);

  let pipValue: number | null = null;
  let tickValue: number | null = null;

  if (assetClass === "forex") {
    pipValue = quantity * pipSize;
  }
  if (assetClass === "metal" || assetClass === "index" || assetClass === "commodity") {
    tickValue = quantity;
  }

  console.log(`Asset class detected: ${assetClass}`);

  const { data: position, error } = await serviceClient
    .from("positions")
    .insert({
      user_id: userId,
      symbol: symbol,
      platform: platform,
      side: side,
      quantity: quantity,
      quantity_lots: quantityLots || quantity,
      entry_price: price,
      entry_timestamp: timestamp,
      open: true,
      is_simulation: isSimulation,
      asset_class: assetClass,
      pip_size: assetClass === "forex" ? pipSize : null,
      pip_value: pipValue,
      tick_size: tickSize,
      tick_value: tickValue,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Position insert error:", error);
    return errorResponse("server_error", error.message, 500);
  }

  console.log("Position created:", position.id);

  return jsonResponse({
    success: true,
    status: "position_created",
    position_id: position.id,
    asset_class: assetClass,
    pip_size: assetClass === "forex" ? pipSize : null,
    pip_value: pipValue,
    tick_size: tickSize,
    tick_value: tickValue,
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
  asset_class: string | null;
}

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
  },
  nowIso: string,
): Promise<Response> {
  const { symbol, price: exitPrice, quantity: exitQuantity, quantityLots: exitLots, timestamp } = payload;

  console.log("Processing TRADE_EXIT:", { userId, symbol, exitPrice, exitQuantity, exitLots });

  const { data: openPositions, error: fetchError } = await serviceClient
    .from("positions")
    .select(
      "id, symbol, side, quantity, quantity_lots, entry_price, entry_timestamp, platform, is_simulation, asset_class",
    )
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .eq("open", true)
    .order("entry_timestamp", { ascending: true });

  if (fetchError) {
    console.error("Fetch positions error:", fetchError);
    return errorResponse("server_error", fetchError.message, 500);
  }

  if (!openPositions || openPositions.length === 0) {
    console.log("No open positions found for symbol:", symbol);
    return errorResponse("no_open_position", `No open position found for ${symbol}`, 404);
  }

  const assetClass = getAssetClass(symbol);
  let remainingQuantity = exitQuantity;
  let totalPnL = 0;
  let totalPnLPct = 0;
  const closedPositions: Array<{ id: number; pnl: number; pnlPct: number; quantity: number }> = [];
  let partialCloseCount = 0;

  // PnL metadata for response
  let lastPnLResult: PnLResult | null = null;

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
      // FULL CLOSE
      // ========================================
      const pnlResult = calculatePnL(position.side, position.entry_price, exitPrice, positionQty, assetClass, symbol);
      lastPnLResult = pnlResult;

      console.log(
        `Closing FULL position ${position.id}: qty=${positionQty}, entry=${position.entry_price}, exit=${exitPrice}, pnl=${pnlResult.pnl}`,
      );

      const { error: updateError } = await serviceClient
        .from("positions")
        .update({
          exit_price: exitPrice,
          exit_timestamp: timestamp,
          pnl: pnlResult.pnl,
          pnl_pct: pnlResult.pnlPct,
          open: false,
          updated_at: nowIso,
          pip_size: pnlResult.pipSize,
          pip_value: pnlResult.pipValue,
          pips: pnlResult.pips,
          tick_size: pnlResult.tickSize,
          tick_value: pnlResult.tickValue,
          ticks: pnlResult.ticks,
        })
        .eq("id", position.id);

      if (updateError) {
        console.error(`Failed to close position ${position.id}:`, updateError);
        continue;
      }

      remainingQuantity -= positionQty;
      totalPnL += pnlResult.pnl;
      totalPnLPct += pnlResult.pnlPct;
      closedPositions.push({ id: position.id, pnl: pnlResult.pnl, pnlPct: pnlResult.pnlPct, quantity: positionQty });
    } else {
      // ========================================
      // PARTIAL CLOSE
      // ========================================
      const closedQty = remainingQuantity;
      const remainingPosQty = positionQty - closedQty;

      const pnlResult = calculatePnL(position.side, position.entry_price, exitPrice, closedQty, assetClass, symbol);
      lastPnLResult = pnlResult;

      // Calculate proportional lots with precision
      const closedLots = Number(((closedQty / positionQty) * positionLots).toFixed(8));
      const remainingLots = Number((positionLots - closedLots).toFixed(8));

      console.log(
        `PARTIAL close position ${position.id}: closing ${closedQty} units (${closedLots} lots), remaining ${remainingPosQty} units, pnl=${pnlResult.pnl}`,
      );

      // Update original position with remaining quantity
      const { error: updateError } = await serviceClient
        .from("positions")
        .update({
          quantity: remainingPosQty,
          quantity_lots: remainingLots,
          updated_at: nowIso,
        })
        .eq("id", position.id);

      if (updateError) {
        console.error(`Failed to update position ${position.id}:`, updateError);
        continue;
      }

      // Create closed position record
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
          pnl: pnlResult.pnl,
          pnl_pct: pnlResult.pnlPct,
          open: false,
          is_simulation: position.is_simulation,
          asset_class: assetClass,
          pip_size: pnlResult.pipSize,
          pip_value: pnlResult.pipValue,
          pips: pnlResult.pips,
          tick_size: pnlResult.tickSize,
          tick_value: pnlResult.tickValue,
          ticks: pnlResult.ticks,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to create closed portion:", insertError);
      } else if (closedPos) {
        closedPositions.push({ id: closedPos.id, pnl: pnlResult.pnl, pnlPct: pnlResult.pnlPct, quantity: closedQty });
      }

      remainingQuantity = 0;
      totalPnL += pnlResult.pnl;
      totalPnLPct += pnlResult.pnlPct;
      partialCloseCount++;
    }
  }

  if (closedPositions.length === 0) {
    return errorResponse("close_failed", "Failed to close any positions", 500);
  }

  const roundedTotalPnL = Math.round(totalPnL * 100) / 100;
  const avgPnLPct = closedPositions.length > 0 ? Math.round((totalPnLPct / closedPositions.length) * 100) / 100 : 0;

  console.log(
    `Exit complete: ${closedPositions.length} positions closed, ${partialCloseCount} partial, total PnL: ${roundedTotalPnL}`,
  );

  const responseData: Record<string, unknown> = {
    success: true,
    asset_class: assetClass,
    pnl: roundedTotalPnL,
    pnl_pct: avgPnLPct,
  };

  // Add pip/tick metadata from last result
  if (lastPnLResult) {
    responseData.pip_size = lastPnLResult.pipSize;
    responseData.pip_value = lastPnLResult.pipValue;
    responseData.pips = lastPnLResult.pips;
    responseData.tick_size = lastPnLResult.tickSize;
    responseData.tick_value = lastPnLResult.tickValue;
    responseData.ticks = lastPnLResult.ticks;
  }

  if (closedPositions.length === 1) {
    responseData.status = "position_closed";
    responseData.position_id = closedPositions[0].id;
    responseData.quantity_closed = closedPositions[0].quantity;
  } else {
    responseData.status = "positions_closed";
    responseData.positions_closed = closedPositions.length;
    responseData.partial_closes = partialCloseCount;
    responseData.positions = closedPositions;
  }

  return jsonResponse(responseData);
}

// ============================================================================
// USER ACTIVITY HANDLER
// ============================================================================

async function handleUserActivity(
  serviceClient: SupabaseClient,
  userId: string,
  payload: {
    platform: string;
    isActive: boolean;
    timestamp: string;
  },
): Promise<Response> {
  const { platform, isActive, timestamp } = payload;

  let normalizedPlatform = platform;
  if (platform.toLowerCase().includes("tradingview")) {
    normalizedPlatform = "TradingView";
  }

  console.log("Processing USER_ACTIVITY:", { userId, platform: normalizedPlatform, isActive });

  const { error } = await serviceClient.from("user_activity").insert({
    user_id: userId,
    platform: normalizedPlatform,
    is_active: isActive,
    timestamp: timestamp,
  });

  if (error) {
    console.error("Activity insert error:", error);
    return errorResponse("server_error", error.message, 500);
  }

  console.log("Activity recorded");
  return jsonResponse({ success: true, status: "activity_logged" });
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST requests are accepted", 405);
  }

  // Single timestamp for this request
  const nowIso = new Date().toISOString();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables");
      return errorResponse("server_error", "Server configuration error", 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const apiKey = req.headers.get("x-api-key");
    const authResult = await authenticateRequest(serviceClient, apiKey);

    if (!authResult.success || !authResult.userId) {
      console.log("Authentication failed:", authResult.error);
      return errorResponse("unauthorized", authResult.error || "Authentication failed", 401);
    }

    const userId = authResult.userId;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("invalid_request", "Invalid JSON body", 400);
    }

    console.log("Received payload:", JSON.stringify(body));

    const rawType = body.type ?? body.event_type;
    const eventType = rawType ? String(rawType).toUpperCase() : null;

    if (!eventType) {
      return errorResponse("invalid_request", "Missing type or event_type field", 400);
    }

    // Normalize symbol
    const rawSymbol = body.symbol as string | undefined;
    const symbol = normalizeSymbol(rawSymbol);

    // Normalize side
    const rawSide = body.side as string | undefined;
    const side = normalizeSide(rawSide);

    // Validate and extract quantity
    let quantity: number | null = null;
    if (body.quantity !== undefined && body.quantity !== null) {
      quantity = Number(body.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return errorResponse("invalid_quantity", "Quantity must be a positive number", 400);
      }
    }

    // Extract quantity_lots
    let quantityLots: number | null = null;
    if (body.quantity_lots !== undefined && body.quantity_lots !== null) {
      quantityLots = Number(body.quantity_lots);
      if (isNaN(quantityLots)) quantityLots = quantity;
    } else {
      quantityLots = quantity;
    }

    // Extract price with validation
    let price: number | null = null;
    if (body.price !== undefined && body.price !== null) {
      price = Number(body.price);
      if (isNaN(price) || price <= 0) {
        return errorResponse("invalid_price", "Price must be a positive number", 400);
      }
    }

    const timestamp = normalizeTimestamp(body.timestamp);
    const platform = (body.platform as string) || "TradingView";
    const isSimulation = Boolean(body.is_simulation || body.isSimulation);

    // Log every event
    await logEvent(
      serviceClient,
      userId,
      eventType,
      {
        symbol,
        side,
        price,
        quantity,
        quantityLots,
        platform,
        timestamp,
        isSimulation,
        raw: body,
      },
      nowIso,
    );

    // Route to appropriate handler
    switch (eventType) {
      case "TRADE_ENTRY": {
        if (!symbol || !side || price === null || quantity === null) {
          return errorResponse("invalid_request", "TRADE_ENTRY requires symbol, side, price, and quantity", 400);
        }

        return await handleTradeEntry(
          serviceClient,
          userId,
          {
            symbol,
            side,
            price,
            quantity,
            quantityLots: quantityLots || quantity,
            platform,
            timestamp,
            isSimulation,
          },
          nowIso,
        );
      }

      case "TRADE_EXIT": {
        if (!symbol || price === null || quantity === null) {
          return errorResponse("invalid_request", "TRADE_EXIT requires symbol, price, and quantity", 400);
        }

        return await handleTradeExit(
          serviceClient,
          userId,
          {
            symbol,
            price,
            quantity,
            quantityLots: quantityLots || quantity,
            platform,
            timestamp,
            isSimulation,
          },
          nowIso,
        );
      }

      case "USER_ACTIVITY": {
        const activityData = (body.data as Record<string, unknown>) || body;
        const activityPlatform = (activityData.platform as string) || platform;
        const isActive = activityData.is_active !== undefined ? Boolean(activityData.is_active) : true;
        const activityTimestamp = normalizeTimestamp(activityData.timestamp || body.timestamp);

        return await handleUserActivity(serviceClient, userId, {
          platform: activityPlatform,
          isActive,
          timestamp: activityTimestamp,
        });
      }

      default: {
        console.log("Unknown event type:", eventType);
        return errorResponse("unknown_event_type", `Unknown event type: ${eventType}`, 400);
      }
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse("server_error", error instanceof Error ? error.message : "Unknown error", 500);
  }
});
