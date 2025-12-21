import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { DefaultStatsGrid } from "@/components/profile/StatsGrid";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { TraderProfileSection } from "@/components/profile/TraderProfileSection";
import { TraderStatusCard } from "@/components/TraderStatusCard";
import { StreakBadge, TraderStats } from "@/components/profile/StreakBadge";
import { PublicPredictionCard } from "@/components/predictions/PublicPredictionCard";
import { ExplanationDialog } from "@/components/predictions/ExplanationDialog";
import { FollowersList } from "@/components/social/FollowersList";
import { FollowingList } from "@/components/social/FollowingList";
import { UserSearch } from "@/components/social/UserSearch";
import { ConnectExchangeButton } from "@/components/exchange/ConnectExchangeButton";
import { ExchangeStatusBadge } from "@/components/exchange/ExchangeStatusBadge";
import { useExchangeConnections } from "@/hooks/useExchangeConnections";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Share2, Target, BookOpen, Users, ArrowUpRight, ArrowDownRight, ChevronRight, User, Calendar, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserTradePredictions, useUserLongTermPredictions } from "@/hooks/usePublicPredictions";
import { useFollows } from "@/hooks/useFollows";

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
  
  const { predictions: tradePredictions, loading: loadingTradePredictions } = useUserTradePredictions(userId);
  const { predictions: longTermPredictions, loading: loadingLongTermPredictions } = useUserLongTermPredictions(userId);
  const { following, followers, followUser, unfollowUser, isFollowing, loading: loadingFollows } = useFollows(userId);
  const { connections, loading: loadingExchanges } = useExchangeConnections();

  // Filter to only show resolved predictions (hit/missed) from real trades
  const resolvedTradePredictions = tradePredictions.filter(p => p.status === "hit" || p.status === "missed");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingTrades(false);
          setLoadingProfile(false);
          return;
        }
        
        setUserId(user.id);

        // Fetch profile with streak data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bio, current_streak, streak_type, total_predictions, total_hits')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
        setLoadingProfile(false);

        // Fetch recent trades from positions table (only user's trades, including simulation)
        const { data, error } = await supabase
          .from('positions')
          .select('id, symbol, side, entry_price, exit_price, pnl, entry_timestamp, is_simulation')
          .eq('user_id', user.id)
          .order('entry_timestamp', { ascending: false })
          .limit(5);

        if (!error && data) {
          setRecentTrades(data);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      } finally {
        setLoadingTrades(false);
        setLoadingProfile(false);
      }
    };

    fetchUserData();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileUpdated = (data: { display_name: string; avatar_url: string; bio: string }) => {
    setProfile(data);
  };

  const renderAvatar = () => {
    const avatarUrl = profile.avatar_url;
    
    if (avatarUrl?.startsWith('emoji:')) {
      const emoji = avatarUrl.replace('emoji:', '');
      return (
        <AvatarFallback className="text-3xl bg-primary/10">
          {emoji}
        </AvatarFallback>
      );
    }
    
    if (avatarUrl) {
      return <AvatarImage src={avatarUrl} alt={profile.display_name || 'Profile'} />;
    }
    
    return (
      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
        {profile.display_name ? getInitials(profile.display_name) : <User className="w-8 h-8" />}
      </AvatarFallback>
    );
  };

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-4 space-y-4">
        {/* Profile Header */}
        <Card variant="glass" className="overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
          
          <CardContent className="p-4 -mt-12">
            <div className="flex items-end gap-4 mb-4">
              <Avatar className="w-20 h-20 border-4 border-card shadow-lg">
                {loadingProfile ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : (
                  renderAvatar()
                )}
              </Avatar>
              <div className="flex-1 min-w-0 pb-1">
                {loadingProfile ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <h1 className="font-bold text-xl">
                      {profile.display_name || 'Set your name'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {profile.bio ? profile.bio.slice(0, 50) + (profile.bio.length > 50 ? '...' : '') : 'No bio yet'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mb-4">
                {profile.bio}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {userId && (
                <ProfileEditDialog
                  userId={userId}
                  currentName={profile.display_name}
                  currentAvatarUrl={profile.avatar_url}
                  currentBio={profile.bio}
                  onProfileUpdated={handleProfileUpdated}
                />
              )}
              
              {/* Social/Followers Dialog */}
              <Dialog open={showSocialDialog} onOpenChange={setShowSocialDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Users className="w-4 h-4" />
                    {followers.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                        {followers.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Connections</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="followers" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="followers" className="flex-1 gap-1">
                        Followers
                        <Badge variant="secondary" className="ml-1 text-xs">{followers.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="following" className="flex-1 gap-1">
                        Following
                        <Badge variant="secondary" className="ml-1 text-xs">{following.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="find" className="flex-1">
                        Find
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="followers" className="mt-4">
                      <FollowersList followerIds={followers} />
                    </TabsContent>
                    <TabsContent value="following" className="mt-4">
                      <FollowingList 
                        followingIds={following}
                        onFollow={followUser}
                        onUnfollow={unfollowUser}
                      />
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

              <Button variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Streak Badge */}
        {profile.current_streak && profile.current_streak >= 2 && (
          <div className="flex justify-center">
            <StreakBadge 
              streak={profile.current_streak} 
              streakType={profile.streak_type || "none"} 
              size="lg" 
            />
          </div>
        )}

        {/* Trader Stats */}
        {profile.total_predictions && profile.total_predictions > 0 && (
          <Card variant="glass" className="p-4">
            <TraderStats 
              totalPredictions={profile.total_predictions || 0}
              totalHits={profile.total_hits || 0}
              currentStreak={profile.current_streak || 0}
              streakType={profile.streak_type || "none"}
            />
          </Card>
        )}

        {/* Trader Profile Section */}
        {userId && <TraderProfileSection userId={userId} />}

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
              <div className="flex flex-wrap gap-2">
                {connections.map((conn) => (
                  <ExchangeStatusBadge
                    key={conn.id}
                    exchange={conn.exchange}
                    status={conn.status}
                    lastSyncAt={conn.last_sync_at}
                    verifiedTradesCount={conn.verified_trades_count}
                    showDetails
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Stats Grid */}
        <DefaultStatsGrid />

        {/* Content Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="predictions" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="longterm" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Calendar className="w-4 h-4" />
              Long-Term
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
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
                <p className="text-xs text-muted-foreground mt-2">Create predictions from the Create Prediction page.</p>
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
                <Button variant="outline" className="mt-4" onClick={() => navigate('/journal')}>
                  Open Trading Journal
                </Button>
              </Card>
            ) : (
              <>
                {recentTrades.map((trade) => (
                  <Card key={trade.id} variant="glass" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={trade.side === 'long' ? 'default' : 'destructive'} 
                          className="gap-1"
                        >
                          {trade.side === 'long' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {trade.side}
                        </Badge>
                        <div>
                          <span className="font-mono font-medium">{trade.symbol}</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(trade.entry_timestamp), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${(trade.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          ${trade.entry_price.toLocaleString()} → {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={() => navigate('/journal')}
                >
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
