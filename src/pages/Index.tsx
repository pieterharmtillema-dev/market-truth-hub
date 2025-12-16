import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicPredictionCard } from "@/components/predictions/PublicPredictionCard";
import { TrendingAssets } from "@/components/feed/TrendingAssets";
import { MarketTicker } from "@/components/feed/MarketTicker";
import { mockTrendingAssets, mockTickerData } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Clock, Target, Activity } from "lucide-react";
import { usePublicPredictions } from "@/hooks/usePublicPredictions";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const Index = () => {
  const { predictions: publicPredictions, loading } = usePublicPredictions(30);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });
  }, []);

  // Sort predictions for different views
  const hotPredictions = [...publicPredictions].sort((a, b) => {
    // Prioritize active predictions first, then by streak
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    const aStreak = a.profile?.streak_type === "hit" ? (a.profile.current_streak || 0) : 0;
    const bStreak = b.profile?.streak_type === "hit" ? (b.profile.current_streak || 0) : 0;
    return bStreak - aStreak;
  });

  const newPredictions = [...publicPredictions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const activePredictions = publicPredictions.filter(p => p.status === "active");
  const winnerPredictions = publicPredictions.filter(p => p.status === "hit");

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
            <TabsTrigger value="active" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Activity className="w-4 h-4" />
              Active
            </TabsTrigger>
            <TabsTrigger value="winners" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Winners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : hotPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Flame className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No predictions yet. Be the first to trade!</p>
              </Card>
            ) : (
              hotPredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : newPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No recent predictions.</p>
              </Card>
            ) : (
              newPredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : activePredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No active trades right now.</p>
              </Card>
            ) : (
              activePredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="winners" className="mt-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : winnerPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No winning predictions yet.</p>
              </Card>
            ) : (
              winnerPredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Index;
