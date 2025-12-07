// Alpha Vantage API configuration
export const ALPHA_VANTAGE_API_KEY = "7G4U39PZ4TIX2LXA";
export const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

export interface AlphaVantageOHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Cache for API responses (Alpha Vantage has strict rate limits: 25/day free tier)
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 600000; // 10 minutes - aggressive caching due to rate limits

// Rate limiter (Alpha Vantage free tier: 25 requests/day, 5 requests/minute)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 15000; // 15 seconds between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`[AlphaVantage] Rate limiting: waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

// Get intraday data for stocks
export async function getStockIntraday(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '60min' = '1min'
): Promise<Map<string, AlphaVantageOHLC> | null> {
  const cacheKey = `stock-intraday-${symbol}-${interval}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`[AlphaVantage] Stock intraday API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check for rate limit error
    if (data.Note || data['Error Message']) {
      console.log(`[AlphaVantage] API limit or error: ${data.Note || data['Error Message']}`);
      return null;
    }
    
    const timeSeriesKey = `Time Series (${interval})`;
    const timeSeries = data[timeSeriesKey];
    
    if (!timeSeries) {
      console.log(`[AlphaVantage] No intraday data for ${symbol}`);
      return null;
    }
    
    const result = new Map<string, AlphaVantageOHLC>();
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      result.set(timestamp, {
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseFloat(v['5. volume'])
      });
    }
    
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching stock intraday for ${symbol}:`, error);
    return null;
  }
}

// Get daily data for stocks
export async function getStockDaily(symbol: string): Promise<Map<string, AlphaVantageOHLC> | null> {
  const cacheKey = `stock-daily-${symbol}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`[AlphaVantage] Stock daily API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.Note || data['Error Message']) {
      console.log(`[AlphaVantage] API limit or error: ${data.Note || data['Error Message']}`);
      return null;
    }
    
    const timeSeries = data['Time Series (Daily)'];
    
    if (!timeSeries) {
      console.log(`[AlphaVantage] No daily data for ${symbol}`);
      return null;
    }
    
    const result = new Map<string, AlphaVantageOHLC>();
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      result.set(timestamp, {
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseFloat(v['5. volume'])
      });
    }
    
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching stock daily for ${symbol}:`, error);
    return null;
  }
}

// Get forex intraday data
export async function getForexIntraday(
  fromCurrency: string,
  toCurrency: string,
  interval: '1min' | '5min' | '15min' | '30min' | '60min' = '1min'
): Promise<Map<string, AlphaVantageOHLC> | null> {
  const cacheKey = `forex-intraday-${fromCurrency}-${toCurrency}-${interval}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=${interval}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`[AlphaVantage] Forex intraday API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.Note || data['Error Message']) {
      console.log(`[AlphaVantage] API limit or error: ${data.Note || data['Error Message']}`);
      return null;
    }
    
    const timeSeriesKey = `Time Series FX (Intraday)`;
    const timeSeries = data[timeSeriesKey];
    
    if (!timeSeries) {
      console.log(`[AlphaVantage] No forex intraday data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
    
    const result = new Map<string, AlphaVantageOHLC>();
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      result.set(timestamp, {
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close'])
      });
    }
    
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching forex intraday for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

// Get forex daily data
export async function getForexDaily(
  fromCurrency: string,
  toCurrency: string
): Promise<Map<string, AlphaVantageOHLC> | null> {
  const cacheKey = `forex-daily-${fromCurrency}-${toCurrency}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`[AlphaVantage] Forex daily API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.Note || data['Error Message']) {
      console.log(`[AlphaVantage] API limit or error: ${data.Note || data['Error Message']}`);
      return null;
    }
    
    const timeSeries = data['Time Series FX (Daily)'];
    
    if (!timeSeries) {
      console.log(`[AlphaVantage] No forex daily data for ${fromCurrency}/${toCurrency}`);
      return null;
    }
    
    const result = new Map<string, AlphaVantageOHLC>();
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      result.set(timestamp, {
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close'])
      });
    }
    
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching forex daily for ${fromCurrency}/${toCurrency}:`, error);
    return null;
  }
}

// Get crypto daily data
export async function getCryptoDaily(
  symbol: string,
  market: string = 'USD'
): Promise<Map<string, AlphaVantageOHLC> | null> {
  const cacheKey = `crypto-daily-${symbol}-${market}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=${market}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`[AlphaVantage] Crypto daily API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.Note || data['Error Message']) {
      console.log(`[AlphaVantage] API limit or error: ${data.Note || data['Error Message']}`);
      return null;
    }
    
    const timeSeries = data['Time Series (Digital Currency Daily)'];
    
    if (!timeSeries) {
      console.log(`[AlphaVantage] No crypto daily data for ${symbol}`);
      return null;
    }
    
    const result = new Map<string, AlphaVantageOHLC>();
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      // Alpha Vantage uses different key format for crypto
      result.set(timestamp, {
        open: parseFloat(v['1a. open (USD)'] || v['1. open']),
        high: parseFloat(v['2a. high (USD)'] || v['2. high']),
        low: parseFloat(v['3a. low (USD)'] || v['3. low']),
        close: parseFloat(v['4a. close (USD)'] || v['4. close']),
        volume: parseFloat(v['5. volume'] || 0)
      });
    }
    
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching crypto daily for ${symbol}:`, error);
    return null;
  }
}

// Helper function to get historical OHLC for a specific date
export async function getHistoricalOHLC(
  symbol: string,
  assetType: 'stocks' | 'crypto' | 'forex',
  timestamp: Date
): Promise<{ low: number; high: number; open: number; close: number } | null> {
  const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    let data: Map<string, AlphaVantageOHLC> | null = null;
    
    switch (assetType) {
      case 'forex': {
        // Parse forex symbol (e.g., "EURUSD" -> "EUR", "USD")
        const fromCurrency = symbol.substring(0, 3);
        const toCurrency = symbol.substring(3, 6) || 'USD';
        data = await getForexDaily(fromCurrency, toCurrency);
        break;
      }
      case 'crypto': {
        // Parse crypto symbol (e.g., "BTC", "BTCUSD" -> "BTC")
        const cryptoSymbol = symbol.replace(/USD$|USDT$/, '');
        data = await getCryptoDaily(cryptoSymbol, 'USD');
        break;
      }
      default: {
        data = await getStockDaily(symbol);
        break;
      }
    }
    
    if (!data) {
      return null;
    }
    
    // Find the closest date to our target
    const ohlc = data.get(dateStr);
    if (ohlc) {
      return {
        low: ohlc.low,
        high: ohlc.high,
        open: ohlc.open,
        close: ohlc.close
      };
    }
    
    // If exact date not found, find closest previous date
    const dates = Array.from(data.keys()).sort().reverse();
    for (const date of dates) {
      if (date <= dateStr) {
        const closestOhlc = data.get(date);
        if (closestOhlc) {
          return {
            low: closestOhlc.low,
            high: closestOhlc.high,
            open: closestOhlc.open,
            close: closestOhlc.close
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[AlphaVantage] Error getting historical OHLC for ${symbol}:`, error);
    return null;
  }
}

// Clear cache
export function clearCache(): void {
  apiCache.clear();
}
