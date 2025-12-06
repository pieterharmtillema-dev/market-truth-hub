import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SentimentBarProps {
  bullish: number;
  bearish: number;
  neutral: number;
  className?: string;
}

export function SentimentBar({ bullish, bearish, neutral, className }: SentimentBarProps) {
  const total = bullish + bearish + neutral;
  const bullishPercent = (bullish / total) * 100;
  const bearishPercent = (bearish / total) * 100;
  const neutralPercent = (neutral / total) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gain">
          <TrendingUp className="w-3 h-3" />
          <span className="font-medium">{bullishPercent.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1 text-neutral">
          <Minus className="w-3 h-3" />
          <span className="font-medium">{neutralPercent.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1 text-loss">
          <TrendingDown className="w-3 h-3" />
          <span className="font-medium">{bearishPercent.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div 
          className="bg-gain transition-all duration-500" 
          style={{ width: `${bullishPercent}%` }} 
        />
        <div 
          className="bg-neutral transition-all duration-500" 
          style={{ width: `${neutralPercent}%` }} 
        />
        <div 
          className="bg-loss transition-all duration-500" 
          style={{ width: `${bearishPercent}%` }} 
        />
      </div>
    </div>
  );
}
