import { useState } from "react";
import { TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, CheckCircle, Flame, Snowflake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

export interface PublicPredictionData {
  id: string;
  user_id: string;
  asset: string;
  asset_type: string;
  direction: string;
  current_price: number; // entry price
  target_price: number; // exit price
  status: string;
  created_at: string;
  resolved_at?: string | null;
  explanation?: string | null;
  explanation_public?: boolean;
  // User profile data (from join)
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    current_streak?: number;
    streak_type?: string;
    total_predictions?: number;
    total_hits?: number;
  };
}

interface PublicPredictionCardProps {
  prediction: PublicPredictionData;
  currentUserId?: string;
  onAddExplanation?: (predictionId: string) => void;
}

export function PublicPredictionCard({ prediction, currentUserId, onAddExplanation }: PublicPredictionCardProps) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const isOwner = currentUserId === prediction.user_id;
  const isLong = prediction.direction === "long";
  const isHit = prediction.status === "hit";
  
  // Calculate accuracy from profile
  const accuracy = prediction.profile?.total_predictions && prediction.profile.total_predictions > 0
    ? Math.round((prediction.profile.total_hits || 0) / prediction.profile.total_predictions * 100)
    : null;

  // Streak info
  const streak = prediction.profile?.current_streak || 0;
  const streakType = prediction.profile?.streak_type || "none";
  const isHotStreak = streakType === "hit" && streak >= 2;
  const isColdStreak = streakType === "miss" && streak >= 3;

  const displayName = prediction.profile?.display_name || "Trader";
  const avatarUrl = prediction.profile?.avatar_url;

  // Format dates
  const entryTime = prediction.created_at ? format(new Date(prediction.created_at), "MMM d, yyyy HH:mm") : "";
  const exitTime = prediction.resolved_at ? format(new Date(prediction.resolved_at), "MMM d, yyyy HH:mm") : "";

  // Should show explanation
  const showExplanation = prediction.explanation && (isOwner || prediction.explanation_public);

  return (
    <Card 
      variant={isHit ? "gain" : "loss"}
      className="animate-fade-in overflow-hidden"
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
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
                <span className="font-medium text-sm">{displayName}</span>
                {isHotStreak && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-orange-400">
                    <Flame className="w-3 h-3" />
                    {streak}
                  </span>
                )}
                {isColdStreak && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-blue-400" title="Cold Streak">
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
          <Badge variant={isHit ? "gain" : "loss"}>
            {isHit ? "Hit ✓" : "Missed"}
          </Badge>
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

          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</div>
              <div className="font-mono font-medium text-sm">${prediction.current_price.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">{entryTime}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Exit</div>
              <div className="font-mono font-medium text-sm">${prediction.target_price.toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">{exitTime}</div>
            </div>
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
                  Trade Explanation
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
            Add Trade Explanation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
