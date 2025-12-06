import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SentimentBar } from "@/components/feed/SentimentBar";
import { LiveChart } from "@/components/charts/LiveChart";
import { MiniChart } from "@/components/charts/MiniChart";
import { RealtimePriceDisplay } from "@/components/charts/RealtimePriceDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sentiment: { bullish: number; bearish: number; neutral: number };
  predictions: number;
  accuracy: number;
  market: "stocks" | "crypto" | "forex";
}

const marketData: MarketItem[] = [
  // Stocks
  { symbol: "AAPL", name: "Apple Inc", price: 278.78, change: 0.87, sentiment: { bullish: 52, bearish: 33, neutral: 15 }, predictions: 78, accuracy: 71, market: "stocks" },
  { symbol: "NVDA", name: "NVIDIA", price: 182.41, change: 3.21, sentiment: { bullish: 75, bearish: 15, neutral: 10 }, predictions: 89, accuracy: 74, market: "stocks" },
  { symbol: "TSLA", name: "Tesla", price: 245.67, change: -1.23, sentiment: { bullish: 48, bearish: 42, neutral: 10 }, predictions: 134, accuracy: 58, market: "stocks" },
  { symbol: "MSFT", name: "Microsoft", price: 378.45, change: 1.12, sentiment: { bullish: 65, bearish: 20, neutral: 15 }, predictions: 92, accuracy: 72, market: "stocks" },
  { symbol: "GOOGL", name: "Alphabet", price: 141.23, change: 0.45, sentiment: { bullish: 58, bearish: 28, neutral: 14 }, predictions: 67, accuracy: 68, market: "stocks" },
  { symbol: "AMZN", name: "Amazon", price: 178.92, change: 2.15, sentiment: { bullish: 62, bearish: 25, neutral: 13 }, predictions: 85, accuracy: 70, market: "stocks" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", price: 89345.29, change: 2.34, sentiment: { bullish: 68, bearish: 22, neutral: 10 }, predictions: 156, accuracy: 72, market: "crypto" },
  { symbol: "ETH", name: "Ethereum", price: 3022.61, change: 1.89, sentiment: { bullish: 55, bearish: 30, neutral: 15 }, predictions: 112, accuracy: 68, market: "crypto" },
  // Forex
  { symbol: "EUR/USD", name: "Euro/US Dollar", price: 1.0542, change: 0.12, sentiment: { bullish: 45, bearish: 40, neutral: 15 }, predictions: 67, accuracy: 65, market: "forex" },
  { symbol: "GBP/USD", name: "British Pound/USD", price: 1.2734, change: -0.08, sentiment: { bullish: 42, bearish: 45, neutral: 13 }, predictions: 54, accuracy: 62, market: "forex" },
  { symbol: "USD/JPY", name: "US Dollar/Yen", price: 149.85, change: 0.35, sentiment: { bullish: 55, bearish: 32, neutral: 13 }, predictions: 78, accuracy: 68, market: "forex" },
  { symbol: "AUD/USD", name: "Australian Dollar/USD", price: 0.6523, change: -0.15, sentiment: { bullish: 38, bearish: 48, neutral: 14 }, predictions: 45, accuracy: 60, market: "forex" },
  { symbol: "USD/CAD", name: "US Dollar/CAD", price: 1.4012, change: 0.22, sentiment: { bullish: 52, bearish: 35, neutral: 13 }, predictions: 52, accuracy: 64, market: "forex" },
  { symbol: "EUR/GBP", name: "Euro/British Pound", price: 0.8278, change: 0.05, sentiment: { bullish: 48, bearish: 38, neutral: 14 }, predictions: 38, accuracy: 61, market: "forex" },
];

const Markets = () => {
  const [selectedAsset, setSelectedAsset] = useState<MarketItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarkets = (filter: string) => {
    let data = marketData;
    if (filter !== "all") {
      data = data.filter(m => m.market === filter);
    }
    if (searchQuery) {
      data = data.filter(m => 
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return data;
  };

  const MarketCard = ({ market }: { market: MarketItem }) => (
    <Card 
      variant="interactive" 
      className={cn(
        "animate-fade-in cursor-pointer transition-all",
        selectedAsset?.symbol === market.symbol && "ring-2 ring-primary"
      )}
      onClick={() => setSelectedAsset(market)}
    >
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
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <RealtimePriceDisplay 
              symbol={market.symbol}
              initialPrice={market.price}
              initialChange={market.change}
              market={market.market}
              showLiveIndicator={false}
            />
            <MiniChart 
              symbol={market.symbol} 
              market={market.market} 
              height={40} 
              className="w-20"
              lazyLoad={true}
            />
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
          <ChevronRight className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="Markets">
      <div className="px-4 py-4 space-y-4">
        {/* Featured Chart */}
        {selectedAsset ? (
          <LiveChart 
            symbol={selectedAsset.symbol} 
            name={selectedAsset.name}
            market={selectedAsset.market}
          />
        ) : (
          <LiveChart symbol="AAPL" name="Apple Inc" market="stocks" />
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search markets..." 
            className="pl-10 bg-card border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Market Type Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-card border border-border overflow-x-auto">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              All
            </TabsTrigger>
            <TabsTrigger value="stocks" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Stocks
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Crypto
            </TabsTrigger>
            <TabsTrigger value="forex" className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Forex
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-3">
            {filteredMarkets("all").map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </TabsContent>

          <TabsContent value="stocks" className="mt-4 space-y-3">
            {filteredMarkets("stocks").map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </TabsContent>

          <TabsContent value="crypto" className="mt-4 space-y-3">
            {filteredMarkets("crypto").map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </TabsContent>

          <TabsContent value="forex" className="mt-4 space-y-3">
            {filteredMarkets("forex").map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Markets;
