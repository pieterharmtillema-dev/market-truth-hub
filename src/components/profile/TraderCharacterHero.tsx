import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarDisplay } from "./AvatarDisplay";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { CategoryBadge, TraderCategory } from "./CategoryBadge";
import { useTradingMetrics } from "@/hooks/useTradingMetrics";
import { AdjustedWinRate, calculateAdjustedWinRate, getMinimumTrades } from "@/components/analytics/AdjustedWinRate";
import { WinLossSizeRatio, calculateNormalizedReturn } from "@/components/analytics/WinLossSizeRatio";
import { PerformanceTrend } from "@/components/analytics/PerformanceTrend";
import { CharacterRenderer } from "./CharacterRenderer";
import { CharacterCustomizer } from "./CharacterCustomizer";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, parseCharacterConfig, stringifyCharacterConfig } from "./characterConfig";
import { useToast } from "@/hooks/use-toast";
import { HeroEnvironment, CharacterAccessories, calculateUnlocks } from "./HeroEnvironment";
import { formatExchangeName } from "@/lib/exchangeUtils";
import {
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Award,
  BarChart3,
  User,
  Clock,
  Shield,
  ArrowUp,
  Users,
  Share2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  character_config: string | null;
}

interface TraderProfile {
  holding_time: string | null;
  risk_per_trade: string | null;
  decision_style: string | null;
  experience_level: string | null;
  trader_category: TraderCategory | null;
  trading_session: string | null;
}

interface TraderCharacterHeroProps {
  userId: string;
  connectedExchanges?: string[];
  onProfileUpdated?: (data: { display_name: string; avatar_url: string; bio: string }) => void;
  onSocialClick?: () => void;
  followersCount?: number;
  followingCount?: number;
}

// Map holding_time to trading class
const getTradeClass = (holdingTime: string | null): string => {
  if (!holdingTime) return "Trader";

  const mapping: Record<string, string> = {
    "seconds_to_minutes": "Scalper",
    "minutes_to_hours": "Day Trader",
    "hours_to_days": "Swing Trader",
    "days_to_weeks": "Position Trader",
    "weeks_to_months": "Investor",
  };

  return mapping[holdingTime] || "Trader";
};

// Format holding time for display
const formatHoldingTime = (holdingTime: string | null): string => {
  if (!holdingTime) return "";
  return holdingTime.split("_").map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
};

// Format risk for display
const formatRisk = (risk: string | null): string => {
  if (!risk) return "";
  const riskMap: Record<string, string> = {
    "less_than_1": "< 1% Risk",
    "1_to_2": "1-2% Risk",
    "2_to_5": "2-5% Risk",
    "5_to_10": "5-10% Risk",
    "more_than_10": "> 10% Risk",
  };
  return riskMap[risk] || risk;
};

// Map trading session to environment theme
const getSessionTheme = (session: string | null): 'day' | 'night' | 'sunset' | 'asian' | 'london' | 'newyork' => {
  if (!session) return 'night';

  const sessionMap: Record<string, 'day' | 'night' | 'sunset' | 'asian' | 'london' | 'newyork'> = {
    'asian': 'asian',
    'london': 'london',
    'new_york': 'newyork',
    'overlap': 'sunset', // London/NY overlap = sunset transition
    'all_sessions': 'night', // Default night theme for all sessions
  };

  return sessionMap[session] || 'night';
};

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function TraderCharacterHero({
  userId,
  connectedExchanges,
  onProfileUpdated,
  onSocialClick,
  followersCount = 0,
  followingCount = 0
}: TraderCharacterHeroProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [totalTrades, setTotalTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();

  // Get real trading metrics
  const { metrics, loading: loadingMetrics } = useTradingMetrics();

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

  const environmentUnlocks = useMemo(
    () => calculateUnlocks(totalTrades, winRate, bestStreak, undefined, userEmail ?? undefined),
    [totalTrades, winRate, bestStreak, userEmail]
  );

  // Get time filter start date based on timeFrame
  const getTimeFilterStartDate = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    // Reset to start of day for accurate "today" filtering
    startDate.setHours(0, 0, 0, 0);

    switch (timeFrame) {
      case 'daily':
        // Today: start of current day (already set above)
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    return startDate;
  }, [timeFrame]);

  // Filter positions by time frame for use in charts and metrics
  const timeFilteredPositions = useMemo(() => {
    return positions.filter(p => {
      if (p.open || p.pnl === null || p.pnl === 0) return false;
      const exitDate = p.exit_timestamp ? new Date(p.exit_timestamp) : null;
      if (!exitDate) return false;
      return exitDate >= getTimeFilterStartDate;
    });
  }, [positions, getTimeFilterStartDate]);

  // Calculate time-filtered metrics
  const timeFilteredMetrics = useMemo(() => {
    const closedTrades = timeFilteredPositions;
    const totalPnl = closedTrades.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const wins = closedTrades.filter(p => (p.pnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Calculate best streak for this time frame
    let longestWin = 0;
    let currentStreak = 0;
    let lastResult: 'win' | 'loss' | null = null;

    const sortedClosed = [...closedTrades].sort((a, b) =>
      new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime()
    );

    for (const position of sortedClosed) {
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

    return {
      totalPnl,
      winRate,
      bestStreak: longestWin,
      totalTrades: closedTrades.length,
    };
  }, [timeFilteredPositions]);

  // Real data from metrics
  const accuracy = metrics?.accuracy_score || 0;
  const totalPredictions = metrics?.total_verified_trades || totalTrades;
  const exchangeLabels = useMemo(
    () => (connectedExchanges || []).map((exchange) => formatExchangeName(exchange) || exchange).filter(Boolean),
    [connectedExchanges]
  );
  const hasExchangeVerifiedTrades = useMemo(
    () => positions.some((pos) => pos.is_exchange_verified || pos.exchange_source),
    [positions]
  );
  const showExchangeVerification = hasExchangeVerifiedTrades && exchangeLabels.length > 0;
  const exchangeSummary = exchangeLabels.join(", ");
  const exchangePreview = exchangeLabels.slice(0, 2).join(", ");
  const extraExchangeCount = Math.max(exchangeLabels.length - 2, 0);

  // Calculate level
  const level = Math.floor(totalTrades / 25) + 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: authData } = await supabase.auth.getUser();
        setUserEmail(authData.user?.email ?? null);

        // Fetch profile data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, character_config")
          .eq("user_id", userId)
          .single();

        if (profileData) {
          setProfile({
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url,
            bio: profileData.bio,
            character_config: profileData.character_config as string | null,
          });

          // Parse character config
          if (profileData.character_config && typeof profileData.character_config === 'string') {
            const parsed = parseCharacterConfig(profileData.character_config);
            if (parsed) {
              setCharacterConfig(parsed);
            }
          }
        }

        // Fetch trader profile data
        const { data: traderData } = await supabase
          .from("trader_profiles")
          .select("holding_time, risk_per_trade, decision_style, experience_level, trader_category, trading_session")
          .eq("user_id", userId)
          .maybeSingle();

        if (traderData) {
          setTraderProfile(traderData);
        }

        // Fetch trading stats from positions
        const { data: positionsData } = await supabase
          .from("positions")
          .select("id, pnl, pnl_pct, open, entry_timestamp, exit_timestamp, exchange_source, is_exchange_verified")
          .eq("user_id", userId);

        if (positionsData) {
          setPositions(positionsData);
          setTotalTrades(positionsData.length);

          // Calculate win rate
          const closedTrades = positionsData.filter(p => p.pnl !== null);
          const wins = closedTrades.filter(p => (p.pnl || 0) > 0).length;
          const calculatedWinRate = closedTrades.length > 0
            ? (wins / closedTrades.length) * 100
            : 0;
          setWinRate(calculatedWinRate);
        }

        setLoading(false);

        // Trigger animation after data loads
        setTimeout(() => setStatsAnimated(true), 300);
      } catch (error) {
        console.error("Error fetching trader data:", error);
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to trader profile changes for real-time updates
    const channel = supabase
      .channel('trader_profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trader_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Trader profile updated:', payload);
          // Update trader profile state with new data
          if (payload.new) {
            setTraderProfile(payload.new as TraderProfile);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleProfileUpdate = (data: { display_name: string; avatar_url: string; bio: string }) => {
    setProfile(prev => prev ? { ...prev, ...data } : null);
    onProfileUpdated?.(data);
  };

  const handleCharacterSave = async (newConfig: CharacterConfig) => {
    try {
      const encoded = stringifyCharacterConfig(newConfig);
      const { error } = await supabase
        .from("profiles")
        .update({ character_config: encoded })
        .eq("user_id", userId);

      if (error) throw error;

      setCharacterConfig(newConfig);
      toast({
        title: "Character saved!",
        description: "Your character customization has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save character:", error);
      toast({
        title: "Error saving character",
        description: "There was an error saving your character. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <div className="p-6 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  const traderClass = getTradeClass(traderProfile?.holding_time);
  const environmentTheme = getSessionTheme(traderProfile?.trading_session);

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .float-anim {
          animation: float 4s ease-in-out infinite;
        }

        .glow-pulse {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .stat-bar-fill {
          transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .character-glow {
          filter: drop-shadow(0 0 40px rgba(61, 214, 140, 0.3));
        }

        .scanline {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(61, 214, 140, 0.1) 2px,
            rgba(61, 214, 140, 0.1) 4px
          );
        }
      `}</style>

      <div className="relative overflow-hidden sm:rounded-2xl -mx-4 sm:mx-0 min-h-[500px] sm:min-h-[600px]">
        {/* Full-bleed Environment Background */}
        <div className="absolute inset-0 w-full h-full">
          <HeroEnvironment
            unlocks={environmentUnlocks}
            theme={environmentTheme}
            preferences={characterConfig.environment}
          />
        </div>
        
        {/* Gradient overlays for seamless integration */}
        {/* Bottom fade - strong fade from bottom up, ending where trader stats begin */}
        <div className="absolute inset-x-0 bottom-0 h-80 sm:h-64 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />

        {/* Top fade - stronger header area fade */}
        <div className="absolute inset-x-0 top-0 h-32 sm:h-40 bg-gradient-to-b from-background/90 via-background/50 to-transparent pointer-events-none" />

        {/* Side fades - stronger edge darkening for depth */}
        <div className="absolute inset-y-0 left-0 w-32 sm:w-40 bg-gradient-to-r from-background/60 via-background/20 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 sm:w-40 bg-gradient-to-l from-background/60 via-background/20 to-transparent pointer-events-none" />

        {/* Central vertical fade - creates smooth transition from background to content area */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/95 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(var(--background-rgb, 0, 0, 0), 0.5) 55%, rgba(var(--background-rgb, 0, 0, 0), 0.95) 100%)'
        }} />

        {/* Content Layer */}
        <div className="relative z-10">
          {/* Top Profile Bar */}
          <div className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
              {/* Left: Avatar + Name */}
              <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
                  {/* Character upper body portrait - head prominently focused */}
                  <svg viewBox="42 24 60 60" className="w-full h-full" preserveAspectRatio="xMidYMid slice" style={{ transform: 'scale(1.1)' }}>
                    <defs>
                      <linearGradient id="avatar-head-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={adjustBrightness(characterConfig.skinTone, 10)} stopOpacity="1" />
                        <stop offset="100%" stopColor={characterConfig.skinTone} stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="avatar-body-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={characterConfig.skinTone} stopOpacity="1" />
                        <stop offset="100%" stopColor={adjustBrightness(characterConfig.skinTone, -20)} stopOpacity="1" />
                      </linearGradient>
                    </defs>

                    {/* Left Arm */}
                    <rect x="54" y="72" width="4" height="16" rx="2"
                      fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#avatar-body-gradient)`} />

                    {/* Right Arm */}
                    <rect x="86" y="72" width="4" height="16" rx="2"
                      fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#avatar-body-gradient)`} />

                    {/* Neck */}
                    <rect x="69" y="60" width="6" height="8" rx="3" fill="url(#avatar-body-gradient)" />

                    {/* Torso - matching hero card style */}
                    {characterConfig.top.type !== 'none' ? (
                      <rect x="62" y="66" width="20" height="18" rx="6" fill={characterConfig.top.color} />
                    ) : (
                      <rect x="62" y="66" width="20" height="18" rx="6" fill="url(#avatar-body-gradient)" />
                    )}

                    {/* Hair back layer */}
                    {characterConfig.face?.hairStyle === 'long' && (
                      <ellipse cx="72" cy="52" rx="20" ry="16" fill={characterConfig.face?.hairColor || '#2D1B0E'} />
                    )}

                    {/* Head */}
                    <ellipse cx="72" cy="44" rx="16" ry="18" fill="url(#avatar-head-gradient)" />

                    {/* Ears */}
                    <ellipse cx="56" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />
                    <ellipse cx="88" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />

                    {/* Hair - using HeadRenderer logic inline */}
                    <HairSVG hairStyle={characterConfig.face?.hairStyle || 'short'} hairColor={characterConfig.face?.hairColor || '#2D1B0E'} />

                    {/* Eyes */}
                    <ellipse cx="66" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
                    <ellipse cx="78" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
                    <circle cx="66" cy="44" r="1.5" fill={characterConfig.face?.eyeColor || '#4A90D9'} />
                    <circle cx="78" cy="44" r="1.5" fill={characterConfig.face?.eyeColor || '#4A90D9'} />
                    <circle cx="65" cy="43.5" r="0.5" fill="#FFFFFF" />
                    <circle cx="77" cy="43.5" r="0.5" fill="#FFFFFF" />

                    {/* Nose */}
                    <path d="M 72 46 L 72 50 L 70 51" stroke={adjustBrightness(characterConfig.skinTone, -30)} strokeWidth="1" fill="none" strokeLinecap="round" />

                    {/* Mouth */}
                    <path d="M 68 54 Q 72 56 76 54" stroke={adjustBrightness(characterConfig.skinTone, -40)} strokeWidth="1.5" fill="none" strokeLinecap="round" />

                    {/* Accessories */}
                    {/* Sunglasses */}
                    {characterConfig.accessories.sunglasses?.enabled && (
                      <g>
                        {characterConfig.accessories.sunglasses.style === 'aviator' ? (
                          <>
                            <ellipse cx="64" cy="45" rx="6" ry="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <ellipse cx="80" cy="45" rx="6" ry="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <path d="M 58 44 L 52 42" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 70 44 L 74 44" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 86 44 L 92 42" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                          </>
                        ) : characterConfig.accessories.sunglasses.style === 'round' ? (
                          <>
                            <circle cx="64" cy="45" r="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <circle cx="80" cy="45" r="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <path d="M 59 45 L 52 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 69 45 L 75 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 85 45 L 92 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                          </>
                        ) : (
                          <>
                            <rect x="58" y="42" width="12" height="6" rx="1" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <rect x="74" y="42" width="12" height="6" rx="1" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                            <path d="M 58 45 L 52 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 70 45 L 74 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                            <path d="M 86 45 L 92 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                          </>
                        )}
                      </g>
                    )}

                    {/* Necklace */}
                    {characterConfig.accessories.necklace?.enabled && (
                      <g>
                        <path d="M 62 64 Q 72 68 82 64" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        <circle cx="65" cy="65" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
                        <circle cx="68" cy="66" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
                        <circle cx="72" cy="66.5" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
                        <circle cx="76" cy="66" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
                        <circle cx="79" cy="65" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
                        <path d="M 63 63 Q 72 67 81 63" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                        {characterConfig.accessories.necklace.type === 'pendant' && (
                          <>
                            <circle cx="72" cy="72" r="3.5" fill={characterConfig.accessories.necklace.color || '#FFD700'} />
                            <circle cx="72" cy="72" r="2.5" fill={adjustBrightness(characterConfig.accessories.necklace.color || '#FFD700', -20)} />
                            <circle cx="71" cy="71" r="0.8" fill="rgba(255,255,255,0.7)" />
                          </>
                        )}
                      </g>
                    )}
                  </svg>
                </div>
                <div className="max-w-md flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold mb-1 text-foreground drop-shadow-lg">
                    {profile?.display_name || "Set Your Name"}
                  </h1>
                  <p className="text-xs sm:text-sm text-primary drop-shadow-md mb-2">
                    {traderClass} • Level {level}
                  </p>
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 drop-shadow-sm">
                      {profile.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {traderProfile?.trader_category && (
                      <Badge className="bg-background/40 backdrop-blur-sm text-primary border-primary/30">
                        <Zap className="w-3 h-3 mr-1" />
                        {traderProfile.trader_category.replace("_", " ")}
                      </Badge>
                    )}
                    {(followersCount > 0 || followingCount > 0) && (
                      <Badge
                        className="bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm text-primary border-primary/50 cursor-pointer hover:from-primary/30 hover:to-primary/20 transition-all shadow-sm"
                        onClick={onSocialClick}
                      >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        <span className="font-semibold">{followersCount}</span>
                        <span className="mx-1 opacity-60">•</span>
                        <span className="font-semibold">{followingCount}</span>
                        <span className="ml-1 text-[10px] opacity-80">following</span>
                      </Badge>
                    )}
                    {traderProfile?.holding_time && (
                      <Badge className="bg-background/40 backdrop-blur-sm text-muted-foreground border-border/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatHoldingTime(traderProfile.holding_time)}
                      </Badge>
                    )}
                    {traderProfile?.risk_per_trade && (
                      <Badge className="bg-background/40 backdrop-blur-sm text-muted-foreground border-border/30">
                        <Shield className="w-3 h-3 mr-1" />
                        {formatRisk(traderProfile.risk_per_trade)}
                      </Badge>
                    )}
                    {showExchangeVerification && (
                      <Badge
                        className="bg-emerald-500/15 backdrop-blur-sm text-emerald-200 border-emerald-500/30"
                        title={exchangeSummary}
                      >
                        <Shield className="w-3 h-3 mr-1 text-emerald-400" />
                        Exchange Verified
                        {exchangePreview && (
                          <span className="ml-1 text-[10px] uppercase tracking-wider text-emerald-100">
                            {exchangePreview}
                            {extraExchangeCount > 0 ? ` +${extraExchangeCount}` : ""}
                          </span>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-2 self-start sm:self-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/30 backdrop-blur-sm hover:bg-background/50 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={onSocialClick}
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/30 backdrop-blur-sm hover:bg-background/50 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${profile?.display_name || 'Trader'}'s Profile`,
                        text: `Check out my trading profile`,
                        url: window.location.href,
                      });
                    }
                  }}
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <ProfileEditDialog
                  userId={userId}
                  currentName={profile?.display_name}
                  currentAvatarUrl={profile?.avatar_url}
                  currentBio={profile?.bio}
                  onProfileUpdated={handleProfileUpdate}
                />
              </div>
            </div>
          </div>

          {/* Main Hero Area with Character and Trading Metrics */}
          <div className="relative flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 px-2 sm:px-4 md:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4">
            {/* Left: PnL & Period Streak */}
            <div className="flex-1 max-w-[140px] sm:max-w-[180px] md:max-w-[200px] space-y-1.5 sm:space-y-2">
              {/* Section Header with Time Frame Filter */}
              <div className="flex flex-col items-center gap-1 mb-1">
                <span className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Period</span>
                <div className="flex gap-0.5 bg-background/40 backdrop-blur-sm rounded-md p-0.5 border border-border/30">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeFrame(tf)}
                      className={cn(
                        "px-1 sm:px-1.5 py-0.5 text-[7px] sm:text-[8px] md:text-[9px] font-medium rounded transition-all uppercase tracking-wider",
                        timeFrame === tf
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tf.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>

              {/* PnL Summary Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 sm:p-2 md:p-2.5">
                <div className="text-center">
                  <span className={cn(
                    "text-lg sm:text-xl md:text-2xl font-bold block",
                    timeFilteredMetrics.totalPnl >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {timeFilteredMetrics.totalPnl >= 0 ? '+' : ''}${timeFilteredMetrics.totalPnl.toFixed(2)}
                  </span>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground mt-0.5">P&L</p>
                  <p className="text-[7px] sm:text-[8px] md:text-[9px] text-muted-foreground/60">{timeFilteredMetrics.totalTrades} trades</p>
                </div>
              </div>

              {/* Performance Trend - Full Hero Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden h-20 sm:h-24">
                <PerformanceTrend positions={timeFilteredPositions} hero isPublic={false} />
              </div>

              {/* Best Streak Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 sm:p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Best Streak</span>
                  <span className="text-sm sm:text-base md:text-lg font-bold text-amber-400">
                    {timeFilteredMetrics.totalTrades === 0 ? '--' : timeFilteredMetrics.bestStreak}
                  </span>
                </div>
                {timeFilteredMetrics.totalTrades > 0 && (
                  <div className="mt-1 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(timeFilteredMetrics.bestStreak * 10, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Character */}
            <div className="relative flex items-end justify-center flex-shrink-0">
              {/* Character - Integrated into scene */}
              <div className="relative group">
                <div className="relative float-anim character-glow">
                  {/* Ground glow effect */}
                  <div className="absolute -bottom-2 sm:-bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 w-16 sm:w-20 md:w-24 h-4 sm:h-5 md:h-6 bg-primary/30 blur-2xl rounded-full" />

                  {/* Character Renderer */}
                  <div className="relative z-10 w-32 h-48 sm:w-40 sm:h-56 md:w-48 md:h-64">
                    <CharacterRenderer
                      config={characterConfig}
                      className="w-full h-full"
                    />
                    {/* Unlockable accessories overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 144 192">
                      <CharacterAccessories unlocks={environmentUnlocks} />
                    </svg>
                  </div>
                </div>

                {/* Edit overlay on hover */}
                <div
                  className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-20"
                  onClick={() => setCustomizerOpen(true)}
                >
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />
                    <span className="text-[8px] sm:text-[10px] md:text-xs text-primary font-semibold">Customize</span>
                  </div>
                </div>

                {/* Level badge */}
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-gradient-to-br from-primary to-primary/80 rounded-full border-2 border-background flex items-center justify-center shadow-lg z-30">
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-primary-foreground">{level}</span>
                </div>
              </div>
            </div>

            {/* Right: Win Rate & All-Time Stats */}
            <div className="flex-1 max-w-[140px] sm:max-w-[180px] md:max-w-[200px] space-y-1.5 sm:space-y-2">
              {/* Section Header */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">All-Time</span>
              </div>

              {/* Adjusted Win Rate Card */}
              <AdjustedWinRate 
                positions={positions} 
                traderCategory={traderProfile?.trader_category}
                showCard={false}
              />

              {/* All-Time Stats */}
              <div className="space-y-1.5 sm:space-y-2">
                {/* Total Trades */}
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 sm:p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Total Trades</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                      {totalTrades}
                    </span>
                  </div>
                  <div className="mt-1 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(totalTrades * 2, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Win/Loss Size Ratio */}
                <WinLossSizeRatio positions={positions} showCard={false} />

                {/* Avg Return */}
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 sm:p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Avg Return</span>
                    <span className={cn(
                      "text-sm sm:text-base md:text-lg font-bold",
                      avgReturn > 0 ? "text-primary" : avgReturn < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        avgReturn >= 0 ? "bg-primary" : "bg-destructive"
                      )}
                      style={{ width: `${Math.min(Math.abs(avgReturn) * 5, 100)}%` }}
                    />
                  </div>
                </div>

                {/* All-Time Best Streak */}
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 sm:p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Best Streak</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-amber-400">{bestStreak}</span>
                  </div>
                  <div className="mt-1 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(bestStreak * 10, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unlocks indicator */}
          {totalTrades > 0 && (
            <div className="flex justify-center pb-4">
              <div className="bg-background/60 backdrop-blur-sm border border-border/30 rounded-full px-4 py-1.5">
                <span className="text-xs text-muted-foreground">
                  🏆 {Object.values(environmentUnlocks).filter(Boolean).length} unlocks earned
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Character Customizer Dialog */}
      <CharacterCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        config={characterConfig}
        onSave={handleCharacterSave}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
        totalTrades={totalTrades}
        winRate={winRate}
        streak={bestStreak}
        userEmail={userEmail}
      />
    </>
  );
}

// Helper function to adjust brightness for colors
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper component for hair in avatar
function HairSVG({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
  switch (hairStyle) {
    case 'short':
      return (
        <g>
          <path d="M 58 36 Q 60 28 72 26 Q 84 28 86 36 Q 84 32 72 30 Q 60 32 58 36" fill={hairColor} />
          <ellipse cx="72" cy="30" rx="12" ry="6" fill={hairColor} />
        </g>
      );
    case 'medium':
      return (
        <g>
          <path d="M 56 40 Q 56 28 72 24 Q 88 28 88 40" fill={hairColor} />
          <path d="M 56 40 Q 54 48 56 52" fill={hairColor} />
          <path d="M 88 40 Q 90 48 88 52" fill={hairColor} />
        </g>
      );
    case 'long':
      return (
        <g>
          <path d="M 54 40 Q 52 28 72 22 Q 92 28 90 40" fill={hairColor} />
          <path d="M 54 40 Q 50 56 54 68" fill={hairColor} />
          <path d="M 90 40 Q 94 56 90 68" fill={hairColor} />
        </g>
      );
    case 'buzz':
      return <ellipse cx="72" cy="32" rx="14" ry="8" fill={hairColor} opacity="0.8" />;
    case 'bald':
      return null;
    case 'mohawk':
      return (
        <g>
          <rect x="68" y="20" width="8" height="18" rx="2" fill={hairColor} />
          <path d="M 68 20 L 72 14 L 76 20" fill={hairColor} />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <ellipse cx="72" cy="30" rx="14" ry="8" fill={hairColor} />
          <path d="M 72 38 Q 80 40 85 50 Q 88 60 86 70" stroke={hairColor} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'afro':
      return <ellipse cx="72" cy="36" rx="22" ry="20" fill={hairColor} />;
    default:
      return <ellipse cx="72" cy="30" rx="12" ry="6" fill={hairColor} />;
  }
}
