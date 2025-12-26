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
import { AvatarDisplay } from "@/components/profile/AvatarDisplay";
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
  Users
} from "lucide-react";

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_streak: number | null;
  streak_type: string | null;
  total_predictions: number | null;
  total_hits: number | null;
  created_at: string | null;
}

interface FakeTraderMeta {
  platform: string;
  asset_focus: string[];
  experience_level: string;
  holding_time: string;
  trade_frequency: string;
  win_rate: number;
  average_r: number;
  total_trades: number;
  is_active: boolean;
  last_active: string;
  followers: string[];
  following: string[];
}

// Fake demo profiles for testing/demo purposes
const FAKE_PROFILES: Record<string, PublicProfile> = {
  '11111111-1111-1111-1111-111111111111': { user_id: '11111111-1111-1111-1111-111111111111', display_name: 'CryptoKing', avatar_url: 'emoji:👑', bio: 'Full-time crypto trader. BTC maximalist.', current_streak: 7, total_predictions: 156, total_hits: 112, streak_type: 'hit', created_at: '2024-01-15' },
  '22222222-2222-2222-2222-222222222222': { user_id: '22222222-2222-2222-2222-222222222222', display_name: 'ForexMaster', avatar_url: 'emoji:🧙‍♂️', bio: 'Forex scalper | 5+ years experience', current_streak: 3, total_predictions: 89, total_hits: 58, streak_type: 'hit', created_at: '2024-03-22' },
  '33333333-3333-3333-3333-333333333333': { user_id: '33333333-3333-3333-3333-333333333333', display_name: 'StockWhisperer', avatar_url: 'emoji:🦊', bio: 'Value investor turned swing trader', current_streak: 2, total_predictions: 234, total_hits: 145, streak_type: 'miss', created_at: '2023-11-08' },
  '44444444-4444-4444-4444-444444444444': { user_id: '44444444-4444-4444-4444-444444444444', display_name: 'TechTrader', avatar_url: 'emoji:🤖', bio: 'Tech stocks enthusiast. NASDAQ focused.', current_streak: 5, total_predictions: 67, total_hits: 41, streak_type: 'hit', created_at: '2024-06-01' },
  '55555555-5555-5555-5555-555555555555': { user_id: '55555555-5555-5555-5555-555555555555', display_name: 'GoldBull', avatar_url: 'emoji:🦁', bio: 'Commodities specialist. Gold & Silver.', current_streak: 1, total_predictions: 42, total_hits: 28, streak_type: 'miss', created_at: '2024-08-14' },
  '66666666-6666-6666-6666-666666666666': { user_id: '66666666-6666-6666-6666-666666666666', display_name: 'SwingKing', avatar_url: 'emoji:⚡', bio: 'Index ETF swing trader. SPY/QQQ specialist.', current_streak: 4, total_predictions: 98, total_hits: 67, streak_type: 'hit', created_at: '2024-02-10' },
  '77777777-7777-7777-7777-777777777777': { user_id: '77777777-7777-7777-7777-777777777777', display_name: 'ScalpMaster', avatar_url: 'emoji:🥷', bio: 'Scalping forex pairs since 2018. Quick in, quick out.', current_streak: 6, total_predictions: 312, total_hits: 198, streak_type: 'hit', created_at: '2023-08-20' },
  '88888888-8888-8888-8888-888888888888': { user_id: '88888888-8888-8888-8888-888888888888', display_name: 'DiamondHands', avatar_url: 'emoji:💎', bio: 'HODL gang. Long-term crypto investor.', current_streak: 12, total_predictions: 24, total_hits: 21, streak_type: 'hit', created_at: '2021-05-15' },
  '99999999-9999-9999-9999-999999999999': { user_id: '99999999-9999-9999-9999-999999999999', display_name: 'OptionsWizard', avatar_url: 'emoji:🎰', bio: 'Options strategies. Theta gang member.', current_streak: 3, total_predictions: 145, total_hits: 89, streak_type: 'hit', created_at: '2024-01-05' },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': { user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', display_name: 'AlgoTrader', avatar_url: 'emoji:🧠', bio: 'Quantitative trading. Python & ML enthusiast.', current_streak: 8, total_predictions: 456, total_hits: 298, streak_type: 'hit', created_at: '2023-03-12' },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': { user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', display_name: 'MemeStockMaven', avatar_url: 'emoji:🚀', bio: 'Riding the meme wave 🚀 GME/AMC veteran', current_streak: 1, total_predictions: 78, total_hits: 42, streak_type: 'miss', created_at: '2024-04-01' },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': { user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', display_name: 'OilBaron', avatar_url: 'emoji:🛢️', bio: 'Energy sector specialist. Crude & Natural Gas.', current_streak: 2, total_predictions: 56, total_hits: 38, streak_type: 'hit', created_at: '2023-10-20' },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': { user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', display_name: 'AsianSession', avatar_url: 'emoji:🌙', bio: 'Trading Tokyo & Sydney sessions. JPY pairs focused.', current_streak: 5, total_predictions: 134, total_hits: 89, streak_type: 'hit', created_at: '2024-05-18' },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': { user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', display_name: 'ValueHunter', avatar_url: 'emoji:🦅', bio: 'Buffett disciple. Deep value investing.', current_streak: 9, total_predictions: 34, total_hits: 28, streak_type: 'hit', created_at: '2022-11-01' },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': { user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', display_name: 'CryptoWhale', avatar_url: 'emoji:🐋', bio: 'Alt season hunter. Finding the next 100x.', current_streak: 4, total_predictions: 89, total_hits: 52, streak_type: 'hit', created_at: '2023-12-01' },
};

// Fake trader metadata with followers/following
const FAKE_TRADER_META: Record<string, FakeTraderMeta> = {
  '11111111-1111-1111-1111-111111111111': {
    platform: 'Binance',
    asset_focus: ['BTC', 'ETH', 'SOL'],
    experience_level: 'Advanced',
    holding_time: 'Swing (days)',
    trade_frequency: 'Daily',
    win_rate: 71.8,
    average_r: 2.1,
    total_trades: 156,
    is_active: true,
    last_active: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    followers: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
    following: ['88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  '22222222-2222-2222-2222-222222222222': {
    platform: 'MetaTrader 5',
    asset_focus: ['EUR/USD', 'GBP/JPY', 'USD/JPY'],
    experience_level: 'Expert',
    holding_time: 'Scalp (minutes)',
    trade_frequency: 'Multiple daily',
    win_rate: 65.2,
    average_r: 1.8,
    total_trades: 89,
    is_active: false,
    last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    followers: ['77777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd'],
    following: ['11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777'],
  },
  '33333333-3333-3333-3333-333333333333': {
    platform: 'TradingView',
    asset_focus: ['AAPL', 'NVDA', 'MSFT', 'META'],
    experience_level: 'Advanced',
    holding_time: 'Swing (days)',
    trade_frequency: 'Weekly',
    win_rate: 62.0,
    average_r: 1.5,
    total_trades: 234,
    is_active: true,
    last_active: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    followers: ['44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'],
    following: ['11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666'],
  },
  '44444444-4444-4444-4444-444444444444': {
    platform: 'Interactive Brokers',
    asset_focus: ['AMD', 'GOOGL', 'AMZN'],
    experience_level: 'Intermediate',
    holding_time: 'Day trading',
    trade_frequency: 'Daily',
    win_rate: 61.2,
    average_r: 1.7,
    total_trades: 67,
    is_active: false,
    last_active: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    followers: ['33333333-3333-3333-3333-333333333333'],
    following: ['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999'],
  },
  '55555555-5555-5555-5555-555555555555': {
    platform: 'MetaTrader 5',
    asset_focus: ['XAU/USD', 'XAG/USD'],
    experience_level: 'Intermediate',
    holding_time: 'Swing (days)',
    trade_frequency: 'Few per week',
    win_rate: 66.7,
    average_r: 1.4,
    total_trades: 42,
    is_active: true,
    last_active: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    followers: ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
    following: ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
  },
  '66666666-6666-6666-6666-666666666666': {
    platform: 'TD Ameritrade',
    asset_focus: ['SPY', 'QQQ', 'IWM'],
    experience_level: 'Advanced',
    holding_time: 'Swing (1-2 weeks)',
    trade_frequency: 'Weekly',
    win_rate: 68.4,
    average_r: 1.9,
    total_trades: 98,
    is_active: true,
    last_active: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    followers: ['33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'],
    following: ['33333333-3333-3333-3333-333333333333'],
  },
  '77777777-7777-7777-7777-777777777777': {
    platform: 'cTrader',
    asset_focus: ['EUR/USD', 'USD/JPY', 'GBP/USD'],
    experience_level: 'Expert',
    holding_time: 'Scalp (1-30 min)',
    trade_frequency: '20+ per day',
    win_rate: 63.5,
    average_r: 1.2,
    total_trades: 312,
    is_active: true,
    last_active: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    followers: ['22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd'],
    following: ['22222222-2222-2222-2222-222222222222'],
  },
  '88888888-8888-8888-8888-888888888888': {
    platform: 'Coinbase',
    asset_focus: ['BTC', 'ETH', 'SOL'],
    experience_level: 'Advanced',
    holding_time: 'Long-term (months)',
    trade_frequency: 'Monthly',
    win_rate: 87.5,
    average_r: 5.2,
    total_trades: 24,
    is_active: false,
    last_active: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    followers: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
    following: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
  },
  '99999999-9999-9999-9999-999999999999': {
    platform: 'Tastytrade',
    asset_focus: ['TSLA', 'NVDA', 'SPY'],
    experience_level: 'Expert',
    holding_time: 'Options (weeks)',
    trade_frequency: 'Daily',
    win_rate: 61.4,
    average_r: 2.3,
    total_trades: 145,
    is_active: true,
    last_active: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    followers: ['44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333'],
    following: ['33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'],
  },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': {
    platform: 'Bybit',
    asset_focus: ['BTC', 'ETH', 'LINK'],
    experience_level: 'Expert',
    holding_time: 'Algo (variable)',
    trade_frequency: '50+ per day',
    win_rate: 65.4,
    average_r: 1.6,
    total_trades: 456,
    is_active: true,
    last_active: new Date(Date.now() - 30 * 1000).toISOString(),
    followers: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
    following: [],
  },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': {
    platform: 'Robinhood',
    asset_focus: ['GME', 'AMC', 'BBBY'],
    experience_level: 'Beginner',
    holding_time: 'Variable',
    trade_frequency: 'Sporadic',
    win_rate: 53.8,
    average_r: 0.8,
    total_trades: 78,
    is_active: false,
    last_active: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    followers: [],
    following: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
  },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': {
    platform: 'NinjaTrader',
    asset_focus: ['CL', 'NG', 'GC'],
    experience_level: 'Advanced',
    holding_time: 'Day trading',
    trade_frequency: 'Daily',
    win_rate: 67.9,
    average_r: 2.0,
    total_trades: 56,
    is_active: true,
    last_active: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    followers: ['55555555-5555-5555-5555-555555555555'],
    following: ['55555555-5555-5555-5555-555555555555'],
  },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': {
    platform: 'OANDA',
    asset_focus: ['USD/JPY', 'EUR/JPY', 'AUD/JPY'],
    experience_level: 'Advanced',
    holding_time: 'Swing (days)',
    trade_frequency: 'Few per week',
    win_rate: 66.4,
    average_r: 1.8,
    total_trades: 134,
    is_active: false,
    last_active: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    followers: ['77777777-7777-7777-7777-777777777777'],
    following: ['22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777'],
  },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': {
    platform: 'Fidelity',
    asset_focus: ['BRK.B', 'JPM', 'V'],
    experience_level: 'Expert',
    holding_time: 'Long-term (years)',
    trade_frequency: 'Monthly',
    win_rate: 82.4,
    average_r: 3.1,
    total_trades: 34,
    is_active: false,
    last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    followers: ['33333333-3333-3333-3333-333333333333'],
    following: ['33333333-3333-3333-3333-333333333333'],
  },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': {
    platform: 'Kraken',
    asset_focus: ['SOL', 'AVAX', 'LINK'],
    experience_level: 'Advanced',
    holding_time: 'Swing (weeks)',
    trade_frequency: 'Weekly',
    win_rate: 58.4,
    average_r: 3.8,
    total_trades: 89,
    is_active: true,
    last_active: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    followers: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'],
    following: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
};

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

        // Map to PublicPredictionData format with profile
        const mappedPredictions: PublicPredictionData[] = (data || []).map(p => ({
          ...p,
          profile: profile ? {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            current_streak: profile.current_streak || 0,
            streak_type: profile.streak_type || "none",
            total_predictions: profile.total_predictions || 0,
            total_hits: profile.total_hits || 0,
          } : null
        }));

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

        {/* Profile Header */}
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AvatarDisplay 
                avatarUrl={profile.avatar_url} 
                displayName={displayName} 
                size={80}
                className="border-4 border-border"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{displayName}</h1>
                  
                  {/* Active Status Badge */}
                  {traderMeta && (
                    <Badge 
                      variant="outline" 
                      className={`gap-1 ${traderMeta.is_active ? 'text-gain border-gain/30 bg-gain/10' : 'text-muted-foreground border-border'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${traderMeta.is_active ? 'bg-gain animate-pulse' : 'bg-muted-foreground'}`} />
                      {traderMeta.is_active ? 'Active' : getTimeAgo(traderMeta.last_active)}
                    </Badge>
                  )}
                  
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
                
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                )}
                
                {/* Follower/Following Counts */}
                {traderMeta && (
                  <div className="flex items-center gap-4 mt-2">
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
                
                {/* Platform Badge */}
                {traderMeta && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="w-3 h-3" />
                      {traderMeta.platform}
                    </Badge>
                    {traderMeta.asset_focus.slice(0, 3).map((asset) => (
                      <Badge key={asset} variant="outline" className="text-xs">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {profile.created_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Follow Button */}
            {currentUserId && !isOwnProfile && (
              <Button
                variant={isFollowingUser ? "default" : "outline"}
                className="w-full mt-4 gap-2"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowingUser ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </Button>
            )}

            {isOwnProfile && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/profile")}
              >
                Edit Profile
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Trading Metrics */}
        {traderMeta && (
          <Card variant="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" />
                Trading Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gain">{traderMeta.win_rate}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{traderMeta.average_r}R</div>
                  <div className="text-xs text-muted-foreground">Avg R</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{traderMeta.total_trades}</div>
                  <div className="text-xs text-muted-foreground">Total Trades</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium">{traderMeta.trade_frequency}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-gain" />
              <div className="text-2xl font-bold">{profile.total_hits || 0}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{profile.total_predictions || 0}</div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </CardContent>
          </Card>
        </div>

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