/**
 * Trade Analyzer Module
 * 
 * Handles FIFO order matching, P/L calculation, and trade analysis
 * for CSV files containing individual orders (not pre-matched trades).
 * 
 * Key Assumptions:
 * - Orders are matched using FIFO (First-In-First-Out) within same symbol
 * - Buy orders are matched with Sell orders, and vice versa
 * - Quantity must match within a tolerance threshold (0.01%)
 * - Commission is deducted from P/L if provided
 * - Timestamps are converted to UTC for consistency
 * - Unmatched orders are tracked but not imported as trades
 */

export interface RawOrder {
  rowNumber: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  fillPrice: number;
  placingTime: Date;
  closingTime?: Date;
  commission?: number;
  leverage?: number;
  margin?: number;
  orderId?: string;
  orderType?: string;
  raw: Record<string, string>;
}

export interface MatchedTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short'; // long = buy then sell, short = sell then buy
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  entryCommission: number;
  exitCommission: number;
  totalCommission: number;
  grossPnL: number;
  netPnL: number;
  pnlPercent: number;
  leverage?: number;
  margin?: number;
  entryOrderId?: string;
  exitOrderId?: string;
  entryRow: number;
  exitRow: number;
}

export interface DailySummary {
  date: string;
  trades: number;
  grossPnL: number;
  netPnL: number;
  totalCommission: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
}

export interface AnalysisSummary {
  totalTrades: number;
  matchedOrders: number;
  unmatchedOrders: number;
  skippedRows: number;
  grossPnL: number;
  netPnL: number;
  totalCommission: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnL: number;
  bestTrade: number;
  worstTrade: number;
  bySymbol: Record<string, { trades: number; pnl: number; winRate: number }>;
  dailySummaries: DailySummary[];
}

export interface OrderParseResult {
  orders: RawOrder[];
  skippedRows: { rowNumber: number; reason: string }[];
  fieldMappings: Record<string, string>;
  detectedFields: string[];
}

export interface TradeAnalysisResult {
  matchedTrades: MatchedTrade[];
  unmatchedOrders: RawOrder[];
  summary: AnalysisSummary;
  parseResult: OrderParseResult;
}

// Field aliases for auto-detection - case-insensitive fuzzy matching
// CRITICAL: Fill Price is the ONLY price used for P/L calculation
// Limit Price and Stop Price are OPTIONAL metadata and do NOT affect trade validity
// Note: 'type' is NOT included in 'side' aliases to avoid confusion with order type (Market/Limit/Stop)
const ORDER_FIELD_ALIASES: Record<string, string[]> = {
  symbol: ['symbol', 'instrument', 'asset', 'ticker', 'pair', 'market', 'name', 'security', 'product', 'currency_pair', 'currencypair', 'trading_pair', 'tradingpair', 'stock', 'coin', 'token'],
  side: ['side', 'direction', 'action', 'order_side', 'orderside', 'buy_sell', 'buysell', 'b/s', 'trade_side', 'tradeside', 'position', 'order_action', 'orderaction', 'trade_direction', 'tradedirection'],
  quantity: ['quantity', 'qty', 'size', 'positionsize', 'position_size', 'contracts', 'amount', 'volume', 'lots', 'units', 'shares', 'order_qty', 'orderqty', 'trade_size', 'tradesize', 'filled_qty', 'filledqty', 'executed_qty', 'executedqty'],
  // Fill Price = execution price - THIS is required for trade validity and P/L
  fill_price: ['fill_price', 'fillprice', 'fill price', 'filled_price', 'filledprice', 'filled price', 'execution_price', 'exec_price', 'executed_price', 'avg_price', 'avgprice', 'average_price', 'avg fill', 'avgfill', 'fill', 'price', 'trade_price', 'tradeprice', 'deal_price', 'dealprice', 'executed_at', 'fill_rate', 'fillrate', 'rate'],
  // Limit Price and Stop Price are OPTIONAL - null values are acceptable
  limit_price: ['limit_price', 'limitprice', 'limit price', 'limit', 'order_price', 'orderprice'],
  stop_price: ['stop_price', 'stopprice', 'stop price', 'stop', 'stop_loss', 'stoploss', 'sl', 'sl_price', 'slprice'],
  placing_time: ['placing_time', 'placingtime', 'placing time', 'entry_time', 'entrytime', 'open_time', 'opentime', 'date', 'datetime', 'timestamp', 'time', 'trade_date', 'tradedate', 'created', 'created_at', 'order_time', 'ordertime', 'open_date', 'opendate', 'entry_date', 'entrydate', 'trade_time', 'tradetime', 'execution_time', 'executiontime', 'executed_at', 'filled_at', 'filledat', 'order_date', 'orderdate', 'transaction_time', 'transactiontime', 'deal_time', 'dealtime'],
  closing_time: ['closing_time', 'closingtime', 'closing time', 'exit_time', 'exittime', 'close_time', 'closetime', 'closed', 'closed_at', 'fill_time', 'filltime', 'close_date', 'closedate', 'exit_date', 'exitdate'],
  commission: ['commission', 'fees', 'fee', 'tradecost', 'trade_cost', 'brokerfee', 'broker_fee', 'cost', 'trading_fee', 'comm', 'transaction_fee', 'transactionfee', 'trading_cost', 'tradingcost', 'charges', 'charge', 'spread_cost', 'spreadcost'],
  leverage: ['leverage', 'lev', 'multiplier', 'margin_multiplier', 'marginmultiplier', 'lever', 'x'],
  margin: ['margin', 'margin_used', 'marginused', 'collateral', 'margin_required', 'marginrequired', 'initial_margin', 'initialmargin', 'used_margin', 'usedmargin'],
  order_id: ['order_id', 'orderid', 'id', 'trade_id', 'tradeid', 'ticket', 'deal_id', 'dealid', 'transaction_id', 'transactionid', 'position_id', 'positionid', 'order_number', 'ordernumber', 'reference', 'ref', 'ticket_id', 'ticketid'],
  order_type: ['order_type', 'ordertype', 'exec_type', 'exectype', 'type'],
};

// Normalize field name for matching - removes all separators and converts to lowercase
function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_./()#]/g, '').trim();
}

// Match a header to a known field using exact and fuzzy matching
function matchOrderField(header: string): string | null {
  const normalized = normalizeFieldName(header);
  
  // Exact match first
  for (const [field, aliases] of Object.entries(ORDER_FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalizeFieldName(alias) === normalized) {
        return field;
      }
    }
  }
  
  // Fuzzy match - check if header contains any alias or vice versa
  for (const [field, aliases] of Object.entries(ORDER_FIELD_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeFieldName(alias);
      if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
        return field;
      }
    }
  }
  
  return null;
}

/**
 * Normalize side/direction value
 * Handles various representations of buy/sell from different platforms
 */
function normalizeSide(value: string): 'buy' | 'sell' | null {
  const normalized = value.toLowerCase().trim();
  
  // Buy variations
  if (['buy', 'b', 'long', 'l', 'bid', 'bought', 'open long', 'openlong', 'go long', 'golong', '+', 'entry', 'open'].includes(normalized)) {
    return 'buy';
  }
  
  // Sell variations
  if (['sell', 's', 'short', 'sh', 'ask', 'sold', 'close', 'exit', 'open short', 'openshort', 'go short', 'goshort', '-', 'close long', 'closelong', 'close short', 'closeshort', 'cover'].includes(normalized)) {
    return 'sell';
  }
  
  return null;
}

/**
 * Parse date/time with flexible format detection
 * Handles many common date formats from trading platforms:
 * - ISO 8601: 2025-12-05T13:22:05Z, 2025-12-05T13:22:05+00:00
 * - ISO-like: 2025-12-05 13:22:05
 * - American: 12/05/2025 13:22, MM/DD/YYYY HH:MM:SS
 * - European: 05.12.2025 13:22, DD.MM.YYYY HH:MM:SS
 * - Date only: 2025-12-05
 * - Unix timestamps (seconds and milliseconds)
 * - AM/PM time formats
 */
function parseOrderDateTime(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  
  let trimmed = value.trim();
  
  // Handle common timezone abbreviations (remove them, treat as UTC)
  trimmed = trimmed.replace(/\s*(UTC|GMT|EST|EDT|PST|PDT|CST|CDT|MST|MDT)$/i, '');
  
  // Unix timestamp
  const numValue = Number(trimmed);
  if (!isNaN(numValue) && numValue > 0) {
    const isMilliseconds = numValue > 1e12;
    const date = new Date(isMilliseconds ? numValue : numValue * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  
  // ISO format or standard date parsing
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  
  // Extract AM/PM if present
  let isPM = false;
  let isAM = false;
  if (/\s*[Pp][Mm]\s*$/.test(trimmed)) {
    isPM = true;
    trimmed = trimmed.replace(/\s*[Pp][Mm]\s*$/, '');
  } else if (/\s*[Aa][Mm]\s*$/.test(trimmed)) {
    isAM = true;
    trimmed = trimmed.replace(/\s*[Aa][Mm]\s*$/, '');
  }
  
  // Try common formats manually
  // Format: DD.MM.YYYY HH:MM:SS or DD/MM/YYYY HH:MM:SS (European - when first part is > 12)
  const europeanMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (europeanMatch) {
    let [, first, second, year, hour = '0', minute = '0', second2 = '0'] = europeanMatch;
    let parsedHour = parseInt(hour);
    if (isPM && parsedHour < 12) parsedHour += 12;
    if (isAM && parsedHour === 12) parsedHour = 0;
    
    // Determine if DD/MM or MM/DD based on values
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);
    
    if (firstNum > 12) {
      // Must be DD/MM (day > 12)
      date = new Date(parseInt(year), secondNum - 1, firstNum, parsedHour, parseInt(minute), parseInt(second2));
    } else if (secondNum > 12) {
      // Must be MM/DD (month slot has day > 12)
      date = new Date(parseInt(year), firstNum - 1, secondNum, parsedHour, parseInt(minute), parseInt(second2));
    } else {
      // Ambiguous - assume MM/DD (American default)
      date = new Date(parseInt(year), firstNum - 1, secondNum, parsedHour, parseInt(minute), parseInt(second2));
    }
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
  const isoLikeMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoLikeMatch) {
    let [, year, month, day, hour = '0', minute = '0', second = '0'] = isoLikeMatch;
    let parsedHour = parseInt(hour);
    if (isPM && parsedHour < 12) parsedHour += 12;
    if (isAM && parsedHour === 12) parsedHour = 0;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parsedHour, parseInt(minute), parseInt(second));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: DD-MMM-YYYY or DD-MMM-YY (e.g., 05-Dec-2025)
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const namedMonthMatch = trimmed.match(/^(\d{1,2})[-\s]([a-zA-Z]{3})[-\s](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (namedMonthMatch) {
    let [, day, monthStr, yearStr, hour = '0', minute = '0', second = '0'] = namedMonthMatch;
    const monthNum = monthNames[monthStr.toLowerCase()];
    if (monthNum !== undefined) {
      let year = parseInt(yearStr);
      if (year < 100) year += 2000;
      let parsedHour = parseInt(hour);
      if (isPM && parsedHour < 12) parsedHour += 12;
      if (isAM && parsedHour === 12) parsedHour = 0;
      date = new Date(year, monthNum, parseInt(day), parsedHour, parseInt(minute), parseInt(second));
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return null;
}

/**
 * Parse numeric value with robust handling for various messy formats
 * Handles:
 * - Currency symbols: $, €, £, ¥, USD, EUR, etc.
 * - Thousands separators: 1,234.56 or 1.234,56
 * - Percentage signs: 50%
 * - NaN strings
 * - Empty or whitespace values
 */
function parseOrderNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  
  let cleaned = value.trim();
  
  // Handle NaN explicitly
  if (cleaned.toLowerCase() === 'nan' || cleaned === '-' || cleaned === '--') return null;
  
  // Remove currency symbols and codes
  cleaned = cleaned.replace(/[$€£¥]/g, '');
  cleaned = cleaned.replace(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|HKD|SGD|CNY|KRW|INR|BRL|MXN|ZAR)\b/gi, '');
  
  // Remove percentage signs
  cleaned = cleaned.replace(/%/g, '');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, '').trim();
  
  // Handle empty after cleaning
  if (cleaned === '' || cleaned === '-') return null;
  
  // Handle European format: 1.234,56 -> 1234.56
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // European: 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56 -> 1234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 6) {
      // Likely decimal: 1234,56 or 1,16512 -> 1234.56 or 1.16512
      cleaned = cleaned.replace(',', '.');
    } else {
      // Multiple commas = thousands separators
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  // Remove any remaining non-numeric characters except dot and minus
  cleaned = cleaned.replace(/[^\d.\-]/g, '');
  
  // Handle multiple decimal points (invalid)
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) return null;
  
  const num = parseFloat(cleaned);
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * Parse leverage value with robust handling
 * Handles: "50:1", "100x", "5", "1:50", "50X", etc.
 */
function parseLeverage(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.trim().toLowerCase();
  
  // Handle "50:1" format
  const ratioMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*:\s*1$/);
  if (ratioMatch) {
    return parseFloat(ratioMatch[1]);
  }
  
  // Handle "1:50" format (inverse)
  const inverseRatioMatch = cleaned.match(/^1\s*:\s*(\d+(?:\.\d+)?)$/);
  if (inverseRatioMatch) {
    return parseFloat(inverseRatioMatch[1]);
  }
  
  // Handle "50x" or "100X" format
  const xMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*x$/);
  if (xMatch) {
    return parseFloat(xMatch[1]);
  }
  
  // Plain number
  return parseOrderNumeric(value);
}

// Parse CSV line handling quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV containing individual orders
 */
export function parseOrdersCSV(text: string): OrderParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }
  
  const headers = parseCSVLine(lines[0]);
  const fieldMappings: Record<string, string> = {};
  const detectedFields: string[] = [];
  
  // Map headers to fields
  headers.forEach(header => {
    const field = matchOrderField(header);
    if (field) {
      fieldMappings[header] = field;
      if (!detectedFields.includes(field)) {
        detectedFields.push(field);
      }
    }
  });
  
  // Helper to get value by field name
  const getValue = (row: Record<string, string>, field: string): string | undefined => {
    for (const [header, mappedField] of Object.entries(fieldMappings)) {
      if (mappedField === field) return row[header];
    }
    return undefined;
  };
  
  const orders: RawOrder[] = [];
  const skippedRows: { rowNumber: number; reason: string }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip completely blank lines
    if (line === '') continue;
    
    const values = parseCSVLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = values[index] || '';
    });
    
    // Check if row has any meaningful data (at least one non-empty value)
    const hasAnyData = values.some(v => v.trim() !== '');
    if (!hasAnyData) continue;
    
    // Check if row has any numeric values - if not, silently skip (likely a header repeat or notes row)
    const hasNumericValue = values.some(v => {
      const cleaned = v.replace(/[$€£¥,.\s\-]/g, '');
      return /\d/.test(cleaned);
    });
    if (!hasNumericValue) continue;
    
    // Parse required fields
    const symbol = getValue(raw, 'symbol')?.trim().toUpperCase();
    const sideValue = getValue(raw, 'side');
    const side = sideValue ? normalizeSide(sideValue) : null;
    const quantity = parseOrderNumeric(getValue(raw, 'quantity'));
    const fillPrice = parseOrderNumeric(getValue(raw, 'fill_price'));
    const placingTimeStr = getValue(raw, 'placing_time');
    const placingTime = placingTimeStr ? parseOrderDateTime(placingTimeStr) : null;
    
    // If all key fields are missing/invalid, silently skip (likely metadata row)
    if (!symbol && !side && !quantity && !fillPrice) continue;
    
    // Validate required fields - only report as errors if row appears to be actual trade data
    if (!symbol) {
      skippedRows.push({ rowNumber: i + 1, reason: 'Missing symbol' });
      continue;
    }
    if (!side) {
      skippedRows.push({ rowNumber: i + 1, reason: `Invalid side: ${sideValue || 'missing'}` });
      continue;
    }
    if (!quantity || quantity <= 0) {
      skippedRows.push({ rowNumber: i + 1, reason: 'Invalid quantity' });
      continue;
    }
    if (!fillPrice || fillPrice <= 0) {
      skippedRows.push({ rowNumber: i + 1, reason: 'Invalid fill price' });
      continue;
    }
    if (!placingTime) {
      skippedRows.push({ rowNumber: i + 1, reason: 'Invalid placing time' });
      continue;
    }
    
    // Parse optional fields - never reject rows for missing optional fields
    const closingTimeStr = getValue(raw, 'closing_time');
    const closingTime = closingTimeStr ? parseOrderDateTime(closingTimeStr) : undefined;
    const commission = parseOrderNumeric(getValue(raw, 'commission')) ?? undefined;
    const leverage = parseLeverage(getValue(raw, 'leverage')) ?? undefined;
    const margin = parseOrderNumeric(getValue(raw, 'margin')) ?? undefined;
    const orderId = getValue(raw, 'order_id')?.trim() || undefined;
    const orderType = getValue(raw, 'order_type')?.trim() || undefined;
    
    orders.push({
      rowNumber: i + 1,
      symbol,
      side,
      quantity,
      fillPrice,
      placingTime,
      closingTime,
      commission,
      leverage,
      margin,
      orderId,
      orderType,
      raw,
    });
  }
  
  return { orders, skippedRows, fieldMappings, detectedFields };
}

/**
 * FIFO Order Matching
 * Pairs buy orders with sell orders of the same symbol and quantity
 */
export function matchOrdersFIFO(orders: RawOrder[]): { matched: MatchedTrade[]; unmatched: RawOrder[] } {
  const matched: MatchedTrade[] = [];
  const unmatched: RawOrder[] = [];
  
  // Sort orders by time for FIFO
  const sortedOrders = [...orders].sort((a, b) => a.placingTime.getTime() - b.placingTime.getTime());
  
  // Separate by symbol
  const ordersBySymbol: Record<string, RawOrder[]> = {};
  sortedOrders.forEach(order => {
    if (!ordersBySymbol[order.symbol]) {
      ordersBySymbol[order.symbol] = [];
    }
    ordersBySymbol[order.symbol].push(order);
  });
  
  // Process each symbol
  for (const symbol of Object.keys(ordersBySymbol)) {
    const symbolOrders = ordersBySymbol[symbol];
    const buyQueue: RawOrder[] = [];
    const sellQueue: RawOrder[] = [];
    const matchedRows = new Set<number>();
    
    // Quantity tolerance threshold (0.01% for rounding differences)
    const QUANTITY_TOLERANCE = 0.0001;
    
    for (const order of symbolOrders) {
      const oppositeQueue = order.side === 'buy' ? sellQueue : buyQueue;
      const sameQueue = order.side === 'buy' ? buyQueue : sellQueue;
      
      // Try to find a match in the opposite queue
      let matchIndex = -1;
      for (let i = 0; i < oppositeQueue.length; i++) {
        const candidate = oppositeQueue[i];
        const qtyDiff = Math.abs(candidate.quantity - order.quantity) / order.quantity;
        
        if (qtyDiff <= QUANTITY_TOLERANCE) {
          matchIndex = i;
          break;
        }
      }
      
      if (matchIndex >= 0) {
        const matchedOrder = oppositeQueue.splice(matchIndex, 1)[0];
        matchedRows.add(order.rowNumber);
        matchedRows.add(matchedOrder.rowNumber);
        
        // Determine entry and exit
        const [entryOrder, exitOrder] = matchedOrder.placingTime < order.placingTime
          ? [matchedOrder, order]
          : [order, matchedOrder];
        
        // Determine trade direction (long = buy first, short = sell first)
        const isLong = entryOrder.side === 'buy';
        
        const entryPrice = entryOrder.fillPrice;
        const exitPrice = exitOrder.fillPrice;
        const quantity = (entryOrder.quantity + exitOrder.quantity) / 2; // Use average for tolerance
        
        const entryCommission = entryOrder.commission ?? 0;
        const exitCommission = exitOrder.commission ?? 0;
        const totalCommission = entryCommission + exitCommission;
        
        // P/L calculation
        // Long: (exit - entry) * qty
        // Short: (entry - exit) * qty
        const grossPnL = isLong
          ? (exitPrice - entryPrice) * quantity
          : (entryPrice - exitPrice) * quantity;
        
        const netPnL = grossPnL - totalCommission;
        const pnlPercent = (grossPnL / (entryPrice * quantity)) * 100;
        
        matched.push({
          id: `${symbol}-${entryOrder.rowNumber}-${exitOrder.rowNumber}`,
          symbol,
          side: isLong ? 'long' : 'short',
          entryPrice,
          exitPrice,
          quantity,
          entryTime: entryOrder.placingTime,
          exitTime: exitOrder.placingTime,
          entryCommission,
          exitCommission,
          totalCommission,
          grossPnL,
          netPnL,
          pnlPercent,
          leverage: entryOrder.leverage ?? exitOrder.leverage,
          margin: entryOrder.margin ?? exitOrder.margin,
          entryOrderId: entryOrder.orderId,
          exitOrderId: exitOrder.orderId,
          entryRow: entryOrder.rowNumber,
          exitRow: exitOrder.rowNumber,
        });
      } else {
        // No match found, add to queue
        sameQueue.push(order);
      }
    }
    
    // Remaining orders are unmatched
    unmatched.push(...buyQueue, ...sellQueue);
  }
  
  // Sort matched trades by entry time
  matched.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  
  return { matched, unmatched };
}

/**
 * Generate daily summaries from matched trades
 */
function generateDailySummaries(trades: MatchedTrade[]): DailySummary[] {
  const byDate: Record<string, MatchedTrade[]> = {};
  
  trades.forEach(trade => {
    const date = trade.exitTime.toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(trade);
  });
  
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTrades]) => {
      const grossPnL = dayTrades.reduce((sum, t) => sum + t.grossPnL, 0);
      const netPnL = dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
      const totalCommission = dayTrades.reduce((sum, t) => sum + t.totalCommission, 0);
      const wins = dayTrades.filter(t => t.netPnL > 0).length;
      const losses = dayTrades.filter(t => t.netPnL <= 0).length;
      
      return {
        date,
        trades: dayTrades.length,
        grossPnL,
        netPnL,
        totalCommission,
        wins,
        losses,
        winRate: dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0,
        avgPnL: dayTrades.length > 0 ? netPnL / dayTrades.length : 0,
      };
    });
}

/**
 * Generate analysis summary
 */
function generateSummary(
  trades: MatchedTrade[],
  unmatchedOrders: RawOrder[],
  skippedRows: number
): AnalysisSummary {
  const grossPnL = trades.reduce((sum, t) => sum + t.grossPnL, 0);
  const netPnL = trades.reduce((sum, t) => sum + t.netPnL, 0);
  const totalCommission = trades.reduce((sum, t) => sum + t.totalCommission, 0);
  const wins = trades.filter(t => t.netPnL > 0).length;
  const losses = trades.filter(t => t.netPnL <= 0).length;
  
  // By symbol
  const bySymbol: Record<string, { trades: number; pnl: number; winRate: number }> = {};
  trades.forEach(trade => {
    if (!bySymbol[trade.symbol]) {
      bySymbol[trade.symbol] = { trades: 0, pnl: 0, winRate: 0 };
    }
    bySymbol[trade.symbol].trades++;
    bySymbol[trade.symbol].pnl += trade.netPnL;
  });
  
  // Calculate win rate per symbol
  for (const symbol of Object.keys(bySymbol)) {
    const symbolTrades = trades.filter(t => t.symbol === symbol);
    const symbolWins = symbolTrades.filter(t => t.netPnL > 0).length;
    bySymbol[symbol].winRate = symbolTrades.length > 0 ? (symbolWins / symbolTrades.length) * 100 : 0;
  }
  
  const pnls = trades.map(t => t.netPnL);
  
  return {
    totalTrades: trades.length,
    matchedOrders: trades.length * 2,
    unmatchedOrders: unmatchedOrders.length,
    skippedRows,
    grossPnL,
    netPnL,
    totalCommission,
    wins,
    losses,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    avgPnL: trades.length > 0 ? netPnL / trades.length : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    bySymbol,
    dailySummaries: generateDailySummaries(trades),
  };
}

/**
 * Main analysis function
 */
export function analyzeTradesCSV(csvText: string): TradeAnalysisResult {
  const parseResult = parseOrdersCSV(csvText);
  const { matched, unmatched } = matchOrdersFIFO(parseResult.orders);
  const summary = generateSummary(matched, unmatched, parseResult.skippedRows.length);
  
  return {
    matchedTrades: matched,
    unmatchedOrders: unmatched,
    summary,
    parseResult,
  };
}

/**
 * Generate sample CSV for testing
 */
export function generateOrdersTestCSV(): string {
  return `Symbol,Side,Type,Qty,Fill Price,Commission,Placing Time,Closing Time,Order ID,Leverage,Margin
EURUSD,Buy,Market,161290,1.16512,5.50,2025-12-05 09:15:00,2025-12-05 09:15:00,ORD001,1,1000
EURUSD,Sell,Market,161290,1.16580,5.50,2025-12-05 14:30:00,2025-12-05 14:30:00,ORD002,1,1000
GBPUSD,Sell,Limit,100000,1.27850,3.00,2025-12-05 10:00:00,2025-12-05 10:00:05,ORD003,1,800
GBPUSD,Buy,Market,100000,1.27650,3.00,2025-12-05 16:45:00,2025-12-05 16:45:00,ORD004,1,800
BTCUSD,Buy,Market,0.5,42500.00,12.50,2025-12-06 08:00:00,2025-12-06 08:00:00,ORD005,10,2125
BTCUSD,Sell,Market,0.5,43200.00,12.50,2025-12-06 20:00:00,2025-12-06 20:00:00,ORD006,10,2125
AAPL,Buy,Limit,100,175.50,1.00,2025-12-04 14:30:00,2025-12-04 14:30:05,ORD007,1,17550
AAPL,Sell,Market,100,178.25,1.00,2025-12-05 15:55:00,2025-12-05 15:55:00,ORD008,1,17550
TSLA,Sell,Market,50,250.00,0.50,2025-12-06 09:30:00,2025-12-06 09:30:00,ORD009,1,12500
TSLA,Buy,Market,50,245.00,0.50,2025-12-06 15:00:00,2025-12-06 15:00:00,ORD010,1,12500`;
}
