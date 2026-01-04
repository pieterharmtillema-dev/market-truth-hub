import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, Flame, Snowflake, Calendar, Globe, Lock, UserPlus, UserMinus, Loader2, BadgeCheck, Plug, Chrome, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, parseCharacterConfig } from "@/components/profile/characterConfig";
import { FAKE_PROFILES } from "@/lib/fakeProfiles";

export interface PublicPredictionData {
  id: string;
  user_id: string;
  asset: string;
  asset_type: string;
  direction: string;
  current_price: number; // entry price
  target_price: number; // target price (or exit price for trades)
  status: string;
  created_at: string;
  resolved_at?: string | null;
  explanation?: string | null;
  explanation_public?: boolean;
  data_source?: string | null;
  time_horizon?: string | null;
  expiry_timestamp?: string | null;
  // PnL data (only available for owner viewing their own trade predictions)
  pnl?: number | null;
  pnl_pct?: number | null;
  // Public visibility
  is_public?: boolean;
  // Trade source tracking
  trade_source?: string | null;
  platform?: string | null;
  exchange_source?: string | null;
  is_exchange_verified?: boolean | null;
  // User profile data (from join)
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    current_streak?: number;
    streak_type?: string;
    total_predictions?: number;
    total_hits?: number;
    is_verified?: boolean;
  } | null;
}

interface PublicPredictionCardProps {
  prediction: PublicPredictionData;
  currentUserId?: string;
  onAddExplanation?: (predictionId: string) => void;
  isFollowing?: boolean;
  onFollow?: (userId: string) => Promise<boolean>;
  onUnfollow?: (userId: string) => Promise<boolean>;
}

export function PublicPredictionCard({
  prediction,
  currentUserId,
  onAddExplanation,
  isFollowing: isFollowingProp,
  onFollow,
  onUnfollow
}: PublicPredictionCardProps) {
  const navigate = useNavigate();
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(prediction.is_public ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const isOwner = currentUserId === prediction.user_id;
  const isLong = prediction.direction === "long";
  const isHit = prediction.status === "hit";
  const isActive = prediction.status === "active";
  const isMissed = prediction.status === "missed";
  const isLongTerm = prediction.data_source === "user";
  const isTrade = prediction.data_source === "trade_sync";

  const handleTogglePublic = async () => {
    if (!isOwner) return;
    setIsUpdating(true);
    try {
      const newValue = !isPublic;
      const { error } = await supabase
        .from("predictions")
        .update({ is_public: newValue })
        .eq("id", prediction.id);
      
      if (error) throw error;
      setIsPublic(newValue);
      toast.success(newValue ? "Trade shared to feed" : "Trade removed from feed");
    } catch (err) {
      console.error("Failed to update visibility:", err);
      toast.error("Failed to update visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFollowClick = async () => {
    if (!onFollow || !onUnfollow) return;
    setFollowLoading(true);
    try {
      if (isFollowingProp) {
        await onUnfollow(prediction.user_id);
      } else {
        await onFollow(prediction.user_id);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // Smart price formatting: show enough decimals to differentiate entry/exit
  const formatPrice = (price: number, otherPrice?: number) => {
    if (otherPrice === undefined) {
      return price.toLocaleString();
    }
    
    // Find minimum decimals needed to show difference
    for (let decimals = 2; decimals <= 8; decimals++) {
      const formatted1 = price.toFixed(decimals);
      const formatted2 = otherPrice.toFixed(decimals);
      if (formatted1 !== formatted2) {
        return Number(price.toFixed(decimals)).toLocaleString(undefined, { 
          minimumFractionDigits: decimals, 
          maximumFractionDigits: decimals 
        });
      }
    }
    // If still same after 8 decimals, just show 2
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const entryPrice = formatPrice(prediction.current_price, prediction.target_price);
  const exitPrice = formatPrice(prediction.target_price, prediction.current_price);
  
  // Calculate accuracy from profile (only for trade-based predictions)
  const accuracy = !isLongTerm && prediction.profile?.total_predictions && prediction.profile.total_predictions > 0
    ? Math.round((prediction.profile.total_hits || 0) / prediction.profile.total_predictions * 100)
    : null;

  // Streak info (only show for trade-based predictions)
  const streak = prediction.profile?.current_streak || 0;
  const streakType = prediction.profile?.streak_type || "none";
  const isHotStreak = !isLongTerm && streakType === "hit" && streak >= 2;
  const isColdStreak = !isLongTerm && streakType === "miss" && streak >= 3;

  const displayName = prediction.profile?.display_name || "Trader";
  const avatarUrl = prediction.profile?.avatar_url;
  const isVerified = prediction.profile?.is_verified || false;

  // Fetch character config for the user
  useEffect(() => {
    const fetchCharacterConfig = async () => {
      // Check if this is a fake profile first
      const fakeProfile = FAKE_PROFILES[prediction.user_id];
      if (fakeProfile?.avatar_url) {
        const parsed = parseCharacterConfig(fakeProfile.avatar_url);
        if (parsed) {
          setCharacterConfig(parsed);
          return;
        }
      }

      // Fetch real user's character config
      try {
        const { data } = await supabase
          .from("profiles")
          .select("character_config")
          .eq("user_id", prediction.user_id)
          .single();

        if (data?.character_config && typeof data.character_config === 'string') {
          const parsed = parseCharacterConfig(data.character_config);
          if (parsed) {
            setCharacterConfig(parsed);
          }
        }
      } catch (error) {
        // Silently fail - will use default config
      }
    };

    fetchCharacterConfig();
  }, [prediction.user_id]);

  // Format dates
  const entryTime = prediction.created_at ? format(new Date(prediction.created_at), "MMM d, yyyy HH:mm") : "";
  const exitTime = prediction.resolved_at ? format(new Date(prediction.resolved_at), "MMM d, yyyy HH:mm") : "";
  const expiryTime = prediction.expiry_timestamp ? new Date(prediction.expiry_timestamp) : null;
  const timeRemaining = expiryTime && isActive ? formatDistanceToNow(expiryTime, { addSuffix: true }) : null;

  // Should show explanation
  const showExplanation = prediction.explanation && (isOwner || prediction.explanation_public);

  // Card variant based on status
  const cardVariant = isActive ? "prediction" : isHit ? "gain" : "loss";

  return (
    <Card 
      variant={cardVariant}
      className="animate-fade-in overflow-hidden"
    >
      <CardContent className="p-4">
        {/* Long-Term Label or Trade Source Badges */}
        {isLongTerm ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 gap-1">
              <Calendar className="w-3 h-3" />
              Long-Term Prediction
            </Badge>
            {isActive && timeRemaining && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Clock className="w-3 h-3" />
                Expires {timeRemaining}
              </Badge>
            )}
          </div>
        ) : isTrade && (prediction.trade_source || prediction.platform || prediction.exchange_source) && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {/* Exchange Verified Badge */}
            {prediction.is_exchange_verified && (
              <Badge variant="outline" className="text-[10px] gap-1 border-green-500/50 text-green-500">
                <Shield className="h-2.5 w-2.5" />
                Verified
              </Badge>
            )}
            {/* API Source Badge */}
            {prediction.trade_source === 'api' && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/50 text-primary">
                <Plug className="h-2.5 w-2.5" />
                API
              </Badge>
            )}
            {/* Extension Source Badge */}
            {prediction.trade_source === 'extension' && (
              <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/50 text-muted-foreground">
                <Chrome className="h-2.5 w-2.5" />
                Extension
              </Badge>
            )}
            {/* Platform Badge */}
            {prediction.platform && (
              <Badge variant="outline" className="text-[10px]">
                {prediction.platform}
              </Badge>
            )}
            {/* Exchange Source Badge */}
            {prediction.exchange_source && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {prediction.exchange_source}
              </Badge>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/trader/${prediction.user_id}`)}
          >
            {/* Character Portrait */}
            <div className="w-10 h-10 rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
              <svg viewBox="42 24 60 60" className="w-full h-full" preserveAspectRatio="xMidYMid slice" style={{ transform: 'scale(1.1)' }}>
                <defs>
                  <linearGradient id={`card-avatar-head-gradient-${prediction.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={adjustBrightness(characterConfig.skinTone, 10)} stopOpacity="1" />
                    <stop offset="100%" stopColor={characterConfig.skinTone} stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id={`card-avatar-body-gradient-${prediction.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={characterConfig.skinTone} stopOpacity="1" />
                    <stop offset="100%" stopColor={adjustBrightness(characterConfig.skinTone, -20)} stopOpacity="1" />
                  </linearGradient>
                </defs>

                {/* Left Arm */}
                <rect x="54" y="72" width="4" height="16" rx="2"
                  fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#card-avatar-body-gradient-${prediction.id})`} />

                {/* Right Arm */}
                <rect x="86" y="72" width="4" height="16" rx="2"
                  fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#card-avatar-body-gradient-${prediction.id})`} />

                {/* Neck */}
                <rect x="69" y="60" width="6" height="8" rx="3" fill={`url(#card-avatar-body-gradient-${prediction.id})`} />

                {/* Torso */}
                {characterConfig.top.type !== 'none' ? (
                  <rect x="62" y="66" width="20" height="18" rx="6" fill={characterConfig.top.color} />
                ) : (
                  <rect x="62" y="66" width="20" height="18" rx="6" fill={`url(#card-avatar-body-gradient-${prediction.id})`} />
                )}

                {/* Hair back layer */}
                {characterConfig.face?.hairStyle === 'long' && (
                  <ellipse cx="72" cy="52" rx="20" ry="16" fill={characterConfig.face?.hairColor || '#2D1B0E'} />
                )}

                {/* Head */}
                <ellipse cx="72" cy="44" rx="16" ry="18" fill={`url(#card-avatar-head-gradient-${prediction.id})`} />

                {/* Ears */}
                <ellipse cx="56" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />
                <ellipse cx="88" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />

                {/* Hair */}
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
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm hover:underline">{displayName}</span>
                {isVerified && (
                  <span title="Verified Trader - Connected Exchange">
                    <BadgeCheck className="w-4 h-4 text-primary" />
                  </span>
                )}
                {isHotStreak && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-orange-400">
                    <Flame className="w-3 h-3" />
                    {streak}
                  </span>
                )}
                {isColdStreak && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-blue-400" title="High Variance">
                    <Snowflake className="w-3 h-3" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {accuracy !== null && (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    {accuracy}% acc
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Follow button - only show for other users */}
            {currentUserId && !isOwner && onFollow && onUnfollow && (
              <Button
                variant={isFollowingProp ? "default" : "outline"}
                size="sm"
                onClick={handleFollowClick}
                disabled={followLoading}
                className="h-7 px-2 gap-1 text-xs"
              >
                {followLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isFollowingProp ? (
                  <UserMinus className="w-3 h-3" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
              </Button>
            )}
            <Badge variant={isActive ? "neutral" : isHit ? "gain" : "loss"}>
              {isActive ? "Active" : isHit ? "Hit ✓" : "Missed"}
            </Badge>
          </div>
        </div>

        {/* Trade Details - Public Info Only (NO PnL) */}
        <div className="bg-background/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {prediction.asset}
              </Badge>
              <Badge variant={isLong ? "gain" : "loss"} className="gap-1">
                {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isLong ? "Long" : "Short"}
              </Badge>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {prediction.asset_type}
            </Badge>
          </div>

          <div className={cn("grid gap-3 text-center", isLongTerm && isActive ? "grid-cols-3" : isOwner && prediction.pnl !== undefined && prediction.pnl !== null ? "grid-cols-3" : "grid-cols-2")}>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</div>
              <div className="font-mono font-medium text-sm">${entryPrice}</div>
              <div className="text-[9px] text-muted-foreground">{entryTime}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                {isLongTerm ? "Target" : "Exit"}
              </div>
              <div className={cn("font-mono font-medium text-sm", isActive ? (isLong ? "text-gain" : "text-loss") : (isHit ? "text-gain" : "text-loss"))}>
                ${exitPrice}
              </div>
              {!isActive && exitTime && (
                <div className="text-[9px] text-muted-foreground">{exitTime}</div>
              )}
            </div>
            {/* PnL - Only visible to owner */}
            {isOwner && prediction.pnl !== undefined && prediction.pnl !== null && !isLongTerm && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">P/L</div>
                <div className={cn("font-mono font-medium text-sm", prediction.pnl >= 0 ? "text-gain" : "text-loss")}>
                  {prediction.pnl >= 0 ? "+" : ""}{prediction.pnl.toFixed(2)}
                </div>
                {prediction.pnl_pct !== undefined && prediction.pnl_pct !== null && (
                  <div className={cn("text-[9px]", prediction.pnl_pct >= 0 ? "text-gain/70" : "text-loss/70")}>
                    {prediction.pnl_pct >= 0 ? "+" : ""}{prediction.pnl_pct.toFixed(2)}%
                  </div>
                )}
              </div>
            )}
            {isLongTerm && isActive && prediction.time_horizon && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Horizon</div>
                <div className="font-medium text-sm">{prediction.time_horizon}</div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Explanation */}
        {showExplanation && (
          <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">
                  {isOwner && !prediction.explanation_public && "(Private) "}
                  {isLongTerm ? "Rationale" : "Trade Explanation"}
                </span>
                {isExplanationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                {prediction.explanation}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Add Explanation Button (Owner only, no explanation yet) */}
        {isOwner && !prediction.explanation && onAddExplanation && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 text-xs"
            onClick={() => onAddExplanation(prediction.id)}
          >
            {isLongTerm ? "Add Rationale" : "Add Trade Explanation"}
          </Button>
        )}

        {/* Share to Feed Toggle (Owner only, resolved trades only) */}
        {isOwner && isTrade && !isActive && (
          <Button 
            variant={isPublic ? "default" : "outline"} 
            size="sm" 
            className="w-full mt-2 text-xs gap-1.5"
            onClick={handleTogglePublic}
            disabled={isUpdating}
          >
            {isPublic ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                Shared on Feed
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                Share to Feed
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to adjust color brightness
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
