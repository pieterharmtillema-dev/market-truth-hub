import { Badge } from "@/components/ui/badge";
import { Circle, Target, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type PredictionStatus = "active" | "hit" | "missed" | "expired";

interface PredictionStatusBadgeProps {
  status: PredictionStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<PredictionStatus, {
  label: string;
  variant: "default" | "gain" | "loss" | "secondary";
  icon: typeof Circle;
  className: string;
}> = {
  active: {
    label: "Active",
    variant: "default",
    icon: Circle,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  hit: {
    label: "Hit",
    variant: "gain",
    icon: Target,
    className: "border-gain/30 bg-gain/10 text-gain",
  },
  missed: {
    label: "Missed",
    variant: "loss",
    icon: X,
    className: "border-loss/30 bg-loss/10 text-loss",
  },
  expired: {
    label: "Expired",
    variant: "secondary",
    icon: Clock,
    className: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
  },
};

export function PredictionStatusBadge({ 
  status, 
  size = "md",
  showIcon = true 
}: PredictionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        "gap-1.5 border font-medium",
        config.className,
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "md" && "text-xs px-2.5 py-0.5",
        size === "lg" && "text-sm px-3 py-1"
      )}
    >
      {showIcon && (
        <Icon className={cn(
          status === "active" && "animate-pulse",
          size === "sm" && "w-2.5 h-2.5",
          size === "md" && "w-3 h-3",
          size === "lg" && "w-4 h-4"
        )} />
      )}
      {config.label}
    </Badge>
  );
}