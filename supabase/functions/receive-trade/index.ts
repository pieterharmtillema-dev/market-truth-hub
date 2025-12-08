import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TradePayload {
  symbol: string
  side: string
  fill_price: number | null
  exit_price: number | null
  quantity: number | null
  timestamp: number
  platform: string | null
  account_id: string | null
  user_id: string | null
}

interface UserActivityPayload {
  type: 'user_activity'
  platform: string
  is_active: boolean
  timestamp: number
  session_duration?: number
  user_id: string | null
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

    // JWT verification is now required - get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', reason: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, status: 'unauthorized', reason: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('Authenticated user:', userId)

    // Parse payload
    const rawPayload = await req.json()
    console.log('Received payload:', JSON.stringify(rawPayload))

    // Check if this is a user_activity event
    if (rawPayload.type === 'user_activity') {
      return await handleUserActivity(supabase, rawPayload as UserActivityPayload, userId)
    }

    // Otherwise, treat as trade payload
    const payload: TradePayload = rawPayload
    console.log('Processing trade payload')

    // ========== INPUT VALIDATION ==========
    
    // Validate required fields exist
    if (!payload.symbol || !payload.side || !payload.timestamp) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'invalid_request', 
          reason: 'missing required fields (symbol, side, timestamp)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate string lengths
    if (typeof payload.symbol !== 'string' || payload.symbol.length > 50) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'symbol must be a string under 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (payload.platform && (typeof payload.platform !== 'string' || payload.platform.length > 100)) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'platform must be a string under 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (payload.account_id && (typeof payload.account_id !== 'string' || payload.account_id.length > 100)) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'account_id must be a string under 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate numeric fields (must be positive if provided)
    if (payload.fill_price !== null && payload.fill_price !== undefined) {
      if (typeof payload.fill_price !== 'number' || payload.fill_price < 0 || !isFinite(payload.fill_price)) {
        return new Response(
          JSON.stringify({ success: false, status: 'invalid_request', reason: 'fill_price must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    // Validate timestamp bounds (not before 2000-01-01, not more than 1 day in future)
    const tsMillis = payload.timestamp < 10_000_000_000 ? payload.timestamp * 1000 : payload.timestamp
    const minValidTimestamp = new Date('2000-01-01').getTime()
    const maxValidTimestamp = Date.now() + (24 * 60 * 60 * 1000) // 1 day in future
    if (tsMillis < minValidTimestamp || tsMillis > maxValidTimestamp) {
      return new Response(
        JSON.stringify({ success: false, status: 'invalid_request', reason: 'timestamp out of valid range' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== END INPUT VALIDATION ==========

    // Normalize symbol (uppercase, trim)
    const normalizedSymbol = payload.symbol.toUpperCase().trim()

    // Normalize side (buy/sell)
    const normalizedSide = payload.side.toLowerCase().trim()
    if (normalizedSide !== 'buy' && normalizedSide !== 'sell') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'invalid_request', 
          reason: 'side must be "buy" or "sell"' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert timestamp to ISO string (already validated above)
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
      .eq('symbol', normalizedSymbol)
      .eq('side', normalizedSide)
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

    // Insert trade
    const { data: insertedTrade, error: insertError } = await supabase
      .from('past_trades')
      .insert({
        user_id: userId,
        symbol: normalizedSymbol,
        side: normalizedSide,
        fill_price: payload.fill_price,
        exit_price: payload.exit_price,
        quantity: payload.quantity,
        platform: payload.platform?.trim() || null,
        account_id: payload.account_id?.trim() || null,
        timestamp: isoTimestamp,
        verified_status: 'pending',
        verification_score: null
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

    console.log('Trade inserted successfully:', insertedTrade.id)
    return new Response(
      JSON.stringify({ 
        success: true, 
        trade_id: insertedTrade.id, 
        status: 'stored',
        user_id: userId
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
