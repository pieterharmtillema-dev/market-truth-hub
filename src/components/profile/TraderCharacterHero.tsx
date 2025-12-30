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

export function TraderCharacterHero({ userId, onProfileUpdated, onSocialClick, followersCount = 0 }: TraderCharacterHeroProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [totalTrades, setTotalTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsAnimated, setStatsAnimated] = useState(false);

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
          .select("display_name, avatar_url, bio")
          .eq("user_id", userId)
          .single();

        if (profileData) {
          setProfile(profileData);
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
    setProfile(data);
    onProfileUpdated?.(data);
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

      <Card variant="glass" className="overflow-hidden relative bg-card/60 backdrop-blur-xl">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-violet-900/10 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(61, 214, 140, 0.1), transparent 70%)'
        }} />

        {/* Top Profile Section */}
        <div className="relative border-b border-border/30">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              {/* Left: Avatar + Name */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-400/50 overflow-hidden flex-shrink-0">
                  <AvatarDisplay
                    avatarUrl={profile?.avatar_url}
                    displayName={profile?.display_name || "Trader"}
                    size={80}
                    className="border-0"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-foreground">
                    {profile?.display_name || "Set Your Name"}
                  </h1>
                  <p className="text-sm text-cyan-400 mb-3">
                    {traderClass} • {formatHoldingTime(traderProfile?.holding_time) || "Trading"}
                  </p>

                  {/* Trader Profile Badges */}
                  <div className="flex flex-wrap gap-2">
                    {traderProfile?.trader_category && (
                      <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30">
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {traderProfile.trader_category.replace("_", " ")}
                      </Badge>
                    )}
                    {traderProfile?.holding_time && (
                      <Badge variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {formatHoldingTime(traderProfile.holding_time)}
                      </Badge>
                    )}
                    {traderProfile?.risk_per_trade && (
                      <Badge variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600">
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        {formatRisk(traderProfile.risk_per_trade)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Level & Actions */}
              <div className="text-right">
                <div className="mb-3">
                  <div className="text-3xl font-black text-cyan-400 font-rajdhani leading-none">
                    LVL {level}
                  </div>
                  <div className="text-xs text-gray-500">{totalTrades} Trades Complete</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end mb-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    onClick={onSocialClick}
                  >
                    <Users className="w-4 h-4" />
                    {followersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                        {followersCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `${profile?.display_name || 'Trader'}'s Profile`,
                          text: `Check out my trading profile on trade-trax.com`,
                          url: window.location.href,
                        });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => console.log('Settings clicked')}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

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
        </div>

        {/* Character Stats Section */}
        <div className="relative">
          {/* Header */}
          <div className="px-6 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-xs text-cyan-400 uppercase tracking-widest font-semibold">
                Character Stats
              </span>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-6 pb-6">
            {/* Left: Performance Metrics */}
            <div className="md:col-span-4 space-y-2">
              <div className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                <div className="w-3 h-px bg-cyan-400" />
                Performance
              </div>

              {/* Total Predictions */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 hover:border-cyan-400/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Predictions</div>
                    <div className="text-3xl font-black text-white font-rajdhani">{totalPredictions}</div>
                  </div>
                  <div className="w-12 h-12 bg-cyan-400/10 rounded-xl border border-cyan-400/30 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Character Display */}
            <div className="md:col-span-4 flex items-center justify-center py-2">
              <div className="relative float-anim">
                {/* Glow rings */}
                <div className="absolute inset-0 blur-3xl bg-cyan-400/20 rounded-full scale-150 glow-pulse" />
                <div className="absolute inset-0 blur-2xl bg-cyan-400/10 rounded-full scale-125" />

                {/* Character container */}
                <div className="relative character-glow">
                  <div className="w-36 h-44 bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-3xl border-2 border-cyan-400/30 flex items-center justify-center overflow-hidden relative">
                    {/* Character icon/placeholder */}
                    <div className="text-center relative z-10">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-400/30 to-cyan-400/10 rounded-full border-2 border-cyan-400/40 flex items-center justify-center mb-2">
                        <User className="w-10 h-10 text-cyan-400" />
                      </div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider">Trader</div>
                    </div>

                    {/* Scanline effect */}
                    <div className="absolute inset-0 opacity-20 scanline" />
                  </div>

                  {/* Level badge */}
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full border-4 border-background flex items-center justify-center shadow-lg">
                    <span className="text-sm font-black text-black">{level}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Trading Metrics */}
            <div className="md:col-span-4 space-y-2">
              <div className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                Trading Metrics
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* Combined Win Rate & Official Rating Progress */}
              <div className={cn(
                "rounded-lg p-3 relative overflow-hidden transition-all",
                totalTrades < 2
                  ? "bg-gray-900/40 border border-gray-800"
                  : totalTrades < 30
                  ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/40"
                  : "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/40"
              )}>
                {/* Animated glow background - only for unlocked states */}
                {totalTrades >= 2 && (
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"
                  )} />
                )}

                <div className="relative z-10">
                  {/* LOCKED STATE - Before 2 trades */}
                  {totalTrades < 2 ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-gray-400 text-xs font-semibold">Win Rate</span>
                        </div>
                        <span className="text-green-400 font-bold text-sm blur-md select-none">---%</span>
                      </div>
                      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mb-2">
                        <div className="stat-bar-fill h-full bg-green-500 blur-sm" style={{ width: '50%' }} />
                      </div>
                      <div className="flex items-center justify-center gap-1.5 bg-gray-800/60 border border-gray-700 rounded-full px-3 py-1.5">
                        <Shield className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] text-gray-300 font-semibold">
                          Unlocks after 2 trades
                        </span>
                      </div>
                    </>
                  ) : totalTrades < 30 ? (
                    /* PREVIEW STATE - 2 to 29 trades */
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-gray-300 text-xs font-semibold">Win Rate</span>
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[8px] px-1 py-0 h-4">
                            PREVIEW
                          </Badge>
                        </div>
                        <span className="text-green-400 font-bold text-sm">{winRate.toFixed(0)}%</span>
                      </div>

                      {/* Win rate bar */}
                      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mb-3">
                        <div
                          className="stat-bar-fill h-full bg-green-500"
                          style={{ width: statsAnimated ? `${winRate}%` : '0%' }}
                        />
                      </div>

                      {/* Official Rating Progress */}
                      <div className="pt-2 border-t border-cyan-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                            Official Rating Progress
                          </span>
                          <span className="text-cyan-400 font-black text-xs tabular-nums">
                            {totalTrades}/30
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="relative h-2 bg-black/40 rounded-full overflow-hidden mb-2 border border-cyan-900/50">
                          <div
                            className="stat-bar-fill h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 relative"
                            style={{
                              width: statsAnimated ? `${Math.min((totalTrades / 30) * 100, 100)}%` : '0%',
                              boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)'
                            }}
                          >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                          </div>

                          {/* Milestone markers */}
                          <div className="absolute inset-0 flex justify-between px-[1px]">
                            {[2, 10, 20, 30].map((milestone) => (
                              <div
                                key={milestone}
                                className={cn(
                                  "w-[2px] h-full",
                                  totalTrades >= milestone ? "bg-cyan-200/60" : "bg-cyan-900/40"
                                )}
                                style={{
                                  marginLeft: milestone === 2 ? '0' : undefined,
                                  marginRight: milestone === 30 ? '0' : undefined
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-cyan-400/80 font-medium">
                            {30 - totalTrades} more trade{30 - totalTrades !== 1 ? 's' : ''} to unlock official
                          </span>
                          <span className="text-cyan-500 font-bold">
                            {((totalTrades / 30) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* OFFICIAL STATE - 30+ trades */
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-gray-300 text-xs font-semibold">Win Rate</span>
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[8px] px-1 py-0 h-4">
                            OFFICIAL
                          </Badge>
                        </div>
                        <span className="text-green-400 font-bold text-lg">{winRate.toFixed(0)}%</span>
                      </div>

                      {/* Official win rate bar with enhanced glow */}
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden mb-3">
                        <div
                          className="stat-bar-fill h-full bg-gradient-to-r from-green-500 to-emerald-400 relative"
                          style={{
                            width: statsAnimated ? `${winRate}%` : '0%',
                            boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)'
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                        </div>
                      </div>

                      {/* Official Rating Achievement */}
                      <div className="pt-2 border-t border-green-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-300 text-[10px] font-bold uppercase tracking-wider">
                              Official Rating Unlocked
                            </span>
                          </div>
                          <span className="text-green-400 font-black text-xs tabular-nums">
                            {totalTrades} Trades
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Average R */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-2.5 hover:border-cyan-400/30 transition-all">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-xs">Average R</span>
                  <span className={cn(
                    "font-bold text-sm",
                    metrics?.average_r && metrics.average_r >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {metrics?.average_r ? `${metrics.average_r >= 0 ? '+' : ''}${metrics.average_r.toFixed(2)}R` : '0R'}
                  </span>
                </div>
                <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "stat-bar-fill h-full",
                      metrics?.average_r && metrics.average_r >= 0 ? "bg-green-400" : "bg-red-400"
                    )}
                    style={{ width: statsAnimated ? `${Math.min(Math.abs(metrics?.average_r || 0) * 50, 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Avg Return */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-2.5 hover:border-cyan-500/30 transition-all">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-xs">Avg Return</span>
                  <span className={cn(
                    "font-bold text-sm",
                    avgReturn >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "stat-bar-fill h-full",
                      avgReturn >= 0 ? "bg-green-400" : "bg-red-400"
                    )}
                    style={{ width: statsAnimated ? `${Math.min(Math.abs(avgReturn) * 5, 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Best Streak */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-2.5 hover:border-amber-500/30 transition-all">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-xs">Best Streak</span>
                  <span className="text-amber-400 font-bold text-sm">{bestStreak}</span>
                </div>
                <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className="stat-bar-fill h-full bg-amber-500"
                    style={{ width: statsAnimated ? `${Math.min(bestStreak * 7, 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-black text-cyan-400 font-rajdhani">{totalTrades}</div>
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider">Trades</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-2.5 text-center">
                  <div className="text-xl font-black text-green-400 font-rajdhani">{winRate.toFixed(0)}%</div>
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider">Win</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
