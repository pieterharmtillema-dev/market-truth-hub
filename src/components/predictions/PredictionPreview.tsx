import { TrendingUp, TrendingDown, Target, Clock, Percent, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PredictionPreviewProps {
  direction: "long" | "short";
  asset: string;
  entryPrice: number;
  targetPrice: number;
  timeframe: string;
  confidence: number;
}

export function PredictionPreview({
  direction,
  asset,
  entryPrice,
  targetPrice,
  timeframe,
  confidence,
}: PredictionPreviewProps) {
  const percentMove = entryPrice > 0 ? ((targetPrice - entryPrice) / entryPrice) * 100 : 0;
  const isValidDirection = 
    (direction === "long" && targetPrice > entryPrice) ||
    (direction === "short" && targetPrice < entryPrice);

  const timeframeLabels: Record<string, string> = {
    "1h": "1 Hour",
    "4h": "4 Hours",
    "1d": "1 Day",
    "1w": "1 Week",
    "1m": "1 Month",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      {/* Header glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Prediction Summary</span>
          <Badge variant={direction === "long" ? "gain" : "loss"} className="gap-1">
            {direction === "long" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {direction.toUpperCase()}
          </Badge>
        </div>

        {/* Asset & Direction */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            direction === "long" ? "bg-gain/20" : "bg-loss/20"
          )}>
            {direction === "long" ? (
              <TrendingUp className="w-6 h-6 text-gain" />
            ) : (
              <TrendingDown className="w-6 h-6 text-loss" />
            )}
          </div>
          <div>
            <span className="font-mono font-bold text-2xl">{asset}</span>
            <p className="text-sm text-muted-foreground">
              {direction === "long" ? "Bullish" : "Bearish"} prediction
            </p>
          </div>
        </div>

        {/* Price Flow */}
        <div className="bg-background/50 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <span className="text-xs text-muted-foreground block mb-1">Entry</span>
              <span className="font-mono font-bold text-lg">
                ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-12 h-8 flex items-center justify-center rounded-lg text-xs font-bold",
                isValidDirection
                  ? direction === "long" ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                  : "bg-warning/20 text-warning"
              )}>
                {percentMove >= 0 ? "+" : ""}{percentMove.toFixed(1)}%
              </div>
              <Target className="w-4 h-4 text-muted-foreground mt-1" />
            </div>
            
            <div className="text-center flex-1">
              <span className="text-xs text-muted-foreground block mb-1">Target</span>
              <span className={cn(
                "font-mono font-bold text-lg",
                direction === "long" ? "text-gain" : "text-loss"
              )}>
                ${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Warning for invalid direction */}
        {!isValidDirection && (
          <div className="flex items-center gap-2 text-warning text-sm bg-warning/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Target price should be {direction === "long" ? "higher" : "lower"} than entry for a {direction} position
            </span>
          </div>
        )}

        {/* Details Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/30 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Time Horizon</span>
              <span className="font-medium text-sm">{timeframeLabels[timeframe] || timeframe}</span>
            </div>
          </div>
          
          <div className="bg-background/30 rounded-lg p-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Confidence</span>
              <span className="font-medium text-sm">{confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}