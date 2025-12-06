import { useRealtimePrice } from "@/hooks/useRealtimePrice";
import { TrendingUp, TrendingDown, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimePriceDisplayProps {
  symbol: string;
  initialPrice: number;
  initialChange: number;
  market?: "stocks" | "crypto" | "forex";
  showLiveIndicator?: boolean;
  compact?: boolean;
  className?: string;
}

export function RealtimePriceDisplay({
  symbol,
  initialPrice,
  initialChange,
  market = "stocks",
  showLiveIndicator = true,
  compact = false,
  className
}: RealtimePriceDisplayProps) {
  const { price, changePercent, isLive, loading } = useRealtimePrice(
    symbol,
    initialPrice,
    initialChange,
    market
  );

  const isPositive = changePercent >= 0;

  if (compact) {
    return (
      <div className={cn("flex flex-col items-end", className)}>
        <span className="font-mono text-lg font-semibold">
          ${price.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: price > 1000 ? 2 : price > 1 ? 2 : 4 
          })}
        </span>
        <span className={cn(
          "flex items-center gap-0.5 font-mono text-sm font-medium",
          isPositive ? "text-gain" : "text-loss"
        )}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <div className="flex items-center gap-1.5">
        {loading && (
          <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
        )}
        {showLiveIndicator && isLive && !loading && (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <Radio className="w-3 h-3" />
            LIVE
          </span>
        )}
        <span className="font-mono text-lg font-semibold">
          ${price.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: price > 1000 ? 2 : price > 1 ? 2 : 4 
          })}
        </span>
      </div>
      <div className={cn(
        "flex items-center gap-1 font-mono text-sm font-medium transition-colors",
        isPositive ? "text-gain" : "text-loss"
      )}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
      </div>
    </div>
  );
}
