import { cn } from "@/lib/utils";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";

export interface TimeframeOption {
  code: string;
  label: string;
  duration: number; // in milliseconds
}

// All timeframe options
export const allTimeframeOptions: TimeframeOption[] = [
  { code: "1h", label: "1H", duration: 60 * 60 * 1000 },
  { code: "4h", label: "4H", duration: 4 * 60 * 60 * 1000 },
  { code: "1d", label: "1D", duration: 24 * 60 * 60 * 1000 },
  { code: "1w", label: "1W", duration: 7 * 24 * 60 * 60 * 1000 },
  { code: "1m", label: "1M", duration: 30 * 24 * 60 * 60 * 1000 },
];

// Long-term options (1 day minimum) for regular users
export const longTermTimeframeOptions: TimeframeOption[] = [
  { code: "1d", label: "1D", duration: 24 * 60 * 60 * 1000 },
  { code: "1w", label: "1W", duration: 7 * 24 * 60 * 60 * 1000 },
  { code: "1m", label: "1M", duration: 30 * 24 * 60 * 60 * 1000 },
];

// Legacy export for backward compatibility
export const timeframeOptions = allTimeframeOptions;

interface TimeframePillsProps {
  value: string;
  onChange: (value: string) => void;
  onCustomDateChange?: (date: Date | undefined) => void;
  customDate?: Date | undefined;
  isAdmin?: boolean; // Admin can use all timeframes
}

export function TimeframePills({ value, onChange, onCustomDateChange, customDate, isAdmin = false }: TimeframePillsProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const isCustom = value === "custom";
  
  // Use all options for admin, long-term only for regular users
  const availableOptions = isAdmin ? allTimeframeOptions : longTermTimeframeOptions;

  // Minimum date for custom selection (tomorrow for non-admins)
  const minDate = isAdmin ? new Date() : addDays(new Date(), 1);

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      onCustomDateChange?.(date);
      onChange("custom");
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
      {availableOptions.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => onChange(option.code)}
          className={cn(
            "px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200",
            value === option.code
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
      
      {/* Custom option with calendar */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200 flex items-center gap-1 sm:gap-1.5",
              isCustom
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {isCustom && customDate ? format(customDate, "MMM d") : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={customDate}
            onSelect={handleCustomDateSelect}
            disabled={(date) => date < minDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function getTimeframeDuration(code: string, customDate?: Date): number {
  if (code === "custom" && customDate) {
    return customDate.getTime() - Date.now();
  }
  const option = allTimeframeOptions.find((o) => o.code === code);
  return option?.duration || 24 * 60 * 60 * 1000; // Default to 1 day
}

export function getTimeframeLabel(code: string, customDate?: Date): string {
  if (code === "custom" && customDate) {
    return `Until ${format(customDate, "MMM d, yyyy")}`;
  }
  const option = allTimeframeOptions.find((o) => o.code === code);
  if (!option) return code;
  
  switch (option.code) {
    case "1h": return "1 Hour";
    case "4h": return "4 Hours";
    case "1d": return "1 Day";
    case "1w": return "1 Week";
    case "1m": return "1 Month";
    default: return option.label;
  }
}