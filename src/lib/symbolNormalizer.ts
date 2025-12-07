/**
 * Symbol Normalization Module
 * 
 * Converts symbols from various trading platform formats to Polygon.io-compatible tickers.
 * Handles forex, crypto, stocks, and detects unsupported symbols gracefully.
 */

export type AssetType = 'forex' | 'crypto' | 'stocks' | 'futures' | 'options' | 'unsupported';

export interface NormalizedSymbol {
  original: string;
  polygon: string | null;
  assetType: AssetType;
  base?: string;
  quote?: string;
  isSupported: boolean;
  reason?: string;
}

// Cache for normalized symbols to avoid redundant processing
const normalizationCache = new Map<string, NormalizedSymbol>();

// Common forex currency codes
const FOREX_CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'HKD', 'SGD',
  'SEK', 'DKK', 'NOK', 'MXN', 'ZAR', 'TRY', 'PLN', 'CNY', 'CNH', 'INR',
  'BRL', 'RUB', 'KRW', 'THB', 'MYR', 'IDR', 'PHP', 'CZK', 'HUF', 'ILS'
]);

// Common crypto base currencies
const CRYPTO_BASES = new Set([
  'BTC', 'ETH', 'XRP', 'LTC', 'BCH', 'ADA', 'DOT', 'LINK', 'BNB', 'SOL',
  'DOGE', 'SHIB', 'AVAX', 'MATIC', 'UNI', 'ATOM', 'XLM', 'ALGO', 'VET',
  'FIL', 'AAVE', 'EOS', 'XTZ', 'THETA', 'XMR', 'NEO', 'DASH', 'ZEC', 'COMP',
  'MKR', 'SNX', 'YFI', 'SUSHI', 'CRV', 'BAT', 'ENJ', 'MANA', 'SAND', 'AXS',
  'FTM', 'ONE', 'NEAR', 'FLOW', 'HBAR', 'ICP', 'EGLD', 'XEC', 'QNT', 'APE'
]);

// Common crypto quote currencies
const CRYPTO_QUOTES = new Set(['USD', 'USDT', 'USDC', 'BUSD', 'EUR', 'GBP', 'BTC', 'ETH']);

/**
 * Detect asset type from symbol format
 */
function detectAssetType(symbol: string): AssetType {
  const upper = symbol.toUpperCase().trim();
  
  // Check for explicit prefixes first
  if (upper.startsWith('FX:') || upper.startsWith('FOREX:') || upper.startsWith('OANDA:')) {
    return 'forex';
  }
  
  if (upper.startsWith('BINANCE:') || upper.startsWith('CRYPTO:') || upper.startsWith('COINBASE:') ||
      upper.startsWith('KRAKEN:') || upper.startsWith('BITSTAMP:') || upper.startsWith('BITFINEX:') ||
      upper.startsWith('GEMINI:') || upper.startsWith('KUCOIN:') || upper.startsWith('BYBIT:') ||
      upper.startsWith('X:')) {
    return 'crypto';
  }
  
  if (upper.startsWith('NASDAQ:') || upper.startsWith('NYSE:') || upper.startsWith('AMEX:') ||
      upper.startsWith('ARCA:') || upper.startsWith('BATS:')) {
    return 'stocks';
  }
  
  if (upper.startsWith('CME:') || upper.startsWith('NYMEX:') || upper.startsWith('COMEX:') ||
      upper.startsWith('CBOT:') || upper.startsWith('ICE:')) {
    return 'futures';
  }
  
  // Strip any prefix for pattern detection
  const cleanSymbol = stripPrefix(upper);
  
  // Check for forex pattern: 6-character currency pairs like EURUSD
  if (cleanSymbol.length === 6) {
    const base = cleanSymbol.substring(0, 3);
    const quote = cleanSymbol.substring(3, 6);
    if (FOREX_CURRENCIES.has(base) && FOREX_CURRENCIES.has(quote)) {
      return 'forex';
    }
  }
  
  // Check for forex with slash: EUR/USD
  if (cleanSymbol.includes('/')) {
    const parts = cleanSymbol.split('/');
    if (parts.length === 2 && FOREX_CURRENCIES.has(parts[0]) && FOREX_CURRENCIES.has(parts[1])) {
      return 'forex';
    }
  }
  
  // Check for crypto patterns
  for (const base of CRYPTO_BASES) {
    if (cleanSymbol.startsWith(base)) {
      const remainder = cleanSymbol.substring(base.length);
      // Check for crypto quote or -quote format
      if (CRYPTO_QUOTES.has(remainder) || 
          (remainder.startsWith('-') && CRYPTO_QUOTES.has(remainder.substring(1))) ||
          (remainder.startsWith('/') && CRYPTO_QUOTES.has(remainder.substring(1)))) {
        return 'crypto';
      }
      // Check if remainder is empty (just the base like "BTC")
      if (remainder === '' || remainder === 'USD' || remainder === 'USDT') {
        return 'crypto';
      }
    }
  }
  
  // If it's a simple 1-5 character ticker, assume stocks
  if (cleanSymbol.length >= 1 && cleanSymbol.length <= 5 && /^[A-Z]+$/.test(cleanSymbol)) {
    return 'stocks';
  }
  
  // Default to stocks for unknown patterns
  return 'stocks';
}

/**
 * Strip exchange/platform prefix from symbol
 */
function stripPrefix(symbol: string): string {
  const prefixes = [
    'FX:', 'FOREX:', 'OANDA:', 'FXCM:',
    'BINANCE:', 'CRYPTO:', 'COINBASE:', 'KRAKEN:', 'BITSTAMP:', 'BITFINEX:',
    'GEMINI:', 'KUCOIN:', 'BYBIT:', 'HUOBI:', 'OKX:', 'MEXC:',
    'NASDAQ:', 'NYSE:', 'AMEX:', 'ARCA:', 'BATS:', 'IEX:',
    'CME:', 'NYMEX:', 'COMEX:', 'CBOT:', 'ICE:', 'EUREX:',
    'X:', 'C:'  // Polygon prefixes
  ];
  
  const upper = symbol.toUpperCase();
  for (const prefix of prefixes) {
    if (upper.startsWith(prefix)) {
      return symbol.substring(prefix.length);
    }
  }
  
  return symbol;
}

/**
 * Extract base and quote from a trading pair
 */
function extractPairComponents(symbol: string, assetType: AssetType): { base: string; quote: string } | null {
  const clean = stripPrefix(symbol).toUpperCase();
  
  // Handle slash format: EUR/USD, BTC/USD
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 2) {
      return { base: parts[0], quote: parts[1] };
    }
  }
  
  // Handle dash format: BTC-USD
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 2) {
      return { base: parts[0], quote: parts[1] };
    }
  }
  
  if (assetType === 'forex' && clean.length === 6) {
    return { base: clean.substring(0, 3), quote: clean.substring(3, 6) };
  }
  
  if (assetType === 'crypto') {
    // Try known crypto bases
    for (const base of CRYPTO_BASES) {
      if (clean.startsWith(base)) {
        const quote = clean.substring(base.length);
        if (quote.length > 0) {
          return { base, quote };
        }
        return { base, quote: 'USD' }; // Default to USD
      }
    }
  }
  
  return null;
}

/**
 * Convert to Polygon.io compatible ticker format
 */
function toPolygonTicker(symbol: string, assetType: AssetType): string | null {
  const pair = extractPairComponents(symbol, assetType);
  
  switch (assetType) {
    case 'forex': {
      if (pair) {
        // Polygon forex format: C:EURUSD
        return `C:${pair.base}${pair.quote}`;
      }
      // Fallback for already-clean symbols
      const clean = stripPrefix(symbol).toUpperCase().replace('/', '');
      return `C:${clean}`;
    }
    
    case 'crypto': {
      if (pair) {
        // Normalize quote to USD for Polygon
        let quote = pair.quote;
        if (quote === 'USDT' || quote === 'USDC' || quote === 'BUSD') {
          quote = 'USD';
        }
        // Polygon crypto format: X:BTCUSD (no dash for crypto)
        return `X:${pair.base}${quote}`;
      }
      // Fallback
      const clean = stripPrefix(symbol).toUpperCase().replace(/[-/]/g, '');
      return `X:${clean}`;
    }
    
    case 'stocks': {
      // Just strip prefix and return clean ticker
      return stripPrefix(symbol).toUpperCase();
    }
    
    case 'futures':
    case 'options':
      // These are not supported by Polygon.io free tier
      return null;
    
    default:
      return null;
  }
}

/**
 * Main normalization function - converts any symbol to Polygon.io format
 */
export function normalizeSymbol(symbol: string, instrumentType?: string | null): NormalizedSymbol {
  const cacheKey = `${symbol}-${instrumentType || ''}`;
  
  // Check cache first
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey)!;
  }
  
  const trimmed = symbol.trim();
  
  if (!trimmed) {
    const result: NormalizedSymbol = {
      original: symbol,
      polygon: null,
      assetType: 'unsupported',
      isSupported: false,
      reason: 'Empty symbol'
    };
    normalizationCache.set(cacheKey, result);
    return result;
  }
  
  // Override asset type if provided
  let assetType: AssetType;
  if (instrumentType === 'forex') {
    assetType = 'forex';
  } else if (instrumentType === 'crypto') {
    assetType = 'crypto';
  } else if (instrumentType === 'stock' || instrumentType === 'stocks') {
    assetType = 'stocks';
  } else if (instrumentType === 'futures') {
    assetType = 'futures';
  } else if (instrumentType === 'options') {
    assetType = 'options';
  } else {
    assetType = detectAssetType(trimmed);
  }
  
  // Check for unsupported types
  if (assetType === 'futures' || assetType === 'options') {
    const result: NormalizedSymbol = {
      original: symbol,
      polygon: null,
      assetType,
      isSupported: false,
      reason: `${assetType} not supported by data provider`
    };
    normalizationCache.set(cacheKey, result);
    return result;
  }
  
  // Convert to Polygon format
  const polygonTicker = toPolygonTicker(trimmed, assetType);
  const pair = extractPairComponents(trimmed, assetType);
  
  const result: NormalizedSymbol = {
    original: symbol,
    polygon: polygonTicker,
    assetType,
    base: pair?.base,
    quote: pair?.quote,
    isSupported: polygonTicker !== null,
    reason: polygonTicker === null ? 'Could not convert to supported format' : undefined
  };
  
  normalizationCache.set(cacheKey, result);
  return result;
}

/**
 * Batch normalize multiple symbols
 */
export function normalizeSymbols(symbols: Array<{ symbol: string; instrumentType?: string | null }>): NormalizedSymbol[] {
  return symbols.map(({ symbol, instrumentType }) => normalizeSymbol(symbol, instrumentType));
}

/**
 * Get market type for Polygon API calls
 */
export function getPolygonMarketType(assetType: AssetType): 'stocks' | 'crypto' | 'forex' {
  switch (assetType) {
    case 'forex': return 'forex';
    case 'crypto': return 'crypto';
    default: return 'stocks';
  }
}

/**
 * Clear the normalization cache
 */
export function clearNormalizationCache(): void {
  normalizationCache.clear();
}

/**
 * Get cache statistics
 */
export function getNormalizationCacheStats(): { size: number; symbols: string[] } {
  return {
    size: normalizationCache.size,
    symbols: Array.from(normalizationCache.keys())
  };
}
