// Polygon.io API configuration
export const POLYGON_API_KEY = "w_4UVsHuoT9cncTKAzRsnUlUabyFN5IY";
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
const CACHE_TTL = 60000; // 1 minute

// Get aggregates (candlestick data) with caching and retry
export async function getAggregates(
  ticker: string,
  multiplier: number = 1,
  timespan: "minute" | "hour" | "day" | "week" | "month" = "day",
  from: string,
  to: string,
  retries: number = 3
): Promise<PolygonAggregatesResponse> {
  const cacheKey = `agg-${ticker}-${multiplier}-${timespan}-${from}-${to}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait and retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`[Polygon] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch aggregates: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful response
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
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

  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch previous close: ${response.statusText}`);
  }
  
  const data = await response.json();
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// Get ticker snapshot
export async function getTickerSnapshot(ticker: string, market: "stocks" | "crypto" | "forex" = "stocks"): Promise<any> {
  const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/${market}/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
  }
  
  return response.json();
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
