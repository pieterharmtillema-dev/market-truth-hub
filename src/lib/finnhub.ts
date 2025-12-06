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

// Get company profile
export async function getCompanyProfile(symbol: string): Promise<any | null> {
  const cacheKey = `profile-${symbol}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
    return cached.data;
  }

  try {
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// Clear cache (useful for forcing refresh)
export function clearCache(): void {
  apiCache.clear();
}
