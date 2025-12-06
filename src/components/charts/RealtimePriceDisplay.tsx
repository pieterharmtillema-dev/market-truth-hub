import { useRealtimePrice } from "@/hooks/useRealtimePrice";
import { TrendingUp, TrendingDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimePriceDisplayProps {
  symbol: string;
  initialPrice: number;
  initialChange: number;
  market?: "stocks" | "crypto" | "forex";
  showLiveIndicator?: boolean;
  className?: string;
}

export function RealtimePriceDisplay({
  symbol,
  initialPrice,
  initialChange,
  market = "stocks",
  showLiveIndicator = true,
  className
}: RealtimePriceDisplayProps) {
  const { price, change, isLive } = useRealtimePrice(
    symbol,
    initialPrice,
    initialChange,
    market
  );

  const isPositive = change >= 0;

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <div className="flex items-center gap-1.5">
        {showLiveIndicator && isLive && (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <Radio className="w-3 h-3 animate-pulse" />
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
        {isPositive ? "+" : ""}{change.toFixed(2)}%
      </div>
    </div>
  );
}
