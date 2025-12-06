import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "./SentimentBar";
import { TrendingUp, MessageCircle, Users } from "lucide-react";

interface TrendingAsset {
  symbol: string;
  name: string;
  sentiment: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  predictions: number;
  discussions: number;
}

interface TrendingAssetsProps {
  assets: TrendingAsset[];
}

export function TrendingAssets({ assets }: TrendingAssetsProps) {
  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Trending Markets
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {assets.map((asset) => (
            <div key={asset.symbol} className="p-4 hover:bg-accent/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {asset.symbol}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{asset.name}</span>
                </div>
              </div>
              <SentimentBar {...asset.sentiment} className="mb-2" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {asset.predictions} predictions
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {asset.discussions} discussions
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
