import { useEffect, useRef, useState } from "react";

export interface WelcomeAnimationData {
  isFirstTime: boolean;
  displayName: string | null;
  currentStreak: number;
  streakType: 'hit' | 'miss' | 'none';
  totalPredictions: number;
}

interface WelcomeAnimationProps {
  onComplete: () => void;
  userData?: WelcomeAnimationData;
}

type UserLevel = {
  tier: 'Novice' | 'Apprentice' | 'Trader' | 'Expert' | 'Master';
  color: string;
  icon: string;
};

const calculateLevel = (totalPredictions: number): UserLevel => {
  if (totalPredictions >= 100) {
    return { tier: 'Master', color: 'hsl(var(--warning))', icon: '🏆' };
  } else if (totalPredictions >= 50) {
    return { tier: 'Expert', color: 'hsl(var(--primary))', icon: '💎' };
  } else if (totalPredictions >= 25) {
    return { tier: 'Trader', color: 'hsl(var(--trax))', icon: '⚡' };
  } else if (totalPredictions >= 10) {
    return { tier: 'Apprentice', color: 'hsl(var(--primary))', icon: '🌟' };
  }
  return { tier: 'Novice', color: 'hsl(var(--muted-foreground))', icon: '🌱' };
};

export default function WelcomeAnimation({ onComplete, userData }: WelcomeAnimationProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [shouldFadeOverlayOut, setShouldFadeOverlayOut] = useState(false);
  const exitTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const overlayFadeInMs = 800;
  const contentFadeInMs = 600;
  const contentFadeInDelayMs = overlayFadeInMs;
  const contentFadeOutMs = 400;
  const overlayFadeOutMs = 800;

  // Calculate level if userData exists
  const userLevel = userData ? calculateLevel(userData.totalPredictions) : null;
  const isFirstTime = userData?.isFirstTime ?? true;
  const hasActiveStreak = userData && userData.currentStreak > 0 && userData.streakType === 'hit';

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setHasEntered(true));

    // Auto-close after video ends (fallback timeout of 5 seconds if video doesn't trigger onEnded)
    const fallbackTimer = setTimeout(() => {
      handleComplete();
    }, 5000);

    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(fallbackTimer);
      exitTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      exitTimersRef.current = [];
    };
  }, []);

  const handleComplete = () => {
    if (isExiting) return;
    setIsExiting(true);

    const overlayTimer = setTimeout(() => {
      setShouldFadeOverlayOut(true);
    }, contentFadeOutMs);

    const doneTimer = setTimeout(() => {
      onComplete();
    }, contentFadeOutMs + overlayFadeOutMs);

    exitTimersRef.current.push(overlayTimer, doneTimer);
  };

  const overlayOpacityClass = shouldFadeOverlayOut
    ? "opacity-0"
    : hasEntered
      ? "opacity-70"
      : "opacity-0";

  const contentOpacityClass = isExiting
    ? "opacity-0"
    : hasEntered
      ? "opacity-100"
      : "opacity-0";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300"
      onClick={handleComplete}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Black fade-to-feed overlay */}
        <div
          className={`absolute inset-0 bg-black pointer-events-none transition-opacity ${overlayOpacityClass}`}
          style={{ transitionDuration: `${shouldFadeOverlayOut ? overlayFadeOutMs : overlayFadeInMs}ms` }}
        />

        {/* Dark fade background overlay */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        <div
          className={`absolute inset-0 pointer-events-none transition-opacity ${contentOpacityClass}`}
          style={{
            transitionDuration: `${isExiting ? contentFadeOutMs : contentFadeInMs}ms`,
            transitionDelay: isExiting ? "0ms" : `${contentFadeInDelayMs}ms`,
          }}
        >
          {/* Continuous glow overlay */}
          <div
            className="absolute inset-0 pointer-events-none animate-glow-pulse"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(var(--trax) / 0.2) 0%, transparent 60%)',
            }}
          />

          {/* Video element */}
          <div className="absolute inset-0 flex items-center justify-center">
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

          {/* Top-right corner: Level badge + username */}
          {userData && userLevel && (
            <div className="absolute top-8 right-8 sm:top-4 sm:right-4 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
              {/* Level Badge */}
              <div
                className="px-4 py-2 rounded-full backdrop-blur-xl border flex items-center gap-2"
                style={{
                  backgroundColor: `${userLevel.color.replace(')', ' / 0.15)')}`,
                  borderColor: `${userLevel.color.replace(')', ' / 0.3)')}`,
                }}
              >
                <span className="text-2xl">{userLevel.icon}</span>
                <span
                  className="font-bold text-sm uppercase tracking-wider"
                  style={{ color: userLevel.color }}
                >
                  {userLevel.tier}
                </span>
              </div>

              {/* Username */}
              {userData.displayName && (
                <div className="text-white font-medium text-lg backdrop-blur-xl px-3 py-1 rounded-lg bg-black/60 border border-white/20">
                  {userData.displayName}
                </div>
              )}
            </div>
          )}

          {/* Center: Welcome message - positioned higher */}
          {userData && (
            <div className="absolute inset-0 flex flex-col items-center justify-start pt-24 sm:pt-32 md:pt-40 pointer-events-none px-4">
              <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                {isFirstTime && (
                  <div className="relative space-y-4">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent animate-glow-pulse" style={{
                      textShadow: '0 0 40px rgba(61, 214, 140, 0.6), 0 0 80px rgba(61, 214, 140, 0.3)',
                    }}>
                      Welcome to the Pack!
                    </h1>
                    <div className="text-5xl sm:text-6xl md:text-7xl animate-in zoom-in duration-500 delay-700">
                      🦖
                    </div>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white" style={{
                      textShadow: '0 0 30px rgba(61, 214, 140, 0.8), 0 0 60px rgba(61, 214, 140, 0.4)',
                    }}>
                      Successfully logged in as {userData.displayName || 'Trader'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Successfully logged in text for returning users - positioned above click hint */}
          {userData && !isFirstTime && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <p className="text-sm sm:text-base md:text-lg font-medium text-white/70 tracking-wide" style={{
                textShadow: '0 1px 10px rgba(0, 0, 0, 0.8)',
              }}>
                Successfully logged in
              </p>

              {/* Active streak badge */}
              {hasActiveStreak && (
                <div className="px-5 py-2 rounded-full backdrop-blur-md border border-primary/30 bg-gradient-to-r from-primary/15 to-trax/15 animate-in zoom-in duration-500 delay-800">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-warning via-primary to-warning bg-clip-text text-transparent" style={{
                    textShadow: '0 0 20px rgba(255, 165, 0, 0.5)',
                  }}>
                    {userData.currentStreak}-trade streak! 🔥
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Click anywhere to skip hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000">
            Click anywhere to continue
          </div>
        </div>
      </div>
    </div>
  );
}
