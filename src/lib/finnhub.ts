// Finnhub API configuration
export const FINNHUB_API_KEY = "d4qamehr01quli1bdbq0d4qamehr01quli1bdbqg";
export const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  t: number[];  // Timestamps
  v: number[];  // Volume
  s: string;    // Status
}

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds for more real-time data

// Get real-time quote for a stock
export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  const cacheKey = `quote-${symbol}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got valid data (c=0 means no data)
    if (data.c === 0 && data.pc === 0) {
      console.warn(`No data for symbol: ${symbol}`);
      return null;
    }
    
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

// Get stock candles from Finnhub API
export async function getStockCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  const cacheKey = `stock-candles-${symbol}-${resolution}-${from}-${to}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) { // 1 minute cache for historical
    return cached.data;
  }
  
  try {
    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub stock candles API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      return null;
    }
    
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching stock candles for ${symbol}:`, error);
    return null;
  }
}

// Get forex candles from Finnhub API
export async function getForexCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  const cacheKey = `forex-candles-${symbol}-${resolution}-${from}-${to}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) {
    return cached.data;
  }
  
  try {
    const url = `${FINNHUB_BASE_URL}/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub forex candles API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      return null;
    }
    
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching forex candles for ${symbol}:`, error);
    return null;
  }
}

// Get crypto candles from Finnhub API
export async function getCryptoCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  const cacheKey = `crypto-candles-${symbol}-${resolution}-${from}-${to}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 6) {
    return cached.data;
  }
  
  try {
    const url = `${FINNHUB_BASE_URL}/crypto/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub crypto candles API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      return null;
    }
    
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching crypto candles for ${symbol}:`, error);
    return null;
  }
}

// Get historical OHLC for verification - tries appropriate endpoint based on asset type
export async function getHistoricalOHLC(
  symbol: string,
  assetType: 'stocks' | 'crypto' | 'forex',
  timestamp: Date
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  // Calculate from/to timestamps - get the full day of the trade
  const tradeDate = new Date(timestamp);
  tradeDate.setHours(0, 0, 0, 0);
  const from = Math.floor(tradeDate.getTime() / 1000);
  const to = from + (24 * 60 * 60);
  
  let candles: FinnhubCandle | null = null;
  
  try {
    switch (assetType) {
      case 'forex':
        candles = await getForexCandles(symbol, 'D', from, to);
        break;
      case 'crypto':
        candles = await getCryptoCandles(symbol, 'D', from, to);
        break;
      default:
        candles = await getStockCandles(symbol, 'D', from, to);
    }
  } catch (error) {
    console.error(`[Finnhub] Error fetching OHLC for ${symbol}:`, error);
    return null;
  }
  
  if (!candles || !candles.c || candles.c.length === 0) {
    return null;
  }
  
  // Find the closest bar to our timestamp
  const targetTime = Math.floor(timestamp.getTime() / 1000);
  let closestIdx = 0;
  let closestDiff = Math.abs((candles.t[0] || 0) - targetTime);
  
  for (let i = 1; i < candles.t.length; i++) {
    const diff = Math.abs(candles.t[i] - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }
  
  return {
    low: candles.l[closestIdx],
    high: candles.h[closestIdx],
    open: candles.o[closestIdx],
    close: candles.c[closestIdx]
  };
}

// Legacy function for chart display - generates synthetic data from quote
export async function getCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  // Generate synthetic historical data from quote for display purposes
  // This is a workaround since the free tier doesn't include candle data
  const quote = await getQuote(symbol);
  
  if (!quote) return null;
  
  // Generate synthetic daily data based on quote
  const days = Math.ceil((to - from) / (24 * 60 * 60));
  const dataPoints = Math.min(days, 30);
  
  const basePrice = quote.pc; // Previous close as base
  const currentPrice = quote.c;
  const priceChange = currentPrice - basePrice;
  
  const timestamps: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const progress = i / (dataPoints - 1);
    const dayTimestamp = from + (i * 24 * 60 * 60);
    
    // Create realistic-looking price movement
    const noise = (Math.random() - 0.5) * 2;
    const trend = basePrice + (priceChange * progress);
    const dailyVariation = trend * 0.02 * noise;
    
    const open = trend + dailyVariation * 0.5;
    const close = i === dataPoints - 1 ? currentPrice : trend + dailyVariation;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    timestamps.push(dayTimestamp);
    opens.push(Number(open.toFixed(2)));
    highs.push(Number(high.toFixed(2)));
    lows.push(Number(low.toFixed(2)));
    closes.push(Number(close.toFixed(2)));
    volumes.push(Math.floor(Math.random() * 10000000));
  }
  
  return {
    c: closes,
    h: highs,
    l: lows,
    o: opens,
    t: timestamps,
    v: volumes,
    s: "ok"
  };
}

// Legacy function for chart display - generates synthetic crypto data from quote
export async function getLegacyCryptoCandles(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  // Use the formatted crypto symbol for quote
  const formattedSymbol = `BINANCE:${symbol}USDT`;
  const quote = await getQuote(formattedSymbol);
  
  if (!quote) return null;
  
  // Generate synthetic data from quote
  const days = Math.ceil((to - from) / (24 * 60 * 60));
  const dataPoints = Math.min(days, 30);
  
  const basePrice = quote.pc;
  const currentPrice = quote.c;
  const priceChange = currentPrice - basePrice;
  
  const timestamps: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const progress = i / (dataPoints - 1);
    const dayTimestamp = from + (i * 24 * 60 * 60);
    
    const noise = (Math.random() - 0.5) * 2;
    const trend = basePrice + (priceChange * progress);
    const dailyVariation = trend * 0.03 * noise; // Crypto is more volatile
    
    const open = trend + dailyVariation * 0.5;
    const close = i === dataPoints - 1 ? currentPrice : trend + dailyVariation;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    
    timestamps.push(dayTimestamp);
    opens.push(Number(open.toFixed(2)));
    highs.push(Number(high.toFixed(2)));
    lows.push(Number(low.toFixed(2)));
    closes.push(Number(close.toFixed(2)));
    volumes.push(Math.floor(Math.random() * 50000000));
  }
  
  return {
    c: closes,
    h: highs,
    l: lows,
    o: opens,
    t: timestamps,
    v: volumes,
    s: "ok"
  };
}

// Get current price with change info
export async function getCurrentPrice(
  symbol: string,
  market: "stocks" | "crypto" | "forex" = "stocks"
): Promise<{ price: number; change: number; changePercent: number } | null> {
  // Format symbol for Finnhub
  const finnhubSymbol = formatFinnhubSymbol(symbol, market);
  
  const quote = await getQuote(finnhubSymbol);
  
  if (!quote) return null;
  
  return {
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp
  };
}

// Format symbol for different markets
export function formatFinnhubSymbol(symbol: string, market: "stocks" | "crypto" | "forex"): string {
  switch (market) {
    case "crypto":
      // Finnhub uses BINANCE:BTCUSDT format for crypto
      return `BINANCE:${symbol}USDT`;
    case "forex":
      // Finnhub uses OANDA:EUR_USD format for forex
      return `OANDA:${symbol.replace("/", "_")}`;
    default:
      return symbol;
  }
}

// Get timestamps for date range
export function getTimestamps(daysAgo: number): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  const from = now - (daysAgo * 24 * 60 * 60);
  return { from, to: now };
}

// Batch fetch quotes for multiple symbols
export async function batchGetQuotes(
  symbols: Array<{ symbol: string; market: "stocks" | "crypto" | "forex" }>
): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const results = new Map();
  
  // Finnhub free tier has rate limits, process sequentially with small delays
  for (const { symbol, market } of symbols) {
    const data = await getCurrentPrice(symbol, market);
    if (data) {
      results.set(symbol, data);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Clear cache (useful for forcing refresh)
export function clearCache(): void {
  apiCache.clear();
}
