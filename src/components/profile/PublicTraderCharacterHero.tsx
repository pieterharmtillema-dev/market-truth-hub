import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarDisplay } from "./AvatarDisplay";
import { CategoryBadge, TraderCategory } from "./CategoryBadge";
import { CharacterRenderer } from "./CharacterRenderer";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, parseCharacterConfig } from "./characterConfig";
import { HeroEnvironment, CharacterAccessories, calculateUnlocks } from "./HeroEnvironment";
import { FAKE_PROFILES, FAKE_TRADER_META } from "@/lib/fakeProfiles";
import { parsePremiumConfig, PremiumAvatarConfig } from "./avatar";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Convert PremiumAvatarConfig to CharacterConfig
const premiumToCharacterConfig = (premium: PremiumAvatarConfig): CharacterConfig => {
  // Map outfit types
  const outfitMap: Record<string, 'tshirt' | 'hoodie' | 'business' | 'suit'> = {
    'tee': 'tshirt',
    'hoodie': 'hoodie',
    'blazer': 'business',
    'jacket': 'suit',
    'sweater': 'hoodie',
    'polo': 'tshirt',
  };

  // Map hair styles
  const hairMap: Record<string, 'short' | 'medium' | 'long' | 'buzz' | 'bald'> = {
    'none': 'bald',
    'short': 'short',
    'fade': 'short',
    'undercut': 'short',
    'waves': 'medium',
    'bun': 'medium',
    'ponytail': 'long',
    'curls': 'medium',
    'buzz': 'buzz',
    'slick': 'short',
  };

  return {
    skinTone: premium.skinTone,
    bodyType: 'athletic',
    height: 1.0,
    face: {
      hairStyle: hairMap[premium.hairStyle] || 'short',
      hairColor: premium.hairColor,
      eyeColor: premium.irisColor,
      facialHair: premium.facialHair,
    },
    top: {
      type: outfitMap[premium.outfit] || 'hoodie',
      color: premium.outfitColor,
      graphic: 'none',
    },
    bottom: {
      type: 'jeans',
      color: '#1A1A1A',
    },
    shoes: {
      type: 'sneakers',
      color: '#1C1C1C',
    },
    accessories: {
      sunglasses: premium.glasses !== 'none' ? {
        enabled: true,
        style: premium.glasses === 'dark' ? 'aviator' : 'round',
        color: premium.glasses === 'dark' ? '#1A1A1A' : '#E0E0E0',
      } : undefined,
      watch: premium.watch ? {
        enabled: true,
        style: 'smart',
        color: '#1C1C1C',
      } : undefined,
    },
  };
};

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

interface PublicTraderCharacterHeroProps {
  userId: string;
  followersCount?: number;
  onFollowClick?: () => void;
  isFollowing?: boolean;
  showFollowButton?: boolean;
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

export function PublicTraderCharacterHero({
  userId,
  followersCount = 0,
  onFollowClick,
  isFollowing = false,
  showFollowButton = true
}: PublicTraderCharacterHeroProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [totalTrades, setTotalTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [averageR, setAverageR] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);

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

  // Calculate level
  const level = Math.floor(totalTrades / 25) + 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check if this is a fake profile first
        const fakeProfile = FAKE_PROFILES[userId];
        const fakeMeta = FAKE_TRADER_META[userId];

        if (fakeProfile && fakeMeta) {
          // Use fake data for demo profiles
          setProfile({
            display_name: fakeProfile.display_name,
            avatar_url: fakeProfile.avatar_url,
            bio: fakeProfile.bio,
            character_config: null,
          });

          // Parse avatar_url to get character config
          if (fakeProfile.avatar_url?.startsWith('avatar:')) {
            const premiumConfig = parsePremiumConfig(fakeProfile.avatar_url);
            if (premiumConfig) {
              setCharacterConfig(premiumToCharacterConfig(premiumConfig));
            }
          }

          setTraderProfile({
            holding_time: fakeMeta.holding_time,
            risk_per_trade: null,
            decision_style: null,
            experience_level: fakeMeta.experience_level,
            trader_category: fakeProfile.trader_category || null,
          });

          setTotalTrades(fakeMeta.total_trades);
          setWinRate(fakeMeta.win_rate);
          setAverageR(fakeMeta.average_r);

          setLoading(false);
          setTimeout(() => setStatsAnimated(true), 300);
          return;
        }

        // Fetch profile data from public_profiles view for real users
        const { data: profileData } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileData) {
          setProfile({
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url,
            bio: profileData.bio,
            character_config: null, // Not exposed in public view
          });

          // Try to parse avatar_url as premium config and convert to character config
          if (profileData.avatar_url?.startsWith('avatar:')) {
            const premiumConfig = parsePremiumConfig(profileData.avatar_url);
            if (premiumConfig) {
              setCharacterConfig(premiumToCharacterConfig(premiumConfig));
            }
          }
        }

        // Fetch additional profile info for character config (if they have one set explicitly)
        const { data: fullProfile } = await supabase
          .from("profiles")
          .select("character_config")
          .eq("user_id", userId)
          .single();

        if (fullProfile?.character_config && typeof fullProfile.character_config === 'string') {
          const parsed = parseCharacterConfig(fullProfile.character_config);
          if (parsed) {
            setCharacterConfig(parsed);
          }
        }

        // Fetch trader profile data (publicly readable fields)
        const { data: traderData } = await supabase
          .from("trader_profiles")
          .select("holding_time, risk_per_trade, decision_style, experience_level, trader_category")
          .eq("user_id", userId)
          .maybeSingle();

        if (traderData) {
          setTraderProfile(traderData);
        }

        // Fetch trading stats from user_trading_metrics (public data only)
        const { data: metricsData } = await supabase
          .from("user_trading_metrics")
          .select("total_verified_trades, win_rate, average_r")
          .eq("user_id", userId)
          .maybeSingle();

        if (metricsData) {
          setTotalTrades(metricsData.total_verified_trades || 0);
          setWinRate(metricsData.win_rate || 0);
          setAverageR(metricsData.average_r || 0);
        }

        // Fetch positions for best streak calculation
        const { data: positionsData } = await supabase
          .from("positions")
          .select("id, pnl, pnl_pct, open, entry_timestamp")
          .eq("user_id", userId);

        if (positionsData) {
          setPositions(positionsData);
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
          <div className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
              {/* Left: Avatar + Name */}
              <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0 backdrop-blur-sm bg-background/30">
                  <AvatarDisplay
                    avatarUrl={profile?.avatar_url}
                    displayName={profile?.display_name || "Trader"}
                    size={64}
                    className="border-0"
                  />
                </div>
                <div className="max-w-md flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold mb-1 text-foreground drop-shadow-lg">
                    {profile?.display_name || "Trader"}
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
                    {followersCount > 0 && (
                      <Badge className="bg-background/40 backdrop-blur-sm text-muted-foreground border-border/30">
                        <Users className="w-3 h-3 mr-1" />
                        {followersCount} follower{followersCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-2 self-start sm:self-auto">
                {showFollowButton && onFollowClick && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                    onClick={onFollowClick}
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/30 backdrop-blur-sm hover:bg-background/50 h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${profile?.display_name || 'Trader'}'s Profile`,
                        text: `Check out this trading profile`,
                        url: window.location.href,
                      });
                    }
                  }}
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main Hero Area with Character and Trading Metrics */}
          <div className="relative flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4">
            {/* Left: Win Rate & Stats */}
            <div className="w-full lg:flex-1 lg:max-w-[200px] space-y-2.5 order-1 lg:order-none">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Performance</span>
              </div>

              {/* Win Rate Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2.5 sm:p-3">
                <div className="text-center">
                  <span className={cn(
                    "text-2xl font-bold block",
                    winRate >= 50 ? "text-primary" : "text-destructive"
                  )}>
                    {totalTrades === 0 ? '--' : `${winRate.toFixed(1)}%`}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Win Rate</p>
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
              </div>

              {/* Best Streak Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Best Streak</span>
                  <span className="text-base font-bold text-amber-400">
                    {totalTrades === 0 ? '--' : bestStreak}
                  </span>
                </div>
                {totalTrades > 0 && (
                  <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(bestStreak * 10, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Character */}
            <div className="relative flex items-end justify-center order-2 lg:order-none">
              {/* Character - Integrated into scene */}
              <div className="relative">
                <div className="relative float-anim character-glow">
                  {/* Ground glow effect */}
                  <div className="absolute -bottom-2 sm:-bottom-4 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-6 sm:h-8 bg-primary/30 blur-2xl rounded-full" />

                  {/* Character Renderer */}
                  <div className="relative z-10 w-32 h-44 sm:w-40 sm:h-56 lg:w-48 lg:h-64">
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

                {/* Level badge */}
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full border-2 border-background flex items-center justify-center shadow-lg z-30">
                  <span className="text-xs sm:text-sm font-black text-primary-foreground">{level}</span>
                </div>
              </div>
            </div>

            {/* Right: Trading Stats */}
            <div className="w-full lg:flex-1 lg:max-w-[200px] space-y-2.5 order-3 lg:order-none">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Statistics</span>
              </div>

              {/* All-Time Stats - Grid on mobile */}
              <div className="space-y-2 grid grid-cols-2 lg:grid-cols-1 gap-2">
              {/* Total Trades Card */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Trades</span>
                  <span className="text-base font-bold text-foreground">
                    {totalTrades}
                  </span>
                </div>
                <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((totalTrades / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Average R */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Average R</span>
                  <span className={cn(
                    "text-base font-bold",
                    averageR >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {averageR ? `${averageR >= 0 ? '+' : ''}${averageR.toFixed(1)}R` : '0R'}
                  </span>
                </div>
                <div className="mt-1.5 h-0.5 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      averageR >= 0 ? "bg-primary" : "bg-destructive"
                    )}
                    style={{ width: `${Math.min(Math.abs(averageR) * 20, 100)}%` }}
                  />
                </div>
              </div>

              {/* Avg Return */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-2.5 col-span-2 lg:col-span-1">
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
    </>
  );
}
