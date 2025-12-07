// Trade Verification Module - Validates fill prices against Polygon.io, Finnhub, and AlphaVantage historical data
// Uses smart tolerance model to reduce false positives while detecting real fraud
import { getAggregates } from './polygon';
import { getHistoricalOHLC as getFinnhubOHLC } from './finnhub';
import { getHistoricalOHLC as getAlphaVantageOHLC } from './alphaVantage';
import { normalizeSymbol, NormalizedSymbol, getPolygonMarketType } from './symbolNormalizer';

export type DataProvider = 'polygon' | 'finnhub' | 'alphavantage' | 'none';

export type VerificationStatus = 
  | 'realistic'           // Within tolerance, verified
  | 'mild_anomaly'        // Slightly outside tolerance, verified with flag
  | 'suspicious_precision'// Exact high/low hit
  | 'impossible'          // Far outside tolerance
  | 'unknown';            // No market data

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
  // Smart tolerance fields
  tolerance_value: number | null;
  deviation_value: number | null;
  deviation_from_range: number | null; // How far outside the range (0 if inside)
  // Flags
  suspicious_precision: boolean;
  suspicious_mild: boolean;
  suspicious_strong: boolean;
  // Legacy fields for compatibility
  deviation: number | null;
  status: VerificationStatus;
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
  mild_anomaly_trades: number;
  average_score: number;
  verification_rate: number;
  // Provider breakdown
  polygon_verified: number;
  finnhub_verified: number;
  alphavantage_verified: number;
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

/**
 * Smart tolerance calculation based on asset type and volatility
 * 
 * Forex: max(0.0002, ATR * 0.2) - minimum 2 pips or 20% of candle volatility
 * Crypto: 0.1% of mid price
 * Stocks: 0.05% of price
 */
function calculateSmartTolerance(
  price: number, 
  marketType: 'stocks' | 'crypto' | 'forex',
  marketData?: { low: number; high: number } | null
): number {
  switch (marketType) {
    case 'forex': {
      const minimumPips = 0.0002; // 2 pips
      if (marketData) {
        const atr = marketData.high - marketData.low; // Simple ATR approximation from candle
        const volatilityTolerance = atr * 0.2; // 20% of candle range
        return Math.max(minimumPips, volatilityTolerance);
      }
      return minimumPips;
    }
    case 'crypto': {
      // 0.1% of mid price
      return price * 0.001;
    }
    default: {
      // Stocks: 0.05% of price
      return price * 0.0005;
    }
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

// Fetch historical price data from AlphaVantage
async function getAlphaVantagePrice(
  normalizedSymbol: NormalizedSymbol,
  timestamp: Date
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  const cacheKey = getPriceCacheKey(normalizedSymbol.original, timestamp, 'alphavantage');
  
  // Check cache first
  const cached = priceCache.get(cacheKey);
  if (cached && cached.provider === 'alphavantage') {
    return { low: cached.low, high: cached.high, open: cached.open, close: cached.close };
  }
  
  try {
    const marketType = getMarketTypeFromNormalized(normalizedSymbol);
    
    // Extract symbol for AlphaVantage (strip prefixes)
    let symbol = normalizedSymbol.original;
    if (symbol.startsWith('C:')) symbol = symbol.substring(2);
    if (symbol.startsWith('X:')) symbol = symbol.substring(2);
    if (symbol.startsWith('FX:')) symbol = symbol.substring(3);
    symbol = symbol.replace(/[:\-\/]/g, '');
    
    const result = await getAlphaVantageOHLC(symbol, marketType, timestamp);
    
    if (!result) {
      console.log(`[AlphaVantage] No price data for ${normalizedSymbol.original} (${symbol})`);
      return null;
    }
    
    // Cache the result
    priceCache.set(cacheKey, { ...result, provider: 'alphavantage' as DataProvider });
    
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching price for ${normalizedSymbol.original}:`, error);
    return null;
  }
}

// Fetch historical price data - tries Polygon first, then Finnhub, then AlphaVantage
async function getHistoricalPrice(
  normalizedSymbol: NormalizedSymbol,
  timestamp: Date
): Promise<{ 
  data: { low: number; high: number; open: number; close: number } | null; 
  provider: DataProvider; 
  polygonStatus: 'success' | 'empty' | 'error'; 
  finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted';
  alphavantageStatus: 'success' | 'empty' | 'error' | 'not_attempted';
}> {
  let polygonStatus: 'success' | 'empty' | 'error' = 'empty';
  let finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  let alphavantageStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  
  // Try Polygon first
  if (normalizedSymbol.polygon) {
    try {
      const polygonData = await getPolygonPrice(normalizedSymbol, timestamp);
      if (polygonData) {
        polygonStatus = 'success';
        return { data: polygonData, provider: 'polygon', polygonStatus, finnhubStatus, alphavantageStatus };
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
        return { data: finnhubData, provider: 'finnhub', polygonStatus, finnhubStatus, alphavantageStatus };
      }
      finnhubStatus = 'empty';
    } catch {
      finnhubStatus = 'error';
    }
  }
  
  // Final fallback to AlphaVantage
  try {
    const alphaData = await getAlphaVantagePrice(normalizedSymbol, timestamp);
    if (alphaData) {
      alphavantageStatus = 'success';
      return { data: alphaData, provider: 'alphavantage', polygonStatus, finnhubStatus, alphavantageStatus };
    }
    alphavantageStatus = 'empty';
  } catch {
    alphavantageStatus = 'error';
  }
  
  return { data: null, provider: 'none', polygonStatus, finnhubStatus, alphavantageStatus };
}

/**
 * Smart leg verification with dynamic tolerance model
 * 
 * Verification levels:
 * - realistic: Within tolerance, high score (0.8-1.0)
 * - mild_anomaly: Slightly outside tolerance (<2x), verified with flag, medium score (0.5-0.7)
 * - suspicious_precision: Exact high/low hit, score penalty (-0.1)
 * - impossible: Far outside tolerance (>2x), not verified, score 0
 * - unknown: No market data, null verification
 */
async function verifyLeg(
  normalizedSymbol: NormalizedSymbol,
  fillPrice: number,
  timestamp: Date,
  side: 'entry' | 'exit'
): Promise<{ 
  verification: LegVerification; 
  polygonStatus: 'success' | 'empty' | 'error'; 
  finnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted';
  alphavantageStatus: 'success' | 'empty' | 'error' | 'not_attempted';
}> {
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
        tolerance_value: null,
        deviation_value: null,
        deviation_from_range: null,
        suspicious_precision: false,
        suspicious_mild: false,
        suspicious_strong: false,
        deviation: null,
        status: 'unknown',
        score: 0.5,
        notes: normalizedSymbol.reason || 'Symbol not supported',
        provider_used: 'none'
      },
      polygonStatus: 'empty',
      finnhubStatus: 'empty',
      alphavantageStatus: 'empty'
    };
  }
  
  const { data: marketData, provider, polygonStatus, finnhubStatus, alphavantageStatus } = await getHistoricalPrice(normalizedSymbol, timestamp);
  
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
        tolerance_value: null,
        deviation_value: null,
        deviation_from_range: null,
        suspicious_precision: false,
        suspicious_mild: false,
        suspicious_strong: false,
        deviation: null,
        status: 'unknown',
        score: 0.5,
        notes: 'No market data available from any provider',
        provider_used: 'none'
      },
      polygonStatus,
      finnhubStatus,
      alphavantageStatus
    };
  }
  
  const { low, high, open, close } = marketData;
  const midpoint = (low + high) / 2;
  const marketType = getMarketTypeFromNormalized(normalizedSymbol);
  
  // Calculate smart tolerance based on asset type and volatility
  const tolerance = calculateSmartTolerance(fillPrice, marketType, marketData);
  
  // Calculate deviation from midpoint (for scoring)
  const deviationFromMidpoint = Math.abs(fillPrice - midpoint) / midpoint;
  
  // Calculate deviation from range (how far outside low-high)
  let deviationFromRange = 0;
  if (fillPrice < low) {
    deviationFromRange = low - fillPrice;
  } else if (fillPrice > high) {
    deviationFromRange = fillPrice - high;
  }
  
  // Check for suspicious precision (exact high or low hit)
  const precisionThreshold = tolerance * 0.05; // 5% of tolerance
  const hitsExactLow = Math.abs(fillPrice - low) < precisionThreshold;
  const hitsExactHigh = Math.abs(fillPrice - high) < precisionThreshold;
  const suspiciousPrecision = hitsExactLow || hitsExactHigh;
  
  let status: VerificationStatus = 'realistic';
  let score = 1.0;
  let notes = '';
  let suspiciousMild = false;
  let suspiciousStrong = false;
  
  // Determine status based on smart tolerance model
  if (fillPrice >= low - tolerance && fillPrice <= high + tolerance) {
    // WITHIN TOLERANCE - Verified
    status = 'realistic';
    
    // Score based on how close to midpoint
    if (deviationFromMidpoint < 0.001) {
      score = 1.0;
      notes = `Excellent fill within volatility tolerance (via ${provider})`;
    } else if (deviationFromMidpoint < 0.003) {
      score = 0.95;
      notes = `Very good fill within tolerance (via ${provider})`;
    } else if (deviationFromMidpoint < 0.005) {
      score = 0.9;
      notes = `Good fill within normal range (via ${provider})`;
    } else if (deviationFromMidpoint < 0.01) {
      score = 0.85;
      notes = `Acceptable fill within tolerance (via ${provider})`;
    } else {
      score = 0.8;
      notes = `Fill at edge of range but within tolerance (via ${provider})`;
    }
    
    // Apply precision penalty if hits exact high/low
    if (suspiciousPrecision) {
      score = Math.max(0.7, score - 0.1);
      notes = `Fill matches exact ${hitsExactLow ? 'low' : 'high'} (minor anomaly) (via ${provider})`;
      status = 'suspicious_precision';
    }
  } else if (deviationFromRange <= tolerance * 2) {
    // SLIGHTLY OUTSIDE TOLERANCE - Verified with flag (mild anomaly)
    status = 'mild_anomaly';
    suspiciousMild = true;
    
    // Score between 0.5 and 0.7 based on how far outside
    const severityRatio = deviationFromRange / (tolerance * 2);
    score = 0.7 - (severityRatio * 0.2); // 0.7 to 0.5
    
    if (fillPrice < low) {
      notes = `Fill ${fillPrice.toFixed(4)} slightly below range (low: ${low.toFixed(4)}) but within tolerance margin (via ${provider})`;
    } else {
      notes = `Fill ${fillPrice.toFixed(4)} slightly above range (high: ${high.toFixed(4)}) but within tolerance margin (via ${provider})`;
    }
    
    // Additional penalty for precision
    if (suspiciousPrecision) {
      score = Math.max(0.5, score - 0.05);
    }
  } else {
    // FAR OUTSIDE TOLERANCE - Impossible (> 2x tolerance)
    status = 'impossible';
    suspiciousStrong = true;
    score = 0;
    
    if (fillPrice < low) {
      notes = `Fill ${fillPrice.toFixed(4)} impossible - far below market low ${low.toFixed(4)} (deviation: ${deviationFromRange.toFixed(4)}, tolerance: ${tolerance.toFixed(4)}) (via ${provider})`;
    } else {
      notes = `Fill ${fillPrice.toFixed(4)} impossible - far above market high ${high.toFixed(4)} (deviation: ${deviationFromRange.toFixed(4)}, tolerance: ${tolerance.toFixed(4)}) (via ${provider})`;
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
      tolerance_value: tolerance,
      deviation_value: deviationFromMidpoint,
      deviation_from_range: deviationFromRange,
      suspicious_precision: suspiciousPrecision,
      suspicious_mild: suspiciousMild,
      suspicious_strong: suspiciousStrong,
      deviation: deviationFromMidpoint,
      status,
      score,
      notes,
      provider_used: provider
    },
    polygonStatus,
    finnhubStatus,
    alphavantageStatus
  };
}

// Verify a complete trade (entry + optional exit)
export async function verifyTrade(trade: TradeToVerify): Promise<TradeVerificationResult> {
  // Normalize the symbol first
  const normalizedSymbol = normalizeSymbol(trade.symbol, trade.instrument_type);
  
  // Verify entry leg
  const { 
    verification: entryVerification, 
    polygonStatus: entryPolygonStatus, 
    finnhubStatus: entryFinnhubStatus,
    alphavantageStatus: entryAlphavantageStatus 
  } = await verifyLeg(
    normalizedSymbol,
    trade.entry_fill_price,
    trade.entry_timestamp,
    'entry'
  );
  
  // Verify exit leg if exists
  let exitVerification: LegVerification | null = null;
  let exitPolygonStatus: 'success' | 'empty' | 'error' = 'empty';
  let exitFinnhubStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  let exitAlphavantageStatus: 'success' | 'empty' | 'error' | 'not_attempted' = 'not_attempted';
  
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
    exitAlphavantageStatus = exitResult.alphavantageStatus;
  }
  
  // Calculate combined authenticity score
  let authenticity_score: number;
  if (exitVerification) {
    authenticity_score = (entryVerification.score + exitVerification.score) / 2;
  } else {
    authenticity_score = entryVerification.score;
  }
  
  // Determine flags based on new status model
  const impossible_flag = 
    entryVerification.status === 'impossible' ||
    exitVerification?.status === 'impossible';
  
  // Suspicious includes mild anomalies and precision issues
  const suspicious_flag = 
    entryVerification.suspicious_precision ||
    entryVerification.suspicious_mild ||
    exitVerification?.suspicious_precision ||
    exitVerification?.suspicious_mild;
  
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
  
  // Trade is verified if:
  // - Symbol is supported
  // - No impossible flags
  // - Score >= 0.5 (allows mild anomalies)
  // - Not unknown
  const verified = 
    normalizedSymbol.isSupported &&
    !impossible_flag &&
    authenticity_score >= 0.5 &&
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
  // Reduced batch size to 2 to stay under API rate limits
  const batchSize = 2;
  
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    
    // Process batch sequentially to respect rate limits
    for (const trade of batch) {
      const result = await verifyTrade(trade);
      results.push(result);
    }
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, trades.length), trades.length);
    }
    
    // Longer delay between batches to avoid rate limiting (20 seconds)
    if (i + batchSize < trades.length) {
      await new Promise(resolve => setTimeout(resolve, 20000));
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
  const mildAnomaly = results.filter(r => 
    r.entry_verification.status === 'mild_anomaly' ||
    r.exit_verification?.status === 'mild_anomaly'
  ).length;
  const unknown = results.filter(r => 
    r.entry_verification.status === 'unknown' ||
    (r.exit_verification?.status === 'unknown')
  ).length;
  
  // Count by provider
  const polygonVerified = results.filter(r => r.verified && r.provider_used === 'polygon').length;
  const finnhubVerified = results.filter(r => r.verified && r.provider_used === 'finnhub').length;
  const alphavantageVerified = results.filter(r => r.verified && r.provider_used === 'alphavantage').length;
  
  const avgScore = total > 0 
    ? results.reduce((sum, r) => sum + r.authenticity_score, 0) / total 
    : 0;
  
  return {
    total_trades: total,
    verified_trades: verified,
    impossible_trades: impossible,
    suspicious_trades: suspicious,
    mild_anomaly_trades: mildAnomaly,
    unknown_trades: unknown,
    average_score: avgScore,
    verification_rate: total > 0 ? (verified / total) * 100 : 0,
    polygon_verified: polygonVerified,
    finnhub_verified: finnhubVerified,
    alphavantage_verified: alphavantageVerified
  };
}

// Clear the price cache (useful for testing or memory management)
export function clearPriceCache(): void {
  priceCache.clear();
}
