import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  const getConfidenceLevel = () => {
    if (value >= 80) return { label: "Very High", color: "text-gain" };
    if (value >= 60) return { label: "High", color: "text-primary" };
    if (value >= 40) return { label: "Medium", color: "text-warning" };
    return { label: "Low", color: "text-muted-foreground" };
  };

  const { label, color } = getConfidenceLevel();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Confidence Level</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  Your personal confidence in this prediction. This reflects your conviction, not the probability of success.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", color)}>{label}</span>
          <div className={cn(
            "min-w-[48px] text-center font-mono font-bold text-lg px-2 py-0.5 rounded-lg",
            value >= 80 ? "bg-gain/20 text-gain" :
            value >= 60 ? "bg-primary/20 text-primary" :
            value >= 40 ? "bg-warning/20 text-warning" :
            "bg-muted text-muted-foreground"
          )}>
            {value}%
          </div>
        </div>
      </div>
      
      <div className="relative px-1">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          max={100}
          min={10}
          step={5}
          className="py-2"
        />
        
        {/* Track markers */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">Low</span>
          <span className="text-[10px] text-muted-foreground">Medium</span>
          <span className="text-[10px] text-muted-foreground">High</span>
          <span className="text-[10px] text-muted-foreground">Very High</span>
        </div>
      </div>
    </div>
  );
}