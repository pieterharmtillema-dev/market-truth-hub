import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Check, SkipForward, Loader2 } from "lucide-react";
import { onboardingQuestions, TraderProfileAnswers } from "@/data/onboardingQuestions";
import traxLogo from "@/assets/trax-dino-logo.png";

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<TraderProfileAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      
      // Check if already completed onboarding
      const { data: profile } = await supabase
        .from("trader_profiles")
        .select("onboarding_completed, onboarding_skipped")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (profile?.onboarding_completed || profile?.onboarding_skipped) {
        navigate("/");
      }
    };
    
    checkAuth();
  }, [navigate]);

  const currentQuestion = onboardingQuestions[currentStep];
  const progress = ((currentStep + 1) / onboardingQuestions.length) * 100;
  const isLastQuestion = currentStep === onboardingQuestions.length - 1;

  const handleSelectOption = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < onboardingQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("trader_profiles")
        .update({
          ...answers,
          onboarding_completed: true,
          onboarding_skipped: false,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Profile saved! 🦖",
        description: "Your trading profile has been set up.",
      });
      
      navigate("/");
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Couldn't save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("trader_profiles")
        .update({
          onboarding_skipped: true,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Skipped for now",
        description: "You can complete this anytime in Settings.",
      });
      
      navigate("/");
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedValue = answers[currentQuestion?.id as keyof TraderProfileAnswers];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-ambient"
          style={{
            background: 'radial-gradient(circle, hsl(var(--trax) / 0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="w-full max-w-lg relative animate-card-enter">
        {/* Header with logo */}
        <div className="text-center mb-6">
          <img 
            src={traxLogo} 
            alt="Trax" 
            className="h-16 w-auto mx-auto mb-3 animate-mascot-idle"
          />
          <p className="text-sm text-muted-foreground">
            Let's personalize your experience
          </p>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">
              Question {currentStep + 1} of {onboardingQuestions.length}
            </span>
            <span className="text-xs font-medium text-[hsl(var(--trax))]">
              {currentQuestion?.dimension}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Question Card */}
        <Card className="border-border/50 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion?.question}
            </CardTitle>
            <CardDescription className="text-sm">
              {currentQuestion?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion?.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelectOption(option.value)}
                className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                  selectedValue === option.value
                    ? "border-[hsl(var(--trax))] bg-[hsl(var(--trax)/0.1)] shadow-[0_0_0_1px_hsl(var(--trax)/0.3)]"
                    : "border-border/50 bg-secondary/30 hover:border-border hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {selectedValue === option.value && (
                    <div className="w-5 h-5 rounded-full bg-[hsl(var(--trax))] flex items-center justify-center shrink-0 ml-3">
                      <Check className="w-3 h-3 text-[hsl(var(--trax-foreground))]" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 gap-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip for now
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!selectedValue || isSubmitting}
              className="gap-2 min-w-[120px] transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--trax)/0.4)]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Complete
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!selectedValue}
              className="gap-2 min-w-[100px] transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--trax)/0.3)]"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Answer later note */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          You can update these answers anytime in your Profile settings
        </p>
      </div>
    </div>
  );
}
