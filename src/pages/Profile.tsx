import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { DefaultStatsGrid } from "@/components/profile/StatsGrid";
import { TraderCharacterHero } from "@/components/profile/TraderCharacterHero";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { TraderStatusCard } from "@/components/TraderStatusCard";
import { StreakBadge, TraderStats } from "@/components/profile/StreakBadge";
import { PublicPredictionCard } from "@/components/predictions/PublicPredictionCard";
import { ExplanationDialog } from "@/components/predictions/ExplanationDialog";
import { FollowersList } from "@/components/social/FollowersList";
import { FollowingList } from "@/components/social/FollowingList";
import { UserSearch } from "@/components/social/UserSearch";
import { ConnectExchangeButton } from "@/components/exchange/ConnectExchangeButton";
import { ExchangeStatusBadge } from "@/components/exchange/ExchangeStatusBadge";
import { TradingMetricsCard } from "@/components/metrics/TradingMetricsCard";
import { CategoryStatsCard } from "@/components/metrics/CategoryStatsCard";
import { TraderCategory } from "@/components/profile/CategoryBadge";
import { useExchangeConnections } from "@/hooks/useExchangeConnections";
import { useTradingMetrics } from "@/hooks/useTradingMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumAvatarRenderer, parsePremiumConfig, DEFAULT_PREMIUM_CONFIG } from "@/components/profile/avatar";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Settings,
  Share2,
  Target,
  BookOpen,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  User,
  Calendar,
  Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserTradePredictions, useUserLongTermPredictions } from "@/hooks/usePublicPredictions";
import { useFollows } from "@/hooks/useFollows";
import { toast } from "@/hooks/use-toast";

interface Trade {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  entry_timestamp: string;
  is_simulation?: boolean;
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_streak?: number;
  streak_type?: string;
  total_predictions?: number;
  total_hits?: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    display_name: null,
    avatar_url: null,
    bio: null,
    current_streak: 0,
    streak_type: "none",
    total_predictions: 0,
    total_hits: 0,
  });
  const [explanationPredictionId, setExplanationPredictionId] = useState<string | null>(null);
  const [showSocialDialog, setShowSocialDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [traderCategory, setTraderCategory] = useState<TraderCategory | null>(null);

  const { predictions: tradePredictions, loading: loadingTradePredictions } = useUserTradePredictions(userId);
  const { predictions: longTermPredictions, loading: loadingLongTermPredictions } = useUserLongTermPredictions(userId);
  const { following, followers, followUser, unfollowUser, isFollowing, loading: loadingFollows } = useFollows(userId);
  const { connections, loading: loadingExchanges, syncTrades, syncing } = useExchangeConnections();
  const { metrics, loading: loadingMetrics, calculating, recalculate } = useTradingMetrics();

  // Filter to only show resolved predictions (hit/missed) from real trades
  const resolvedTradePredictions = tradePredictions.filter((p) => p.status === "hit" || p.status === "missed");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingTrades(false);
          setLoadingProfile(false);
          return;
        }

        setUserId(user.id);

        // Fetch profile with streak data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, current_streak, streak_type, total_predictions, total_hits")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch trader category
        const { data: traderProfileData } = await supabase
          .from("trader_profiles")
          .select("trader_category")
          .eq("user_id", user.id)
          .maybeSingle();

        if (traderProfileData?.trader_category) {
          setTraderCategory(traderProfileData.trader_category as TraderCategory);
        }

        setLoadingProfile(false);

        // Fetch recent trades from positions table (only user's trades, including simulation)
        const { data, error } = await supabase
          .from("positions")
          .select("id, symbol, side, entry_price, exit_price, pnl, entry_timestamp, is_simulation")
          .eq("user_id", user.id)
          .order("entry_timestamp", { ascending: false })
          .limit(5);

        if (!error && data) {
          setRecentTrades(data);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setLoadingTrades(false);
        setLoadingProfile(false);
      }
    };

    fetchUserData();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileUpdated = (data: { display_name: string; avatar_url: string; bio: string }) => {
    setProfile(data);
  };

  const renderAvatar = () => {
    const avatarUrl = profile.avatar_url;

    // ✅ Premium avatar (SAFE)
    if (avatarUrl?.startsWith("avatar:")) {
      const parsedConfig = parsePremiumConfig(avatarUrl) ?? DEFAULT_PREMIUM_CONFIG;

      return <PremiumAvatarRenderer config={parsedConfig} size={80} />;
    }

    // ✅ Uploaded image / NFT
    if (avatarUrl?.startsWith("http")) {
      return <AvatarImage src={avatarUrl} alt={profile.display_name || "Profile"} />;
    }

    // ✅ Fallback initials
    return (
      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
        {profile.display_name ? getInitials(profile.display_name) : <User className="w-8 h-8" />}
      </AvatarFallback>
    );
  };

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-4 space-y-4">
        {/* Trader Character Hero - New Game-Style Profile Header */}
        {userId && <TraderCharacterHero userId={userId} onProfileUpdated={handleProfileUpdated} />}

        {/* Social Dialog - Preserved from original */}
        <Dialog open={showSocialDialog} onOpenChange={setShowSocialDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Connections</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="followers" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="followers" className="flex-1 gap-1">
                  Followers
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {followers.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1 gap-1">
                  Following
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {following.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="find" className="flex-1">
                  Find
                </TabsTrigger>
              </TabsList>
              <TabsContent value="followers" className="mt-4">
                <FollowersList followerIds={followers} />
              </TabsContent>
              <TabsContent value="following" className="mt-4">
                <FollowingList followingIds={following} onFollow={followUser} onUnfollow={unfollowUser} />
              </TabsContent>
              <TabsContent value="find" className="mt-4">
                {userId && (
                  <UserSearch
                    currentUserId={userId}
                    isFollowing={isFollowing}
                    onFollow={followUser}
                    onUnfollow={unfollowUser}
                  />
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Quick Actions - Social, Share, Settings */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="icon" className="relative" onClick={() => setShowSocialDialog(true)}>
            <Users className="w-4 h-4" />
            {followers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {followers.length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            // Handle share functionality
            if (navigator.share) {
              navigator.share({
                title: `${profile.display_name || 'Trader'}'s Profile`,
                text: `Check out my trading profile on trade-trax.com`,
                url: window.location.href,
              });
            }
          }}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            // Navigate to settings or open settings dialog
            console.log('Settings clicked');
          }}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {profile.current_streak >= 2 && (
          <div className="flex justify-center">
            <StreakBadge streak={profile.current_streak} streakType={profile.streak_type || "none"} size="lg" />
          </div>
        )}

        {profile.total_predictions > 0 && (
          <Card variant="glass" className="p-4">
            <TraderStats
              totalPredictions={profile.total_predictions}
              totalHits={profile.total_hits || 0}
              currentStreak={profile.current_streak || 0}
              streakType={profile.streak_type || "none"}
            />
          </Card>
        )}

        {/* Trader Status & Exchange Connections - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trader Status */}
          <TraderStatusCard />

          {/* Exchange Connections */}
          {userId && (
            <Card variant="glass" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Exchange Connections</h3>
                </div>
                <ConnectExchangeButton variant="outline" size="sm" />
              </div>

              {loadingExchanges ? (
                <Skeleton className="h-12 w-full" />
              ) : connections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Connect your exchange to automatically sync and verify your trades.
                </p>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <ExchangeStatusBadge
                      key={conn.id}
                      exchange={conn.exchange}
                      status={conn.status}
                      lastSyncAt={conn.last_sync_at}
                      verifiedTradesCount={conn.verified_trades_count}
                      showDetails
                      syncing={syncing}
                      onSync={async () => {
                        const result = await syncTrades(conn.exchange);
                        if (result.success) {
                          toast({
                            title: "Trades Synced",
                            description: result.synced > 0 
                              ? `Synced ${result.synced} new trade${result.synced !== 1 ? 's' : ''}`
                              : "No new trades found",
                          });
                        } else {
                          toast({
                            title: "Sync Failed",
                            description: result.error || "Failed to sync trades",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Trading Metrics - Simple Display */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Trading Metrics
            </h2>
            <span className="text-xs text-muted-foreground">Unverified</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl font-bold mb-1">78%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Accuracy</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {metrics?.win_rate ? `${(metrics.win_rate * 100).toFixed(0)}%` : '65%'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl font-bold text-cyan-400 mb-1">+12.4%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg Return</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/50">
              <div className="text-2xl font-bold text-amber-400 mb-1">14</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Best Streak</div>
            </div>
          </div>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger
              value="predictions"
              className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Target className="w-4 h-4" />
              Trades
            </TabsTrigger>
            <TabsTrigger
              value="longterm"
              className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Calendar className="w-4 h-4" />
              Long-Term
            </TabsTrigger>
            <TabsTrigger
              value="journal"
              className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <BookOpen className="w-4 h-4" />
              Journal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="mt-4 space-y-4">
            {loadingTradePredictions ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : resolvedTradePredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No trade predictions yet.</p>
                <p className="text-xs text-muted-foreground mt-2">Complete real trades to see them here.</p>
              </Card>
            ) : (
              resolvedTradePredictions.map((prediction) => (
                <PublicPredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  currentUserId={userId || undefined}
                  onAddExplanation={(id) => setExplanationPredictionId(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="longterm" className="mt-4 space-y-4">
            {loadingLongTermPredictions ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : longTermPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No long-term predictions yet.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Create predictions from the Create Prediction page.
                </p>
              </Card>
            ) : (
              longTermPredictions.map((prediction) => (
                <PublicPredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  currentUserId={userId || undefined}
                  onAddExplanation={(id) => setExplanationPredictionId(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="journal" className="mt-4 space-y-3">
            {loadingTrades ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentTrades.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No trades yet. Import your first trades.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/journal")}>
                  Open Trading Journal
                </Button>
              </Card>
            ) : (
              <>
                {recentTrades.map((trade) => (
                  <Card key={trade.id} variant="glass" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.side === "long" ? "default" : "destructive"} className="gap-1">
                          {trade.side === "long" ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {trade.side}
                        </Badge>
                        <div>
                          <span className="font-mono font-medium">{trade.symbol}</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(trade.entry_timestamp), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(trade.pnl || 0) >= 0 ? "+" : ""}${(trade.pnl || 0).toFixed(2)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          ${trade.entry_price.toLocaleString()} →{" "}
                          {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : "—"}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/journal")}>
                  View All Trades
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Explanation Dialog */}
        <ExplanationDialog
          predictionId={explanationPredictionId}
          open={!!explanationPredictionId}
          onOpenChange={(open) => !open && setExplanationPredictionId(null)}
          onSaved={() => window.location.reload()}
        />
      </div>
    </AppLayout>
  );
};

export default Profile;
