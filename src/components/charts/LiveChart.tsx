import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData, Time, CandlestickSeries, LineSeries } from "lightweight-charts";
import { getCandles, getCryptoCandles, getCurrentPrice, getTimestamps, FinnhubCandle } from "@/lib/finnhub";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveChartProps {
  symbol: string;
  name: string;
  market?: "stocks" | "crypto" | "forex";
  className?: string;
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y";
type ChartType = "candle" | "line";

const timeRangeConfig: Record<TimeRange, { days: number; resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M" }> = {
  "1D": { days: 1, resolution: "5" },
  "1W": { days: 7, resolution: "60" },
  "1M": { days: 30, resolution: "D" },
  "3M": { days: 90, resolution: "D" },
  "1Y": { days: 365, resolution: "D" },
};

export function LiveChart({ symbol, name, market = "stocks", className }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<{ current: number; change: number; changePercent: number } | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Fetch current price on mount and periodically
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      setPriceLoading(true);
      try {
        const data = await getCurrentPrice(symbol, market);
        if (data) {
          setPriceData({
            current: data.price,
            change: data.change,
            changePercent: data.changePercent,
          });
          setIsLive(true);
        }
      } catch (err) {
        console.error("Failed to fetch current price:", err);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchCurrentPrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentPrice, 30000);
    return () => clearInterval(interval);
  }, [symbol, market]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--muted-foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.3)" },
        horzLines: { color: "hsl(var(--border) / 0.3)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
      },
      timeScale: {
        borderColor: "hsl(var(--border))",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "hsl(var(--primary) / 0.5)",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: "hsl(var(--primary) / 0.5)",
          width: 1,
          style: 2,
        },
      },
    });

    chartRef.current = chart;

    // Handle resize
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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!chartRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const config = timeRangeConfig[timeRange];
        const { from, to } = getTimestamps(config.days);

        let data: FinnhubCandle | null;
        
        if (market === "crypto") {
          data = await getCryptoCandles(symbol, config.resolution, from, to);
        } else {
          data = await getCandles(symbol, config.resolution, from, to);
        }

        if (!data || !data.c || data.c.length === 0) {
          setError("No data available");
          setLoading(false);
          return;
        }

        // Remove existing series
        if (seriesRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
        }

        // Calculate price change
        const firstClose = data.o[0];
        const lastClose = data.c[data.c.length - 1];
        const change = lastClose - firstClose;
        const changePercent = (change / firstClose) * 100;
        setPriceData({
          current: lastClose,
          change,
          changePercent,
        });

        const isPositive = change >= 0;
        const upColor = "hsl(142, 76%, 45%)";
        const downColor = "hsl(0, 84%, 60%)";

        if (chartType === "candle") {
          const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: upColor,
            downColor: downColor,
            borderUpColor: upColor,
            borderDownColor: downColor,
            wickUpColor: upColor,
            wickDownColor: downColor,
          });

          const candleData: CandlestickData[] = data.t.map((timestamp, i) => ({
            time: timestamp as Time,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
          }));

          candlestickSeries.setData(candleData);
          seriesRef.current = candlestickSeries as any;
        } else {
          const lineSeries = chartRef.current.addSeries(LineSeries, {
            color: isPositive ? upColor : downColor,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
          });

          const lineData: LineData[] = data.t.map((timestamp, i) => ({
            time: timestamp as Time,
            value: data.c[i],
          }));

          lineSeries.setData(lineData);
          seriesRef.current = lineSeries as any;
        }

        chartRef.current.timeScale().fitContent();
      } catch (err) {
        console.error("Chart data fetch error:", err);
        setError("Failed to load chart data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, market, timeRange, chartType]);

  return (
    <Card variant="glass" className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-mono font-bold text-primary text-sm">{symbol.slice(0, 2)}</span>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {symbol}
                <Badge variant="outline" className="text-[10px] font-normal">{name}</Badge>
              </CardTitle>
              {priceData ? (
                <div className="flex items-center gap-2 mt-0.5">
                  {priceLoading ? (
                    <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                  ) : isLive && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <Radio className="w-3 h-3" />
                    </span>
                  )}
                  <span className="font-mono text-xl font-semibold">
                    ${priceData.current.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: priceData.current > 1000 ? 2 : 4 
                    })}
                  </span>
                  <span className={cn(
                    "flex items-center gap-0.5 text-sm font-mono font-medium",
                    priceData.changePercent >= 0 ? "text-gain" : "text-loss"
                  )}>
                    {priceData.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {priceData.changePercent >= 0 ? "+" : ""}{priceData.changePercent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading price...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType(chartType === "candle" ? "line" : "candle")}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Activity className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList className="bg-muted/30 h-8">
              {(["1D", "1W", "1M", "3M", "1Y"] as TimeRange[]).map((range) => (
                <TabsTrigger
                  key={range}
                  value={range}
                  className="text-xs px-3 h-6 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  {range}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading chart...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <span className="text-sm text-muted-foreground">{error}</span>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full" style={{ height: 300 }} />
        </div>
      </CardContent>
    </Card>
  );
}
