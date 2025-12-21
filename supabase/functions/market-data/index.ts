import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API keys from environment
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
const ALPHA_VANTAGE_API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');

const POLYGON_BASE_URL = "https://api.polygon.io";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, endpoint, params } = await req.json();

    console.log(`[market-data] Request: provider=${provider}, endpoint=${endpoint}`);

    let url: string;
    let apiKey: string | undefined;

    switch (provider) {
      case 'polygon':
        apiKey = POLYGON_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Polygon API key not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        url = buildPolygonUrl(endpoint, params, apiKey);
        break;

      case 'finnhub':
        apiKey = FINNHUB_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Finnhub API key not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        url = buildFinnhubUrl(endpoint, params, apiKey);
        break;

      case 'alphavantage':
        apiKey = ALPHA_VANTAGE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Alpha Vantage API key not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        url = buildAlphaVantageUrl(params, apiKey);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid provider' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[market-data] Fetching from: ${url.replace(apiKey, '***')}`);

    const response = await fetch(url);
    const data = await response.json();

    console.log(`[market-data] Response status: ${response.status}`);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[market-data] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPolygonUrl(endpoint: string, params: Record<string, any>, apiKey: string): string {
  const { ticker, multiplier, timespan, from, to } = params;
  
  switch (endpoint) {
    case 'aggregates':
      return `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    case 'previousClose':
      return `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
    case 'snapshot':
      return `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/${params.market}/tickers/${ticker}?apiKey=${apiKey}`;
    case 'lastTrade':
      return `${POLYGON_BASE_URL}/v2/last/trade/${ticker}?apiKey=${apiKey}`;
    default:
      throw new Error(`Unknown Polygon endpoint: ${endpoint}`);
  }
}

function buildFinnhubUrl(endpoint: string, params: Record<string, any>, apiKey: string): string {
  const { symbol, resolution, from, to } = params;
  
  switch (endpoint) {
    case 'quote':
      return `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`;
    case 'stockCandles':
      return `${FINNHUB_BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    case 'forexCandles':
      return `${FINNHUB_BASE_URL}/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    case 'cryptoCandles':
      return `${FINNHUB_BASE_URL}/crypto/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    default:
      throw new Error(`Unknown Finnhub endpoint: ${endpoint}`);
  }
}

function buildAlphaVantageUrl(params: Record<string, any>, apiKey: string): string {
  const queryParams = new URLSearchParams({ ...params, apikey: apiKey });
  return `${ALPHA_VANTAGE_BASE_URL}?${queryParams.toString()}`;
}
