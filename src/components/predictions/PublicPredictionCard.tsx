import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, Flame, Snowflake, Calendar, Target, Globe, Lock, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  // User profile data (from join)
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    current_streak?: number;
    streak_type?: string;
    total_predictions?: number;
    total_hits?: number;
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
        {/* Long-Term Label */}
        {isLongTerm && (
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
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/trader/${prediction.user_id}`)}
          >
            <Avatar className="w-10 h-10 border-2 border-border">
              {avatarUrl && avatarUrl.length <= 4 ? (
                <div className="w-full h-full flex items-center justify-center text-lg bg-muted">
                  {avatarUrl}
                </div>
              ) : (
                <>
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm hover:underline">{displayName}</span>
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
              <div className={cn("font-mono font-medium text-sm", isLong ? "text-gain" : "text-loss")}>
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
