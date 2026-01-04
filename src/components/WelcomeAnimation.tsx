import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export default function WelcomeAnimation({ onComplete }: WelcomeAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-close after video ends (fallback timeout of 5 seconds if video doesn't trigger onEnded)
    const fallbackTimer = setTimeout(() => {
      handleComplete();
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300); // Wait for fade-out animation
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleComplete}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          autoPlay
          muted
          playsInline
          onEnded={handleComplete}
          className="max-w-full max-h-full object-contain pointer-events-none"
          style={{
            filter: "drop-shadow(0 0 40px rgba(61, 214, 140, 0.3))",
          }}
        >
          <source src="/welcome.webm" type="video/webm" />
        </video>
      </div>

      {/* Optional: Click anywhere to skip hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000">
        Click anywhere to continue
      </div>
    </div>
  );
}
