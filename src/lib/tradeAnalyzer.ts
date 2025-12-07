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

// Field aliases for auto-detection
// Note: 'type' is NOT included in 'side' aliases to avoid confusion with order type (Market/Limit/Stop)
const ORDER_FIELD_ALIASES: Record<string, string[]> = {
  symbol: ['symbol', 'instrument', 'asset', 'ticker', 'pair', 'market', 'name', 'security'],
  side: ['side', 'direction', 'action', 'order_side', 'orderside', 'buy_sell', 'buysell', 'b/s', 'trade_side', 'tradeside'],
  quantity: ['quantity', 'qty', 'size', 'positionsize', 'position_size', 'contracts', 'amount', 'volume', 'lots', 'units'],
  fill_price: ['fill_price', 'fillprice', 'filled_price', 'price', 'execution_price', 'exec_price', 'avg_price', 'avgprice', 'entry_price', 'entryprice', 'fill'],
  placing_time: ['placing_time', 'placingtime', 'placing time', 'entry_time', 'entrytime', 'open_time', 'opentime', 'date', 'datetime', 'timestamp', 'time', 'trade_date', 'tradedate', 'created', 'created_at', 'order_time', 'ordertime', 'open_date', 'opendate', 'entry_date', 'entrydate', 'trade_time', 'tradetime'],
  closing_time: ['closing_time', 'closingtime', 'closing time', 'exit_time', 'exittime', 'close_time', 'closetime', 'closed', 'closed_at', 'fill_time', 'filltime', 'close_date', 'closedate', 'exit_date', 'exitdate'],
  commission: ['commission', 'fees', 'fee', 'tradecost', 'trade_cost', 'brokerfee', 'broker_fee', 'cost', 'trading_fee', 'comm'],
  leverage: ['leverage', 'lev', 'multiplier'],
  margin: ['margin', 'margin_used', 'marginused', 'collateral'],
  order_id: ['order_id', 'orderid', 'id', 'trade_id', 'tradeid', 'ticket', 'deal_id', 'dealid'],
  order_type: ['order_type', 'ordertype', 'exec_type', 'exectype', 'type'],
};

// Normalize field name for matching
function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_./]/g, '').trim();
}

// Match a header to a known field
function matchOrderField(header: string): string | null {
  const normalized = normalizeFieldName(header);
  
  for (const [field, aliases] of Object.entries(ORDER_FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalizeFieldName(alias) === normalized) {
        return field;
      }
    }
  }
  
  // Fuzzy match
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

// Normalize side value
function normalizeSide(value: string): 'buy' | 'sell' | null {
  const normalized = value.toLowerCase().trim();
  
  if (['buy', 'b', 'long', 'l', 'bid'].includes(normalized)) return 'buy';
  if (['sell', 's', 'short', 'sh', 'ask', 'close'].includes(normalized)) return 'sell';
  
  return null;
}

// Parse date/time with flexible format detection
function parseOrderDateTime(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
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
  
  // Try common formats manually
  // Format: DD.MM.YYYY HH:MM:SS or DD/MM/YYYY HH:MM:SS
  const europeanMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (europeanMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = europeanMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: MM/DD/YYYY HH:MM:SS (American)
  const americanMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (americanMatch) {
    const [, month, day, year, hour = '0', minute = '0', second = '0'] = americanMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: YYYY-MM-DD HH:MM:SS
  const isoLikeMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoLikeMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = isoLikeMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Format: YYYY/MM/DD HH:MM:SS
  const slashIsoMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slashIsoMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = slashIsoMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

// Parse numeric value
function parseOrderNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/[$€£¥,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
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
    if (lines[i].trim() === '') continue;
    
    const values = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = values[index] || '';
    });
    
    // Parse required fields
    const symbol = getValue(raw, 'symbol')?.trim().toUpperCase();
    const sideValue = getValue(raw, 'side');
    const side = sideValue ? normalizeSide(sideValue) : null;
    const quantity = parseOrderNumeric(getValue(raw, 'quantity'));
    const fillPrice = parseOrderNumeric(getValue(raw, 'fill_price'));
    const placingTimeStr = getValue(raw, 'placing_time');
    const placingTime = placingTimeStr ? parseOrderDateTime(placingTimeStr) : null;
    
    // Validate required fields
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
    
    // Parse optional fields
    const closingTimeStr = getValue(raw, 'closing_time');
    const closingTime = closingTimeStr ? parseOrderDateTime(closingTimeStr) : undefined;
    const commission = parseOrderNumeric(getValue(raw, 'commission')) ?? undefined;
    const leverage = parseOrderNumeric(getValue(raw, 'leverage')) ?? undefined;
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
