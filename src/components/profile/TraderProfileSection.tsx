import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Loader2, Check, Clock, TrendingUp, Brain, Heart, Award, Globe } from "lucide-react";
import { onboardingQuestions, TraderProfileAnswers } from "@/data/onboardingQuestions";
import { CategoryBadge, TraderCategory } from "@/components/profile/CategoryBadge";

interface TraderProfile extends TraderProfileAnswers {
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
  trader_category?: TraderCategory | null;
}

interface TraderProfileSectionProps {
  userId: string;
}

const dimensionIcons: Record<string, React.ReactNode> = {
  holding_time: <Clock className="w-4 h-4" />,
  risk_per_trade: <TrendingUp className="w-4 h-4" />,
  trade_frequency: <TrendingUp className="w-4 h-4" />,
  decision_style: <Brain className="w-4 h-4" />,
  loss_response: <Heart className="w-4 h-4" />,
  experience_level: <Award className="w-4 h-4" />,
  trading_session: <Globe className="w-4 h-4" />,
};

const getAnswerLabel = (questionId: string, value: string): string => {
  const question = onboardingQuestions.find(q => q.id === questionId);
  const option = question?.options.find(o => o.value === value);
  return option?.label || value;
};

export function TraderProfileSection({ userId }: TraderProfileSectionProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(0);
  const [editAnswers, setEditAnswers] = useState<TraderProfileAnswers>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("trader_profiles")
        .select("*, trader_category")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as TraderProfile);
        setEditAnswers({
          holding_time: data.holding_time,
          risk_per_trade: data.risk_per_trade,
          trade_frequency: data.trade_frequency,
          decision_style: data.decision_style,
          loss_response: data.loss_response,
          experience_level: data.experience_level,
          trading_session: data.trading_session,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      // Derive the trader category based on answers
      let traderCategory: string | null = null;
      try {
        const { data: categoryData, error: categoryError } = await supabase
          .rpc("derive_trader_category", {
            p_holding_time: editAnswers.holding_time || null,
            p_trade_frequency: editAnswers.trade_frequency || null,
            p_risk_per_trade: editAnswers.risk_per_trade || null,
          });

        if (!categoryError && categoryData) {
          traderCategory = categoryData;
        }
      } catch (err) {
        console.error("Error deriving category:", err);
        // Continue without category if derivation fails
      }

      // Build update object with all fields (null for undefined)
      const updateData: any = {
        user_id: userId,
        holding_time: editAnswers.holding_time || null,
        risk_per_trade: editAnswers.risk_per_trade || null,
        trade_frequency: editAnswers.trade_frequency || null,
        decision_style: editAnswers.decision_style || null,
        loss_response: editAnswers.loss_response || null,
        experience_level: editAnswers.experience_level || null,
        trading_session: editAnswers.trading_session || null,
        trader_category: traderCategory,
        onboarding_completed: true,
        onboarding_skipped: false,
      };

      console.log("Saving trader profile with data:", updateData);

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("trader_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from("trader_profiles")
          .update(updateData)
          .eq("user_id", userId)
          .select();
      } else {
        // Insert new profile
        result = await supabase
          .from("trader_profiles")
          .insert(updateData)
          .select();
      }

      const { error, data } = result;

      if (error) {
        console.error("Save error details:", error);
        console.error("Update data being sent:", updateData);
        throw error;
      }

      console.log("Profile saved successfully:", data);

      setProfile(prev => prev ? { ...prev, ...editAnswers, trader_category: traderCategory as any, onboarding_completed: true } : null);
      setEditOpen(false);
      setEditStep(0);

      // Format category name for display
      const categoryNames: Record<string, string> = {
        scalper: "Scalper",
        day_trader: "Day Trader",
        swing_trader: "Swing Trader",
        position_trader: "Position Trader",
        long_term_trader: "Long Term Trader",
      };

      const categoryName = traderCategory ? categoryNames[traderCategory] : null;

      toast({
        title: "Profile updated!",
        description: categoryName
          ? `You're categorized as a ${categoryName}.`
          : "Your trading profile has been saved."
      });

      // Reload to update the category badge
      window.location.reload();
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const currentQuestion = onboardingQuestions[editStep];
  const selectedValue = editAnswers[currentQuestion?.id as keyof TraderProfileAnswers];
  const isLastStep = editStep === onboardingQuestions.length - 1;

  const hasAnyAnswers = profile && (
    profile.holding_time ||
    profile.risk_per_trade ||
    profile.trade_frequency ||
    profile.decision_style ||
    profile.loss_response ||
    profile.experience_level ||
    profile.trading_session
  );

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading trader profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Trader Profile</CardTitle>
            <CardDescription className="text-xs">
              {hasAnyAnswers ? "Your trading style and preferences" : "Complete your trading profile"}
            </CardDescription>
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                {hasAnyAnswers ? "Edit" : "Set up"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {hasAnyAnswers ? "Edit Trader Profile" : "Complete Your Profile"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Progress */}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Question {editStep + 1} of {onboardingQuestions.length}</span>
                  <span className="text-[hsl(var(--trax))]">{currentQuestion?.dimension}</span>
                </div>

                {/* Question */}
                <div>
                  <p className="font-medium mb-3">{currentQuestion?.question}</p>
                  <div className="space-y-2">
                    {currentQuestion?.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEditAnswers(prev => ({ ...prev, [currentQuestion.id]: option.value }))}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedValue === option.value
                            ? "border-[hsl(var(--trax))] bg-[hsl(var(--trax)/0.1)]"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            {option.description && (
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            )}
                          </div>
                          {selectedValue === option.value && (
                            <Check className="w-4 h-4 text-[hsl(var(--trax))]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setEditStep(prev => prev - 1)}
                    disabled={editStep === 0}
                  >
                    Back
                  </Button>
                  {isLastStep ? (
                    <Button onClick={handleSaveEdit} disabled={!selectedValue || isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
                    </Button>
                  ) : (
                    <Button onClick={() => setEditStep(prev => prev + 1)} disabled={!selectedValue}>
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {hasAnyAnswers ? (
          <div className="flex flex-wrap gap-2">
            {/* Trader Category Badge - Same size as others */}
            {profile.trader_category && (
              <CategoryBadge category={profile.trader_category} size="sm" />
            )}

            {profile.holding_time && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                {dimensionIcons.holding_time}
                {getAnswerLabel("holding_time", profile.holding_time)}
              </Badge>
            )}
            {profile.risk_per_trade && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                {dimensionIcons.risk_per_trade}
                {getAnswerLabel("risk_per_trade", profile.risk_per_trade)}
              </Badge>
            )}
            {profile.decision_style && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                {dimensionIcons.decision_style}
                {getAnswerLabel("decision_style", profile.decision_style)}
              </Badge>
            )}
            {profile.experience_level && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                {dimensionIcons.experience_level}
                {getAnswerLabel("experience_level", profile.experience_level)}
              </Badge>
            )}
            {profile.trading_session && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                {dimensionIcons.trading_session}
                {getAnswerLabel("trading_session", profile.trading_session)}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete your profile to get personalized insights and recommendations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
