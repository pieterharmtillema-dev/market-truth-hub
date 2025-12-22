import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Position {
  id: number;
  user_id: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  entry_timestamp: string;
  exit_timestamp: string | null;
  quantity: number;
  pnl: number | null;
  is_exchange_verified: boolean;
  exchange_source: string | null;
  fees_total: number;
  mae: number | null;
  mfe: number | null;
  r_multiple: number | null;
  estimated_risk: number | null;
}

interface PriceCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CachedPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Fetch price data with aggressive caching
async function fetchCachedPrices(
  supabase: SupabaseClient,
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<PriceCandle[]> {
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Check cache first
  const { data: cached, error: cacheError } = await supabase
    .from('price_cache')
    .select('date, open, high, low, close')
    .eq('symbol', symbol.toUpperCase())
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true });

  if (!cacheError && cached && cached.length > 0) {
    console.log(`Cache hit for ${symbol}: ${cached.length} candles`);
    return (cached as CachedPrice[]).map(c => ({
      date: c.date,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));
  }

  // Fetch from Finnhub (better rate limits than Polygon)
  const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
  if (!finnhubKey) {
    console.warn('FINNHUB_API_KEY not set, using fallback risk estimation');
    return [];
  }

  try {
    const from = Math.floor(startDate.getTime() / 1000);
    const to = Math.floor(endDate.getTime() / 1000);
    
    // Normalize symbol for Finnhub
    const normalizedSymbol = normalizeSymbolForFinnhub(symbol);
    
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${normalizedSymbol}&resolution=D&from=${from}&to=${to}&token=${finnhubKey}`;
    console.log(`Fetching from Finnhub: ${normalizedSymbol}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data' || !data.t) {
      console.log(`No data from Finnhub for ${symbol}`);
      return [];
    }
    
    const candles: PriceCandle[] = [];
    for (let i = 0; i < data.t.length; i++) {
      const date = new Date(data.t[i] * 1000).toISOString().split('T')[0];
      candles.push({
        date,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
      });
    }
    
    // Cache the results
    if (candles.length > 0) {
      const cacheInserts = candles.map(c => ({
        symbol: symbol.toUpperCase(),
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        provider: 'finnhub',
      }));
      
      // Insert into cache - ignore conflicts
      try {
        for (const insert of cacheInserts) {
          const { error } = await supabase
            .from('price_cache')
            .insert(insert);
          // Ignore duplicate key errors
          if (error && !error.message.includes('duplicate')) {
            console.error('Cache insert error:', error);
          }
        }
      } catch (e) {
        console.error('Cache batch insert error:', e);
      }
      
      console.log(`Cached ${candles.length} candles for ${symbol}`);
    }
    
    return candles;
  } catch (error) {
    console.error(`Error fetching prices for ${symbol}:`, error);
    return [];
  }
}

// Normalize symbol for Finnhub API
function normalizeSymbolForFinnhub(symbol: string): string {
  // Remove common suffixes
  let normalized = symbol.toUpperCase()
    .replace(/USD$/, '')
    .replace(/USDT$/, '')
    .replace(/-USD$/, '')
    .replace(/\/USD$/, '');
  
  // Add exchange prefix for crypto
  if (isCrypto(symbol)) {
    return `BINANCE:${normalized}USDT`;
  }
  
  return normalized;
}

function isCrypto(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'DOGE', 'AVAX', 'MATIC', 'LINK'];
  const upper = symbol.toUpperCase();
  return cryptoSymbols.some(c => upper.includes(c));
}

// Calculate MAE (Maximum Adverse Excursion) - how far price moved against the trade
function calculateMAE(
  candles: PriceCandle[],
  entryPrice: number,
  side: string
): number {
  if (candles.length === 0) return 0;
  
  let maxAdverseMove = 0;
  
  for (const candle of candles) {
    let adverseMove: number;
    
    if (side === 'buy' || side === 'long') {
      // For long positions, adverse is when price goes below entry
      adverseMove = entryPrice - candle.low;
    } else {
      // For short positions, adverse is when price goes above entry
      adverseMove = candle.high - entryPrice;
    }
    
    if (adverseMove > maxAdverseMove) {
      maxAdverseMove = adverseMove;
    }
  }
  
  return maxAdverseMove;
}

// Calculate MFE (Maximum Favorable Excursion) - how far price moved in favor
function calculateMFE(
  candles: PriceCandle[],
  entryPrice: number,
  side: string
): number {
  if (candles.length === 0) return 0;
  
  let maxFavorableMove = 0;
  
  for (const candle of candles) {
    let favorableMove: number;
    
    if (side === 'buy' || side === 'long') {
      // For long positions, favorable is when price goes above entry
      favorableMove = candle.high - entryPrice;
    } else {
      // For short positions, favorable is when price goes below entry
      favorableMove = entryPrice - candle.low;
    }
    
    if (favorableMove > maxFavorableMove) {
      maxFavorableMove = favorableMove;
    }
  }
  
  return maxFavorableMove;
}

// Estimate risk using MAE, with fallback to position-based estimation
function estimateRisk(
  mae: number,
  entryPrice: number,
  quantity: number,
  actualLoss: number | null
): number {
  // Risk must be at least as large as the largest loss experienced
  const minRisk = actualLoss !== null && actualLoss < 0 ? Math.abs(actualLoss) : 0;
  
  // Calculate risk from MAE
  const maeRisk = mae * quantity;
  
  // If no MAE data, use conservative estimate (2% of position value)
  const fallbackRisk = entryPrice * quantity * 0.02;
  
  const calculatedRisk = maeRisk > 0 ? maeRisk : fallbackRisk;
  
  // Return the larger of calculated risk or actual loss
  return Math.max(calculatedRisk, minRisk, 0.01); // Ensure non-zero risk
}

// Calculate R-Multiple: PnL / Risk
function calculateRMultiple(pnl: number, risk: number): number {
  if (risk <= 0) return 0;
  return pnl / risk;
}

// Calculate accuracy score (0-100)
function calculateAccuracyScore(
  averageR: number,
  positiveRPercentage: number,
  rVariance: number
): number {
  // Normalize average R (typical range -2 to +3)
  // Map to 0-40 range
  const avgRScore = Math.min(40, Math.max(0, (averageR + 1) * 10));
  
  // Positive R percentage (0-100) maps to 0-40
  const positiveRScore = positiveRPercentage * 0.4;
  
  // Consistency bonus (penalize high variance)
  // Variance of 1 = no penalty, variance of 4+ = max penalty
  const variancePenalty = Math.min(20, Math.max(0, (rVariance - 1) * 5));
  const consistencyScore = 20 - variancePenalty;
  
  const totalScore = avgRScore + positiveRScore + consistencyScore;
  
  // Clamp to 0-100
  return Math.min(100, Math.max(0, totalScore));
}

// Calculate variance of R-multiples
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating metrics for user ${user.id}`);

    // Check if user has exchange connection
    const { data: connections } = await supabase
      .from('exchange_connections')
      .select('exchange, status, last_sync_at')
      .eq('user_id', user.id)
      .eq('status', 'connected');

    const hasActiveConnection = connections && connections.length > 0;
    const lastSyncAt = hasActiveConnection ? (connections[0] as { last_sync_at: string }).last_sync_at : null;

    // Fetch closed positions for this user
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('open', false)
      .not('exit_price', 'is', null)
      .order('exit_timestamp', { ascending: false });

    if (posError) {
      console.error('Error fetching positions:', posError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch positions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!positions || positions.length === 0) {
      // No positions, return empty metrics
      const emptyMetrics = {
        total_verified_trades: 0,
        win_rate: null,
        accuracy_score: null,
        is_verified: false,
        api_status: hasActiveConnection ? 'connected' : 'disconnected',
      };

      await supabase
        .from('user_trading_metrics')
        .upsert({
          user_id: user.id,
          ...emptyMetrics,
          last_api_sync_at: lastSyncAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({ metrics: emptyMetrics, trades_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${positions.length} closed positions`);

    const rMultiples: number[] = [];
    let totalWins = 0;
    let totalLosses = 0;
    let totalBreakeven = 0;
    let verifiedCount = 0;

    // Process each position
    for (const position of positions) {
      const pos = position as Position;
      
      // Skip if no exit data
      if (!pos.exit_price || !pos.exit_timestamp) continue;
      
      const entryDate = new Date(pos.entry_timestamp);
      const exitDate = new Date(pos.exit_timestamp);
      
      // Fetch cached price data for the trade period
      const candles = await fetchCachedPrices(supabase, pos.symbol, entryDate, exitDate);
      
      // Calculate MAE and MFE
      const mae = calculateMAE(candles, pos.entry_price, pos.side);
      const mfe = calculateMFE(candles, pos.entry_price, pos.side);
      
      // Calculate net PnL (after fees)
      const fees = pos.fees_total || 0;
      const netPnl = (pos.pnl || 0) - fees;
      
      // Estimate risk
      const estimatedRisk = estimateRisk(mae, pos.entry_price, pos.quantity, netPnl < 0 ? netPnl : null);
      
      // Calculate R-Multiple
      const rMultiple = calculateRMultiple(netPnl, estimatedRisk);
      rMultiples.push(rMultiple);
      
      // Count win/loss/breakeven
      if (netPnl > 0.01) {
        totalWins++;
      } else if (netPnl < -0.01) {
        totalLosses++;
      } else {
        totalBreakeven++;
      }
      
      // Count as verified if from exchange source
      if (pos.is_exchange_verified || pos.exchange_source) {
        verifiedCount++;
      }
      
      // Update position with metrics
      await supabase
        .from('positions')
        .update({
          mae,
          mfe,
          r_multiple: rMultiple,
          estimated_risk: estimatedRisk,
          metrics_calculated_at: new Date().toISOString(),
        })
        .eq('id', pos.id);
    }

    // Calculate aggregate metrics
    const totalTrades = totalWins + totalLosses + totalBreakeven;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;
    const averageR = rMultiples.length > 0 
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length 
      : 0;
    const totalR = rMultiples.reduce((a, b) => a + b, 0);
    const positiveRPercentage = rMultiples.length > 0
      ? (rMultiples.filter(r => r > 0).length / rMultiples.length) * 100
      : 0;
    const rVariance = calculateVariance(rMultiples);
    
    // Calculate accuracy score
    const accuracyScore = rMultiples.length >= 30
      ? calculateAccuracyScore(averageR, positiveRPercentage, rVariance)
      : null;
    
    // Determine verification status
    const isVerified = hasActiveConnection && verifiedCount >= 30;

    const metrics = {
      user_id: user.id,
      total_verified_trades: verifiedCount,
      total_wins: totalWins,
      total_losses: totalLosses,
      total_breakeven: totalBreakeven,
      win_rate: winRate,
      average_r: averageR,
      total_r: totalR,
      positive_r_percentage: positiveRPercentage,
      r_variance: rVariance,
      accuracy_score: accuracyScore,
      is_verified: isVerified,
      last_api_sync_at: lastSyncAt,
      api_status: hasActiveConnection ? 'connected' : 'disconnected',
      updated_at: new Date().toISOString(),
    };

    // Upsert metrics
    const { error: upsertError } = await supabase
      .from('user_trading_metrics')
      .upsert(metrics, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error saving metrics:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save metrics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Metrics calculated: ${verifiedCount} verified trades, Win Rate: ${winRate?.toFixed(1)}%, Accuracy: ${accuracyScore?.toFixed(1)}`);

    return new Response(
      JSON.stringify({ 
        metrics: {
          total_verified_trades: verifiedCount,
          total_wins: totalWins,
          total_losses: totalLosses,
          win_rate: winRate,
          average_r: averageR,
          positive_r_percentage: positiveRPercentage,
          accuracy_score: accuracyScore,
          is_verified: isVerified,
          api_status: hasActiveConnection ? 'connected' : 'disconnected',
          last_sync_at: lastSyncAt,
        },
        trades_processed: totalTrades 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating metrics:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});