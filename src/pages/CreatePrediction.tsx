import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Target, Clock, ArrowLeft, Sparkles, Loader2, Send, 
  Eye, AlertCircle, Shield, Radio 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPrice } from "@/lib/polygon";

import { DirectionSelector } from "@/components/predictions/DirectionSelector";
import { AssetSelector, availableAssets, type Asset } from "@/components/predictions/AssetSelector";
import { TimeframePills, getTimeframeDuration, getTimeframeLabel } from "@/components/predictions/TimeframePills";
import { ConfidenceSlider } from "@/components/predictions/ConfidenceSlider";
import { PredictionPreview } from "@/components/predictions/PredictionPreview";
import { PredictionTags } from "@/components/predictions/PredictionTags";
import { PriceInput } from "@/components/predictions/PriceInput";

const CreatePrediction = () => {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [confidence, setConfidence] = useState(70);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedAssetData, setSelectedAssetData] = useState<Asset | null>(null);
  const [entryPrice, setEntryPrice] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("1d");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [rationale, setRationale] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch live price when asset is selected
  const fetchLivePrice = useCallback(async () => {
    if (!selectedAssetData) {
      setLivePrice(null);
      setPriceChange(null);
      return;
    }

    setPriceLoading(true);
    try {
      const priceData = await getCurrentPrice(selectedAssetData.symbol, selectedAssetData.market);
      if (priceData) {
        setLivePrice(priceData.price);
        setPriceChange(priceData.changePercent);
        // Auto-fill entry price with live price
        setEntryPrice(priceData.price.toString());
      } else {
        setLivePrice(null);
        setPriceChange(null);
      }
    } catch (error) {
      console.error("Failed to fetch price:", error);
      setLivePrice(null);
      setPriceChange(null);
    } finally {
      setPriceLoading(false);
    }
  }, [selectedAssetData]);

  useEffect(() => {
    fetchLivePrice();
  }, [fetchLivePrice]);

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset.symbol);
    setSelectedAssetData(asset);
  };

  const refreshPrice = async () => {
    await fetchLivePrice();
    if (livePrice) {
      toast.success("Price updated");
    }
  };

  const entryNum = parseFloat(entryPrice) || 0;
  const targetNum = parseFloat(targetPrice) || 0;
  const percentMove = entryNum > 0 ? ((targetNum - entryNum) / entryNum) * 100 : 0;

  // Validation
  const isValidDirection = 
    (direction === "long" && targetNum > entryNum) ||
    (direction === "short" && targetNum < entryNum);

  const canSubmit = 
    selectedAsset && 
    entryNum > 0 && 
    targetNum > 0 && 
    timeframe &&
    isValidDirection;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to create predictions");
        navigate("/auth");
        return;
      }

      // Calculate expiry timestamp
      const duration = getTimeframeDuration(timeframe, customDate);
      const expiryTimestamp = timeframe === "custom" && customDate 
        ? customDate.toISOString() 
        : new Date(Date.now() + duration).toISOString();

      const { error } = await supabase.from("predictions").insert({
        user_id: user.id,
        asset: selectedAsset,
        asset_type: selectedAssetData?.assetType || "stock",
        direction,
        current_price: entryNum,
        target_price: targetNum,
        time_horizon: getTimeframeLabel(timeframe, customDate),
        timeframe_code: timeframe,
        confidence: confidence,
        rationale: rationale.trim() || null,
        tags: tags.length > 0 ? tags : null,
        status: "active",
        expiry_timestamp: expiryTimestamp,
        data_source: "polygon",
      });

      if (error) throw error;

      toast.success("Prediction published! It will be tracked automatically.");
      navigate("/profile");
    } catch (error) {
      console.error("Failed to create prediction:", error);
      toast.error("Failed to publish prediction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout showNav={false}>
      <div className="min-h-screen">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="relative px-4 pt-4 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="font-bold text-2xl gradient-text">New Prediction</h1>
                <p className="text-sm text-muted-foreground">Share your market thesis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-6">
          {/* Direction Selection */}
          <section className="animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Direction</h2>
            </div>
            <DirectionSelector value={direction} onChange={setDirection} />
          </section>

          {/* Asset Selection */}
          <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Asset</h2>
            </div>
            <AssetSelector
              selectedAsset={selectedAsset}
              onSelect={handleAssetSelect}
              livePrice={livePrice}
              priceChange={priceChange}
              priceLoading={priceLoading}
              onRefreshPrice={refreshPrice}
            />
          </section>

          {/* Price Targets */}
          {selectedAsset && (
            <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <Card className="border-0 bg-gradient-to-br from-card to-card-elevated">
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entry" className="text-sm text-muted-foreground">Entry Price</Label>
                      <PriceInput
                        id="entry"
                        value={entryPrice}
                        onChange={setEntryPrice}
                        step={livePrice && livePrice > 100 ? 1 : 0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="target" className="text-sm text-muted-foreground">Target Price</Label>
                        {livePrice && (
                          <button
                            type="button"
                            onClick={() => setTargetPrice(livePrice.toString())}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            Use current
                          </button>
                        )}
                      </div>
                      <PriceInput
                        id="target"
                        value={targetPrice}
                        onChange={setTargetPrice}
                        step={livePrice && livePrice > 100 ? 1 : 0.01}
                        className={cn(
                          targetNum > 0 && (isValidDirection 
                            ? direction === "long" ? "border-gain/50" : "border-loss/50"
                            : "border-warning/50"
                          )
                        )}
                      />
                    </div>
                  </div>

                  {/* Percent Move Display */}
                  {entryNum > 0 && targetNum > 0 && (
                    <div className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl",
                      isValidDirection
                        ? direction === "long" ? "bg-gain/10" : "bg-loss/10"
                        : "bg-warning/10"
                    )}>
                      {!isValidDirection && (
                        <AlertCircle className="w-4 h-4 text-warning" />
                      )}
                      <span className={cn(
                        "font-mono font-bold text-2xl",
                        isValidDirection
                          ? direction === "long" ? "text-gain" : "text-loss"
                          : "text-warning"
                      )}>
                        {percentMove >= 0 ? "+" : ""}{percentMove.toFixed(2)}% target
                      </span>
                    </div>
                  )}

                  {/* Warning Message */}
                  {targetNum > 0 && !isValidDirection && (
                    <p className="text-xs text-warning flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Target should be {direction === "long" ? "above" : "below"} entry for a {direction} position
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Timeframe */}
          <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Time Horizon</h2>
            </div>
            <TimeframePills 
              value={timeframe} 
              onChange={setTimeframe} 
              customDate={customDate}
              onCustomDateChange={setCustomDate}
            />
          </section>

          {/* Confidence */}
          <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Card className="border-0 bg-gradient-to-br from-card to-card-elevated">
              <CardContent className="p-5">
                <ConfidenceSlider value={confidence} onChange={setConfidence} />
              </CardContent>
            </Card>
          </section>

          {/* Rationale */}
          <section className="animate-slide-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Rationale</h2>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            <Card className="border-0 bg-gradient-to-br from-card to-card-elevated">
              <CardContent className="p-4 space-y-3">
                <Textarea
                  placeholder="Explain your thesis. What technical or fundamental factors support this prediction? Use markdown for formatting."
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={4}
                  className="resize-none bg-background/50 border-0 focus-visible:ring-1"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <PredictionTags selectedTags={tags} onChange={setTags} />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {rationale.length}/1000
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Preview */}
          {canSubmit && (
            <section className="animate-slide-up" style={{ animationDelay: "300ms" }}>
              <Button
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
                className="w-full mb-3 gap-2 text-muted-foreground"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              
              {showPreview && (
                <PredictionPreview
                  direction={direction}
                  asset={selectedAsset!}
                  entryPrice={entryNum}
                  targetPrice={targetNum}
                  timeframe={timeframe}
                  confidence={confidence}
                />
              )}
            </section>
          )}

          {/* Submit Section */}
          <section className="space-y-4 pt-2 animate-slide-up" style={{ animationDelay: "350ms" }}>
            <Button 
              size="xl" 
              className="w-full gap-2 h-14 text-lg font-semibold"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? "Publishing..." : "Publish Prediction"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Predictions are verified automatically with live market data</span>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatePrediction;