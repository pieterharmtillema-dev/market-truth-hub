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

// Get aggregates (candlestick data)
export async function getAggregates(
  ticker: string,
  multiplier: number = 1,
  timespan: "minute" | "hour" | "day" | "week" | "month" = "day",
  from: string,
  to: string
): Promise<PolygonAggregatesResponse> {
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch aggregates: ${response.statusText}`);
  }
  
  return response.json();
}

// Get previous day's data
export async function getPreviousClose(ticker: string): Promise<any> {
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch previous close: ${response.statusText}`);
  }
  
  return response.json();
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
