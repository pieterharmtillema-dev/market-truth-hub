import { Zap, Clock, TrendingUp, Target, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TraderCategory = "scalper" | "day_trader" | "swing_trader" | "long_term_trader";

export interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const getCategoryConfig = (category: TraderCategory): CategoryConfig => {
  const configs: Record<TraderCategory, CategoryConfig> = {
    scalper: {
      label: "Scalper",
      icon: Zap,
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-500/20",
    },
    day_trader: {
      label: "Day Trader",
      icon: Clock,
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-500/20",
    },
    swing_trader: {
      label: "Swing Trader",
      icon: TrendingUp,
      bgColor: "bg-green-500/10",
      textColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-500/20",
    },
    long_term_trader: {
      label: "Long-Term Trader",
      icon: Target,
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-500/20",
    },
  };

  return configs[category];
};

interface CategoryBadgeProps {
  category: TraderCategory;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  size = "md",
  showIcon = true,
  className
}: CategoryBadgeProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1.5 border",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
