import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectionSelectorProps {
  value: "long" | "short";
  onChange: (value: "long" | "short") => void;
}

export function DirectionSelector({ value, onChange }: DirectionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Long Card */}
      <button
        type="button"
        onClick={() => onChange("long")}
        className={cn(
          "group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
          value === "long"
            ? "border-gain bg-gradient-to-br from-gain/20 via-gain/10 to-transparent shadow-[0_0_30px_hsl(var(--gain)/0.3)] scale-[1.02]"
            : "border-border/50 bg-card/50 hover:border-gain/50 hover:bg-gain/5"
        )}
      >
        {/* Glow effect */}
        {value === "long" && (
          <div className="absolute inset-0 bg-gradient-to-t from-gain/10 to-transparent animate-pulse-glow" />
        )}
        
        {/* Icon */}
        <div className={cn(
          "relative w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
          value === "long"
            ? "bg-gain/30 shadow-[0_0_20px_hsl(var(--gain)/0.4)]"
            : "bg-muted group-hover:bg-gain/20"
        )}>
          <TrendingUp className={cn(
            "w-7 h-7 transition-colors",
            value === "long" ? "text-gain" : "text-muted-foreground group-hover:text-gain"
          )} />
        </div>
        
        {/* Label */}
        <span className={cn(
          "font-bold text-lg mb-1 transition-colors",
          value === "long" ? "text-gain" : "text-foreground group-hover:text-gain"
        )}>
          Long
        </span>
        
        {/* Description */}
        <span className="text-xs text-muted-foreground text-center">
          Expect price to rise
        </span>
        
        {/* Selected indicator */}
        {value === "long" && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gain animate-pulse" />
        )}
      </button>

      {/* Short Card */}
      <button
        type="button"
        onClick={() => onChange("short")}
        className={cn(
          "group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
          value === "short"
            ? "border-loss bg-gradient-to-br from-loss/20 via-loss/10 to-transparent shadow-[0_0_30px_hsl(var(--loss)/0.3)] scale-[1.02]"
            : "border-border/50 bg-card/50 hover:border-loss/50 hover:bg-loss/5"
        )}
      >
        {/* Glow effect */}
        {value === "short" && (
          <div className="absolute inset-0 bg-gradient-to-t from-loss/10 to-transparent animate-pulse-glow" />
        )}
        
        {/* Icon */}
        <div className={cn(
          "relative w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
          value === "short"
            ? "bg-loss/30 shadow-[0_0_20px_hsl(var(--loss)/0.4)]"
            : "bg-muted group-hover:bg-loss/20"
        )}>
          <TrendingDown className={cn(
            "w-7 h-7 transition-colors",
            value === "short" ? "text-loss" : "text-muted-foreground group-hover:text-loss"
          )} />
        </div>
        
        {/* Label */}
        <span className={cn(
          "font-bold text-lg mb-1 transition-colors",
          value === "short" ? "text-loss" : "text-foreground group-hover:text-loss"
        )}>
          Short
        </span>
        
        {/* Description */}
        <span className="text-xs text-muted-foreground text-center">
          Expect price to fall
        </span>
        
        {/* Selected indicator */}
        {value === "short" && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-loss animate-pulse" />
        )}
      </button>
    </div>
  );
}