import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, LineData, Time, AreaSeries } from "lightweight-charts";
import { getAggregates, getDateString, formatPolygonTicker, PolygonAggregateBar } from "@/lib/polygon";
import { cn } from "@/lib/utils";

interface MiniChartProps {
  symbol: string;
  market?: "stocks" | "crypto" | "forex";
  days?: number;
  height?: number;
  className?: string;
  lazyLoad?: boolean;
}

// Simple cache to reduce API calls
const chartDataCache = new Map<string, { data: LineData[]; isPositive: boolean; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export function MiniChart({ symbol, market = "stocks", days = 7, height = 60, className, lazyLoad = true }: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPositive, setIsPositive] = useState(true);
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (chartContainerRef.current) {
      observer.observe(chartContainerRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad]);

  useEffect(() => {
    if (!chartContainerRef.current || !isVisible) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [height, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const fetchData = async () => {
      if (!chartRef.current) return;

      const cacheKey = `${symbol}-${market}-${days}`;
      const cached = chartDataCache.get(cacheKey);
      
      // Use cache if valid
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setIsPositive(cached.isPositive);
        
        if (seriesRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
        }

        const areaSeries = chartRef.current.addSeries(AreaSeries, {
          lineColor: cached.isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)",
          topColor: cached.isPositive ? "hsla(142, 76%, 45%, 0.3)" : "hsla(0, 84%, 60%, 0.3)",
          bottomColor: cached.isPositive ? "hsla(142, 76%, 45%, 0.0)" : "hsla(0, 84%, 60%, 0.0)",
          lineWidth: 2,
        });

        areaSeries.setData(cached.data);
        seriesRef.current = areaSeries;
        chartRef.current.timeScale().fitContent();
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ticker = formatPolygonTicker(symbol, market);
        const from = getDateString(days);
        const to = getDateString(0);

        // Add staggered delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

        const data = await getAggregates(ticker, 1, "day", from, to);

        if (!data.results || data.results.length === 0) {
          setLoading(false);
          return;
        }

        const firstBar = data.results[0];
        const lastBar = data.results[data.results.length - 1];
        const positive = lastBar.c >= firstBar.o;
        setIsPositive(positive);

        if (seriesRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
        }

        const areaSeries = chartRef.current.addSeries(AreaSeries, {
          lineColor: positive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)",
          topColor: positive ? "hsla(142, 76%, 45%, 0.3)" : "hsla(0, 84%, 60%, 0.3)",
          bottomColor: positive ? "hsla(142, 76%, 45%, 0.0)" : "hsla(0, 84%, 60%, 0.0)",
          lineWidth: 2,
        });

        const lineData: LineData[] = data.results.map((bar: PolygonAggregateBar) => ({
          time: (bar.t / 1000) as Time,
          value: bar.c,
        }));

        areaSeries.setData(lineData);
        seriesRef.current = areaSeries;
        chartRef.current.timeScale().fitContent();

        // Cache the data
        chartDataCache.set(cacheKey, { data: lineData, isPositive: positive, timestamp: Date.now() });
      } catch (err) {
        console.error("Mini chart fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, market, days, isVisible]);

  return (
    <div className={cn("relative", className)}>
      {loading && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
}
