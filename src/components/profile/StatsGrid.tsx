import { Target, TrendingUp, Award, BarChart2, Flame, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: "primary" | "gain" | "loss" | "warning" | "neutral";
}

interface StatsGridProps {
  stats: StatItem[];
}

const colorClasses = {
  primary: "text-primary bg-primary/10 border-primary/20",
  gain: "text-gain bg-gain/10 border-gain/20",
  loss: "text-loss bg-loss/10 border-loss/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  neutral: "text-muted-foreground bg-muted border-border",
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <Card key={stat.label} variant="glass" className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center border",
                colorClasses[stat.color]
              )}>
                <stat.icon className="w-4 h-4" />
              </div>
              {stat.change !== undefined && (
                <span className={cn(
                  "text-[10px] font-mono",
                  stat.change >= 0 ? "text-gain" : "text-loss"
                )}>
                  {stat.change >= 0 ? "↑" : "↓"} {Math.abs(stat.change)}%
                </span>
              )}
            </div>
            <div className="font-mono font-bold text-xl mb-0.5">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DefaultStatsGrid() {
  const stats: StatItem[] = [
    { label: "Accuracy", value: "78%", change: 2.3, icon: Target, color: "primary" },
    { label: "Win Rate", value: "65%", change: 1.2, icon: TrendingUp, color: "gain" },
    { label: "Avg Return", value: "+12.4%", change: -0.5, icon: BarChart2, color: "gain" },
    { label: "Best Streak", value: "14", icon: Flame, color: "warning" },
    { label: "Total Calls", value: "342", change: 15, icon: History, color: "neutral" },
    { label: "Rank", value: "#47", change: 8, icon: Award, color: "warning" },
  ];

  return <StatsGrid stats={stats} />;
}
