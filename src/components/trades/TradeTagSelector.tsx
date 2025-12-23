import { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DEFAULT_TAGS = [
  'Breakout',
  'Pullback', 
  'News',
  'Range',
  'Trend',
  'Reversal',
  'Scalp',
  'Swing'
];

interface TradeTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TradeTagSelector({ selectedTags, onChange, disabled }: TradeTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
      setCustomTag('');
    }
  };

  const allTags = [...new Set([...DEFAULT_TAGS, ...selectedTags])];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Setup Tags</span>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              disabled={disabled}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                See how different trade setups perform over time based on your own tagging.
              </p>
              
              {/* Default tags */}
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                        isSelected
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom tag input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                  className="h-8 text-xs"
                />
                <Button 
                  size="sm" 
                  className="h-8"
                  onClick={addCustomTag}
                  disabled={!customTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Display selected tags */}
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="gap-1 pr-1"
            >
              {tag}
              {!disabled && (
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No tags assigned</p>
      )}
    </div>
  );
}