// Trade Verification Module - Validates fill prices against Polygon.io historical data
import { getAggregates, formatPolygonTicker } from './polygon';

export interface TradeLeg {
  price: number;
  timestamp: Date;
  side: 'entry' | 'exit';
}

export interface LegVerification {
  side: 'entry' | 'exit';
  fill_price: number;
  timestamp: Date;
  market_low: number | null;
  market_high: number | null;
  market_open: number | null;
  market_close: number | null;
  deviation: number | null;
  status: 'realistic' | 'impossible_low' | 'impossible_high' | 'suspicious_precision' | 'unknown';
  score: number;
  notes: string;
}

export interface TradeVerificationResult {
  trade_id: string;
  verified: boolean;
  authenticity_score: number;
  entry_verification: LegVerification;
  exit_verification: LegVerification | null;
  verification_notes: string;
  suspicious_flag: boolean;
  impossible_flag: boolean;
}

export interface VerificationSummary {
  total_trades: number;
  verified_trades: number;
  impossible_trades: number;
  suspicious_trades: number;
  unknown_trades: number;
  average_score: number;
  verification_rate: number;
}

export interface TradeToVerify {
  id: string;
  symbol: string;
  side: string; // buy/sell/long/short
  entry_fill_price: number;
  exit_fill_price: number | null;
  entry_timestamp: Date;
  exit_timestamp: Date | null;
  quantity: number | null;
  instrument_type?: string | null;
}

// Cache for historical price data to minimize API calls
const priceCache = new Map<string, { low: number; high: number; open: number; close: number }>();

// Generate cache key for price data
function getPriceCacheKey(symbol: string, timestamp: Date): string {
  const minuteTimestamp = new Date(timestamp);
  minuteTimestamp.setSeconds(0, 0);
  return `${symbol}-${minuteTimestamp.toISOString()}`;
}

// Determine market type from symbol or instrument type
function getMarketType(symbol: string, instrumentType?: string | null): 'stocks' | 'crypto' | 'forex' {
  if (instrumentType === 'crypto') return 'crypto';
  if (instrumentType === 'forex') return 'forex';
  
  // Auto-detect from symbol format
  const upperSymbol = symbol.toUpperCase();
  
  // Crypto patterns: BTC, ETH, BTCUSD, etc.
  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH') || 
      upperSymbol.includes('USD') && (upperSymbol.length <= 7)) {
    // Check for forex pairs like EURUSD
    const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
    if (forexPairs.some(pair => upperSymbol.startsWith(pair))) {
      return 'forex';
    }
    return 'crypto';
  }
  
  // Forex patterns
  if (symbol.includes('/') || (symbol.length === 6 && /^[A-Z]+$/.test(upperSymbol))) {
    return 'forex';
  }
  
  return 'stocks';
}

// Get tolerance based on market type
function getTolerance(price: number, marketType: 'stocks' | 'crypto' | 'forex'): number {
  switch (marketType) {
    case 'forex':
      // 2 pips tolerance (assuming standard 4-decimal pairs)
      return 0.0002;
    case 'crypto':
      // 0.1% tolerance
      return price * 0.001;
    default:
      // Stocks: 0.05% tolerance
      return price * 0.0005;
  }
}

// Fetch historical price data for a symbol at a specific timestamp
async function getHistoricalPrice(
  symbol: string,
  timestamp: Date,
  instrumentType?: string | null
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  const cacheKey = getPriceCacheKey(symbol, timestamp);
  
  // Check cache first
  if (priceCache.has(cacheKey)) {
    return priceCache.get(cacheKey)!;
  }
  
  try {
    const marketType = getMarketType(symbol, instrumentType);
    const ticker = formatPolygonTicker(symbol, marketType);
    
    // Get the date in YYYY-MM-DD format
    const dateStr = timestamp.toISOString().split('T')[0];
    
    // Fetch minute-level data for the day
    const data = await getAggregates(ticker, 1, 'minute', dateStr, dateStr);
    
    if (!data.results || data.results.length === 0) {
      console.log(`[Verification] No price data for ${symbol} on ${dateStr}`);
      return null;
    }
    
    // Find the bar closest to the timestamp
    const targetTime = timestamp.getTime();
    let closestBar = data.results[0];
    let closestDiff = Math.abs(data.results[0].t - targetTime);
    
    for (const bar of data.results) {
      const diff = Math.abs(bar.t - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestBar = bar;
      }
    }
    
    const result = {
      low: closestBar.l,
      high: closestBar.h,
      open: closestBar.o,
      close: closestBar.c
    };
    
    // Cache the result
    priceCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`[Verification] Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// Verify a single trade leg
async function verifyLeg(
  symbol: string,
  fillPrice: number,
  timestamp: Date,
  side: 'entry' | 'exit',
  instrumentType?: string | null
): Promise<LegVerification> {
  const marketData = await getHistoricalPrice(symbol, timestamp, instrumentType);
  
  if (!marketData) {
    return {
      side,
      fill_price: fillPrice,
      timestamp,
      market_low: null,
      market_high: null,
      market_open: null,
      market_close: null,
      deviation: null,
      status: 'unknown',
      score: 0.5, // Neutral score when data unavailable
      notes: 'Historical price data not available'
    };
  }
  
  const { low, high, open, close } = marketData;
  const midpoint = (low + high) / 2;
  const marketType = getMarketType(symbol, instrumentType);
  const tolerance = getTolerance(fillPrice, marketType);
  
  let status: LegVerification['status'] = 'realistic';
  let score = 1.0;
  let notes = '';
  
  // Calculate deviation from midpoint
  const deviation = Math.abs(fillPrice - midpoint) / midpoint;
  
  // Check if price is within realistic range
  if (fillPrice < low - tolerance) {
    status = 'impossible_low';
    score = 0.0;
    notes = `Fill price ${fillPrice} is below market low ${low.toFixed(4)} (tolerance: ${tolerance.toFixed(6)})`;
  } else if (fillPrice > high + tolerance) {
    status = 'impossible_high';
    score = 0.0;
    notes = `Fill price ${fillPrice} is above market high ${high.toFixed(4)} (tolerance: ${tolerance.toFixed(6)})`;
  } else {
    // Check for suspicious precision (exact high or low)
    const precisionThreshold = tolerance * 0.1;
    if (Math.abs(fillPrice - low) < precisionThreshold || Math.abs(fillPrice - high) < precisionThreshold) {
      status = 'suspicious_precision';
      score = 0.3;
      notes = `Fill price matches market ${Math.abs(fillPrice - low) < precisionThreshold ? 'low' : 'high'} suspiciously precisely`;
    } else {
      // Realistic trade - adjust score based on deviation
      if (deviation < 0.001) {
        score = 1.0;
        notes = 'Excellent fill - very close to midpoint';
      } else if (deviation < 0.005) {
        score = 0.9;
        notes = 'Good fill - within normal range';
      } else if (deviation < 0.01) {
        score = 0.75;
        notes = 'Acceptable fill - moderate deviation from midpoint';
      } else {
        score = 0.6;
        notes = 'High deviation fill - near edge of range';
      }
    }
  }
  
  return {
    side,
    fill_price: fillPrice,
    timestamp,
    market_low: low,
    market_high: high,
    market_open: open,
    market_close: close,
    deviation,
    status,
    score,
    notes
  };
}

// Verify a complete trade (entry + optional exit)
export async function verifyTrade(trade: TradeToVerify): Promise<TradeVerificationResult> {
  // Verify entry leg
  const entryVerification = await verifyLeg(
    trade.symbol,
    trade.entry_fill_price,
    trade.entry_timestamp,
    'entry',
    trade.instrument_type
  );
  
  // Verify exit leg if exists
  let exitVerification: LegVerification | null = null;
  if (trade.exit_fill_price !== null && trade.exit_timestamp !== null) {
    exitVerification = await verifyLeg(
      trade.symbol,
      trade.exit_fill_price,
      trade.exit_timestamp,
      'exit',
      trade.instrument_type
    );
  }
  
  // Calculate combined authenticity score
  let authenticity_score: number;
  if (exitVerification) {
    authenticity_score = (entryVerification.score + exitVerification.score) / 2;
  } else {
    authenticity_score = entryVerification.score;
  }
  
  // Determine flags
  const impossible_flag = 
    entryVerification.status === 'impossible_low' || 
    entryVerification.status === 'impossible_high' ||
    (exitVerification?.status === 'impossible_low') ||
    (exitVerification?.status === 'impossible_high');
  
  const suspicious_flag = 
    entryVerification.status === 'suspicious_precision' ||
    (exitVerification?.status === 'suspicious_precision');
  
  // Trade is verified if all legs are realistic and score >= 0.7
  const verified = 
    !impossible_flag &&
    authenticity_score >= 0.7 &&
    entryVerification.status !== 'unknown' &&
    (!exitVerification || exitVerification.status !== 'unknown');
  
  // Build verification notes
  const notes: string[] = [];
  notes.push(`Entry: ${entryVerification.notes}`);
  if (exitVerification) {
    notes.push(`Exit: ${exitVerification.notes}`);
  }
  
  return {
    trade_id: trade.id,
    verified,
    authenticity_score,
    entry_verification: entryVerification,
    exit_verification: exitVerification,
    verification_notes: notes.join(' | '),
    suspicious_flag,
    impossible_flag
  };
}

// Verify multiple trades with batching and rate limiting
export async function verifyTrades(
  trades: TradeToVerify[],
  onProgress?: (completed: number, total: number) => void
): Promise<TradeVerificationResult[]> {
  const results: TradeVerificationResult[] = [];
  const batchSize = 5; // Process 5 trades at a time to avoid rate limiting
  
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(trade => verifyTrade(trade))
    );
    
    results.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, trades.length), trades.length);
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < trades.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}

// Generate verification summary
export function generateVerificationSummary(results: TradeVerificationResult[]): VerificationSummary {
  const total = results.length;
  const verified = results.filter(r => r.verified).length;
  const impossible = results.filter(r => r.impossible_flag).length;
  const suspicious = results.filter(r => r.suspicious_flag && !r.impossible_flag).length;
  const unknown = results.filter(r => 
    r.entry_verification.status === 'unknown' ||
    (r.exit_verification?.status === 'unknown')
  ).length;
  
  const avgScore = total > 0 
    ? results.reduce((sum, r) => sum + r.authenticity_score, 0) / total 
    : 0;
  
  return {
    total_trades: total,
    verified_trades: verified,
    impossible_trades: impossible,
    suspicious_trades: suspicious,
    unknown_trades: unknown,
    average_score: avgScore,
    verification_rate: total > 0 ? (verified / total) * 100 : 0
  };
}

// Clear the price cache (useful for testing or memory management)
export function clearPriceCache(): void {
  priceCache.clear();
}
