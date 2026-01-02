import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
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
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserTradePredictions, useUserLongTermPredictions } from "@/hooks/usePublicPredictions";
import { useFollows } from "@/hooks/useFollows";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [traderProfileData, setTraderProfileData] = useState<{
    holding_time: string | null;
    risk_per_trade: string | null;
    decision_style: string | null;
    experience_level: string | null;
  } | null>(null);

  const { predictions: tradePredictions, loading: loadingTradePredictions } = useUserTradePredictions(userId);
  const { predictions: longTermPredictions, loading: loadingLongTermPredictions } = useUserLongTermPredictions(userId);
  const { following, followers, followUser, unfollowUser, isFollowing, loading: loadingFollows } = useFollows(userId);
  const { connections, loading: loadingExchanges, syncTrades, syncing } = useExchangeConnections();
  const { metrics, loading: loadingMetrics, calculating, recalculate } = useTradingMetrics();
  const [positions, setPositions] = useState<any[]>([]);

  // Filter to only show resolved predictions (hit/missed) from real trades
  const resolvedTradePredictions = tradePredictions.filter((p) => p.status === "hit" || p.status === "missed");

  // Calculate best streak from positions
  const bestStreak = useMemo(() => {
    const closed = positions
      .filter(p => !p.open && p.pnl !== null && p.pnl !== 0)
      .sort((a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime());

    if (closed.length === 0) return 0;

    let longestWin = 0;
    let currentStreak = 0;
    let lastResult: 'win' | 'loss' | null = null;

    for (const position of closed) {
      const isWin = (position.pnl || 0) > 0;
      const result = isWin ? 'win' : 'loss';

      if (lastResult === result) {
        currentStreak++;
      } else {
        if (lastResult === 'win') {
          longestWin = Math.max(longestWin, currentStreak);
        }
        currentStreak = 1;
      }
      lastResult = result;
    }

    if (lastResult === 'win') {
      longestWin = Math.max(longestWin, currentStreak);
    }

    return longestWin;
  }, [positions]);

  // Calculate average PnL % from positions
  const avgReturn = useMemo(() => {
    const closedTrades = positions.filter(p => !p.open && p.pnl_pct !== null);
    if (closedTrades.length === 0) return 0;

    const totalPnlPct = closedTrades.reduce((sum, p) => sum + (p.pnl_pct || 0), 0);
    return totalPnlPct / closedTrades.length;
  }, [positions]);

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

        // Fetch trader category and profile
        const { data: traderProfileData } = await supabase
          .from("trader_profiles")
          .select("trader_category, holding_time, risk_per_trade, decision_style, experience_level")
          .eq("user_id", user.id)
          .maybeSingle();

        if (traderProfileData) {
          if (traderProfileData.trader_category) {
            setTraderCategory(traderProfileData.trader_category as TraderCategory);
          }
          setTraderProfileData({
            holding_time: traderProfileData.holding_time,
            risk_per_trade: traderProfileData.risk_per_trade,
            decision_style: traderProfileData.decision_style,
            experience_level: traderProfileData.experience_level,
          });
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

        // Fetch all positions for metrics calculations
        const { data: allPositions } = await supabase
          .from("positions")
          .select("id, pnl, pnl_pct, open, entry_timestamp")
          .eq("user_id", user.id);

        if (allPositions) {
          setPositions(allPositions);
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
        {userId && (
          <TraderCharacterHero
            userId={userId}
            onProfileUpdated={handleProfileUpdated}
            onSocialClick={() => setShowSocialDialog(true)}
            followersCount={followers.length}
          />
        )}

        {/* Profile Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Social & Trading Stats */}
          <Card variant="glass" className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Trading Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Followers */}
              <button
                onClick={() => setShowSocialDialog(true)}
                className="flex flex-col items-center p-3 rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer border border-border/30"
              >
                <Users className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground">{followers.length}</span>
                <span className="text-xs text-muted-foreground">Follower{followers.length !== 1 ? 's' : ''}</span>
              </button>

              {/* Following */}
              <button
                onClick={() => setShowSocialDialog(true)}
                className="flex flex-col items-center p-3 rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer border border-border/30"
              >
                <Users className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground">{following.length}</span>
                <span className="text-xs text-muted-foreground">Following</span>
              </button>

              {/* Total Trades */}
              <div className="flex flex-col items-center p-3 rounded-lg bg-background/40 border border-border/30">
                <BarChart3 className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground">{positions.length}</span>
                <span className="text-xs text-muted-foreground">Total Trade{positions.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Win Rate */}
              <div className="flex flex-col items-center p-3 rounded-lg bg-background/40 border border-border/30">
                <Target className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-foreground">
                  {positions.filter(p => !p.open && p.pnl !== null).length > 0
                    ? `${((positions.filter(p => !p.open && (p.pnl || 0) > 0).length / positions.filter(p => !p.open && p.pnl !== null).length) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
                <span className="text-xs text-muted-foreground">Win Rate</span>
              </div>
            </div>
          </Card>

          {/* Trader Profile */}
          {traderProfileData && (
            <Card variant="glass" className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Trader Profile
              </h3>
              <div className="space-y-3">
                {traderCategory && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                    <span className="text-xs text-muted-foreground">Category</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {traderCategory.replace("_", " ")}
                    </Badge>
                  </div>
                )}
                {traderProfileData.holding_time && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                    <span className="text-xs text-muted-foreground">Holding Time</span>
                    <span className="text-sm font-medium">
                      {traderProfileData.holding_time.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  </div>
                )}
                {traderProfileData.risk_per_trade && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                    <span className="text-xs text-muted-foreground">Risk Per Trade</span>
                    <span className="text-sm font-medium">
                      {traderProfileData.risk_per_trade === "less_than_1" ? "< 1%" :
                       traderProfileData.risk_per_trade === "1_to_2" ? "1-2%" :
                       traderProfileData.risk_per_trade === "2_to_5" ? "2-5%" :
                       traderProfileData.risk_per_trade === "5_to_10" ? "5-10%" :
                       traderProfileData.risk_per_trade === "more_than_10" ? "> 10%" :
                       traderProfileData.risk_per_trade}
                    </span>
                  </div>
                )}
                {traderProfileData.decision_style && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                    <span className="text-xs text-muted-foreground">Decision Style</span>
                    <span className="text-sm font-medium">
                      {traderProfileData.decision_style.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  </div>
                )}
                {traderProfileData.experience_level && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                    <span className="text-xs text-muted-foreground">Experience Level</span>
                    <span className="text-sm font-medium">
                      {traderProfileData.experience_level.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

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
