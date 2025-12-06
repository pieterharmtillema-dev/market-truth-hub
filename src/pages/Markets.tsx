import { AppLayout } from "@/components/layout/AppLayout";
import { SentimentBar } from "@/components/feed/SentimentBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, MessageCircle, Target, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const marketData = [
  { symbol: "BTC", name: "Bitcoin", price: 67523.45, change: 2.34, sentiment: { bullish: 68, bearish: 22, neutral: 10 }, predictions: 156, accuracy: 72 },
  { symbol: "ETH", name: "Ethereum", price: 3456.78, change: 1.89, sentiment: { bullish: 55, bearish: 30, neutral: 15 }, predictions: 112, accuracy: 68 },
  { symbol: "NVDA", name: "NVIDIA", price: 142.56, change: 3.21, sentiment: { bullish: 75, bearish: 15, neutral: 10 }, predictions: 89, accuracy: 74 },
  { symbol: "SPY", name: "S&P 500 ETF", price: 512.34, change: -0.45, sentiment: { bullish: 45, bearish: 40, neutral: 15 }, predictions: 67, accuracy: 65 },
  { symbol: "AAPL", name: "Apple Inc", price: 189.23, change: 0.87, sentiment: { bullish: 52, bearish: 33, neutral: 15 }, predictions: 78, accuracy: 71 },
  { symbol: "TSLA", name: "Tesla", price: 245.67, change: -1.23, sentiment: { bullish: 48, bearish: 42, neutral: 10 }, predictions: 134, accuracy: 58 },
  { symbol: "EUR/USD", name: "Euro/Dollar", price: 1.0875, change: -0.23, sentiment: { bullish: 38, bearish: 52, neutral: 10 }, predictions: 45, accuracy: 63 },
  { symbol: "GOLD", name: "Gold Futures", price: 2345.67, change: 0.56, sentiment: { bullish: 62, bearish: 28, neutral: 10 }, predictions: 34, accuracy: 69 },
];

const Markets = () => {
  return (
    <AppLayout title="Markets">
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search markets..." 
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Market Type Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-card border border-border overflow-x-auto">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              All
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Crypto
            </TabsTrigger>
            <TabsTrigger value="stocks" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Stocks
            </TabsTrigger>
            <TabsTrigger value="forex" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Forex
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {marketData.map((market) => (
              <Card key={market.symbol} variant="interactive" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-sm">{market.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{market.symbol}</span>
                          <Badge variant="outline" className="text-[10px]">{market.name}</Badge>
                        </div>
                        <div className="font-mono text-lg font-semibold">
                          ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 font-mono text-sm font-medium",
                      market.change >= 0 ? "text-gain" : "text-loss"
                    )}>
                      {market.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {market.change >= 0 ? "+" : ""}{market.change.toFixed(2)}%
                    </div>
                  </div>

                  <SentimentBar {...market.sentiment} className="mb-3" />

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {market.predictions} predictions
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {market.accuracy}% avg accuracy
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">View →</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="crypto" className="mt-4 space-y-3">
            {marketData.filter(m => ["BTC", "ETH"].includes(m.symbol)).map((market) => (
              <Card key={market.symbol} variant="interactive" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-sm">{market.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">{market.symbol}</span>
                        <div className="font-mono text-lg font-semibold">
                          ${market.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={cn("font-mono", market.change >= 0 ? "text-gain" : "text-loss")}>
                      {market.change >= 0 ? "+" : ""}{market.change}%
                    </span>
                  </div>
                  <SentimentBar {...market.sentiment} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stocks" className="mt-4 space-y-3">
            {marketData.filter(m => ["NVDA", "SPY", "AAPL", "TSLA"].includes(m.symbol)).map((market) => (
              <Card key={market.symbol} variant="interactive" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-sm">{market.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">{market.symbol}</span>
                        <div className="font-mono text-lg font-semibold">
                          ${market.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={cn("font-mono", market.change >= 0 ? "text-gain" : "text-loss")}>
                      {market.change >= 0 ? "+" : ""}{market.change}%
                    </span>
                  </div>
                  <SentimentBar {...market.sentiment} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="forex" className="mt-4 space-y-3">
            {marketData.filter(m => ["EUR/USD", "GOLD"].includes(m.symbol)).map((market) => (
              <Card key={market.symbol} variant="interactive" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-primary text-sm">{market.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <span className="font-medium">{market.symbol}</span>
                        <div className="font-mono text-lg font-semibold">
                          ${market.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={cn("font-mono", market.change >= 0 ? "text-gain" : "text-loss")}>
                      {market.change >= 0 ? "+" : ""}{market.change}%
                    </span>
                  </div>
                  <SentimentBar {...market.sentiment} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Markets;
