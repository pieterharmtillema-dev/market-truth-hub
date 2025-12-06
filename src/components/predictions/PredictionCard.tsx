import { TrendingUp, TrendingDown, Clock, Target, BarChart2, MessageCircle, Heart, Share2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface PredictionData {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
    accuracy: number;
    isVerified?: boolean;
  };
  asset: string;
  assetType: "crypto" | "stock" | "forex" | "futures";
  direction: "long" | "short";
  currentPrice: number;
  targetPrice: number;
  timeHorizon: string;
  confidence: number;
  rationale: string;
  status: "active" | "success" | "fail" | "neutral";
  likes: number;
  comments: number;
  createdAt: string;
}

interface PredictionCardProps {
  prediction: PredictionData;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function PredictionCard({ prediction, onLike, onComment, onShare }: PredictionCardProps) {
  const isLong = prediction.direction === "long";
  const priceChange = ((prediction.targetPrice - prediction.currentPrice) / prediction.currentPrice) * 100;
  
  const statusColors = {
    active: "neutral",
    success: "gain",
    fail: "loss",
    neutral: "neutral",
  } as const;

  return (
    <Card 
      variant={prediction.status === "active" ? "prediction" : prediction.status === "success" ? "gain" : prediction.status === "fail" ? "loss" : "default"}
      className="animate-fade-in"
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={prediction.user.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {prediction.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{prediction.user.name}</span>
                {prediction.user.isVerified && (
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{prediction.user.username}</span>
                <span>•</span>
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  {prediction.user.accuracy}% acc
                </Badge>
              </div>
            </div>
          </div>
          <Badge variant={statusColors[prediction.status]}>
            {prediction.status === "active" ? "Active" : prediction.status === "success" ? "Hit ✓" : prediction.status === "fail" ? "Missed" : "Neutral"}
          </Badge>
        </div>

        {/* Prediction Details */}
        <div className="bg-background/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {prediction.asset}
              </Badge>
              <Badge variant={isLong ? "gain" : "loss"} className="gap-1">
                {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isLong ? "Long" : "Short"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {prediction.timeHorizon}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</div>
              <div className="font-mono font-medium text-sm">${prediction.currentPrice.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</div>
              <div className={cn(
                "font-mono font-medium text-sm",
                isLong ? "text-gain" : "text-loss"
              )}>
                ${prediction.targetPrice.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Expected</div>
              <div className={cn(
                "font-mono font-medium text-sm",
                priceChange > 0 ? "text-gain" : "text-loss"
              )}>
                {priceChange > 0 ? "+" : ""}{priceChange.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Confidence</span>
              <span className="font-mono">{prediction.confidence}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rationale */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {prediction.rationale}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-loss" onClick={onLike}>
              <Heart className="w-4 h-4" />
              <span className="text-xs">{prediction.likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onComment}>
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{prediction.comments}</span>
            </Button>
          </div>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
