import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarDisplay } from "./AvatarDisplay";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { CategoryBadge, TraderCategory } from "./CategoryBadge";
import {
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Award,
  BarChart3,
  Crown,
  Star,
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

export function TraderCharacterHero({ userId, onProfileUpdated }: TraderCharacterHeroProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [totalTrades, setTotalTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsAnimated, setStatsAnimated] = useState(false);

  // Mock data for stats not yet implemented
  const accuracy = 78;
  const avgReturn = 2.4;
  const bestStreak = 7;
  const totalCalls = 142;
  const rank = "#47";

  // Calculate level and XP
  const level = Math.floor(totalTrades / 25) + 1;
  const currentXP = totalTrades % 25;
  const xpToNextLevel = 25;
  const xpProgress = (currentXP / xpToNextLevel) * 100;

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
        const { data: positions } = await supabase
          .from("positions")
          .select("id, pnl")
          .eq("user_id", userId);

        if (positions) {
          setTotalTrades(positions.length);

          // Calculate win rate
          const closedTrades = positions.filter(p => p.pnl !== null);
          const wins = closedTrades.filter(p => (p.pnl || 0) > 0).length;
          const calculatedWinRate = closedTrades.length > 0
            ? (wins / closedTrades.length) * 100
            : 0;
          setWinRate(calculatedWinRate);
        }

        setLoading(false);

        // Trigger animation after data loads
        setTimeout(() => setStatsAnimated(true), 100);
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

        @keyframes fill-bar {
          from { width: 0%; }
          to { width: var(--target-width); }
        }

        .float-animation {
          animation: float 4s ease-in-out infinite;
        }

        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .stat-bar {
          transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .scanline {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            transparent 0%,
            rgba(61, 214, 140, 0.05) 50%,
            transparent 100%
          );
          background-size: 100% 4px;
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }

        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
      `}</style>

      <Card variant="glass" className="overflow-hidden bg-gradient-to-br from-gray-900 to-black border-border/50">
        <div className="p-6 space-y-6">
          {/* Top Section - Profile Info */}
          <div className="flex items-start justify-between gap-4">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative">
                <AvatarDisplay
                  avatarUrl={profile?.avatar_url}
                  displayName={profile?.display_name || "Trader"}
                  size={80}
                  className="border-4 border-cyan-500/20 shadow-lg shadow-cyan-500/10"
                />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-background shadow-lg">
                  LVL {level}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1 truncate">
                  {profile?.display_name || "Set Your Name"}
                </h1>
                <p className="text-cyan-400 font-rajdhani text-sm mb-2">{traderClass}</p>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-2 items-center">
                  {traderProfile?.trader_category && (
                    <CategoryBadge category={traderProfile.trader_category} size="sm" showIcon={false} />
                  )}
                  {traderProfile?.holding_time && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                      {traderProfile.holding_time.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {traderProfile?.risk_per_trade && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                      Risk: {traderProfile.risk_per_trade.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Edit Button */}
            <ProfileEditDialog
              userId={userId}
              currentName={profile?.display_name}
              currentAvatarUrl={profile?.avatar_url}
              currentBio={profile?.bio}
              onProfileUpdated={handleProfileUpdate}
            />
          </div>

          {/* Bottom Section - 3 Column Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column - Performance */}
            <div className="lg:col-span-3 space-y-3">
              {/* Total Calls */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-900/10 border-purple-500/20 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Trophy className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold font-rajdhani text-white">{totalCalls}</p>
                    <p className="text-xs text-purple-400 mt-0.5">+15% this month</p>
                  </div>
                </div>
              </Card>

              {/* Rank */}
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-900/10 border-amber-500/20 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Award className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Global Rank</p>
                    <p className="text-2xl font-bold font-rajdhani text-white">{rank}</p>
                    <p className="text-xs text-amber-400 mt-0.5">+8% improvement</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Center Column - Character Display */}
            <div className="lg:col-span-6">
              <Card className="relative bg-gradient-to-br from-cyan-500/5 to-cyan-900/5 border-cyan-500/20 p-6 backdrop-blur-sm overflow-hidden h-full">
                <div className="scanline"></div>

                {/* Floating Character Placeholder */}
                <div className="relative h-48 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-radial from-cyan-500/20 via-transparent to-transparent blur-2xl pulse-glow"></div>

                  <div className="relative float-animation">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border-2 border-cyan-500/40 flex items-center justify-center backdrop-blur-sm">
                      <Crown className="w-16 h-16 text-cyan-400" />
                    </div>

                    {/* Level Badge Overlay */}
                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-sm font-bold px-3 py-1.5 rounded-full border-2 border-background shadow-lg">
                      <Star className="w-4 h-4 inline mr-1" />
                      {level}
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Level {level}</span>
                    <span>{currentXP} / {xpToNextLevel} XP</span>
                  </div>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 stat-bar"
                      style={{ width: statsAnimated ? `${xpProgress}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Trades</p>
                    <p className="text-lg font-bold font-rajdhani text-cyan-400">{totalTrades}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Streak</p>
                    <p className="text-lg font-bold font-rajdhani text-amber-400">{bestStreak}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Trading Metrics */}
            <div className="lg:col-span-3 space-y-3">
              {/* Win Rate - Most Important */}
              <Card className="bg-gradient-to-br from-green-500/10 to-green-900/10 border-green-500/20 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-medium text-green-400">WIN RATE</span>
                </div>
                <p className="text-3xl font-bold font-rajdhani text-white mb-2">
                  {winRate.toFixed(1)}%
                </p>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 stat-bar"
                    style={{ width: statsAnimated ? `${winRate}%` : '0%' }}
                  />
                </div>
              </Card>

              {/* Accuracy */}
              <StatCard
                icon={Zap}
                label="Accuracy"
                value={accuracy}
                color="blue"
                animated={statsAnimated}
              />

              {/* Avg Return */}
              <StatCard
                icon={TrendingUp}
                label="Avg Return"
                value={avgReturn}
                suffix="R"
                color="purple"
                animated={statsAnimated}
              />

              {/* Best Streak */}
              <StatCard
                icon={BarChart3}
                label="Best Streak"
                value={bestStreak}
                suffix=" wins"
                color="amber"
                animated={statsAnimated}
              />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

// Reusable stat card component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: "blue" | "purple" | "amber";
  animated: boolean;
}

function StatCard({ icon: Icon, label, value, suffix = "%", color, animated }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "from-blue-500/10 to-blue-900/10",
      border: "border-blue-500/20",
      text: "text-blue-400",
      bar: "from-blue-500 to-blue-400",
    },
    purple: {
      bg: "from-purple-500/10 to-purple-900/10",
      border: "border-purple-500/20",
      text: "text-purple-400",
      bar: "from-purple-500 to-purple-400",
    },
    amber: {
      bg: "from-amber-500/10 to-amber-900/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      bar: "from-amber-500 to-amber-400",
    },
  };

  const colors = colorClasses[color];
  const percentage = suffix === "%" ? value : Math.min((value / 10) * 100, 100);

  return (
    <Card className={cn("bg-gradient-to-br backdrop-blur-sm p-3", colors.bg, colors.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", colors.text)} />
        <span className={cn("text-xs font-medium", colors.text)}>{label.toUpperCase()}</span>
      </div>
      <p className="text-xl font-bold font-rajdhani text-white mb-1.5">
        {value}{suffix}
      </p>
      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r stat-bar", colors.bar)}
          style={{ width: animated ? `${percentage}%` : '0%' }}
        />
      </div>
    </Card>
  );
}
