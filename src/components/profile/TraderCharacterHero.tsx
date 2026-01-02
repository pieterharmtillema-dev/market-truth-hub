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
import { CharacterRenderer } from "./CharacterRenderer";
import { CharacterCustomizer } from "./CharacterCustomizer";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, parseCharacterConfig, stringifyCharacterConfig } from "./characterConfig";
import { useToast } from "@/hooks/use-toast";
import { HeroEnvironment, CharacterAccessories, calculateUnlocks } from "./HeroEnvironment";
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
}

interface TraderCharacterHeroProps {
  userId: string;
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

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function TraderCharacterHero({ userId, onProfileUpdated, onSocialClick, followersCount = 0, followingCount = 0 }: TraderCharacterHeroProps) {
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

  // Calculate time-filtered metrics
  const timeFilteredMetrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFrame) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
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

    const filteredPositions = positions.filter(p => {
      const entryDate = new Date(p.entry_timestamp);
      return entryDate >= startDate;
    });

    const closedTrades = filteredPositions.filter(p => !p.open && p.pnl !== null && p.pnl !== 0);
    const totalPnl = closedTrades.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const wins = closedTrades.filter(p => (p.pnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Calculate best streak for this time frame
    let longestWin = 0;
    let currentStreak = 0;
    let lastResult: 'win' | 'loss' | null = null;

    const sortedClosed = closedTrades.sort((a, b) =>
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
  }, [positions, timeFrame]);

  // Real data from metrics
  const accuracy = metrics?.accuracy_score || 0;
  const totalPredictions = metrics?.total_verified_trades || totalTrades;

  // Calculate level
  const level = Math.floor(totalTrades / 25) + 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

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
          .select("holding_time, risk_per_trade, decision_style, experience_level, trader_category")
          .eq("user_id", userId)
          .maybeSingle();

        if (traderData) {
          setTraderProfile(traderData);
        }

        // Fetch trading stats from positions
        const { data: positionsData } = await supabase
          .from("positions")
          .select("id, pnl, pnl_pct, open, entry_timestamp")
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

      <div className="relative overflow-hidden rounded-2xl">
        {/* Full-bleed Environment Background */}
        <div className="absolute inset-0">
          <HeroEnvironment 
            unlocks={calculateUnlocks(totalTrades, winRate, bestStreak)}
            theme="night"
          />
        </div>
        
        {/* Gradient overlays for seamless integration */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/90 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background/60 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background/60 to-transparent pointer-events-none" />

        {/* Content Layer */}
        <div className="relative z-10">
          {/* Top Profile Bar */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              {/* Left: Avatar + Name */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0 backdrop-blur-sm bg-background/30">
                  {/* Character head as avatar - larger view */}
                  <svg viewBox="40 20 64 50" className="w-full h-full" style={{ transform: 'scale(1.3) translateY(-8px)' }}>
                    <defs>
                      <linearGradient id="avatar-head-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={adjustBrightness(characterConfig.skinTone, 10)} stopOpacity="1" />
                        <stop offset="100%" stopColor={characterConfig.skinTone} stopOpacity="1" />
                      </linearGradient>
                    </defs>

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
                  </svg>
                </div>
                <div className="max-w-md">
                  <h1 className="text-2xl font-bold mb-1 text-foreground drop-shadow-lg">
                    {profile?.display_name || "Set Your Name"}
                  </h1>
                  <p className="text-sm text-primary drop-shadow-md mb-2">
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
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/30 backdrop-blur-sm hover:bg-background/50"
                  onClick={onSocialClick}
                >
                  <Users className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/30 backdrop-blur-sm hover:bg-background/50"
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
                  <Share2 className="w-4 h-4" />
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
          <div className="relative flex items-center justify-center gap-6 px-6 pb-6 pt-4">
            {/* Left: PnL & Period Streak */}
            <div className="flex-1 max-w-[200px] space-y-2.5">
              {/* Section Header with Time Frame Filter */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Period</span>
                <div className="flex gap-0.5 bg-background/40 backdrop-blur-sm rounded-md p-0.5 border border-border/30">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeFrame(tf)}
                      className={cn(
                        "px-1.5 py-0.5 text-[9px] font-medium rounded transition-all uppercase tracking-wider",
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
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-3">
                <div className="text-center">
                  <span className={cn(
                    "text-2xl font-bold block",
                    timeFilteredMetrics.totalPnl >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {timeFilteredMetrics.totalPnl >= 0 ? '+' : ''}${timeFilteredMetrics.totalPnl.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">P&L</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">{timeFilteredMetrics.totalTrades} trades</p>
                </div>
              </div>

              {/* Best Streak Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Best Streak</span>
                  <span className="text-base font-bold text-amber-400">
                    {timeFilteredMetrics.totalTrades === 0 ? '--' : timeFilteredMetrics.bestStreak}
                  </span>
                </div>
                {timeFilteredMetrics.totalTrades > 0 && (
                  <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(timeFilteredMetrics.bestStreak * 10, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Character */}
            <div className="relative flex items-end justify-center">
              {/* Character - Integrated into scene */}
              <div className="relative group">
                <div className="relative float-anim character-glow">
                  {/* Ground glow effect */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/30 blur-2xl rounded-full" />

                  {/* Character Renderer */}
                  <div className="relative z-10 w-48 h-64">
                    <CharacterRenderer
                      config={characterConfig}
                      className="w-full h-full"
                    />
                    {/* Unlockable accessories overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 144 192">
                      <CharacterAccessories unlocks={calculateUnlocks(totalTrades, winRate, bestStreak)} />
                    </svg>
                  </div>
                </div>

                {/* Edit overlay on hover */}
                <div
                  className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-20"
                  onClick={() => setCustomizerOpen(true)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    <span className="text-sm text-primary font-semibold">Customize</span>
                  </div>
                </div>

                {/* Level badge */}
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full border-2 border-background flex items-center justify-center shadow-lg z-30">
                  <span className="text-sm font-black text-primary-foreground">{level}</span>
                </div>
              </div>
            </div>

            {/* Right: Win Rate & All-Time Stats */}
            <div className="flex-1 max-w-[200px] space-y-2.5">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">All-Time</span>
              </div>

              {/* Win Rate Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Win Rate</span>
                  <span className={cn(
                    "text-base font-bold",
                    winRate >= 50 ? "text-primary" : "text-destructive"
                  )}>
                    {totalTrades === 0 ? '--' : `${winRate.toFixed(1)}%`}
                  </span>
                </div>
                {totalTrades > 0 && (
                  <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        winRate >= 50 ? "bg-primary" : "bg-destructive"
                      )}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                )}
              </div>

              {/* All-Time Stats */}
              <div className="space-y-2">
                  {/* Total Trades */}
                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Trades</span>
                      <span className="text-base font-bold text-foreground">
                        {totalTrades}
                      </span>
                    </div>
                    <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(totalTrades * 2, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Average R */}
                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Average R</span>
                      <span className={cn(
                        "text-base font-bold",
                        (metrics?.average_r || 0) >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {metrics?.average_r ? `${metrics.average_r >= 0 ? '+' : ''}${metrics.average_r.toFixed(1)}R` : '0R'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          (metrics?.average_r || 0) >= 0 ? "bg-primary" : "bg-destructive"
                        )}
                        style={{ width: `${Math.min(Math.abs(metrics?.average_r || 0) * 20, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Avg Return */}
                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Avg Return</span>
                      <span className={cn(
                        "text-base font-bold",
                        avgReturn > 0 ? "text-primary" : avgReturn < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
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
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Best Streak</span>
                    <span className="text-base font-bold text-amber-400">{bestStreak}</span>
                  </div>
                  <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
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
                  🏆 {Object.values(calculateUnlocks(totalTrades, winRate, bestStreak)).filter(Boolean).length} unlocks earned
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
