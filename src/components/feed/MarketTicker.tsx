import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
}

interface MarketTickerProps {
  items: TickerItem[];
}

export function MarketTicker({ items }: MarketTickerProps) {
  return (
    <div className="overflow-hidden bg-card/50 border-y border-border">
      <div className="flex animate-scroll">
        {[...items, ...items].map((item, index) => (
          <div 
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-3 px-4 py-2 border-r border-border/50 min-w-fit"
          >
            <span className="font-mono font-medium text-sm">{item.symbol}</span>
            <span className="font-mono text-sm text-muted-foreground">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "flex items-center gap-0.5 font-mono text-xs",
              item.change >= 0 ? "text-gain" : "text-loss"
            )}>
              {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
