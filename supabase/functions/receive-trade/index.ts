import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Parse payload
    const payload: TradePayload = await req.json()
    console.log('Received trade payload:', JSON.stringify(payload))

    // Validate required fields
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

    // Get user_id from payload or auth header
    let userId = payload.user_id

    if (!userId) {
      // Try to get from auth header
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (!authError && user) {
          userId = user.id
        }
      }
    }

    if (!userId) {
      console.log('No user_id provided and no authenticated user')
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'invalid_request', 
          reason: 'no user' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Convert timestamp to ISO string
    const ts = payload.timestamp < 10_000_000_000 
      ? payload.timestamp * 1000 
      : payload.timestamp
    const isoTimestamp = new Date(ts).toISOString()

    // Check for duplicates (within 5 seconds)
    const fiveSecondsMs = 5000
    const timestampDate = new Date(ts)
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
