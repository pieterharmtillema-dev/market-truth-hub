import { useEffect, useState } from "react";

interface WelcomeAnimationData {
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
  const [isVisible, setIsVisible] = useState(true);

  // Calculate level if userData exists
  const userLevel = userData ? calculateLevel(userData.totalPredictions) : null;
  const isFirstTime = userData?.isFirstTime ?? true;
  const hasActiveStreak = userData && userData.currentStreak > 0 && userData.streakType === 'hit';

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
      className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300"
      onClick={handleComplete}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Dark fade background overlay */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Continuous glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none animate-glow-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--trax) / 0.2) 0%, transparent 60%)',
          }}
        />

        {/* Video element */}
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

        {/* Center: Welcome message - positioned on top */}
        {userData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              {isFirstTime ? (
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
              ) : (
                <div className="space-y-6">
                  {/* Welcome back - positioned on top */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-trax/40 to-primary/40 blur-3xl animate-pulse" />
                    <h1 className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white" style={{
                      textShadow: '0 0 60px rgba(61, 214, 140, 1), 0 0 100px rgba(125, 197, 66, 0.8), 0 0 140px rgba(255, 255, 255, 0.6), 0 6px 30px rgba(0, 0, 0, 0.9)',
                      WebkitTextStroke: '2px rgba(61, 214, 140, 0.4)',
                      letterSpacing: '0.02em',
                    }}>
                      Welcome back
                    </h1>
                  </div>

                  {/* Successfully logged in - smaller, below */}
                  <div className="relative">
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-white/90 tracking-wide" style={{
                      textShadow: '0 0 20px rgba(61, 214, 140, 0.6), 0 0 40px rgba(61, 214, 140, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)',
                    }}>
                      Successfully logged in
                    </p>
                  </div>

                  {/* Active streak badge */}
                  {hasActiveStreak && (
                    <div className="mt-4 px-6 py-3 rounded-full backdrop-blur-xl border-2 border-primary/40 inline-block bg-gradient-to-r from-primary/20 to-trax/20 animate-in zoom-in duration-500 delay-800">
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-warning via-primary to-warning bg-clip-text text-transparent" style={{
                        textShadow: '0 0 25px rgba(255, 165, 0, 0.6)',
                      }}>
                        {userData.currentStreak}-trade streak! 🔥
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click anywhere to skip hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000">
        Click anywhere to continue
      </div>
    </div>
  );
}
