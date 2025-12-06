import { useState, useEffect, useCallback } from "react";
import { polygonWS } from "@/lib/polygonWebSocket";
import { getPreviousClose } from "@/lib/polygon";

interface RealtimePrice {
  price: number;
  change: number;
  isLive: boolean;
  loading: boolean;
}

export function useRealtimePrice(
  symbol: string,
  initialPrice: number,
  initialChange: number,
  market: "stocks" | "crypto" | "forex" = "stocks"
): RealtimePrice {
  const [price, setPrice] = useState(initialPrice);
  const [change, setChange] = useState(initialChange);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const handlePriceUpdate = useCallback((sym: string, newPrice: number, newChange: number) => {
    if (sym === symbol || sym === symbol.replace("X:", "").replace("USD", "")) {
      setPrice(newPrice);
      setChange(newChange);
      setIsLive(true);
    }
  }, [symbol]);

  useEffect(() => {
    // For forex, we don't have WebSocket support in the free tier
    if (market === "forex") {
      setLoading(false);
      return;
    }

    const wsType = market === "crypto" ? "crypto" : "stocks";
    
    // Try to get previous close for accurate change calculation
    const fetchPrevClose = async () => {
      try {
        const data = await getPreviousClose(symbol);
        if (data.results?.[0]?.c) {
          polygonWS.setPrevClose(symbol, data.results[0].c);
        }
      } catch (e) {
        // Use initial price as fallback
        polygonWS.setPrevClose(symbol, initialPrice / (1 + initialChange / 100));
      } finally {
        setLoading(false);
      }
    };

    fetchPrevClose();

    // Subscribe to real-time updates
    const unsubscribe = polygonWS.subscribe(symbol, handlePriceUpdate, wsType);

    return () => {
      unsubscribe();
    };
  }, [symbol, market, initialPrice, initialChange, handlePriceUpdate]);

  return { price, change, isLive, loading };
}
