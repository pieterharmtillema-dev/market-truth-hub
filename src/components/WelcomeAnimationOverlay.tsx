import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WelcomeAnimation, { WelcomeAnimationData } from "@/components/WelcomeAnimation";

type WelcomeLocationState = {
  welcomeAnimationData?: WelcomeAnimationData;
};

export default function WelcomeAnimationOverlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const [welcomeData, setWelcomeData] = useState<WelcomeAnimationData | null>(null);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  useEffect(() => {
    const state = location.state as WelcomeLocationState | null;
    if (state?.welcomeAnimationData) {
      setWelcomeData(state.welcomeAnimationData);
      setShowWelcomeAnimation(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  if (!showWelcomeAnimation) return null;

  return (
    <WelcomeAnimation
      onComplete={() => setShowWelcomeAnimation(false)}
      userData={welcomeData || undefined}
    />
  );
}
