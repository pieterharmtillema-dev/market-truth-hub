import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Clock, Percent, ArrowLeft, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { CSVImporter } from "@/components/trades/CSVImporter";

const CreatePrediction = () => {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [confidence, setConfidence] = useState([70]);
  const [asset, setAsset] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [rationale, setRationale] = useState("");

  const handleSubmit = () => {
    if (!asset || !entryPrice || !targetPrice || !timeframe || !rationale) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Prediction submitted!",
      description: "Your prediction is now live on the feed",
    });
    navigate("/");
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

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Target className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
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

            {/* Asset & Prices */}
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Asset & Price Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset">Asset / Symbol</Label>
                  <Input
                    id="asset"
                    placeholder="e.g., BTC/USD, NVDA, EUR/USD"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </div>

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
                  Rationale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Explain your reasoning. What technical or fundamental factors support this prediction?"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Quality explanations help build your reputation
                </p>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button 
              size="xl" 
              className="w-full gap-2"
              onClick={handleSubmit}
            >
              <Target className="w-5 h-5" />
              Publish Prediction
            </Button>

            <p className="text-xs text-center text-muted-foreground px-4">
              Your prediction will be tracked automatically and resolved based on market data.
            </p>
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <CSVImporter onImportComplete={() => {
              toast({
                title: "Trades imported!",
                description: "View your trades in the Trade History",
              });
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CreatePrediction;
