import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicPredictionCard } from "@/components/predictions/PublicPredictionCard";
import { TrendingAssets } from "@/components/feed/TrendingAssets";
import { MarketTicker } from "@/components/feed/MarketTicker";
import { mockTrendingAssets, mockTickerData } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Clock, Target, Calendar, Users, Filter } from "lucide-react";
import { usePublicPredictions, useLongTermPredictions } from "@/hooks/usePublicPredictions";
import { useFollows, useFollowingPredictions } from "@/hooks/useFollows";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserSearch } from "@/components/social/UserSearch";
import { FollowingList } from "@/components/social/FollowingList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Index = () => {
  const navigate = useNavigate();
  const { predictions: tradePredictions, loading: loadingTrades } = usePublicPredictions(30);
  const { predictions: longTermPredictions, loading: loadingLongTerm } = useLongTermPredictions(30);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const { following, followUser, unfollowUser, isFollowing } = useFollows(currentUserId || null);
  const { predictions: followingPredictions, loading: loadingFollowing } = useFollowingPredictions(currentUserId || null, following);
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [specificAssetFilter, setSpecificAssetFilter] = useState<string>("all");

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

  // Get available specific assets based on selected category
  const getAvailableAssets = (predictions: typeof tradePredictions) => {
    if (assetFilter === "all") {
      // Return all unique assets across all categories
      return Array.from(new Set(predictions.map(p => p.asset))).sort();
    }
    // Return unique assets for the selected category
    return Array.from(
      new Set(
        predictions
          .filter(p => p.asset_type === assetFilter)
          .map(p => p.asset)
      )
    ).sort();
  };

  // Filter predictions by asset type and specific asset
  const filterByAsset = (preds: typeof tradePredictions) => {
    let filtered = preds;

    // First filter by category
    if (assetFilter !== "all") {
      filtered = filtered.filter(p => p.asset_type === assetFilter);
    }

    // Then filter by specific asset if selected
    if (specificAssetFilter !== "all") {
      filtered = filtered.filter(p => p.asset === specificAssetFilter);
    }

    return filtered;
  };

  // Reset specific asset filter when category changes
  useEffect(() => {
    setSpecificAssetFilter("all");
  }, [assetFilter]);

  // Sort trade predictions for different views
  const hotPredictions = filterByAsset([...tradePredictions]).sort((a, b) => {
    const aStreak = a.profile?.streak_type === "hit" ? (a.profile.current_streak || 0) : 0;
    const bStreak = b.profile?.streak_type === "hit" ? (b.profile.current_streak || 0) : 0;
    return bStreak - aStreak;
  });

  const newTradePredictions = filterByAsset([...tradePredictions]).sort((a, b) => 
    new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime()
  );

  const topPredictions = filterByAsset([...tradePredictions]).filter(p => p.status === "hit");

  // Long-term predictions sorted by creation date
  const sortedLongTermPredictions = filterByAsset([...longTermPredictions]).sort((a, b) =>
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
          <div className="space-y-3 mb-4">
            <TabsList className="w-full bg-card border border-border flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="hot" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Flame className="w-4 h-4" />
                Hot
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Clock className="w-4 h-4" />
                New
              </TabsTrigger>
              {currentUserId && (
                <TabsTrigger value="following" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Users className="w-4 h-4" />
                  Following
                </TabsTrigger>
              )}
              <TabsTrigger value="longterm" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Calendar className="w-4 h-4" />
                Long-Term
              </TabsTrigger>
              <TabsTrigger value="top" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Target className="w-4 h-4" />
                Winners
              </TabsTrigger>
            </TabsList>

            {/* Asset Filter Pills */}
            <Card variant="glass" className="p-3 space-y-3">
              {/* Asset Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {[
                    { value: 'all', label: 'All', emoji: '🌐' },
                    { value: 'crypto', label: 'Crypto', emoji: '₿' },
                    { value: 'forex', label: 'Forex', emoji: '💱' },
                    { value: 'stock', label: 'Stocks', emoji: '📈' },
                    { value: 'commodity', label: 'Commodities', emoji: '🛢️' },
                    { value: 'options', label: 'Options', emoji: '📊' },
                  ].map((asset) => (
                    <button
                      key={asset.value}
                      onClick={() => setAssetFilter(asset.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        assetFilter === asset.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card border border-border/50'
                      }`}
                    >
                      <span className="mr-1.5">{asset.emoji}</span>
                      {asset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Asset Filter - Show when category is selected */}
              {(() => {
                const availableAssets = getAvailableAssets(tradePredictions);
                if (availableAssets.length === 0) return null;

                return (
                  <div className="flex items-start gap-2 pl-6 border-l-2 border-primary/20">
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      <button
                        onClick={() => setSpecificAssetFilter("all")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                          specificAssetFilter === "all"
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background/80 border border-border/30'
                        }`}
                      >
                        All {assetFilter === 'all' ? 'Assets' : assetFilter === 'crypto' ? 'Coins' : assetFilter === 'forex' ? 'Pairs' : assetFilter === 'stock' ? 'Stocks' : assetFilter === 'commodity' ? 'Commodities' : 'Contracts'}
                      </button>
                      {availableAssets.slice(0, 12).map((asset) => (
                        <button
                          key={asset}
                          onClick={() => setSpecificAssetFilter(asset)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                            specificAssetFilter === asset
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background/80 border border-border/30'
                          }`}
                        >
                          {asset}
                        </button>
                      ))}
                      {availableAssets.length > 12 && (
                        <span className="px-2.5 py-1 text-[11px] text-muted-foreground">
                          +{availableAssets.length - 12} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>

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
                  isFollowing={isFollowing(prediction.user_id)}
                  onFollow={followUser}
                  onUnfollow={unfollowUser}
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
                  isFollowing={isFollowing(prediction.user_id)}
                  onFollow={followUser}
                  onUnfollow={unfollowUser}
                />
              ))
            )}
          </TabsContent>

          {currentUserId && (
            <TabsContent value="following" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Dialog open={showFollowDialog} onOpenChange={setShowFollowDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Users className="w-4 h-4" />
                      Manage Following
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Find & Follow Traders</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <UserSearch 
                        currentUserId={currentUserId}
                        isFollowing={isFollowing}
                        onFollow={followUser}
                        onUnfollow={unfollowUser}
                      />
                      <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-medium mb-3">Following ({following.length})</h4>
                        <FollowingList 
                          followingIds={following}
                          onFollow={followUser}
                          onUnfollow={unfollowUser}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingFollowing ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                  ))}
                </div>
              ) : followingPredictions.length === 0 ? (
                <Card variant="glass" className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No predictions from traders you follow.</p>
                  <p className="text-xs text-muted-foreground mt-1">Follow some traders to see their activity here!</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setShowFollowDialog(true)}
                  >
                    Find Traders
                  </Button>
                </Card>
              ) : (
                followingPredictions.map((prediction) => (
                  <PublicPredictionCard 
                    key={prediction.id} 
                    prediction={prediction}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </TabsContent>
          )}

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
                  isFollowing={isFollowing(prediction.user_id)}
                  onFollow={followUser}
                  onUnfollow={unfollowUser}
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
                  isFollowing={isFollowing(prediction.user_id)}
                  onFollow={followUser}
                  onUnfollow={unfollowUser}
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
