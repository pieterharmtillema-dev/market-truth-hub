import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Target, Clock, Percent, ArrowLeft, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPrice } from "@/lib/polygon";

// Available assets for prediction
const availableAssets = [
  { symbol: "BTC", name: "Bitcoin", market: "crypto" as const, assetType: "crypto" },
  { symbol: "ETH", name: "Ethereum", market: "crypto" as const, assetType: "crypto" },
  { symbol: "SOL", name: "Solana", market: "crypto" as const, assetType: "crypto" },
  { symbol: "NVDA", name: "NVIDIA", market: "stocks" as const, assetType: "stock" },
  { symbol: "AAPL", name: "Apple", market: "stocks" as const, assetType: "stock" },
  { symbol: "SPY", name: "S&P 500 ETF", market: "stocks" as const, assetType: "stock" },
  { symbol: "TSLA", name: "Tesla", market: "stocks" as const, assetType: "stock" },
  { symbol: "GOOGL", name: "Google", market: "stocks" as const, assetType: "stock" },
  { symbol: "MSFT", name: "Microsoft", market: "stocks" as const, assetType: "stock" },
  { symbol: "AMZN", name: "Amazon", market: "stocks" as const, assetType: "stock" },
  { symbol: "EUR/USD", name: "Euro/US Dollar", market: "forex" as const, assetType: "forex" },
  { symbol: "GBP/USD", name: "British Pound/US Dollar", market: "forex" as const, assetType: "forex" },
  { symbol: "GOLD", name: "Gold", market: "stocks" as const, assetType: "commodity" },
];

const timeframeLabels: Record<string, string> = {
  "1d": "1 Day",
  "3d": "3 Days",
  "1w": "1 Week",
  "2w": "2 Weeks",
  "1m": "1 Month",
  "3m": "3 Months",
};

const CreatePrediction = () => {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [confidence, setConfidence] = useState([70]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [rationale, setRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAssetData = availableAssets.find(a => a.symbol === selectedAsset);

  // Fetch live price when asset is selected
  useEffect(() => {
    const fetchLivePrice = async () => {
      if (!selectedAssetData) {
        setLivePrice(null);
        return;
      }

      setPriceLoading(true);
      try {
        const priceData = await getCurrentPrice(selectedAssetData.symbol, selectedAssetData.market);
        if (priceData) {
          setLivePrice(priceData.price);
          // Auto-fill entry price with live price
          setEntryPrice(priceData.price.toString());
        } else {
          setLivePrice(null);
        }
      } catch (error) {
        console.error("Failed to fetch price:", error);
        setLivePrice(null);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchLivePrice();
  }, [selectedAsset, selectedAssetData]);

  const refreshPrice = async () => {
    if (!selectedAssetData) return;
    
    setPriceLoading(true);
    try {
      const priceData = await getCurrentPrice(selectedAssetData.symbol, selectedAssetData.market);
      if (priceData) {
        setLivePrice(priceData.price);
        setEntryPrice(priceData.price.toString());
        toast.success("Price updated");
      }
    } catch (error) {
      toast.error("Failed to refresh price");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAsset || !entryPrice || !targetPrice || !timeframe) {
      toast.error("Please fill in all required fields");
      return;
    }

    const entryNum = parseFloat(entryPrice);
    const targetNum = parseFloat(targetPrice);

    if (isNaN(entryNum) || isNaN(targetNum) || entryNum <= 0 || targetNum <= 0) {
      toast.error("Please enter valid prices");
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

      const { error } = await supabase.from("predictions").insert({
        user_id: user.id,
        asset: selectedAsset,
        asset_type: selectedAssetData?.assetType || "stock",
        direction,
        current_price: entryNum,
        target_price: targetNum,
        time_horizon: timeframeLabels[timeframe] || timeframe,
        confidence: confidence[0],
        rationale: rationale.trim() || null,
        status: "active",
      });

      if (error) throw error;

      toast.success("Prediction published!");
      navigate("/profile");
    } catch (error) {
      console.error("Failed to create prediction:", error);
      toast.error("Failed to publish prediction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const entryNum = parseFloat(entryPrice) || 0;
  const targetNum = parseFloat(targetPrice) || 0;
  const expectedReturn = entryNum > 0 ? ((targetNum - entryNum) / entryNum) * 100 : 0;

  return (
    <AppLayout showNav={false}>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">New Prediction</h1>
            <p className="text-sm text-muted-foreground">Share your market call</p>
          </div>
        </div>

        {/* Direction Selection */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Direction
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button
              variant={direction === "long" ? "gain" : "outline"}
              size="lg"
              onClick={() => setDirection("long")}
              className="gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Long / Bullish
            </Button>
            <Button
              variant={direction === "short" ? "loss" : "outline"}
              size="lg"
              onClick={() => setDirection("short")}
              className="gap-2"
            >
              <TrendingDown className="w-5 h-5" />
              Short / Bearish
            </Button>
          </CardContent>
        </Card>

        {/* Asset Selection */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset & Price Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset / Symbol</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      <span className="font-mono font-medium">{asset.symbol}</span>
                      <span className="text-muted-foreground ml-2">- {asset.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live Price Display */}
            {selectedAsset && (
              <div className="bg-background/50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Live Price</span>
                  <div className="font-mono font-bold text-lg">
                    {priceLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : livePrice ? (
                      `$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      "N/A"
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={refreshPrice}
                  disabled={priceLoading || !selectedAsset}
                >
                  <RefreshCw className={cn("w-4 h-4", priceLoading && "animate-spin")} />
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entry">Entry Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="entry"
                    type="number"
                    placeholder="0.00"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="pl-7 font-mono"
                  />
                </div>
                {livePrice && entryPrice && parseFloat(entryPrice) !== livePrice && (
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(entryPrice) > livePrice ? "Above" : "Below"} live price
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="target"
                    type="number"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="pl-7 font-mono"
                  />
                </div>
              </div>
            </div>

            {entryNum > 0 && targetNum > 0 && (
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <span className="text-xs text-muted-foreground">Expected Return</span>
                <div className={cn(
                  "font-mono font-bold text-2xl",
                  expectedReturn >= 0 ? "text-gain" : "text-loss"
                )}>
                  {expectedReturn >= 0 ? "+" : ""}{expectedReturn.toFixed(2)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time & Confidence */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Timeframe & Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Time Horizon</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="1w">1 Week</SelectItem>
                  <SelectItem value="2w">2 Weeks</SelectItem>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Confidence Level
                </Label>
                <Badge variant={confidence[0] >= 70 ? "success" : confidence[0] >= 50 ? "warning" : "secondary"}>
                  {confidence[0]}%
                </Badge>
              </div>
              <Slider
                value={confidence}
                onValueChange={setConfidence}
                max={100}
                min={10}
                step={5}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rationale */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Rationale (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Explain your reasoning. What technical or fundamental factors support this prediction?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Quality explanations help build your reputation ({rationale.length}/1000)
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button 
          size="xl" 
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedAsset || !entryPrice || !targetPrice || !timeframe}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Target className="w-5 h-5" />
          )}
          {isSubmitting ? "Publishing..." : "Publish Prediction"}
        </Button>

        <p className="text-xs text-center text-muted-foreground px-4">
          Your prediction will be tracked automatically and resolved based on market data.
        </p>
      </div>
    </AppLayout>
  );
};

export default CreatePrediction;
