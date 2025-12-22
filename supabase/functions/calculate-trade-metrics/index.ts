import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  asset_class: string | null;
  r_multiple: number | null;
  estimated_risk: number | null;
}

// Volatility lookup table - conservative daily volatility percentages
// These represent typical adverse price movements per asset class
const VOLATILITY_TABLE: Record<string, number> = {
  // Major cryptocurrencies
  'BTC': 0.02,      // 2% - Bitcoin
  'ETH': 0.025,     // 2.5% - Ethereum
  'SOL': 0.03,      // 3% - Solana
  'XRP': 0.03,      // 3% - Ripple
  'BNB': 0.025,     // 2.5% - Binance Coin
  'ADA': 0.035,     // 3.5% - Cardano
  'DOT': 0.035,     // 3.5% - Polkadot
  'DOGE': 0.04,     // 4% - Dogecoin
  'AVAX': 0.035,    // 3.5% - Avalanche
  'MATIC': 0.035,   // 3.5% - Polygon
  'LINK': 0.03,     // 3% - Chainlink
  
  // Default by asset class
  'crypto_major': 0.025,    // 2.5% - Large cap crypto
  'crypto_alt': 0.04,       // 4% - Alt coins
  'crypto_small': 0.05,     // 5% - Small cap / meme coins
  'stock': 0.015,           // 1.5% - Stocks
  'forex': 0.008,           // 0.8% - Forex
  'futures': 0.02,          // 2% - Futures
  'default': 0.03,          // 3% - Default fallback
};

// Known major crypto symbols for classification
const MAJOR_CRYPTO = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'];
const MEME_COINS = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME'];

// Get volatility for a symbol
function getVolatility(symbol: string, assetClass: string | null): number {
  // Normalize symbol - remove common suffixes
  const normalized = symbol.toUpperCase()
    .replace(/USD$/, '')
    .replace(/USDT$/, '')
    .replace(/-USD$/, '')
    .replace(/\/USD$/, '')
    .replace(/PERP$/, '')
    .replace(/-PERP$/, '');
  
  // Check direct lookup first
  if (VOLATILITY_TABLE[normalized]) {
    return VOLATILITY_TABLE[normalized];
  }
  
  // Check asset class
  if (assetClass) {
    const ac = assetClass.toLowerCase();
    if (ac === 'crypto') {
      // Classify crypto by symbol
      if (MAJOR_CRYPTO.includes(normalized)) {
        return VOLATILITY_TABLE['crypto_major'];
      }
      if (MEME_COINS.includes(normalized)) {
        return VOLATILITY_TABLE['crypto_small'];
      }
      return VOLATILITY_TABLE['crypto_alt'];
    }
    if (ac === 'forex' || ac === 'fx') return VOLATILITY_TABLE['forex'];
    if (ac === 'stock' || ac === 'equity') return VOLATILITY_TABLE['stock'];
    if (ac === 'futures') return VOLATILITY_TABLE['futures'];
  }
  
  // Infer from symbol patterns
  if (normalized.endsWith('BTC') || normalized.startsWith('BTC') || 
      normalized.includes('USDT') || normalized.includes('USD')) {
    // Likely crypto
    if (MAJOR_CRYPTO.some(c => normalized.includes(c))) {
      return VOLATILITY_TABLE['crypto_major'];
    }
    return VOLATILITY_TABLE['crypto_alt'];
  }
  
  // Forex pairs (6 character codes like EURUSD)
  if (/^[A-Z]{6}$/.test(normalized)) {
    return VOLATILITY_TABLE['forex'];
  }
  
  return VOLATILITY_TABLE['default'];
}

/**
 * Calculate estimated risk using Volatility-Adjusted Position Risk model
 * 
 * Step 1: Position Notional = entry_price × quantity
 * Step 2: Estimated Risk = Position Notional × Volatility %
 * Step 3: Final Risk = max(Estimated Risk, abs(realized loss))
 * 
 * This ensures we never underestimate risk on losing trades
 */
function calculateVolatilityAdjustedRisk(
  entryPrice: number,
  quantity: number,
  symbol: string,
  assetClass: string | null,
  netPnl: number
): number {
  // Step 1: Calculate position notional
  const positionNotional = entryPrice * Math.abs(quantity);
  
  // Step 2: Get volatility and calculate estimated risk
  const volatility = getVolatility(symbol, assetClass);
  const estimatedRisk = positionNotional * volatility;
  
  // Step 3: Apply safety rule - risk cannot be less than actual loss
  const actualLoss = netPnl < 0 ? Math.abs(netPnl) : 0;
  const finalRisk = Math.max(estimatedRisk, actualLoss, 0.01); // Ensure non-zero
  
  console.log(`Risk for ${symbol}: Notional=${positionNotional.toFixed(2)}, Vol=${(volatility*100).toFixed(1)}%, Est=${estimatedRisk.toFixed(2)}, Final=${finalRisk.toFixed(2)}`);
  
  return finalRisk;
}

// Calculate R-Multiple: Net PnL / Risk
function calculateRMultiple(netPnl: number, risk: number): number {
  if (risk <= 0) return 0;
  return netPnl / risk;
}

// Calculate accuracy score (0-100)
// Combines: Average R (expectancy), % of trades with R > 0, Consistency (variance penalty)
function calculateAccuracyScore(
  averageR: number,
  positiveRPercentage: number,
  rVariance: number
): number {
  // Component 1: Average R contribution (0-40 points)
  // Maps averageR from range [-2, +3] to [0, 40]
  // averageR of 0 = 20 points, +1R = 30 points, +2R = 40 points
  const avgRScore = Math.min(40, Math.max(0, (averageR + 2) * 8));
  
  // Component 2: Positive R percentage (0-40 points)
  // 100% positive R trades = 40 points
  const positiveRScore = (positiveRPercentage / 100) * 40;
  
  // Component 3: Consistency bonus (0-20 points)
  // Low variance = high consistency = more points
  // Variance < 1 = full 20 points, variance > 4 = 0 points
  const variancePenalty = Math.min(20, Math.max(0, rVariance * 5));
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

    // Check if user has active exchange connection
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
      console.log('No closed positions found');
      
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
          total_wins: 0,
          total_losses: 0,
          total_breakeven: 0,
          average_r: null,
          total_r: null,
          positive_r_percentage: null,
          r_variance: null,
          last_api_sync_at: lastSyncAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({ metrics: emptyMetrics, trades_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${positions.length} closed positions using Volatility-Adjusted Risk model`);

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
      
      // Calculate net PnL (after fees)
      const fees = pos.fees_total || 0;
      const netPnl = (pos.pnl || 0) - fees;
      
      // Calculate volatility-adjusted risk (NO market data API calls needed!)
      const estimatedRisk = calculateVolatilityAdjustedRisk(
        pos.entry_price,
        pos.quantity,
        pos.symbol,
        pos.asset_class,
        netPnl
      );
      
      // Calculate R-Multiple
      const rMultiple = calculateRMultiple(netPnl, estimatedRisk);
      rMultiples.push(rMultiple);
      
      // Count win/loss/breakeven
      // Win = Net PnL > 0, Loss = Net PnL < 0
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
      
      // Update position with calculated metrics
      const { error: updateError } = await supabase
        .from('positions')
        .update({
          r_multiple: rMultiple,
          estimated_risk: estimatedRisk,
          metrics_calculated_at: new Date().toISOString(),
        })
        .eq('id', pos.id);
      
      if (updateError) {
        console.error(`Error updating position ${pos.id}:`, updateError);
      }
    }

    // Calculate aggregate metrics
    const totalTrades = totalWins + totalLosses + totalBreakeven;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;
    
    const averageR = rMultiples.length > 0 
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length 
      : null;
    
    const totalR = rMultiples.length > 0 
      ? rMultiples.reduce((a, b) => a + b, 0) 
      : null;
    
    const positiveRPercentage = rMultiples.length > 0
      ? (rMultiples.filter(r => r > 0).length / rMultiples.length) * 100
      : null;
    
    const rVariance = rMultiples.length >= 2 ? calculateVariance(rMultiples) : 0;
    
    // Calculate accuracy score (only if 30+ trades)
    const accuracyScore = rMultiples.length >= 30 && averageR !== null && positiveRPercentage !== null
      ? calculateAccuracyScore(averageR, positiveRPercentage, rVariance)
      : null;
    
    // Determine verification status
    // Must have active exchange connection AND 30+ verified trades
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

    console.log(`Metrics calculated successfully:
      - Total trades: ${totalTrades}
      - Verified: ${verifiedCount}
      - Win Rate: ${winRate?.toFixed(1)}%
      - Avg R: ${averageR?.toFixed(2)}
      - Accuracy Score: ${accuracyScore?.toFixed(0) ?? 'N/A (need 30+ trades)'}`);

    return new Response(
      JSON.stringify({ 
        metrics: {
          total_verified_trades: verifiedCount,
          total_wins: totalWins,
          total_losses: totalLosses,
          total_breakeven: totalBreakeven,
          win_rate: winRate,
          average_r: averageR,
          total_r: totalR,
          positive_r_percentage: positiveRPercentage,
          accuracy_score: accuracyScore,
          is_verified: isVerified,
          api_status: hasActiveConnection ? 'connected' : 'disconnected',
        },
        trades_processed: totalTrades,
        volatility_model: 'v1',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in calculate-trade-metrics:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
