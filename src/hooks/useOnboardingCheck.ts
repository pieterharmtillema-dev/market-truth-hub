import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useOnboardingCheck() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setIsChecking(false);
          return;
        }

        // Check trader profile for onboarding status
        const { data: traderProfile } = await supabase
          .from("trader_profiles")
          .select("onboarding_completed, onboarding_skipped")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // If no profile exists or onboarding not completed/skipped, redirect
        if (!traderProfile) {
          // Profile doesn't exist yet (might be new user), create it
          await supabase
            .from("trader_profiles")
            .insert({ user_id: session.user.id });
          
          setNeedsOnboarding(true);
          navigate("/onboarding");
        } else if (!traderProfile.onboarding_completed && !traderProfile.onboarding_skipped) {
          setNeedsOnboarding(true);
          navigate("/onboarding");
        }
      } catch (error) {
        console.error("Error checking onboarding:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [navigate]);

  return { isChecking, needsOnboarding };
}
