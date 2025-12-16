import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Prediction {
  id: string;
  asset: string;
  asset_type: string;
  direction: string;
  current_price: number;
  target_price: number;
  expiry_timestamp: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const polygonApiKey = Deno.env.get("POLYGON_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active predictions that haven't expired
    const now = new Date().toISOString();
    const { data: predictions, error: fetchError } = await supabase
      .from("predictions")
      .select("*")
      .eq("status", "active")
      .not("expiry_timestamp", "is", null);

    if (fetchError) {
      console.error("Error fetching predictions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${predictions?.length || 0} active predictions to check`);

    const results = {
      checked: 0,
      hit: 0,
      expired: 0,
      errors: 0,
    };

    for (const prediction of predictions || []) {
      try {
        const expiryTime = new Date(prediction.expiry_timestamp).getTime();
        const nowTime = Date.now();

        // Check if prediction has expired
        if (nowTime >= expiryTime) {
          // Mark as missed (expired predictions that didn't hit are missed)
          await supabase
            .from("predictions")
            .update({
              status: "missed",
              resolved_at: now,
            })
            .eq("id", prediction.id);

          results.expired++;
          console.log(`Prediction ${prediction.id} MISSED (expired without hitting target)`);
          continue;
        }

        // Fetch current price from Polygon
        if (!polygonApiKey) {
          console.log("No Polygon API key configured, skipping price check");
          continue;
        }

        const ticker = formatPolygonTicker(prediction.asset, prediction.asset_type);
        const priceData = await fetchCurrentPrice(ticker, polygonApiKey);

        if (!priceData) {
          console.log(`Could not fetch price for ${prediction.asset}`);
          continue;
        }

        const currentPrice = priceData.price;
        const entryPrice = prediction.current_price;
        const targetPrice = prediction.target_price;
        const direction = prediction.direction;

        // Update last checked price
        await supabase
          .from("predictions")
          .update({
            last_price_check: now,
            last_checked_price: currentPrice,
          })
          .eq("id", prediction.id);

        // Check if target is hit
        let isHit = false;

        if (direction === "long") {
          // For long: price touches or exceeds target
          isHit = currentPrice >= targetPrice;
        } else {
          // For short: price touches or goes below target
          isHit = currentPrice <= targetPrice;
        }

        if (isHit) {
          await supabase
            .from("predictions")
            .update({
              status: "hit",
              resolved_at: now,
              resolved_price: currentPrice,
              hit_timestamp: now,
            })
            .eq("id", prediction.id);

          results.hit++;
          console.log(`Prediction ${prediction.id} HIT at ${currentPrice}`);
        }

        results.checked++;
      } catch (predError) {
        console.error(`Error processing prediction ${prediction.id}:`, predError);
        results.errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-predictions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPolygonTicker(symbol: string, assetType: string): string {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

  switch (assetType) {
    case "crypto":
      return `X:${cleanSymbol}USD`;
    case "forex":
      const forexClean = symbol.replace("/", "");
      return `C:${forexClean}`;
    case "commodity":
      if (cleanSymbol === "GOLD") return "C:XAUUSD";
      return cleanSymbol;
    default:
      return cleanSymbol;
  }
}

async function fetchCurrentPrice(
  ticker: string,
  apiKey: string
): Promise<{ price: number } | null> {
  try {
    // Use previous close endpoint for simplicity
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Polygon API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return { price: data.results[0].c }; // Close price
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return null;
  }
}