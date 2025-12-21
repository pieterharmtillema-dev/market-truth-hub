import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple XOR-based encryption with Base64 encoding for credential storage
// In production, consider using a proper encryption library
function encryptCredential(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

function decryptCredential(encrypted: string, key: string): string {
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(key);
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

// Validate API credentials by making a test request to the exchange
async function validateExchangeCredentials(
  exchange: string,
  apiKey: string,
  apiSecret: string
): Promise<{ valid: boolean; error?: string; tradesCount?: number }> {
  try {
    switch (exchange) {
      case 'binance':
        return await validateBinance(apiKey, apiSecret);
      case 'bitvavo':
        return await validateBitvavo(apiKey, apiSecret);
      case 'coinbase':
        return await validateCoinbase(apiKey, apiSecret);
      default:
        return { valid: false, error: 'Unsupported exchange' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    console.error(`Validation error for ${exchange}:`, errorMessage);
    return { valid: false, error: errorMessage };
  }
}

// Binance API validation
async function validateBinance(apiKey: string, apiSecret: string): Promise<{ valid: boolean; error?: string; tradesCount?: number }> {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  
  // Create HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Test with account endpoint (read-only)
  const response = await fetch(
    `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`,
    {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    if (error.code === -2015) {
      return { valid: false, error: 'Invalid API key or permissions' };
    }
    return { valid: false, error: error.msg || 'API validation failed' };
  }
  
  // Check if key has withdrawal permissions (we don't want that)
  const data = await response.json();
  if (data.permissions && data.permissions.includes('WITHDRAW')) {
    return { valid: false, error: 'API key has withdrawal permissions. Please use a read-only key.' };
  }
  
  return { valid: true, tradesCount: 0 };
}

// Bitvavo API validation
async function validateBitvavo(apiKey: string, apiSecret: string): Promise<{ valid: boolean; error?: string; tradesCount?: number }> {
  const timestamp = Date.now();
  const method = 'GET';
  const url = '/v2/account';
  const body = '';
  
  const message = `${timestamp}${method}${url}${body}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const response = await fetch('https://api.bitvavo.com/v2/account', {
    headers: {
      'BITVAVO-ACCESS-KEY': apiKey,
      'BITVAVO-ACCESS-SIGNATURE': signatureHex,
      'BITVAVO-ACCESS-TIMESTAMP': timestamp.toString(),
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { valid: false, error: error.errorCode || 'API validation failed' };
  }
  
  return { valid: true, tradesCount: 0 };
}

// Coinbase API validation (using Coinbase Pro/Advanced Trade API)
async function validateCoinbase(apiKey: string, apiSecret: string): Promise<{ valid: boolean; error?: string; tradesCount?: number }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const path = '/api/v3/brokerage/accounts';
  const body = '';
  
  const message = `${timestamp}${method}${path}${body}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  const response = await fetch(`https://api.coinbase.com${path}`, {
    headers: {
      'CB-ACCESS-KEY': apiKey,
      'CB-ACCESS-SIGN': signatureBase64,
      'CB-ACCESS-TIMESTAMP': timestamp,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { valid: false, error: error.message || 'API validation failed' };
  }
  
  return { valid: true, tradesCount: 0 };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('EXCHANGE_ENCRYPTION_KEY')!;

    if (!encryptionKey) {
      console.error('EXCHANGE_ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token for RLS
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'POST' && path === 'exchange-connect') {
      // Connect new exchange
      const { exchange, apiKey, apiSecret } = await req.json();

      // Validate inputs (never log the actual secret)
      if (!exchange || !apiKey || !apiSecret) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validExchanges = ['binance', 'bitvavo', 'coinbase'];
      if (!validExchanges.includes(exchange)) {
        return new Response(
          JSON.stringify({ error: 'Unsupported exchange' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Validating ${exchange} credentials for user ${user.id}`);

      // Validate credentials with the exchange
      const validation = await validateExchangeCredentials(exchange, apiKey, apiSecret);

      if (!validation.valid) {
        console.log(`Validation failed for ${exchange}: ${validation.error}`);
        return new Response(
          JSON.stringify({ error: validation.error || 'Invalid API credentials' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Encrypt credentials
      const encryptedApiKey = encryptCredential(apiKey, encryptionKey);
      const encryptedApiSecret = encryptCredential(apiSecret, encryptionKey);

      // Store in database (upsert to handle reconnection)
      const { data, error } = await supabase
        .from('exchange_connections')
        .upsert({
          user_id: user.id,
          exchange,
          api_key_encrypted: encryptedApiKey,
          api_secret_encrypted: encryptedApiSecret,
          status: 'connected',
          last_sync_at: new Date().toISOString(),
          verified_trades_count: validation.tradesCount || 0,
          error_message: null,
        }, {
          onConflict: 'user_id,exchange'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully connected ${exchange} for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            id: data.id,
            exchange: data.exchange,
            status: data.status,
            last_sync_at: data.last_sync_at,
            verified_trades_count: data.verified_trades_count,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET' && path === 'exchange-connect') {
      // Get user's exchange connections
      const { data, error } = await supabase
        .from('exchange_connections')
        .select('id, exchange, status, last_sync_at, verified_trades_count, error_message, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch connections' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ connections: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE' && path === 'exchange-connect') {
      const { exchange } = await req.json();

      const { error } = await supabase
        .from('exchange_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('exchange', exchange);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect exchange' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Disconnected ${exchange} for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Exchange connect error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
