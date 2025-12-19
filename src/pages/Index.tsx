import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicPredictionCard } from "@/components/predictions/PublicPredictionCard";
import { TrendingAssets } from "@/components/feed/TrendingAssets";
import { MarketTicker } from "@/components/feed/MarketTicker";
import { mockTrendingAssets, mockTickerData } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Clock, Target, Calendar } from "lucide-react";
import { usePublicPredictions, useLongTermPredictions } from "@/hooks/usePublicPredictions";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const { predictions: tradePredictions, loading: loadingTrades } = usePublicPredictions(30);
  const { predictions: longTermPredictions, loading: loadingLongTerm } = useLongTermPredictions(30);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const checkUserAndOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUserId(session.user.id);
        
        // Check if user needs onboarding
        const { data: traderProfile } = await supabase
          .from("trader_profiles")
          .select("onboarding_completed, onboarding_skipped")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (traderProfile && !traderProfile.onboarding_completed && !traderProfile.onboarding_skipped) {
          navigate("/onboarding");
        }
      }
    };
    
    checkUserAndOnboarding();
  }, [navigate]);

  // Sort trade predictions for different views
  const hotPredictions = [...tradePredictions].sort((a, b) => {
    const aStreak = a.profile?.streak_type === "hit" ? (a.profile.current_streak || 0) : 0;
    const bStreak = b.profile?.streak_type === "hit" ? (b.profile.current_streak || 0) : 0;
    return bStreak - aStreak;
  });

  const newTradePredictions = [...tradePredictions].sort((a, b) => 
    new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime()
  );

  const topPredictions = [...tradePredictions].filter(p => p.status === "hit");

  // Long-term predictions sorted by creation date
  const sortedLongTermPredictions = [...longTermPredictions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
            <TabsTrigger value="longterm" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Calendar className="w-4 h-4" />
              Long-Term
            </TabsTrigger>
            <TabsTrigger value="top" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Winners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot" className="mt-4 space-y-4">
            {loadingTrades ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : hotPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Flame className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No trade predictions yet. Start trading!</p>
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
            {loadingTrades ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : newTradePredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No recent trade predictions.</p>
              </Card>
            ) : (
              newTradePredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="longterm" className="mt-4 space-y-4">
            {loadingLongTerm ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : sortedLongTermPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No long-term predictions yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to share your market thesis!</p>
              </Card>
            ) : (
              sortedLongTermPredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="top" className="mt-4 space-y-4">
            {loadingTrades ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : topPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No winning predictions yet.</p>
              </Card>
            ) : (
              topPredictions.map((prediction) => (
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
