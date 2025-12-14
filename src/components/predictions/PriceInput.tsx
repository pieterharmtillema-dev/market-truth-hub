import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  step?: number;
}

export const PriceInput = ({
  id,
  value,
  onChange,
  placeholder = "0.00",
  className,
  step = 0.01,
}: PriceInputProps) => {
  const numValue = parseFloat(value) || 0;

  const increment = () => {
    const newValue = Math.max(0, numValue + step);
    onChange(newValue.toFixed(step < 1 ? 2 : 0));
  };

  const decrement = () => {
    const newValue = Math.max(0, numValue - step);
    onChange(newValue.toFixed(step < 1 ? 2 : 0));
  };

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono z-10">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "" || /^\d*\.?\d*$/.test(val)) {
            onChange(val);
          }
        }}
        className={cn(
          "flex h-12 w-full rounded-lg border border-input bg-background/50 pl-7 pr-10 py-2 text-lg font-mono",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={increment}
          className={cn(
            "flex items-center justify-center w-7 h-5 rounded-md",
            "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
            "transition-colors duration-150",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={decrement}
          className={cn(
            "flex items-center justify-center w-7 h-5 rounded-md",
            "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
            "transition-colors duration-150",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
