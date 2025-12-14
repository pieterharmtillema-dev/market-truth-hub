import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const availableTags = [
  "Breakout",
  "Earnings",
  "Macro",
  "Technical",
  "Fundamental",
  "News",
  "Momentum",
  "Reversal",
  "Support/Resistance",
  "Volume",
];

interface PredictionTagsProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function PredictionTags({ selectedTags, onChange }: PredictionTagsProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < 3) {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Optional tags (max 3)</span>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          const isDisabled = !isSelected && selectedTags.length >= 3;
          
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              disabled={isDisabled}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1",
                isSelected
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : isDisabled
                  ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tag}
              {isSelected && <X className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}