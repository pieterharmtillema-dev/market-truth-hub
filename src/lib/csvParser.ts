// Field alias mappings for fuzzy matching
const FIELD_ALIASES: Record<string, string[]> = {
  // Required fields
  symbol: ['symbol', 'instrument', 'asset', 'ticker', 'pair', 'market'],
  side: ['side', 'direction', 'type', 'action', 'order_side', 'orderside', 'tradetype', 'trade_type'],
  entry_price: ['entry_price', 'entryprice', 'open_price', 'openprice', 'buy_price', 'buyprice', 'short_price', 'shortprice'],
  exit_price: ['exit_price', 'exitprice', 'closeprice', 'close_price', 'sellprice', 'sell_price', 'takeprofitprice', 'take_profit_price', 'tp_price', 'buyback_price', 'cover_price'],
  fill_price: ['fillprice', 'fill_price', 'filled_price', 'filledprice', 'execution_price', 'exec_price', 'limitprice', 'limit_price', 'stopprice', 'stop_price', 'price'],
  entry_datetime: ['entry_datetime', 'entry_date', 'entrydate', 'entry_time', 'entrytime', 'open_date', 'opendate', 'open_time', 'opentime', 'date', 'datetime', 'timestamp', 'time', 'trade_date', 'tradedate'],
  
  // Optional fields
  exit_datetime: ['exit_datetime', 'exit_date', 'exitdate', 'exit_time', 'exittime', 'close_date', 'closedate', 'close_time', 'closetime'],
  quantity: ['quantity', 'qty', 'size', 'positionsize', 'position_size', 'contracts', 'amount', 'volume', 'lots'],
  profit_loss: ['profit_loss', 'profitloss', 'pnl', 'profit', 'loss', 'netprofit', 'net_profit', 'realized_pnl', 'realizedpnl', 'gain'],
  commission: ['commission', 'fees', 'fee', 'tradecost', 'trade_cost', 'brokerfee', 'broker_fee', 'cost', 'trading_fee'],
  stop_loss: ['stop_loss', 'stoploss', 'sl', 'stop', 'stop_price_sl'],
  take_profit: ['take_profit', 'takeprofit', 'tp', 'target', 'target_price'],
  leverage: ['leverage', 'lev', 'multiplier'],
  margin: ['margin', 'margin_used', 'marginused', 'collateral'],
  strategy: ['strategy', 'tag', 'method', 'system', 'setup', 'pattern', 'strategy_name', 'strategyname'],
  broker_id: ['broker_id', 'brokerid', 'broker', 'exchange', 'platform'],
  account_id: ['account_id', 'accountid', 'account', 'wallet', 'portfolio', 'subaccount', 'sub_account'],
  instrument_type: ['instrument_type', 'instrumenttype', 'assettype', 'asset_type', 'market', 'category', 'asset_class', 'assetclass'],
  notes: ['notes', 'note', 'comment', 'comments', 'description', 'memo'],
  timezone: ['timezone', 'tz', 'time_zone', 'utc_offset', 'offset'],
};

// Normalize field name for matching
function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_]/g, '').trim();
}

// Find the best matching field alias
export function matchField(header: string): string | null {
  const normalized = normalizeFieldName(header);
  
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalizeFieldName(alias) === normalized) {
        return field;
      }
    }
  }
  
  // Fuzzy match - check if header contains any alias
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeFieldName(alias);
      if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
        return field;
      }
    }
  }
  
  return null;
}

// Normalize side/direction values
export function normalizeSide(value: string): 'buy' | 'sell' | 'long' | 'short' | null {
  const normalized = value.toLowerCase().trim();
  
  if (['buy', 'b', 'long', 'l'].includes(normalized)) return 'long';
  if (['sell', 's', 'short', 'sh'].includes(normalized)) return 'short';
  if (normalized === 'buy') return 'buy';
  if (normalized === 'sell') return 'sell';
  
  return null;
}

// Normalize instrument type
export function normalizeInstrumentType(value: string): 'stock' | 'crypto' | 'forex' | 'futures' | 'options' | 'other' {
  const normalized = value.toLowerCase().trim();
  
  if (['stock', 'stocks', 'equity', 'equities', 'share', 'shares'].includes(normalized)) return 'stock';
  if (['crypto', 'cryptocurrency', 'btc', 'eth', 'coin', 'token'].includes(normalized)) return 'crypto';
  if (['forex', 'fx', 'currency', 'currencies'].includes(normalized)) return 'forex';
  if (['futures', 'future', 'futs'].includes(normalized)) return 'futures';
  if (['options', 'option', 'opts', 'calls', 'puts'].includes(normalized)) return 'options';
  
  return 'other';
}

// Parse date/time with timezone detection
export function parseDateTime(value: string, timezoneHint?: string): { utc: Date; detected: string } | null {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
  // Try Unix timestamp (seconds or milliseconds)
  const numValue = Number(trimmed);
  if (!isNaN(numValue) && numValue > 0) {
    const isMilliseconds = numValue > 1e12;
    const date = new Date(isMilliseconds ? numValue : numValue * 1000);
    if (!isNaN(date.getTime())) {
      return { utc: date, detected: 'unix' };
    }
  }
  
  // Try ISO 8601 format
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    // Check if timezone info is in the string
    const hasTimezone = /[+-]\d{2}:?\d{2}$|Z$/i.test(trimmed);
    return { utc: isoDate, detected: hasTimezone ? 'iso_tz' : 'iso_local' };
  }
  
  // Common date formats
  const formats = [
    // MM/DD/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // DD/MM/YYYY HH:MM:SS (European)
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // MM-DD-YYYY HH:MM:SS
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
  ];
  
  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      try {
        // Attempt to create a valid date
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return { utc: date, detected: timezoneHint || 'utc' };
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

// Parse numeric value
export function parseNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove currency symbols and thousands separators
  const cleaned = value.replace(/[$€£¥,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

export interface ParsedRow {
  // Required
  symbol: string;
  side: 'buy' | 'sell' | 'long' | 'short';
  entry_price: number;
  exit_price?: number; // Optional - trade may still be open
  entry_datetime_utc: string;
  
  // Optional
  exit_datetime_utc?: string;
  quantity?: number;
  profit_loss?: number;
  commission?: number;
  stop_loss?: number;
  take_profit?: number;
  leverage?: number;
  margin?: number;
  strategy?: string;
  broker_id?: string;
  account_id?: string;
  instrument_type?: 'stock' | 'crypto' | 'forex' | 'futures' | 'options' | 'other';
  notes?: string;
  
  // Grouping
  group_symbol?: string;
  group_strategy?: string;
  
  // Raw data
  raw_row: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ParsedTradeRow {
  rowNumber: number;
  isValid: boolean;
  errors: ValidationError[];
  data: Partial<ParsedRow>;
  raw: Record<string, string>;
}

export interface CSVParseResult {
  headers: string[];
  fieldMappings: Record<string, string>;
  rows: ParsedTradeRow[];
  validCount: number;
  invalidCount: number;
  detectedTimezone: string;
}

// Parse CSV text into structured data
export function parseCSV(text: string): CSVParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Map headers to fields
  const fieldMappings: Record<string, string> = {};
  headers.forEach((header, index) => {
    const field = matchField(header);
    if (field) {
      fieldMappings[header] = field;
    }
  });
  
  // Check for timezone column
  let detectedTimezone = 'utc';
  const tzIndex = headers.findIndex(h => matchField(h) === 'timezone');
  
  // Parse data rows
  const rows: ParsedTradeRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = values[index] || '';
    });
    
    // Get timezone from row if available
    if (tzIndex >= 0 && values[tzIndex]) {
      detectedTimezone = values[tzIndex];
    }
    
    const parsed = parseRow(raw, fieldMappings, detectedTimezone);
    
    if (parsed.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    
    rows.push({
      rowNumber: i,
      ...parsed,
      raw,
    });
  }
  
  return {
    headers,
    fieldMappings,
    rows,
    validCount,
    invalidCount,
    detectedTimezone,
  };
}

// Parse a single CSV line handling quoted values
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

// Parse a single row
function parseRow(
  raw: Record<string, string>,
  fieldMappings: Record<string, string>,
  timezone: string
): { isValid: boolean; errors: ValidationError[]; data: Partial<ParsedRow> } {
  const errors: ValidationError[] = [];
  const data: Partial<ParsedRow> = { raw_row: raw };
  
  // Get mapped values
  const getValue = (field: string): string | undefined => {
    for (const [header, mappedField] of Object.entries(fieldMappings)) {
      if (mappedField === field) {
        return raw[header];
      }
    }
    return undefined;
  };
  
  // Required: Symbol
  const symbol = getValue('symbol');
  if (!symbol || symbol.trim() === '') {
    errors.push({ field: 'symbol', message: 'Symbol is required' });
  } else {
    data.symbol = symbol.trim().toUpperCase();
    data.group_symbol = data.symbol;
  }
  
  // Required: Side
  const sideValue = getValue('side');
  if (!sideValue) {
    errors.push({ field: 'side', message: 'Side/direction is required' });
  } else {
    const side = normalizeSide(sideValue);
    if (!side) {
      errors.push({ field: 'side', message: `Invalid side value: ${sideValue}` });
    } else {
      data.side = side;
    }
  }
  
  // Get fill price (can be used as entry or exit depending on context)
  const fillPrice = parseNumeric(getValue('fill_price'));
  
  // Entry price: use entry_price, or fill_price if no exit_price exists (opening trade)
  let entryPrice = parseNumeric(getValue('entry_price'));
  let exitPrice = parseNumeric(getValue('exit_price'));
  
  // Smart price assignment for short positions:
  // If we have fill_price but no entry_price, and we have an exit_price -> fill_price is the exit
  // If we have fill_price but no exit_price, and we have an entry_price -> fill_price could be exit
  // If we have only fill_price -> use as entry_price (opening trade)
  if (fillPrice !== null && fillPrice > 0) {
    if (entryPrice === null && exitPrice === null) {
      // Only fill price - treat as entry (opening trade)
      entryPrice = fillPrice;
    } else if (entryPrice !== null && exitPrice === null) {
      // Have entry, no exit - fill_price is the exit (closing trade)
      exitPrice = fillPrice;
    } else if (entryPrice === null && exitPrice !== null) {
      // Have exit, no entry - fill_price is the entry
      entryPrice = fillPrice;
    }
  }
  
  // Validate entry price (required)
  if (entryPrice === null || entryPrice <= 0) {
    errors.push({ field: 'entry_price', message: 'Entry price must be a positive number' });
  } else {
    data.entry_price = entryPrice;
  }
  
  // Exit price is optional (trade may still be open)
  if (exitPrice !== null && exitPrice > 0) {
    data.exit_price = exitPrice;
  }
  
  // Required: Entry datetime
  const entryDatetime = parseDateTime(getValue('entry_datetime') || '', timezone);
  if (!entryDatetime) {
    errors.push({ field: 'entry_datetime', message: 'Valid entry date/time is required' });
  } else {
    data.entry_datetime_utc = entryDatetime.utc.toISOString();
  }
  
  // Optional: Exit datetime
  const exitDatetimeValue = getValue('exit_datetime');
  if (exitDatetimeValue) {
    const exitDatetime = parseDateTime(exitDatetimeValue, timezone);
    if (exitDatetime) {
      data.exit_datetime_utc = exitDatetime.utc.toISOString();
    }
  }
  
  // Optional numeric fields
  const quantity = parseNumeric(getValue('quantity'));
  if (quantity !== null) data.quantity = quantity;
  
  const profitLoss = parseNumeric(getValue('profit_loss'));
  if (profitLoss !== null) data.profit_loss = profitLoss;
  
  const commission = parseNumeric(getValue('commission'));
  if (commission !== null) data.commission = Math.abs(commission);
  
  const stopLoss = parseNumeric(getValue('stop_loss'));
  if (stopLoss !== null && stopLoss >= 0) data.stop_loss = stopLoss;
  
  const takeProfit = parseNumeric(getValue('take_profit'));
  if (takeProfit !== null && takeProfit >= 0) data.take_profit = takeProfit;
  
  const leverage = parseNumeric(getValue('leverage'));
  if (leverage !== null && leverage >= 0) data.leverage = leverage;
  
  const margin = parseNumeric(getValue('margin'));
  if (margin !== null && margin >= 0) data.margin = margin;
  
  // Optional string fields
  const strategy = getValue('strategy');
  if (strategy) {
    data.strategy = strategy.trim();
    data.group_strategy = data.strategy;
  }
  
  const brokerId = getValue('broker_id');
  if (brokerId) data.broker_id = brokerId.trim();
  
  const accountId = getValue('account_id');
  if (accountId) data.account_id = accountId.trim();
  
  const notes = getValue('notes');
  if (notes) data.notes = notes.trim();
  
  // Instrument type
  const instrumentType = getValue('instrument_type');
  if (instrumentType) {
    data.instrument_type = normalizeInstrumentType(instrumentType);
  }
  
  // Calculate P/L if not provided
  if (data.profit_loss === undefined && data.entry_price && data.exit_price && data.quantity) {
    const multiplier = data.side === 'long' || data.side === 'buy' ? 1 : -1;
    data.profit_loss = (data.exit_price - data.entry_price) * data.quantity * multiplier - (data.commission || 0);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data,
  };
}

// Generate test CSV content
export function generateTestCSV(): string {
  return `Symbol,Side,Entry Price,Exit Price,Entry Date,Exit Date,Quantity,PnL,Commission,Stop Loss,Take Profit,Strategy,Broker,Account,Instrument Type,Notes
AAPL,long,150.50,155.75,2024-01-15 09:30:00,2024-01-15 15:45:00,100,525.00,9.99,148.00,160.00,Momentum,TD Ameritrade,Main,stock,Strong earnings play
BTCUSD,short,45000,44500,2024-01-16T14:00:00Z,2024-01-16T18:30:00Z,0.5,250.00,5.00,46000,43000,Breakout,Binance,Spot,crypto,Resistance rejection
EURUSD,buy,1.0850,1.0920,01/17/2024 08:15:00,,10000,70.00,2.50,1.0800,1.1000,Trend Follow,OANDA,Demo,forex,ECB decision
TSLA,sell,250.00,245.00,2024-01-18 10:00:00,2024-01-18 14:30:00,50,250.00,4.99,255.00,240.00,Mean Reversion,Robinhood,Cash,stock,Overbought bounce
ETHUSD,long,2500,2650,1705680000000,,2,300.00,3.00,2400,2800,DCA,Coinbase,Main,crypto,Weekly DCA entry
NVDA,short,500.00,,2024-01-19 11:00:00,,25,,,510.00,480.00,Swing,Fidelity,IRA,stock,Open short position
SPY,short,480.00,475.00,2024-01-20 09:35:00,2024-01-20 15:50:00,100,500.00,1.00,485.00,470.00,Day Trade,Interactive Brokers,Margin,stock,Short covered at fill price`;
}
