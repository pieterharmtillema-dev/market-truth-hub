import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Content-Type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TradePayload {
  event_type?: string
  trade_mode?: 'real' | 'simulation'
  symbol?: string
  side: string
  fill_price?: number | null
  exit_price?: number | null
  price?: number | null
  quantity?: number | null
  timestamp: number
  platform?: string | null
  account_id?: string | null
  user_id?: string | null
  user_role?: string | null
  order_type?: string | null
  position_id?: string | null
  source?: string | null
  raw?: Record<string, unknown> | null
}

interface UserActivityPayload {
  type: 'user_activity'
  platform: string
  is_active: boolean
  timestamp: number
  session_duration?: number
  user_id: string | null
}

interface Position {
  id?: string
  user_id: string
  symbol: string
  net_size: number
  avg_entry: number
  realized_pnl: number
}

interface PnLResult {
  realized_pnl: number
  position_size_after: number
  avg_entry_after: number
}

// PnL calculation engine
function calculatePnL(
  currentPosition: Position | null,
  side: string,
  quantity: number,
  price: number
): PnLResult {
  // Default position if none exists
  const pos: Position = currentPosition || {
    user_id: '',
    symbol: '',
    net_size: 0,
    avg_entry: 0,
    realized_pnl: 0
  }

  // Determine trade direction: positive for long/buy, negative for short/sell
  const sideNormalized = side.toLowerCase()
  const isLong = sideNormalized === 'long' || sideNormalized === 'buy'
  const tradeDelta = isLong ? quantity : -quantity

  let realized_pnl = 0
  let new_net_size = pos.net_size
  let new_avg_entry = pos.avg_entry

  const currentNetSize = pos.net_size
  const currentAvgEntry = pos.avg_entry

  // Case 1: Opening or adding to position (same direction)
  if ((currentNetSize >= 0 && tradeDelta > 0) || (currentNetSize <= 0 && tradeDelta < 0)) {
    // Adding to position - calculate new weighted average entry
    const totalCost = Math.abs(currentNetSize) * currentAvgEntry + quantity * price
    new_net_size = currentNetSize + tradeDelta
    new_avg_entry = Math.abs(new_net_size) > 0 ? totalCost / Math.abs(new_net_size) : price
    realized_pnl = 0
  }
  // Case 2: Reducing position (opposite direction)
  else {
    const absCurrentSize = Math.abs(currentNetSize)
    const absTradeQty = quantity

    if (absTradeQty <= absCurrentSize) {
      // Partial or full close - realize PnL on closed portion
      if (currentNetSize > 0) {
        // Was long, now selling (closing)
        realized_pnl = absTradeQty * (price - currentAvgEntry)
      } else {
        // Was short, now buying (closing)
        realized_pnl = absTradeQty * (currentAvgEntry - price)
      }
      new_net_size = currentNetSize + tradeDelta
      // Keep same avg entry for remaining position
      new_avg_entry = Math.abs(new_net_size) > 0 ? currentAvgEntry : 0
    } else {
      // Position flip - close entire old position + open new position
      // First, realize PnL on closing the entire old position
      if (currentNetSize > 0) {
        realized_pnl = absCurrentSize * (price - currentAvgEntry)
      } else {
        realized_pnl = absCurrentSize * (currentAvgEntry - price)
      }
      // Then open new position with remaining quantity
      const remainingQty = absTradeQty - absCurrentSize
      new_net_size = tradeDelta > 0 ? remainingQty : -remainingQty
      new_avg_entry = price // New position starts at current price
    }
  }

  return {
    realized_pnl: Math.round(realized_pnl * 100) / 100, // Round to 2 decimal places
    position_size_after: Math.round(new_net_size * 100000) / 100000, // Handle floating point
    avg_entry_after: Math.round(new_avg_entry * 100) / 100
  }
}

// Handle user activity updates
async function handleUserActivity(
  supabase: SupabaseClient,
  payload: UserActivityPayload,
  userId: string
): Promise<Response> {
  console.log('Processing user_activity event for user:', userId)

  // Convert timestamp
  const ts = payload.timestamp < 10_000_000_000 
    ? payload.timestamp * 1000 
    : payload.timestamp
  const isoTimestamp = new Date(ts).toISOString()

  // Upsert activity record (update if exists, insert if not)
  const { data: existingActivity } = await supabase
    .from('trader_activity')
    .select('id')
    .eq('user_id', userId)
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let result
  if (existingActivity) {
    // Update existing record
    result = await supabase
      .from('trader_activity')
      .update({
        is_active: payload.is_active,
        platform: payload.platform,
        session_duration: payload.session_duration || null,
        last_activity_at: isoTimestamp
      })
      .eq('id', (existingActivity as { id: string }).id)
  } else {
    // Insert new record
    result = await supabase
      .from('trader_activity')
      .insert({
        user_id: userId,
        is_active: payload.is_active,
        platform: payload.platform,
        session_duration: payload.session_duration || null,
        last_activity_at: isoTimestamp
      })
  }

  if (result.error) {
    console.error('Error updating activity:', result.error)
    return new Response(
      JSON.stringify({ success: false, status: 'error', reason: result.error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Activity updated successfully:', { userId, isActive: payload.is_active })
  return new Response(
    JSON.stringify({ success: true, status: 'activity_updated', user_id: userId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Authenticate request - supports both JWT and API key
async function authenticateRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<{ userId: string | null; error: string | null }> {
  
  // Check for API key first (preferred for Chrome extension)
  const apiKey = req.headers.get('x-api-key')
  if (apiKey) {
    console.log('Authenticating via API key')
    
    // Validate API key format
    if (!apiKey.startsWith('md_') || apiKey.length < 20) {
      return { userId: null, error: 'Invalid API key format' }
    }
    
    // Look up user by API key
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('api_key', apiKey)
      .maybeSingle()
    
    if (lookupError) {
      console.error('API key lookup error:', lookupError)
      return { userId: null, error: 'API key validation failed' }
    }
    
    if (!profile) {
      console.log('No profile found for API key')
      return { userId: null, error: 'Invalid API key' }
    }
    
    console.log('API key authenticated for user:', profile.user_id)
    return { userId: profile.user_id, error: null }
  }
  
  // Fall back to JWT authentication
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    console.log('Authenticating via JWT')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('JWT authentication failed:', authError?.message)
      return { userId: null, error: 'Invalid authentication token' }
    }
    
    console.log('JWT authenticated for user:', user.id)
    return { userId: user.id, error: null }
  }
  
  return { userId: null, error: 'Authentication required. Provide x-api-key header or Authorization: Bearer <token>' }
}

// Update or create position
async function updatePosition(
  supabase: SupabaseClient,
  userId: string,
  symbol: string,
  pnlResult: PnLResult
): Promise<void> {
  const { data: existingPosition } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .maybeSingle()

  if (existingPosition) {
    // Update existing position
    await supabase
      .from('positions')
      .update({
        net_size: pnlResult.position_size_after,
        avg_entry: pnlResult.avg_entry_after,
        realized_pnl: (existingPosition.realized_pnl || 0) + pnlResult.realized_pnl,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id)
  } else {
    // Create new position
    await supabase
      .from('positions')
      .insert({
        user_id: userId,
        symbol: symbol,
        net_size: pnlResult.position_size_after,
        avg_entry: pnlResult.avg_entry_after,
        realized_pnl: pnlResult.realized_pnl
      })
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, status: 'invalid_request', reason: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate request (supports API key or JWT)
    const { userId, error: authError } = await authenticateRequest(req, supabase)
    
    if (authError || !userId) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', reason: authError || 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', userId)

    // Parse payload
    const rawPayload = await req.json()
    console.log('Received payload:', JSON.stringify(rawPayload))

    // Check if this is a user_activity event
    if (rawPayload.type === 'user_activity') {
      return await handleUserActivity(supabase, rawPayload as UserActivityPayload, userId)
    }

    // Process trade payload (supports both TRADE_EXECUTION and TRADE_SIMULATION)
    const payload: TradePayload = rawPayload
    const eventType = payload.event_type || 'TRADE_EXECUTION'
    const tradeMode = payload.trade_mode || (eventType === 'TRADE_SIMULATION' ? 'simulation' : 'real')
    
    console.log('Processing trade event:', eventType, 'mode:', tradeMode)

    // Validate required fields
    if (!payload.side || !payload.timestamp) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'invalid_request', 
          reason: 'missing required fields (side, timestamp)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize side (long/short or buy/sell)
    const sideInput = payload.side.toLowerCase().trim()
    let normalizedSide: string
    if (sideInput === 'long' || sideInput === 'buy') {
      normalizedSide = sideInput
    } else if (sideInput === 'short' || sideInput === 'sell') {
      normalizedSide = sideInput
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'invalid_request', 
          reason: 'side must be "buy", "sell", "long", or "short"' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate symbol if provided
    const symbol = payload.symbol?.toUpperCase().trim() || 'UNKNOWN'
    if (payload.symbol && (typeof payload.symbol !== 'string' || payload.symbol.length > 50)) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'symbol must be a string under 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate platform if provided
    if (payload.platform && (typeof payload.platform !== 'string' || payload.platform.length > 100)) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'platform must be a string under 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate numeric fields
    const fillPrice = payload.fill_price ?? payload.price ?? null
    if (fillPrice !== null && (typeof fillPrice !== 'number' || fillPrice < 0 || !isFinite(fillPrice))) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'fill_price/price must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (payload.exit_price !== null && payload.exit_price !== undefined) {
      if (typeof payload.exit_price !== 'number' || payload.exit_price < 0 || !isFinite(payload.exit_price)) {
        return new Response(
          JSON.stringify({ success: false, status: 'invalid_request', reason: 'exit_price must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (payload.quantity !== null && payload.quantity !== undefined) {
      if (typeof payload.quantity !== 'number' || payload.quantity <= 0 || !isFinite(payload.quantity)) {
        return new Response(
          JSON.stringify({ success: false, status: 'invalid_request', reason: 'quantity must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate timestamp bounds
    const tsMillis = payload.timestamp < 10_000_000_000 ? payload.timestamp * 1000 : payload.timestamp
    const minValidTimestamp = new Date('2000-01-01').getTime()
    const maxValidTimestamp = Date.now() + (24 * 60 * 60 * 1000)
    if (tsMillis < minValidTimestamp || tsMillis > maxValidTimestamp) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'timestamp out of valid range' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isoTimestamp = new Date(tsMillis).toISOString()

    // Check for duplicates (within 5 seconds)
    const fiveSecondsMs = 5000
    const timestampDate = new Date(tsMillis)
    const minTimestamp = new Date(timestampDate.getTime() - fiveSecondsMs).toISOString()
    const maxTimestamp = new Date(timestampDate.getTime() + fiveSecondsMs).toISOString()

    const { data: existingTrades, error: checkError } = await supabase
      .from('past_trades')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('side', normalizedSide)
      .eq('trade_mode', tradeMode)
      .gte('timestamp', minTimestamp)
      .lte('timestamp', maxTimestamp)
      .limit(1)

    if (checkError) {
      console.error('Error checking duplicates:', checkError)
    }

    if (existingTrades && existingTrades.length > 0) {
      console.log('Duplicate trade detected')
      return new Response(
        JSON.stringify({ success: false, status: 'duplicate' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate PnL if we have price and quantity
    let pnlResult: PnLResult = {
      realized_pnl: 0,
      position_size_after: 0,
      avg_entry_after: 0
    }

    const quantity = payload.quantity || 0
    const price = fillPrice || 0

    if (quantity > 0 && price > 0 && symbol !== 'UNKNOWN') {
      // Fetch current position for this symbol
      const { data: currentPosition } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .maybeSingle()

      // Calculate PnL
      pnlResult = calculatePnL(currentPosition as Position | null, normalizedSide, quantity, price)
      console.log('PnL calculated:', pnlResult)

      // Update position in database
      await updatePosition(supabase, userId, symbol, pnlResult)
    }

    // Insert trade with PnL data
    const { data: insertedTrade, error: insertError } = await supabase
      .from('past_trades')
      .insert({
        user_id: userId,
        symbol: symbol,
        side: normalizedSide,
        fill_price: fillPrice,
        exit_price: payload.exit_price ?? null,
        quantity: payload.quantity ?? null,
        platform: payload.platform?.trim() || null,
        account_id: payload.account_id?.trim() || null,
        timestamp: isoTimestamp,
        verified_status: 'pending',
        verification_score: null,
        trade_mode: tradeMode,
        user_role: payload.user_role || 'user',
        order_type: payload.order_type || null,
        position_id: payload.position_id || null,
        source: payload.source || null,
        raw: payload.raw || null,
        pnl: pnlResult.realized_pnl || null,
        position_size_after: pnlResult.position_size_after,
        avg_entry_after: pnlResult.avg_entry_after
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting trade:', insertError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'error', 
          reason: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Trade inserted successfully:', insertedTrade.id, 'mode:', tradeMode, 'pnl:', pnlResult.realized_pnl)
    return new Response(
      JSON.stringify({ 
        success: true, 
        trade_id: insertedTrade.id, 
        status: 'stored',
        trade_mode: tradeMode,
        user_id: userId,
        pnl: pnlResult.realized_pnl,
        position_size_after: pnlResult.position_size_after,
        avg_entry_after: pnlResult.avg_entry_after
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        status: 'error', 
        reason: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
