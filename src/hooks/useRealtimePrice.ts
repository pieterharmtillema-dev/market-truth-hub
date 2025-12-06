import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentPrice } from "@/lib/polygon";

interface RealtimePrice {
  price: number;
  change: number;
  changePercent: number;
  isLive: boolean;
  loading: boolean;
  lastUpdate: number;
}

export function useRealtimePrice(
  symbol: string,
  initialPrice: number,
  initialChange: number,
  market: "stocks" | "crypto" | "forex" = "stocks",
  refreshInterval: number = 30000 // Refresh every 30 seconds
): RealtimePrice {
  const [price, setPrice] = useState(initialPrice);
  const [change, setChange] = useState(0);
  const [changePercent, setChangePercent] = useState(initialChange);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const data = await getCurrentPrice(symbol, market);
      
      if (data) {
        setPrice(data.price);
        setChange(data.change);
        setChangePercent(data.changePercent);
        setIsLive(true);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
    } finally {
      setLoading(false);
    }
  }, [symbol, market]);

  useEffect(() => {
    // Initial fetch
    fetchPrice();

    // Set up refresh interval
    intervalRef.current = setInterval(fetchPrice, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice, refreshInterval]);

  return { 
    price, 
    change, 
    changePercent, 
    isLive, 
    loading,
    lastUpdate
  };
}
