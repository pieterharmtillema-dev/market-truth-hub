import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SentimentData {
  bullishPct: number;
  bearishPct: number;
}

interface TrendingAsset {
  symbol: string;
  name: string;
  assetType?: 'crypto' | 'stock' | 'etf' | 'forex' | 'commodity';
  crowdSentiment: SentimentData;
  weightedSentiment?: SentimentData; // Optional, falls back to crowd if missing
  predictions: number;
  discussions: number;
  confidence?: 'high' | 'medium' | 'low';
  numericPredictions?: Array<{ targetPrice: number; currentPrice: number }>;
}

interface TrendingAssetsProps {
  assets: TrendingAsset[];
}

/**
 * Build stacked bar percentages ensuring they sum to 100%
 * Handles edge cases: undefined, NaN, overflow
 */
function buildStackedPercents(bullishPct: number, bearishPct: number): {
  bullish: number;
  neutral: number;
  bearish: number;
} {
  // Clamp inputs to [0, 100]
  const bullish = Math.max(0, Math.min(100, bullishPct || 0));
  const bearish = Math.max(0, Math.min(100, bearishPct || 0));

  // If sum > 100, scale down proportionally
  if (bullish + bearish > 100) {
    const total = bullish + bearish;
    const scale = 100 / total;
    return {
      bullish: Math.round(bullish * scale),
      bearish: Math.round(bearish * scale),
      neutral: 0,
    };
  }

  // Otherwise, neutral fills the gap
  const neutral = Math.max(0, 100 - bullish - bearish);

  return { bullish, neutral, bearish };
}

/**
 * Compute consensus label based on prediction dispersion or sentiment spread
 *
 * @returns { label: 'Tight' | 'Moderate' | 'Split', isLowData: boolean }
 */
function computeConsensusLabel({
  numericPredictions,
  crowdBullishPct,
  crowdBearishPct,
  predictionsCount,
  assetType,
}: {
  numericPredictions?: Array<{ targetPrice: number; currentPrice: number }>;
  crowdBullishPct: number;
  crowdBearishPct: number;
  predictionsCount: number;
  assetType?: string;
}): { label: 'Tight' | 'Moderate' | 'Split'; isLowData: boolean } {
  let consensusScore = 0;

  // Method 1: Use numeric predictions if available
  if (numericPredictions && numericPredictions.length > 0) {
    const expectedMoves = numericPredictions.map(p =>
      (p.targetPrice - p.currentPrice) / p.currentPrice
    ).filter(move => !isNaN(move) && isFinite(move));

    if (expectedMoves.length >= 2) {
      // Calculate standard deviation
      const mean = expectedMoves.reduce((a, b) => a + b, 0) / expectedMoves.length;
      const squaredDiffs = expectedMoves.map(x => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / expectedMoves.length;
      const stdDev = Math.sqrt(variance);

      // Determine max expected move based on asset type
      const maxExpectedMove =
        assetType === 'crypto' ? 0.30 :
        (assetType === 'stock' || assetType === 'etf') ? 0.15 :
        0.20; // Default for forex/commodity

      // Dispersion score: higher stdDev = more dispersed
      const dispersionScore = Math.min(1, stdDev / maxExpectedMove);
      consensusScore = 1 - dispersionScore;
    }
  }

  // Method 2: Fallback to sentiment spread
  if (consensusScore === 0) {
    const bullish = Math.max(0, Math.min(100, crowdBullishPct || 0));
    const bearish = Math.max(0, Math.min(100, crowdBearishPct || 0));
    consensusScore = Math.abs(bullish - bearish) / 100;
  }

  // Map to label
  let label: 'Tight' | 'Moderate' | 'Split';
  if (consensusScore >= 0.75) {
    label = 'Tight';
  } else if (consensusScore >= 0.50) {
    label = 'Moderate';
  } else {
    label = 'Split';
  }

  const isLowData = predictionsCount < 10;

  return { label, isLowData };
}

/**
 * Render a single sentiment row with stacked bar and text
 */
function SentimentRow({
  label,
  bullishPct,
  bearishPct
}: {
  label: string;
  bullishPct: number;
  bearishPct: number;
}) {
  const percents = buildStackedPercents(bullishPct, bearishPct);

  return (
    <div className="flex items-center gap-2">
      {/* Label */}
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0">
        {label}
      </span>

      {/* Stacked bar */}
      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted">
        {percents.bullish > 0 && (
          <div
            className="bg-gain transition-all duration-500"
            style={{ width: `${percents.bullish}%` }}
          />
        )}
        {percents.neutral > 0 && (
          <div
            className="bg-muted-foreground/20 transition-all duration-500"
            style={{ width: `${percents.neutral}%` }}
          />
        )}
        {percents.bearish > 0 && (
          <div
            className="bg-loss transition-all duration-500"
            style={{ width: `${percents.bearish}%` }}
          />
        )}
      </div>

      {/* Text */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        <span className="text-gain font-medium">{percents.bullish}%</span> Bullish •{' '}
        <span className="text-loss font-medium">{percents.bearish}%</span> Bearish
      </span>
    </div>
  );
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
          {assets.map((asset) => {
            const consensus = computeConsensusLabel({
              numericPredictions: asset.numericPredictions,
              crowdBullishPct: asset.crowdSentiment.bullishPct,
              crowdBearishPct: asset.crowdSentiment.bearishPct,
              predictionsCount: asset.predictions,
              assetType: asset.assetType,
            });

            // Use weighted sentiment if available, otherwise fall back to crowd
            const weightedSentiment = asset.weightedSentiment || asset.crowdSentiment;

            return (
              <div
                key={asset.symbol}
                className="p-3 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                {/* Title row with confidence badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs px-1.5 py-0.5">
                      {asset.symbol}
                    </Badge>
                    <span className="text-sm font-medium">{asset.name}</span>
                  </div>
                  {asset.confidence === 'high' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      High Confidence
                    </Badge>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-border/30 mb-2" />

                {/* Crowd Sentiment row */}
                <SentimentRow
                  label="Crowd Sentiment"
                  bullishPct={asset.crowdSentiment.bullishPct}
                  bearishPct={asset.crowdSentiment.bearishPct}
                />

                {/* Weighted Sentiment row */}
                <div className="mt-1.5">
                  <SentimentRow
                    label="Weighted Sentiment"
                    bullishPct={weightedSentiment.bullishPct}
                    bearishPct={weightedSentiment.bearishPct}
                  />
                </div>

                {/* Meta row: Consensus + Chevron */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    Consensus: <span className="font-medium">{consensus.label}</span>
                    {consensus.isLowData && (
                      <span className="text-muted-foreground/60 ml-1">(Low data)</span>
                    )}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>

                {/* Counts row */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <span>{asset.predictions} predictions</span>
                  <span>•</span>
                  <span>{asset.discussions} discussions</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
