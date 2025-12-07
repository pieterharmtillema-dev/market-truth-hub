// Trade Verification Module - Validates fill prices against Polygon.io and Finnhub historical data
import { getAggregates } from './polygon';
import { getHistoricalOHLC as getFinnhubOHLC } from './finnhub';
import { normalizeSymbol, NormalizedSymbol, getPolygonMarketType } from './symbolNormalizer';

export type DataProvider = 'polygon' | 'finnhub' | 'none';

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
  provider_used: DataProvider;
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
  // Symbol normalization info
  original_symbol: string;
  normalized_symbol: string | null;
  asset_type: string;
  unsupported_reason?: string;
  // Provider tracking
  provider_used: DataProvider;
  polygon_status: 'success' | 'empty' | 'error' | 'not_attempted';
  finnhub_status: 'success' | 'empty' | 'error' | 'not_attempted';
}

export interface VerificationSummary {
  total_trades: number;
  verified_trades: number;
  impossible_trades: number;
  suspicious_trades: number;
  unknown_trades: number;
  average_score: number;
  verification_rate: number;
  // Provider breakdown
  polygon_verified: number;
  finnhub_verified: number;
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
const priceCache = new Map<string, { low: number; high: number; open: number; close: number; provider: DataProvider }>();

// Generate cache key for price data
function getPriceCacheKey(symbol: string, timestamp: Date, provider: string): string {
  const minuteTimestamp = new Date(timestamp);
  minuteTimestamp.setSeconds(0, 0);
  return `${provider}-${symbol}-${minuteTimestamp.toISOString()}`;
}

// Get market type from normalized symbol
function getMarketTypeFromNormalized(normalizedSymbol: NormalizedSymbol): 'stocks' | 'crypto' | 'forex' {
  return getPolygonMarketType(normalizedSymbol.assetType);
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

// Fetch historical price data from Polygon
async function getPolygonPrice(
  normalizedSymbol: NormalizedSymbol,
  timestamp: Date
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  if (!normalizedSymbol.polygon) {
    return null;
  }
  
  const cacheKey = getPriceCacheKey(normalizedSymbol.polygon, timestamp, 'polygon');
  
  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && cached.provider === 'polygon') {
    return { low: cached.low, high: cached.high, open: cached.open, close: cached.close };
  }
  
  try {
    const ticker = normalizedSymbol.polygon;
    const dateStr = timestamp.toISOString().split('T')[0];
    
    // Fetch minute-level data for the day
    const data = await getAggregates(ticker, 1, 'minute', dateStr, dateStr);
    
    if (!data.results || data.results.length === 0) {
      console.log(`[Polygon] No price data for ${normalizedSymbol.original} (${ticker}) on ${dateStr}`);
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
    priceCache.set(cacheKey, { ...result, provider: 'polygon' });
    
    return result;
  } catch (error) {
    console.error(`[Polygon] Error fetching price for ${normalizedSymbol.original}:`, error);
    return null;
  }
}

// Fetch historical price data from Finnhub
async function getFinnhubPrice(
  normalizedSymbol: NormalizedSymbol,
  timestamp: Date
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  if (!normalizedSymbol.finnhub) {
    return null;
  }
  
  const cacheKey = getPriceCacheKey(normalizedSymbol.finnhub, timestamp, 'finnhub');
  
  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && cached.provider === 'finnhub') {
    return { low: cached.low, high: cached.high, open: cached.open, close: cached.close };
  }
  
  try {
    const marketType = getMarketTypeFromNormalized(normalizedSymbol);
    const result = await getFinnhubOHLC(normalizedSymbol.finnhub, marketType, timestamp);
    
    if (!result) {
      console.log(`[Finnhub] No price data for ${normalizedSymbol.original} (${normalizedSymbol.finnhub})`);
      return null;
    }
    
    // Cache the result
    priceCache.set(cacheKey, { ...result, provider: 'finnhub' });
    
    return result;
  } catch (error) {
    console.error(`[Finnhub] Error fetching price for ${normalizedSymbol.original}:`, error);
    return null;
  }
}

// Fetch historical price data - tries Polygon first, then Finnhub
async function getHistoricalPrice(
  normalizedSymbol: NormalizedSymbol,
  timestamp: Date
): Promise<{ data: { low: number; high: number; open: number; close: number } | null; provider: DataProvider; polygonStatus: 'success' | 'empty' | 'error'; finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' }> {
  let polygonStatus: 'success' | 'empty' | 'error' = 'empty';
  let finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  
  // Try Polygon first
  if (normalizedSymbol.polygon) {
    try {
      const polygonData = await getPolygonPrice(normalizedSymbol, timestamp);
      if (polygonData) {
        polygonStatus = 'success';
        return { data: polygonData, provider: 'polygon', polygonStatus, finnhubStatus };
      }
      polygonStatus = 'empty';
    } catch {
      polygonStatus = 'error';
    }
  }
  
  // Fallback to Finnhub
  if (normalizedSymbol.finnhub) {
    try {
      const finnhubData = await getFinnhubPrice(normalizedSymbol, timestamp);
      if (finnhubData) {
        finnhubStatus = 'success';
        return { data: finnhubData, provider: 'finnhub', polygonStatus, finnhubStatus };
      }
      finnhubStatus = 'empty';
    } catch {
      finnhubStatus = 'error';
    }
  }
  
  return { data: null, provider: 'none', polygonStatus, finnhubStatus };
}

// Verify a single trade leg
async function verifyLeg(
  normalizedSymbol: NormalizedSymbol,
  fillPrice: number,
  timestamp: Date,
  side: 'entry' | 'exit'
): Promise<{ verification: LegVerification; polygonStatus: 'success' | 'empty' | 'error'; finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' }> {
  // If symbol is not supported, return unknown status
  if (!normalizedSymbol.isSupported) {
    return {
      verification: {
        side,
        fill_price: fillPrice,
        timestamp,
        market_low: null,
        market_high: null,
        market_open: null,
        market_close: null,
        deviation: null,
        status: 'unknown',
        score: 0.5, // Neutral score when unsupported
        notes: normalizedSymbol.reason || 'Symbol not supported',
        provider_used: 'none'
      },
      polygonStatus: 'empty',
      finnhubStatus: 'empty'
    };
  }
  
  const { data: marketData, provider, polygonStatus, finnhubStatus } = await getHistoricalPrice(normalizedSymbol, timestamp);
  
  if (!marketData) {
    return {
      verification: {
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
        notes: `No market data available from any provider`,
        provider_used: 'none'
      },
      polygonStatus,
      finnhubStatus
    };
  }
  
  const { low, high, open, close } = marketData;
  const midpoint = (low + high) / 2;
  const marketType = getMarketTypeFromNormalized(normalizedSymbol);
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
    notes = `Fill price ${fillPrice} is below market low ${low.toFixed(4)} (via ${provider})`;
  } else if (fillPrice > high + tolerance) {
    status = 'impossible_high';
    score = 0.0;
    notes = `Fill price ${fillPrice} is above market high ${high.toFixed(4)} (via ${provider})`;
  } else {
    // Check for suspicious precision (exact high or low)
    const precisionThreshold = tolerance * 0.1;
    if (Math.abs(fillPrice - low) < precisionThreshold || Math.abs(fillPrice - high) < precisionThreshold) {
      status = 'suspicious_precision';
      score = 0.3;
      notes = `Fill price matches market ${Math.abs(fillPrice - low) < precisionThreshold ? 'low' : 'high'} suspiciously precisely (via ${provider})`;
    } else {
      // Realistic trade - adjust score based on deviation
      if (deviation < 0.001) {
        score = 1.0;
        notes = `Excellent fill - very close to midpoint (via ${provider})`;
      } else if (deviation < 0.005) {
        score = 0.9;
        notes = `Good fill - within normal range (via ${provider})`;
      } else if (deviation < 0.01) {
        score = 0.75;
        notes = `Acceptable fill - moderate deviation (via ${provider})`;
      } else {
        score = 0.6;
        notes = `High deviation fill - near edge of range (via ${provider})`;
      }
    }
  }
  
  return {
    verification: {
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
      notes,
      provider_used: provider
    },
    polygonStatus,
    finnhubStatus
  };
}

// Verify a complete trade (entry + optional exit)
export async function verifyTrade(trade: TradeToVerify): Promise<TradeVerificationResult> {
  // Normalize the symbol first
  const normalizedSymbol = normalizeSymbol(trade.symbol, trade.instrument_type);
  
  // Verify entry leg
  const { verification: entryVerification, polygonStatus: entryPolygonStatus, finnhubStatus: entryFinnhubStatus } = await verifyLeg(
    normalizedSymbol,
    trade.entry_fill_price,
    trade.entry_timestamp,
    'entry'
  );
  
  // Verify exit leg if exists
  let exitVerification: LegVerification | null = null;
  let exitPolygonStatus: 'success' | 'empty' | 'error' = 'empty';
  let exitFinnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  
  if (trade.exit_fill_price !== null && trade.exit_timestamp !== null) {
    const exitResult = await verifyLeg(
      normalizedSymbol,
      trade.exit_fill_price,
      trade.exit_timestamp,
      'exit'
    );
    exitVerification = exitResult.verification;
    exitPolygonStatus = exitResult.polygonStatus;
    exitFinnhubStatus = exitResult.finnhubStatus;
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
  
  // Determine overall provider used (prefer the one that worked)
  let provider_used: DataProvider = 'none';
  if (entryVerification.provider_used !== 'none') {
    provider_used = entryVerification.provider_used;
  } else if (exitVerification?.provider_used && exitVerification.provider_used !== 'none') {
    provider_used = exitVerification.provider_used;
  }
  
  // Combine status from both legs
  const polygonStatus = entryPolygonStatus === 'success' || exitPolygonStatus === 'success' 
    ? 'success' 
    : (entryPolygonStatus === 'error' || exitPolygonStatus === 'error' ? 'error' : 'empty');
  
  const finnhubStatus = entryFinnhubStatus === 'success' || exitFinnhubStatus === 'success'
    ? 'success'
    : (entryFinnhubStatus === 'error' || exitFinnhubStatus === 'error' ? 'error' : 
       (entryFinnhubStatus === 'not_attempted' && exitFinnhubStatus === 'not_attempted' ? 'not_attempted' : 'empty'));
  
  // Trade is verified if all legs are realistic and score >= 0.7
  const verified = 
    normalizedSymbol.isSupported &&
    !impossible_flag &&
    authenticity_score >= 0.7 &&
    entryVerification.status !== 'unknown' &&
    (!exitVerification || exitVerification.status !== 'unknown');
  
  // Build verification notes
  const notes: string[] = [];
  if (!normalizedSymbol.isSupported) {
    notes.push(`Symbol: ${normalizedSymbol.reason || 'Unsupported'}`);
  }
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
    impossible_flag,
    // Symbol normalization info
    original_symbol: trade.symbol,
    normalized_symbol: normalizedSymbol.polygon || normalizedSymbol.finnhub,
    asset_type: normalizedSymbol.assetType,
    unsupported_reason: normalizedSymbol.isSupported ? undefined : normalizedSymbol.reason,
    // Provider tracking
    provider_used,
    polygon_status: polygonStatus,
    finnhub_status: finnhubStatus
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
  
  // Count by provider
  const polygonVerified = results.filter(r => r.verified && r.provider_used === 'polygon').length;
  const finnhubVerified = results.filter(r => r.verified && r.provider_used === 'finnhub').length;
  
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
    verification_rate: total > 0 ? (verified / total) * 100 : 0,
    polygon_verified: polygonVerified,
    finnhub_verified: finnhubVerified
  };
}

// Clear the price cache (useful for testing or memory management)
export function clearPriceCache(): void {
  priceCache.clear();
}