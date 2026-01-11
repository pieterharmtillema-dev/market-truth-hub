import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Time horizon types
export type TimeHorizon = 'short' | 'mid' | 'long';

interface SentimentData {
  bullishPct: number;
  bearishPct: number;
}

interface HorizonScopedSentiment {
  short?: SentimentData;
  mid?: SentimentData;
  long?: SentimentData;
}

interface HorizonScopedData {
  crowdSentiment?: HorizonScopedSentiment;
  weightedSentiment?: HorizonScopedSentiment;
  predictions?: {
    short?: number;
    mid?: number;
    long?: number;
  };
  numericPredictions?: {
    short?: Array<{ targetPrice: number; currentPrice: number }>;
    mid?: Array<{ targetPrice: number; currentPrice: number }>;
    long?: Array<{ targetPrice: number; currentPrice: number }>;
  };
}

interface TrendingAsset {
  symbol: string;
  name: string;
  assetType?: 'crypto' | 'stock' | 'etf' | 'forex' | 'commodity';

  // Legacy format (no horizon scope)
  crowdSentiment?: SentimentData;
  weightedSentiment?: SentimentData;
  predictions?: number;
  discussions: number;
  confidence?: 'high' | 'medium' | 'low';
  numericPredictions?: Array<{ targetPrice: number; currentPrice: number }>;

  // Horizon-scoped format (new)
  horizonData?: HorizonScopedData;
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
 * Extract horizon-specific data from asset
 * Falls back to legacy format if horizon data not available
 */
function getHorizonData(asset: TrendingAsset, horizon: TimeHorizon): {
  crowdSentiment: SentimentData;
  weightedSentiment: SentimentData;
  predictions: number;
  numericPredictions?: Array<{ targetPrice: number; currentPrice: number }>;
} {
  // Try horizon-scoped data first
  if (asset.horizonData) {
    const crowdSentiment = asset.horizonData.crowdSentiment?.[horizon];
    const weightedSentiment = asset.horizonData.weightedSentiment?.[horizon];
    const predictions = asset.horizonData.predictions?.[horizon];
    const numericPredictions = asset.horizonData.numericPredictions?.[horizon];

    if (crowdSentiment) {
      return {
        crowdSentiment,
        weightedSentiment: weightedSentiment || crowdSentiment,
        predictions: predictions || 0,
        numericPredictions,
      };
    }
  }

  // Fallback to legacy format
  return {
    crowdSentiment: asset.crowdSentiment || { bullishPct: 0, bearishPct: 0 },
    weightedSentiment: asset.weightedSentiment || asset.crowdSentiment || { bullishPct: 0, bearishPct: 0 },
    predictions: asset.predictions || 0,
    numericPredictions: asset.numericPredictions,
  };
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

/**
 * Time Horizon Selector Component
 */
function TimeHorizonSelector({
  selected,
  onChange,
}: {
  selected: TimeHorizon;
  onChange: (horizon: TimeHorizon) => void;
}) {
  const horizons: Array<{ value: TimeHorizon; label: string }> = [
    { value: 'short', label: '1–7d' },
    { value: 'mid', label: '1–3m' },
    { value: 'long', label: '6–12m' },
  ];

  return (
    <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
      {horizons.map((horizon) => (
        <Button
          key={horizon.value}
          size="sm"
          variant="ghost"
          onClick={() => onChange(horizon.value)}
          aria-selected={selected === horizon.value}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-all",
            selected === horizon.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {horizon.label}
        </Button>
      ))}
    </div>
  );
}

export function TrendingAssets({ assets }: TrendingAssetsProps) {
  // State: selected time horizon (default = mid-term)
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>('mid');

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Trending Markets
          </CardTitle>
          <TimeHorizonSelector
            selected={selectedHorizon}
            onChange={setSelectedHorizon}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {assets.map((asset) => {
            // Extract horizon-specific data
            const horizonData = getHorizonData(asset, selectedHorizon);

            const consensus = computeConsensusLabel({
              numericPredictions: horizonData.numericPredictions,
              crowdBullishPct: horizonData.crowdSentiment.bullishPct,
              crowdBearishPct: horizonData.crowdSentiment.bearishPct,
              predictionsCount: horizonData.predictions,
              assetType: asset.assetType,
            });

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
                  bullishPct={horizonData.crowdSentiment.bullishPct}
                  bearishPct={horizonData.crowdSentiment.bearishPct}
                />

                {/* Weighted Sentiment row */}
                <div className="mt-1.5">
                  <SentimentRow
                    label="Weighted Sentiment"
                    bullishPct={horizonData.weightedSentiment.bullishPct}
                    bearishPct={horizonData.weightedSentiment.bearishPct}
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
                  <span>{horizonData.predictions} predictions</span>
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
