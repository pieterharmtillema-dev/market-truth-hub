// Polygon.io API client - uses Edge Function proxy for secure API access
import { supabase } from "@/integrations/supabase/client";

export const POLYGON_BASE_URL = "https://api.polygon.io";

export interface PolygonAggregateBar {
  c: number; // close
  h: number; // high
  l: number; // low
  o: number; // open
  t: number; // timestamp
  v: number; // volume
  vw: number; // volume weighted average price
  n: number; // number of transactions
}

export interface PolygonAggregatesResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: PolygonAggregateBar[];
  status: string;
  request_id: string;
  count: number;
}

export interface PolygonTickerSnapshot {
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  updated: number;
  day: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  min: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
    t: number;
  };
  prevDay: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
}

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes - extended to reduce API calls

// Global rate limiter for Polygon (free tier: 5 requests/minute)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 15000; // 15 seconds between requests to stay under 5/min

async function rateLimitedFetch(provider: string, endpoint: string, params: Record<string, any>): Promise<any> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`[Polygon] Rate limiting: waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  const { data, error } = await supabase.functions.invoke('market-data', {
    body: { provider, endpoint, params }
  });
  
  if (error) {
    throw new Error(`Market data API error: ${error.message}`);
  }
  
  return data;
}

// Get aggregates (candlestick data) with caching and retry
export async function getAggregates(
  ticker: string,
  multiplier: number = 1,
  timespan: "minute" | "hour" | "day" | "week" | "month" = "day",
  from: string,
  to: string,
  retries: number = 2
): Promise<PolygonAggregatesResponse> {
  const cacheKey = `agg-${ticker}-${multiplier}-${timespan}-${from}-${to}`;
  const cached = apiCache.get(cacheKey);
  
  // Use cache more aggressively
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const data = await rateLimitedFetch('polygon', 'aggregates', {
        ticker,
        multiplier,
        timespan,
        from,
        to
      });
      
      // Cache successful response
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error("Max retries exceeded");
}

// Get previous day's data with caching
export async function getPreviousClose(ticker: string): Promise<any> {
  const cacheKey = `prev-${ticker}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL * 5) { // 5 minute cache for prev close
    return cached.data;
  }

  const data = await rateLimitedFetch('polygon', 'previousClose', { ticker });
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// Get ticker snapshot
export async function getTickerSnapshot(ticker: string, market: "stocks" | "crypto" | "forex" = "stocks"): Promise<any> {
  const cacheKey = `snapshot-${ticker}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache for snapshots
    return cached.data;
  }

  const data = await rateLimitedFetch('polygon', 'snapshot', { ticker, market });
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// Get last trade price for a ticker
export async function getLastTrade(ticker: string): Promise<{ price: number; timestamp: number } | null> {
  const cacheKey = `trade-${ticker}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 15000) { // 15 second cache
    return cached.data;
  }

  try {
    const data = await rateLimitedFetch('polygon', 'lastTrade', { ticker });
    const result = data.results ? { price: data.results.p, timestamp: data.results.t } : null;
    
    if (result) {
      apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    
    return result;
  } catch {
    return null;
  }
}

// Get current price using previous close (most reliable for free tier)
export async function getCurrentPrice(
  symbol: string, 
  market: "stocks" | "crypto" | "forex" = "stocks"
): Promise<{ price: number; change: number; changePercent: number } | null> {
  const cacheKey = `current-${symbol}-${market}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
    return cached.data;
  }

  try {
    const ticker = formatPolygonTicker(symbol, market);
    const prevData = await getPreviousClose(ticker);
    
    if (!prevData.results?.[0]) return null;
    
    const bar = prevData.results[0];
    const price = bar.c;
    const prevClose = bar.o;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    const result = { price, change, changePercent };
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  } catch {
    return null;
  }
}

// Batch fetch current prices for multiple symbols (with rate limit awareness)
export async function batchGetCurrentPrices(
  symbols: Array<{ symbol: string; market: "stocks" | "crypto" | "forex" }>
): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const results = new Map();
  
  // Process in small batches with delays to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const promises = batch.map(async ({ symbol, market }) => {
      const data = await getCurrentPrice(symbol, market);
      if (data) {
        results.set(symbol, data);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Format ticker for different markets
export function formatPolygonTicker(symbol: string, market: "stocks" | "crypto" | "forex"): string {
  switch (market) {
    case "crypto":
      return `X:${symbol}USD`;
    case "forex":
      return `C:${symbol.replace("/", "")}`;
    default:
      return symbol;
  }
}

// Get date string for API
export function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}
