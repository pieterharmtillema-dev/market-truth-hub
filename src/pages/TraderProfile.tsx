import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { PublicPredictionCard, PublicPredictionData } from "@/components/predictions/PublicPredictionCard";
import { PublicTraderCharacterHero } from "@/components/profile/PublicTraderCharacterHero";
import { AvatarDisplay } from "@/components/profile/AvatarDisplay";
import { CategoryBadge, TraderCategory } from "@/components/profile/CategoryBadge";
import { FAKE_PROFILES, FAKE_TRADER_META, PublicProfile, FakeTraderMeta } from "@/lib/fakeProfiles";
import {
  Flame,
  Snowflake,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  UserMinus,
  Loader2,
  ArrowLeft,
  Calendar,
  BarChart3,
  Clock,
  Activity,
  Briefcase,
  Zap,
  LineChart,
  Users,
  CheckCircle2,
  Shield,
  TrendingDown,
  Percent,
  Globe
} from "lucide-react";

function getTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const TraderProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [traderMeta, setTraderMeta] = useState<FakeTraderMeta | null>(null);
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  const { following, followUser, unfollowUser, isFollowing } = useFollows(currentUserId);
  const isOwnProfile = currentUserId === userId;
  const isFollowingUser = userId ? isFollowing(userId) : false;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        // Use fake profile if no real profile found
        if (data) {
          setProfile(data);
        } else if (FAKE_PROFILES[userId]) {
          setProfile(FAKE_PROFILES[userId]);
        } else {
          setProfile(null);
        }
        
        // Set fake trader meta if available
        if (FAKE_TRADER_META[userId]) {
          setTraderMeta(FAKE_TRADER_META[userId]);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        // Fall back to fake profile on error
        if (userId && FAKE_PROFILES[userId]) {
          setProfile(FAKE_PROFILES[userId]);
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchPredictions = async () => {
      setLoadingPredictions(true);
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Fetch trade source data from positions table
        const positionIds = (data || [])
          .filter(p => p.source_position_id)
          .map(p => p.source_position_id);

        let positionsMap = new Map<number, { trade_source: string | null; platform: string | null; exchange_source: string | null; is_exchange_verified: boolean | null }>();

        if (positionIds.length > 0) {
          const { data: positionsData } = await supabase
            .from("positions")
            .select("id, trade_source, platform, exchange_source, is_exchange_verified")
            .in("id", positionIds);

          if (positionsData) {
            positionsMap = new Map(positionsData.map(p => [p.id, {
              trade_source: p.trade_source,
              platform: p.platform,
              exchange_source: p.exchange_source,
              is_exchange_verified: p.is_exchange_verified
            }]));
          }
        }

        // Map to PublicPredictionData format with profile and trade source data
        const mappedPredictions: PublicPredictionData[] = (data || []).map(p => {
          const positionData = p.source_position_id
            ? positionsMap.get(p.source_position_id)
            : null;

          return {
            ...p,
            trade_source: positionData?.trade_source ?? null,
            platform: positionData?.platform ?? null,
            exchange_source: positionData?.exchange_source ?? null,
            is_exchange_verified: positionData?.is_exchange_verified ?? null,
            profile: profile ? {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              current_streak: profile.current_streak || 0,
              streak_type: profile.streak_type || "none",
              total_predictions: profile.total_predictions || 0,
              total_hits: profile.total_hits || 0,
            } : null
          };
        });

        setPredictions(mappedPredictions);
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
      } finally {
        setLoadingPredictions(false);
      }
    };

    fetchProfile();
    fetchPredictions();
  }, [userId]);

  // Re-map predictions when profile loads
  useEffect(() => {
    if (profile && predictions.length > 0) {
      setPredictions(prev => prev.map(p => ({
        ...p,
        profile: {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          current_streak: profile.current_streak || 0,
          streak_type: profile.streak_type || "none",
          total_predictions: profile.total_predictions || 0,
          total_hits: profile.total_hits || 0,
        }
      })));
    }
  }, [profile]);

  const handleFollow = async () => {
    if (!userId) return;
    setFollowLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = profile?.display_name || "Trader";
  const accuracy = profile?.total_predictions && profile.total_predictions > 0
    ? Math.round((profile.total_hits || 0) / profile.total_predictions * 100)
    : 0;
  const streak = profile?.current_streak || 0;
  const streakType = profile?.streak_type || "none";
  const isHotStreak = streakType === "hit" && streak >= 2;
  const isColdStreak = streakType === "miss" && streak >= 3;

  const tradePredictions = predictions.filter(p => p.data_source === "trade_sync");
  const longTermPredictions = predictions.filter(p => p.data_source === "user");

  const followerCount = traderMeta?.followers.length || 0;
  const followingCount = traderMeta?.following.length || 0;

  const getProfileForId = (id: string) => FAKE_PROFILES[id] || null;

  if (loading) {
    return (
      <AppLayout title="Trader Profile">
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Trader Profile">
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">Profile not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Trader Profile">
      <div className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Hero Card */}
        <PublicTraderCharacterHero
          userId={userId!}
          followersCount={followerCount}
          onFollowClick={currentUserId && !isOwnProfile ? handleFollow : undefined}
          isFollowing={isFollowingUser}
          showFollowButton={currentUserId !== null && !isOwnProfile}
        />

        {/* Trader Profile Info */}
        {traderMeta && (
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Trader Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="font-medium">{traderMeta.experience_level}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Holding:</span>
                  <span className="font-medium">{traderMeta.holding_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium">{traderMeta.trade_frequency}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">{traderMeta.platform}</span>
                </div>
                {traderMeta.trading_session && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Session:</span>
                    <span className="font-medium capitalize">{traderMeta.trading_session.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {traderMeta.asset_focus && traderMeta.asset_focus.length > 0 && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Trading:</span>
                    <div className="flex flex-wrap gap-1">
                      {traderMeta.asset_focus.map((asset) => (
                        <Badge key={asset} variant="outline" className="text-xs">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Status & Member Info */}
        <div className="flex items-center justify-between gap-4">
          {traderMeta && (
            <Badge
              variant="outline"
              className={`gap-1 ${traderMeta.is_active ? 'text-gain border-gain/30 bg-gain/10' : 'text-muted-foreground border-border'}`}
            >
              <span className={`w-2 h-2 rounded-full ${traderMeta.is_active ? 'bg-gain animate-pulse' : 'bg-muted-foreground'}`} />
              {traderMeta.is_active ? 'Active' : `Last seen ${getTimeAgo(traderMeta.last_active)}`}
            </Badge>
          )}
          {profile.created_at && (
            <p className="text-xs text-muted-foreground">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Followers/Following Section */}
        {traderMeta && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFollowersModal(true)}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-bold">{followerCount}</span>
              <span className="text-muted-foreground ml-1">followers</span>
            </button>
            <button
              onClick={() => setShowFollowingModal(true)}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-bold">{followingCount}</span>
              <span className="text-muted-foreground ml-1">following</span>
            </button>
          </div>
        )}

        {/* Streak Badges */}
        {(isHotStreak || isColdStreak) && (
          <div className="flex gap-2">
            {isHotStreak && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/30 gap-1">
                <Flame className="w-3 h-3" />
                {streak} Win Streak
              </Badge>
            )}
            {isColdStreak && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/30 gap-1">
                <Snowflake className="w-3 h-3" />
                High Variance
              </Badge>
            )}
          </div>
        )}

        {/* Predictions Tabs */}
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="trades" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BarChart3 className="w-4 h-4" />
              Trades ({tradePredictions.length})
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Calendar className="w-4 h-4" />
              Predictions ({longTermPredictions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="mt-4 space-y-4">
            {loadingPredictions ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : tradePredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No shared trades yet</p>
              </Card>
            ) : (
              tradePredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId || undefined}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="predictions" className="mt-4 space-y-4">
            {loadingPredictions ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : longTermPredictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No public predictions yet</p>
              </Card>
            ) : (
              longTermPredictions.map((prediction) => (
                <PublicPredictionCard 
                  key={prediction.id} 
                  prediction={prediction}
                  currentUserId={currentUserId || undefined}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Followers Modal */}
      <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Followers ({followerCount})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {traderMeta?.followers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No followers yet</p>
              ) : (
                traderMeta?.followers.map((followerId) => {
                  const followerProfile = getProfileForId(followerId);
                  if (!followerProfile) return null;
                  return (
                    <div
                      key={followerId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowFollowersModal(false);
                        navigate(`/trader/${followerId}`);
                      }}
                    >
                      <AvatarDisplay 
                        avatarUrl={followerProfile.avatar_url} 
                        displayName={followerProfile.display_name || "?"} 
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{followerProfile.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{followerProfile.bio}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Following ({followingCount})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {traderMeta?.following.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Not following anyone yet</p>
              ) : (
                traderMeta?.following.map((followingId) => {
                  const followingProfile = getProfileForId(followingId);
                  if (!followingProfile) return null;
                  return (
                    <div
                      key={followingId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowFollowingModal(false);
                        navigate(`/trader/${followingId}`);
                      }}
                    >
                      <AvatarDisplay 
                        avatarUrl={followingProfile.avatar_url} 
                        displayName={followingProfile.display_name || "?"} 
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{followingProfile.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{followingProfile.bio}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TraderProfile;