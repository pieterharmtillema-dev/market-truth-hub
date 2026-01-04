import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// XOR-based decryption (must match exchange-connect encryption)
function decryptCredential(encrypted: string, key: string): string {
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(key);
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

// Create HMAC signature
async function createHmacSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Fetch trades from Bitvavo
async function fetchBitvavoTrades(apiKey: string, apiSecret: string, lastSyncCursor?: string): Promise<{
  trades: any[];
  newCursor?: string;
  error?: string;
}> {
  try {
    // First get all markets to know which pairs to query
    const marketsResponse = await fetch('https://api.bitvavo.com/v2/markets');
    const markets = await marketsResponse.json();
    
    if (!Array.isArray(markets)) {
      console.error('Invalid markets response:', markets);
      return { trades: [], error: 'Failed to fetch markets' };
    }

    const allTrades: any[] = [];
    const tradeTimestamp = lastSyncCursor ? parseInt(lastSyncCursor) : 0;
    let maxTimestamp = tradeTimestamp;

    // Fetch trades for common markets (limit to avoid rate limits)
    const commonMarkets = markets
      .filter((m: any) => m.status === 'trading')
      .slice(0, 50); // Limit to 50 markets

    for (const market of commonMarkets) {
      const marketName = market.market;
      const timestamp = Date.now();
      const method = 'GET';
      const url = `/v2/trades?market=${marketName}&limit=100`;
      const body = '';
      
      const message = `${timestamp}${method}${url}${body}`;
      const signatureHex = await createHmacSignature(message, apiSecret);
      
      const response = await fetch(`https://api.bitvavo.com${url}`, {
        headers: {
          'BITVAVO-ACCESS-KEY': apiKey,
          'BITVAVO-ACCESS-SIGNATURE': signatureHex,
          'BITVAVO-ACCESS-TIMESTAMP': timestamp.toString(),
        },
      });
      
      if (response.ok) {
        const trades = await response.json();
        if (Array.isArray(trades)) {
          // Filter trades newer than last sync
          const newTrades = trades.filter((t: any) => t.timestamp > tradeTimestamp);
          allTrades.push(...newTrades.map((t: any) => ({
            ...t,
            market: marketName,
            exchange: 'bitvavo'
          })));
          
          // Track max timestamp
          for (const t of newTrades) {
            if (t.timestamp > maxTimestamp) {
              maxTimestamp = t.timestamp;
            }
          }
        }
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Fetched ${allTrades.length} trades from Bitvavo`);
    
    return {
      trades: allTrades,
      newCursor: maxTimestamp > tradeTimestamp ? maxTimestamp.toString() : undefined
    };
  } catch (error) {
    console.error('Bitvavo fetch error:', error);
    return { trades: [], error: error instanceof Error ? error.message : 'Failed to fetch trades' };
  }
}

// Fetch trades from Binance
async function fetchBinanceTrades(apiKey: string, apiSecret: string, lastSyncCursor?: string): Promise<{
  trades: any[];
  newCursor?: string;
  error?: string;
}> {
  try {
    // First get account info to find traded symbols
    const timestamp = Date.now();
    let queryString = `timestamp=${timestamp}`;
    let signature = await createHmacSignature(queryString, apiSecret);
    
    const accountResponse = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      { headers: { 'X-MBX-APIKEY': apiKey } }
    );
    
    if (!accountResponse.ok) {
      const error = await accountResponse.json();
      return { trades: [], error: error.msg || 'Failed to fetch account' };
    }
    
    const account = await accountResponse.json();
    const balances = account.balances?.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) || [];
    
    const allTrades: any[] = [];
    const startTime = lastSyncCursor ? parseInt(lastSyncCursor) : Date.now() - 30 * 24 * 60 * 60 * 1000; // Default to 30 days ago
    let maxTimestamp = startTime;
    
    // Get trades for each symbol with balance
    for (const balance of balances.slice(0, 20)) { // Limit to avoid rate limits
      const asset = balance.asset;
      if (asset === 'USDT' || asset === 'BUSD' || asset === 'EUR') continue;
      
      const symbol = `${asset}USDT`;
      const ts = Date.now();
      queryString = `symbol=${symbol}&startTime=${startTime}&timestamp=${ts}`;
      signature = await createHmacSignature(queryString, apiSecret);
      
      const tradesResponse = await fetch(
        `https://api.binance.com/api/v3/myTrades?${queryString}&signature=${signature}`,
        { headers: { 'X-MBX-APIKEY': apiKey } }
      );
      
      if (tradesResponse.ok) {
        const trades = await tradesResponse.json();
        if (Array.isArray(trades)) {
          allTrades.push(...trades.map((t: any) => ({
            ...t,
            exchange: 'binance'
          })));
          
          for (const t of trades) {
            if (t.time > maxTimestamp) {
              maxTimestamp = t.time;
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Fetched ${allTrades.length} trades from Binance`);
    
    return {
      trades: allTrades,
      newCursor: maxTimestamp > startTime ? maxTimestamp.toString() : undefined
    };
  } catch (error) {
    console.error('Binance fetch error:', error);
    return { trades: [], error: error instanceof Error ? error.message : 'Failed to fetch trades' };
  }
}

// Fetch trades from Coinbase
async function fetchCoinbaseTrades(apiKey: string, apiSecret: string, lastSyncCursor?: string): Promise<{
  trades: any[];
  newCursor?: string;
  error?: string;
}> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    
    // Get filled orders
    let path = '/api/v3/brokerage/orders/historical/fills';
    if (lastSyncCursor) {
      path += `?start_sequence_timestamp=${lastSyncCursor}`;
    }
    
    const message = `${timestamp}${method}${path}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    const response = await fetch(`https://api.coinbase.com${path}`, {
      headers: {
        'CB-ACCESS-KEY': apiKey,
        'CB-ACCESS-SIGN': signatureBase64,
        'CB-ACCESS-TIMESTAMP': timestamp,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { trades: [], error: error.message || 'Failed to fetch trades' };
    }
    
    const data = await response.json();
    const fills = data.fills || [];
    
    let maxTimestamp = lastSyncCursor || '';
    for (const fill of fills) {
      if (fill.trade_time && fill.trade_time > maxTimestamp) {
        maxTimestamp = fill.trade_time;
      }
    }
    
    console.log(`Fetched ${fills.length} trades from Coinbase`);
    
    return {
      trades: fills.map((f: any) => ({ ...f, exchange: 'coinbase' })),
      newCursor: maxTimestamp !== lastSyncCursor ? maxTimestamp : undefined
    };
  } catch (error) {
    console.error('Coinbase fetch error:', error);
    return { trades: [], error: error instanceof Error ? error.message : 'Failed to fetch trades' };
  }
}

// Normalize trade to position format
function normalizeTradeToPosition(trade: any, userId: string, exchange: string): any {
  const now = new Date().toISOString();
  
  if (exchange === 'bitvavo') {
    const [base, quote] = trade.market.split('-');
    const side = trade.side === 'buy' ? 'long' : 'short';
    const quantity = parseFloat(trade.amount);
    const price = parseFloat(trade.price);
    const fee = parseFloat(trade.fee || 0);
    
    return {
      user_id: userId,
      symbol: `${base}/${quote}`,
      side,
      quantity,
      entry_price: price,
      entry_timestamp: new Date(trade.timestamp).toISOString(),
      exit_price: price, // For spot trades, entry = exit
      exit_timestamp: new Date(trade.timestamp).toISOString(),
      pnl: 0, // Spot trades need to be matched with sells
      pnl_pct: 0,
      open: false,
      is_exchange_verified: true,
      exchange_source: 'bitvavo',
      trade_source: 'api',
      fees_total: fee,
      platform: 'Bitvavo',
      asset_class: 'crypto',
      created_at: now,
      updated_at: now,
    };
  }
  
  if (exchange === 'binance') {
    const symbol = trade.symbol.replace('USDT', '/USDT');
    const side = trade.isBuyer ? 'long' : 'short';
    const quantity = parseFloat(trade.qty);
    const price = parseFloat(trade.price);
    const fee = parseFloat(trade.commission || 0);
    
    return {
      user_id: userId,
      symbol,
      side,
      quantity,
      entry_price: price,
      entry_timestamp: new Date(trade.time).toISOString(),
      exit_price: price,
      exit_timestamp: new Date(trade.time).toISOString(),
      pnl: 0,
      pnl_pct: 0,
      open: false,
      is_exchange_verified: true,
      exchange_source: 'binance',
      trade_source: 'api',
      fees_total: fee,
      platform: 'Binance',
      asset_class: 'crypto',
      created_at: now,
      updated_at: now,
    };
  }
  
  if (exchange === 'coinbase') {
    const side = trade.side === 'BUY' ? 'long' : 'short';
    const quantity = parseFloat(trade.size || trade.base_size || 0);
    const price = parseFloat(trade.price || 0);
    const fee = parseFloat(trade.commission || 0);
    
    return {
      user_id: userId,
      symbol: trade.product_id?.replace('-', '/') || 'UNKNOWN',
      side,
      quantity,
      entry_price: price,
      entry_timestamp: trade.trade_time || now,
      exit_price: price,
      exit_timestamp: trade.trade_time || now,
      pnl: 0,
      pnl_pct: 0,
      open: false,
      is_exchange_verified: true,
      exchange_source: 'coinbase',
      trade_source: 'api',
      fees_total: fee,
      platform: 'Coinbase',
      asset_class: 'crypto',
      created_at: now,
      updated_at: now,
    };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('EXCHANGE_ENCRYPTION_KEY')!;

    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { exchange } = await req.json().catch(() => ({}));
    
    console.log(`Starting sync for user ${user.id}, exchange: ${exchange || 'all'}`);

    // Get exchange connections (skip TradeStation and Alpaca - they have their own sync functions)
    let query = supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .neq('exchange', 'tradestation') // TradeStation uses dedicated tradestation-sync function
      .neq('exchange', 'alpaca'); // Alpaca uses dedicated alpaca-sync function

    if (exchange) {
      query = query.eq('exchange', exchange);
    }
    
    const { data: connections, error: connError } = await query;
    
    if (connError || !connections?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No connected exchanges found',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSynced = 0;
    const results: any[] = [];

    for (const connection of connections) {
      try {
        // Decrypt credentials
        const apiKey = decryptCredential(connection.api_key_encrypted, encryptionKey);
        const apiSecret = decryptCredential(connection.api_secret_encrypted, encryptionKey);
        
        let fetchResult: { trades: any[]; newCursor?: string; error?: string };
        
        switch (connection.exchange) {
          case 'bitvavo':
            fetchResult = await fetchBitvavoTrades(apiKey, apiSecret, connection.last_sync_cursor);
            break;
          case 'binance':
            fetchResult = await fetchBinanceTrades(apiKey, apiSecret, connection.last_sync_cursor);
            break;
          case 'coinbase':
            fetchResult = await fetchCoinbaseTrades(apiKey, apiSecret, connection.last_sync_cursor);
            break;
          default:
            fetchResult = { trades: [], error: 'Unsupported exchange' };
        }
        
        if (fetchResult.error) {
          console.error(`Error syncing ${connection.exchange}:`, fetchResult.error);
          results.push({
            exchange: connection.exchange,
            error: fetchResult.error,
            synced: 0
          });
          continue;
        }
        
        // Insert new positions
        let insertedCount = 0;
        for (const trade of fetchResult.trades) {
          const position = normalizeTradeToPosition(trade, user.id, connection.exchange);
          if (!position) continue;
          
          // Check for duplicates based on timestamp and symbol
          const { data: existing } = await supabase
            .from('positions')
            .select('id')
            .eq('user_id', user.id)
            .eq('symbol', position.symbol)
            .eq('entry_timestamp', position.entry_timestamp)
            .eq('exchange_source', connection.exchange)
            .single();
          
          if (!existing) {
            const { error: insertError } = await supabase
              .from('positions')
              .insert(position);
            
            if (!insertError) {
              insertedCount++;
            } else {
              console.error('Insert error:', insertError);
            }
          }
        }
        
        // Update connection with new sync info
        const updateData: any = {
          last_sync_at: new Date().toISOString(),
          verified_trades_count: (connection.verified_trades_count || 0) + insertedCount,
          error_message: null,
        };
        
        if (fetchResult.newCursor) {
          updateData.last_sync_cursor = fetchResult.newCursor;
        }
        
        await supabase
          .from('exchange_connections')
          .update(updateData)
          .eq('id', connection.id);
        
        totalSynced += insertedCount;
        results.push({
          exchange: connection.exchange,
          synced: insertedCount,
          total: fetchResult.trades.length
        });
        
        console.log(`Synced ${insertedCount} new trades from ${connection.exchange}`);
        
      } catch (err) {
        console.error(`Error processing ${connection.exchange}:`, err);
        results.push({
          exchange: connection.exchange,
          error: err instanceof Error ? err.message : 'Unknown error',
          synced: 0
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: totalSynced,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Exchange sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
