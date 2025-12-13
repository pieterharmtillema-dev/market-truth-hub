import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { DefaultStatsGrid } from "@/components/profile/StatsGrid";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { TraderStatusCard } from "@/components/TraderStatusCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Share2, Target, BookOpen, Users, ArrowUpRight, ArrowDownRight, ChevronRight, User, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Trade {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  entry_timestamp: string;
}

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Prediction {
  id: string;
  asset: string;
  asset_type: string;
  direction: string;
  current_price: number;
  target_price: number;
  time_horizon: string;
  confidence: number;
  rationale: string | null;
  status: string;
  likes: number;
  comments: number;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    display_name: null,
    avatar_url: null,
    bio: null,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingTrades(false);
          setLoadingProfile(false);
          setLoadingPredictions(false);
          return;
        }
        
        setUserId(user.id);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bio')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
        setLoadingProfile(false);

        // Fetch user's predictions
        const { data: predictionsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (predictionsData) {
          setPredictions(predictionsData);
        }
        setLoadingPredictions(false);

        // Fetch recent trades from positions table
        const { data, error } = await supabase
          .from('positions')
          .select('id, symbol, side, entry_price, exit_price, pnl, entry_timestamp')
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
              <Button variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trader Status */}
        <TraderStatusCard />

        {/* Stats Grid */}
        <DefaultStatsGrid />

        {/* Content Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="predictions" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BookOpen className="w-4 h-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-4 h-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="mt-4 space-y-4">
            {loadingPredictions ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : predictions.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No predictions yet. Make your first prediction.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/create-prediction')}>
                  Create Prediction
                </Button>
              </Card>
            ) : (
              predictions.map((prediction) => (
                <Card key={prediction.id} variant="glass" className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{prediction.asset}</span>
                      <Badge variant={prediction.direction === 'long' ? 'default' : 'destructive'} className="gap-1">
                        {prediction.direction === 'long' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {prediction.direction}
                      </Badge>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        prediction.status === 'active' && 'border-blue-500 text-blue-500',
                        prediction.status === 'success' && 'border-green-500 text-green-500',
                        prediction.status === 'fail' && 'border-red-500 text-red-500',
                        prediction.status === 'expired' && 'border-muted-foreground text-muted-foreground'
                      )}
                    >
                      {prediction.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm mb-2">
                    <span className="text-muted-foreground">
                      ${prediction.current_price.toLocaleString()} → <span className="text-foreground font-medium">${prediction.target_price.toLocaleString()}</span>
                    </span>
                    <span className="text-muted-foreground">• {prediction.time_horizon}</span>
                  </div>
                  
                  {prediction.rationale && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{prediction.rationale}</p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{prediction.confidence}% confidence</span>
                    <span>•</span>
                    <span>{format(new Date(prediction.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </Card>
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

          <TabsContent value="groups" className="mt-4">
            <Card variant="glass" className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Groups you manage or are a member of</p>
              <Button variant="outline" className="mt-4">
                Create Group
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
