import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Normalize symbol by removing broker prefixes and converting to uppercase
function normalizeSymbol(symbol: string | null | undefined): string | null {
  if (!symbol) return null;
  // Remove any prefix like "BROKER:" or "EXCHANGE:"
  const normalized = symbol.replace(/^[A-Z0-9_]+:/i, "").toUpperCase();
  return normalized || null;
}

// Normalize timestamp to Date object
function normalizeTimestamp(ts: unknown): Date {
  if (!ts) return new Date();
  
  if (typeof ts === "string") {
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  if (typeof ts === "number") {
    // Handle unix seconds vs milliseconds
    const ms = ts > 9999999999 ? ts : ts * 1000;
    return new Date(ms);
  }
  
  return new Date();
}

// JSON response helper
function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Authenticate via x-api-key header only
async function authenticateByApiKey(
  serviceClient: SupabaseClient,
  apiKey: string | null,
): Promise<{ userId: string | null; error: string | null }> {
  if (!apiKey) {
    return { userId: null, error: "Missing x-api-key header" };
  }

  console.log("Authenticating via API key");

  // Look up user by API key using service client
  const { data: profile, error: lookupError } = await serviceClient
    .from("profiles")
    .select("user_id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (lookupError) {
    console.error("API key lookup error:", lookupError);
    return { userId: null, error: "API key validation failed" };
  }

  if (!profile) {
    console.log("No profile found for API key");
    return { userId: null, error: "Invalid API key" };
  }

  console.log("API key authenticated for user:", profile.user_id);
  return { userId: profile.user_id, error: null };
}

// Log event to trade_log table
async function logEvent(
  serviceClient: SupabaseClient,
  userId: string,
  eventType: string,
  symbol: string | null,
  side: string | null,
  price: number | null,
  quantity: number | null,
  platform: string,
  timestamp: Date,
  isSimulation: boolean,
  raw: unknown,
): Promise<void> {
  const { error } = await serviceClient.from("trade_log").insert({
    user_id: userId,
    event_type: eventType,
    symbol,
    side,
    price,
    quantity,
    platform,
    timestamp: timestamp.toISOString(),
    is_simulation: isSimulation,
    raw,
  });

  if (error) {
    console.error("Error logging event:", error);
  } else {
    console.log("Event logged:", eventType, symbol);
  }
}

// Handle TRADE_ENTRY - create new position
async function handleTradeEntry(
  serviceClient: SupabaseClient,
  userId: string,
  symbol: string,
  side: string,
  price: number,
  quantity: number,
  platform: string,
  timestamp: Date,
  isSimulation: boolean,
): Promise<Response> {
  console.log("Processing TRADE_ENTRY:", { userId, symbol, side, price, quantity });

  // Validate side
  const normalizedSide = side.toLowerCase();
  if (!["long", "short"].includes(normalizedSide)) {
    return jsonResponse({
      success: false,
      status: "invalid_request",
      reason: "side must be 'long' or 'short'",
    }, 400);
  }

  // Insert new position using service client (bypasses RLS)
  const { data: position, error } = await serviceClient
    .from("positions")
    .insert({
      user_id: userId,
      symbol,
      side: normalizedSide,
      quantity,
      entry_price: price,
      entry_timestamp: timestamp.toISOString(),
      platform,
      open: true,
      is_simulation: isSimulation,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating position:", error);
    return jsonResponse({ success: false, status: "server_error", reason: error.message }, 500);
  }

  console.log("Position created:", position.id);
  return jsonResponse({ success: true, status: "position_created", id: position.id });
}

// Handle TRADE_EXIT - close existing position(s) with FIFO matching
async function handleTradeExit(
  serviceClient: SupabaseClient,
  userId: string,
  symbol: string,
  exitPrice: number,
  exitQuantity: number | null,
  platform: string,
  timestamp: Date,
  isSimulation: boolean,
): Promise<Response> {
  console.log("Processing TRADE_EXIT:", { userId, symbol, exitPrice, exitQuantity });

  // Find all open positions for this user + symbol, ordered by entry time (FIFO)
  const { data: openPositions, error: findError } = await serviceClient
    .from("positions")
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .eq("open", true)
    .order("entry_timestamp", { ascending: true });

  if (findError) {
    console.error("Error finding open positions:", findError);
    return jsonResponse({ success: false, status: "server_error", reason: findError.message }, 500);
  }

  if (!openPositions || openPositions.length === 0) {
    console.log("No open position found for symbol:", symbol);
    return jsonResponse({
      success: false,
      status: "no_open_position",
      reason: `No open position found for symbol`,
    }, 404);
  }

  // Determine quantity to close
  let remainingQty = exitQuantity ?? openPositions[0].quantity;
  const closedPositions: Array<{ id: number; pnl: number }> = [];

  for (const pos of openPositions) {
    if (remainingQty <= 0) break;

    const closeQty = Math.min(remainingQty, Number(pos.quantity));

    // Calculate PnL based on side
    let pnl: number;
    if (pos.side === "long") {
      pnl = (exitPrice - Number(pos.entry_price)) * closeQty;
    } else {
      pnl = (Number(pos.entry_price) - exitPrice) * closeQty;
    }
    pnl = Math.round(pnl * 100) / 100;

    if (closeQty < Number(pos.quantity)) {
      // Partial close: split the position
      // Update original position with remaining quantity
      const { error: splitError } = await serviceClient
        .from("positions")
        .update({
          quantity: Number(pos.quantity) - closeQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pos.id);

      if (splitError) {
        console.error("Failed to split position:", splitError);
        continue;
      }

      // Create a new closed position for the closed portion
      const { data: closedPos, error: closeError } = await serviceClient
        .from("positions")
        .insert({
          user_id: userId,
          symbol: pos.symbol,
          platform: pos.platform,
          side: pos.side,
          quantity: closeQty,
          entry_price: pos.entry_price,
          entry_timestamp: pos.entry_timestamp,
          exit_price: exitPrice,
          exit_timestamp: timestamp.toISOString(),
          pnl,
          open: false,
          is_simulation: pos.is_simulation,
        })
        .select("id")
        .single();

      if (closeError) {
        console.error("Failed to create closed position:", closeError);
      } else if (closedPos) {
        closedPositions.push({ id: closedPos.id, pnl });
      }
    } else {
      // Full close: update the existing position
      const { error: updateError } = await serviceClient
        .from("positions")
        .update({
          exit_price: exitPrice,
          exit_timestamp: timestamp.toISOString(),
          pnl,
          open: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pos.id);

      if (updateError) {
        console.error("Error closing position:", updateError);
        return jsonResponse({ success: false, status: "server_error", reason: updateError.message }, 500);
      }

      closedPositions.push({ id: pos.id, pnl });
    }

    remainingQty -= closeQty;
  }

  const totalPnl = Math.round(closedPositions.reduce((sum, p) => sum + p.pnl, 0) * 100) / 100;
  console.log("Closed positions:", closedPositions, "Total PnL:", totalPnl);

  if (closedPositions.length === 1) {
    return jsonResponse({
      success: true,
      status: "position_closed",
      id: closedPositions[0].id,
      pnl: closedPositions[0].pnl,
    });
  }

  return jsonResponse({
    success: true,
    status: "positions_closed",
    positions: closedPositions,
    total_pnl: totalPnl,
  });
}

// Handle USER_ACTIVITY
async function handleUserActivity(
  serviceClient: SupabaseClient,
  userId: string,
  activityPlatform: string,
  isActive: boolean,
  timestamp: Date,
): Promise<Response> {
  console.log("Processing USER_ACTIVITY:", { userId, activityPlatform, isActive });

  const { error } = await serviceClient.from("user_activity").insert({
    user_id: userId,
    platform: activityPlatform,
    is_active: isActive,
    timestamp: timestamp.toISOString(),
  });

  if (error) {
    console.error("Error recording activity:", error);
    return jsonResponse({ success: false, status: "server_error", reason: error.message }, 500);
  }

  console.log("Activity recorded");
  return jsonResponse({ success: true, status: "activity_logged" });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, status: "invalid_request", reason: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return jsonResponse({ success: false, status: "server_error", reason: "Server configuration error" }, 500);
    }

    // Create service client for privileged operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate via x-api-key header
    const apiKey = req.headers.get("x-api-key");
    const { userId, error: authError } = await authenticateByApiKey(serviceClient, apiKey);

    if (authError || !userId) {
      console.error("Authentication failed:", authError);
      return jsonResponse({ success: false, status: "unauthorized", reason: authError || "Authentication required" }, 401);
    }

    // Parse payload
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, status: "invalid_request", reason: "Invalid JSON body" }, 400);
    }

    console.log("Received payload:", JSON.stringify(body));

    // Normalize event type (accept both 'type' and 'event_type')
    const rawType = body.type ?? body.event_type;
    const eventType = rawType ? String(rawType).toUpperCase() : null;

    if (!eventType) {
      return jsonResponse({ success: false, status: "invalid_request", reason: "Missing type or event_type" }, 400);
    }

    // Extract common fields
    const symbol = normalizeSymbol(body.symbol as string);
    const platform = (body.platform as string) || "TradingView";
    const isSimulation = Boolean(body.is_simulation || body.isSimulation);
    const timestamp = normalizeTimestamp(body.timestamp);
    const side = body.side as string | null;
    const price = body.price as number | null;
    
    // Ensure quantity is always a number
    let quantity: number | null = null;
    if (body.quantity !== undefined && body.quantity !== null) {
      quantity = Number(body.quantity);
      if (isNaN(quantity)) {
        return jsonResponse({
          success: false,
          status: "invalid_quantity",
          reason: "Quantity must be a number",
        }, 400);
      }
    }

    // Log every event to trade_log
    await logEvent(
      serviceClient,
      userId,
      eventType,
      symbol,
      side,
      price,
      quantity,
      platform,
      timestamp,
      isSimulation,
      body,
    );

    // Route to appropriate handler
    switch (eventType) {
      case "TRADE_ENTRY": {
        if (!symbol || !side || price == null || quantity == null) {
          return jsonResponse({
            success: false,
            status: "invalid_request",
            reason: "TRADE_ENTRY requires symbol, side, price, and quantity",
          }, 400);
        }
        return await handleTradeEntry(
          serviceClient,
          userId,
          symbol,
          side,
          price,
          quantity,
          platform,
          timestamp,
          isSimulation,
        );
      }

      case "TRADE_EXIT": {
        if (!symbol || price == null) {
          return jsonResponse({
            success: false,
            status: "invalid_request",
            reason: "TRADE_EXIT requires symbol and price",
          }, 400);
        }
        return await handleTradeExit(
          serviceClient,
          userId,
          symbol,
          price,
          quantity,
          platform,
          timestamp,
          isSimulation,
        );
      }

      case "USER_ACTIVITY": {
        // Handle nested data structure
        const activityData = (body.data as Record<string, unknown>) || body;
        const activityPlatform = (activityData.platform as string) || platform;
        const isActive = activityData.is_active !== undefined ? Boolean(activityData.is_active) : true;
        const activityTimestamp = normalizeTimestamp(activityData.timestamp || body.timestamp);

        return await handleUserActivity(serviceClient, userId, activityPlatform, isActive, activityTimestamp);
      }

      default:
        console.log("Unknown event type:", eventType);
        return jsonResponse({
          success: false,
          status: "invalid_request",
          reason: `Unknown event type: ${eventType}`,
        }, 400);
    }
  } catch (error) {
    console.error("Server error:", error);
    return jsonResponse({
      success: false,
      status: "server_error",
      reason: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
