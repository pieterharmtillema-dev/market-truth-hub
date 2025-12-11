import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TradeEntryPayload {
  type: "TRADE_ENTRY";
  symbol: string;
  side: "long" | "short";
  price: number;
  quantity: number;
  timestamp: number;
  platform?: string;
  user_id?: string;
}

interface TradeExitPayload {
  type: "TRADE_EXIT";
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  platform?: string;
  user_id?: string;
}

interface UserActivityPayload {
  type: "USER_ACTIVITY";
  data?: {
    platform: string;
    is_active: boolean;
    timestamp: number;
  };
  platform?: string;
  is_active?: boolean;
  timestamp?: number;
  user_id?: string;
}

type EventPayload = TradeEntryPayload | TradeExitPayload | UserActivityPayload;

// Authenticate request - supports both JWT and API key
async function authenticateRequest(
  req: Request,
  supabase: SupabaseClient,
): Promise<{ userId: string | null; error: string | null }> {
  // Check for API key first (preferred for Chrome extension)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    console.log("Authenticating via API key");

    // Validate API key format
    if (!apiKey.startsWith("md_") || apiKey.length < 20) {
      return { userId: null, error: "Invalid API key format" };
    }

    // Look up user by API key
    const { data: profile, error: lookupError } = await supabase
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

  // Fall back to JWT authentication
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    console.log("Authenticating via JWT");
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("JWT authentication failed:", authError?.message);
      return { userId: null, error: "Invalid authentication token" };
    }

    console.log("JWT authenticated for user:", user.id);
    return { userId: user.id, error: null };
  }

  return { userId: null, error: "Authentication required. Provide x-api-key header or Authorization: Bearer <token>" };
}

// Log raw event to trade_log table
async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  payload: EventPayload,
  timestamp: Date,
): Promise<void> {
  const logData: Record<string, unknown> = {
    user_id: userId,
    event_type: eventType,
    timestamp: timestamp.toISOString(),
    raw: payload,
  };

  if ("symbol" in payload) {
    logData.symbol = payload.symbol;
  }
  if ("side" in payload) {
    logData.side = payload.side;
  }
  if ("price" in payload) {
    logData.price = payload.price;
  }
  if ("quantity" in payload) {
    logData.quantity = payload.quantity;
  }
  if ("platform" in payload) {
    logData.platform = payload.platform;
  }

  const { error } = await supabase.from("trade_log").insert(logData);
  if (error) {
    console.error("Error logging event:", error);
  } else {
    console.log("Event logged successfully:", eventType);
  }
}

// Handle TRADE_ENTRY - create new position
async function handleTradeEntry(
  supabase: SupabaseClient,
  userId: string,
  payload: TradeEntryPayload,
  timestamp: Date,
): Promise<Response> {
  console.log("Processing TRADE_ENTRY for user:", userId);

  // Validate required fields
  if (!payload.symbol || !payload.side || !payload.price || !payload.quantity) {
    return new Response(
      JSON.stringify({
        success: false,
        status: "invalid_request",
        reason: "Missing required fields: symbol, side, price, quantity",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Insert new position
  const { data: position, error } = await supabase
    .from("positions")
    .insert({
      user_id: userId,
      symbol: payload.symbol.toUpperCase(),
      side: payload.side.toLowerCase(),
      quantity: payload.quantity,
      entry_price: payload.price,
      entry_timestamp: timestamp.toISOString(),
      platform: payload.platform || "TradingView",
      open: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating position:", error);
    return new Response(JSON.stringify({ success: false, status: "error", reason: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Position created:", position.id);
  return new Response(JSON.stringify({ success: true, status: "position_created", position_id: position.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handle TRADE_EXIT - close existing position with PnL
async function handleTradeExit(
  supabase: SupabaseClient,
  userId: string,
  payload: TradeExitPayload,
  timestamp: Date,
): Promise<Response> {
  console.log("Processing TRADE_EXIT for user:", userId);

  // Validate required fields
  if (!payload.symbol || !payload.price) {
    return new Response(
      JSON.stringify({ success: false, status: "invalid_request", reason: "Missing required fields: symbol, price" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Find the oldest open position for this user + symbol
  const { data: openPosition, error: findError } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", payload.symbol.toUpperCase())
    .eq("open", true)
    .order("entry_timestamp", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("Error finding open position:", findError);
    return new Response(JSON.stringify({ success: false, status: "error", reason: findError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!openPosition) {
    console.log("No open position found for symbol:", payload.symbol);
    return new Response(
      JSON.stringify({ success: false, status: "no_position", reason: "No open position found for this symbol" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Calculate PnL
  let pnl: number;
  if (openPosition.side === "long") {
    pnl = (payload.price - openPosition.entry_price) * openPosition.quantity;
  } else {
    // short position
    pnl = (openPosition.entry_price - payload.price) * openPosition.quantity;
  }
  pnl = Math.round(pnl * 100) / 100; // Round to 2 decimal places

  // Update position with exit data
  const { error: updateError } = await supabase
    .from("positions")
    .update({
      exit_price: payload.price,
      exit_timestamp: timestamp.toISOString(),
      pnl: pnl,
      open: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", openPosition.id);

  if (updateError) {
    console.error("Error closing position:", updateError);
    return new Response(JSON.stringify({ success: false, status: "error", reason: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Position closed with PnL:", pnl);
  return new Response(
    JSON.stringify({
      success: true,
      status: "position_closed",
      position_id: openPosition.id,
      pnl: pnl,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// Handle USER_ACTIVITY
async function handleUserActivity(
  supabase: SupabaseClient,
  userId: string,
  payload: UserActivityPayload,
  timestamp: Date,
): Promise<Response> {
  console.log("Processing USER_ACTIVITY for user:", userId);

  // Support both formats: { data: { ... } } and flat { platform, is_active, ... }
  const activityData = payload.data || payload;
  const platform = activityData.platform || "TradingView";
  const isActive = activityData.is_active ?? true;

  // Insert activity record
  const { error } = await supabase.from("user_activity").insert({
    user_id: userId,
    platform: platform,
    is_active: isActive,
    timestamp: timestamp.toISOString(),
  });

  if (error) {
    console.error("Error recording activity:", error);
    return new Response(JSON.stringify({ success: false, status: "error", reason: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Activity recorded:", { userId, platform, isActive });
  return new Response(JSON.stringify({ success: true, status: "activity_recorded" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, status: "invalid_request", reason: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate request
    const { userId, error: authError } = await authenticateRequest(req, supabase);

    if (authError || !userId) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ success: false, status: "unauthorized", reason: authError || "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Authenticated user:", userId);

    // Parse payload
    const payload = (await req.json()) as EventPayload;
    console.log("Received payload:", JSON.stringify(payload));

    // Convert timestamp
    const rawTimestamp =
      ("data" in payload && payload.data?.timestamp) ||
      ("timestamp" in payload ? payload.timestamp : undefined) ||
      Date.now();
    const tsMillis =
      typeof rawTimestamp === "number" && rawTimestamp < 10_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
    const timestamp = new Date(tsMillis as number);

    // Validate timestamp
    if (isNaN(timestamp.getTime())) {
      return new Response(JSON.stringify({ success: false, status: "invalid_request", reason: "Invalid timestamp" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept both "type" and "event_type"
    const rawType = (payload as any).type ?? (payload as any).event_type;
    const eventType = rawType ? String(rawType).toUpperCase() : "UNKNOWN";

    // Log every event to trade_log
    await logEvent(supabase, userId, eventType, payload, timestamp);

    // Route to appropriate handler
    switch (eventType) {
      case "TRADE_ENTRY":
        return await handleTradeEntry(supabase, userId, payload as TradeEntryPayload, timestamp);

      case "TRADE_EXIT":
        return await handleTradeExit(supabase, userId, payload as TradeExitPayload, timestamp);

      case "USER_ACTIVITY":
        return await handleUserActivity(supabase, userId, payload as UserActivityPayload, timestamp);

      default:
        console.log("Unknown event type:", eventType);
        return new Response(
          JSON.stringify({ success: false, status: "unknown_event", reason: `Unknown event type: ${eventType}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (error) {
    console.error("Server error:", error);
    return new Response(JSON.stringify({ success: false, status: "server_error", reason: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
