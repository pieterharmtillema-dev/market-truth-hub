import { AppLayout } from "@/components/layout/AppLayout";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { TrendingAssets } from "@/components/feed/TrendingAssets";
import { MarketTicker } from "@/components/feed/MarketTicker";
import { mockPredictions, mockTrendingAssets, mockTickerData } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Clock, Target, Users } from "lucide-react";

const Index = () => {
  return (
    <AppLayout>
      {/* Market Ticker */}
      <MarketTicker items={mockTickerData} />

      <div className="px-4 py-4 space-y-4">
        {/* Trending Assets */}
        <TrendingAssets assets={mockTrendingAssets} />

        {/* Feed Tabs */}
        <Tabs defaultValue="hot" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="hot" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Flame className="w-4 h-4" />
              Hot
            </TabsTrigger>
            <TabsTrigger value="new" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Clock className="w-4 h-4" />
              New
            </TabsTrigger>
            <TabsTrigger value="top" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Top
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-4 h-4" />
              Following
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-4 space-y-4">
            {mockPredictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-4">
            {[...mockPredictions].reverse().map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </TabsContent>

          <TabsContent value="top" className="mt-4 space-y-4">
            {[...mockPredictions]
              .sort((a, b) => b.likes - a.likes)
              .map((prediction) => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Follow traders to see their predictions here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Index;
