import { cn } from "@/lib/utils";

export interface TimeframeOption {
  code: string;
  label: string;
  duration: number; // in milliseconds
}

export const timeframeOptions: TimeframeOption[] = [
  { code: "1h", label: "1H", duration: 60 * 60 * 1000 },
  { code: "4h", label: "4H", duration: 4 * 60 * 60 * 1000 },
  { code: "1d", label: "1D", duration: 24 * 60 * 60 * 1000 },
  { code: "1w", label: "1W", duration: 7 * 24 * 60 * 60 * 1000 },
  { code: "1m", label: "1M", duration: 30 * 24 * 60 * 60 * 1000 },
];

interface TimeframePillsProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeframePills({ value, onChange }: TimeframePillsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {timeframeOptions.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => onChange(option.code)}
          className={cn(
            "px-4 py-2 rounded-full font-medium text-sm transition-all duration-200",
            value === option.code
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function getTimeframeDuration(code: string): number {
  const option = timeframeOptions.find((o) => o.code === code);
  return option?.duration || 24 * 60 * 60 * 1000; // Default to 1 day
}

export function getTimeframeLabel(code: string): string {
  const option = timeframeOptions.find((o) => o.code === code);
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