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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [customizerOpen, setCustomizerOpen] = useState(false);
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
                <div className="w-16 h-16 rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0 backdrop-blur-sm bg-background/30">
                  <AvatarDisplay
                    avatarUrl={profile?.avatar_url}
                    displayName={profile?.display_name || "Trader"}
                    size={64}
                    className="border-0"
                  />
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
                    {followersCount > 0 && (
                      <Badge 
                        className="bg-background/40 backdrop-blur-sm text-muted-foreground border-border/30 cursor-pointer hover:bg-background/60"
                        onClick={onSocialClick}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {followersCount} follower{followersCount !== 1 ? 's' : ''}
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

          {/* Main Hero Area with Character */}
          <div className="relative min-h-[320px] flex items-end justify-center pb-6">
            {/* Character - Integrated into scene */}
            <div className="relative group">
              <div className="relative float-anim character-glow">
                {/* Ground glow effect */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/30 blur-2xl rounded-full" />
                
                {/* Character Renderer */}
                <div className="relative z-10 w-56 h-72">
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
            
            {/* Left Stats Panel - Floating */}
            <div className="absolute left-4 bottom-8 space-y-2 hidden md:block">
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20 min-w-[120px]">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Total Trades</div>
                <div className="text-2xl font-black text-foreground">{totalTrades}</div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Record</div>
                <div className="text-xl font-black">
                  <span className="text-primary">{metrics?.total_wins || 0}W</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-destructive">{metrics?.total_losses || 0}L</span>
                </div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Best Streak</div>
                <div className="text-2xl font-black text-amber-400">{bestStreak}</div>
              </div>
            </div>
            
            {/* Right Stats Panel - Floating */}
            <div className="absolute right-4 bottom-8 space-y-2 hidden md:block">
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20 min-w-[120px]">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Win Rate</div>
                <div className={cn(
                  "text-2xl font-black",
                  winRate >= 50 ? "text-primary" : "text-destructive"
                )}>
                  {winRate.toFixed(0)}%
                </div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Avg R</div>
                <div className={cn(
                  "text-2xl font-black",
                  (metrics?.average_r || 0) >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {metrics?.average_r ? `${metrics.average_r >= 0 ? '+' : ''}${metrics.average_r.toFixed(1)}` : '0'}R
                </div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-xl p-3 border border-border/20">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">+R Rate</div>
                <div className={cn(
                  "text-2xl font-black",
                  (metrics?.positive_r_percentage || 0) > 50 ? "text-primary" : "text-muted-foreground"
                )}>
                  {metrics?.positive_r_percentage ? `${metrics.positive_r_percentage.toFixed(0)}%` : '--'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Stats Bar - Mobile */}
          <div className="md:hidden px-4 pb-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className="text-lg font-black text-foreground">{totalPredictions}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Trades</div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className={cn("text-lg font-black", winRate >= 50 ? "text-primary" : "text-destructive")}>
                  {winRate.toFixed(0)}%
                </div>
                <div className="text-muted-foreground text-[8px] uppercase">Win</div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className="text-lg font-black text-amber-400">{bestStreak}</div>
                <div className="text-muted-foreground text-[8px] uppercase">Streak</div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className={cn("text-lg font-black", (metrics?.average_r || 0) >= 0 ? "text-primary" : "text-destructive")}>
                  {metrics?.average_r?.toFixed(1) || '0'}R
                </div>
                <div className="text-muted-foreground text-[8px] uppercase">Avg R</div>
              </div>
            </div>
            {/* Second row for mobile */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className="text-base font-black">
                  <span className="text-primary">{metrics?.total_wins || 0}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-destructive">{metrics?.total_losses || 0}</span>
                </div>
                <div className="text-muted-foreground text-[8px] uppercase">W/L</div>
              </div>
              <div className="backdrop-blur-md bg-background/40 rounded-lg p-2 text-center border border-border/20">
                <div className={cn("text-lg font-black", (metrics?.positive_r_percentage || 0) > 50 ? "text-primary" : "text-muted-foreground")}>
                  {metrics?.positive_r_percentage ? `${metrics.positive_r_percentage.toFixed(0)}%` : '--'}
                </div>
                <div className="text-muted-foreground text-[8px] uppercase">+R Rate</div>
              </div>
            </div>
          </div>
          
          {/* Unlocks indicator */}
          {totalTrades > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-sm border border-border/30 rounded-full px-4 py-1.5 z-30">
              <span className="text-xs text-muted-foreground">
                🏆 {Object.values(calculateUnlocks(totalTrades, winRate, bestStreak)).filter(Boolean).length} unlocks earned
              </span>
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
