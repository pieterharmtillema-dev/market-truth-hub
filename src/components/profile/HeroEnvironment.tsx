import { useMemo } from "react";

export interface EnvironmentUnlocks {
  // Background items
  lamborghini: boolean;
  mansion: boolean;
  yacht: boolean;
  privateJet: boolean;
  cityscape: boolean;
  tradingDesk: boolean;
  moneyPile: boolean;
  
  // Character accessories
  rolex: boolean;
  crown: boolean;
  diamondChain: boolean;
  briefcase: boolean;
  
  // Effects
  goldRain: boolean;
  fireworks: boolean;
  spotlight: boolean;
}

export interface EnvironmentConfig {
  unlocks: EnvironmentUnlocks;
  theme: 'day' | 'night' | 'sunset';
}

// Calculate unlocks based on trading stats
export function calculateUnlocks(
  totalTrades: number,
  winRate: number,
  bestStreak: number,
  totalPnl?: number
): EnvironmentUnlocks {
  return {
    // Background unlocks
    tradingDesk: totalTrades >= 1,           // First trade
    cityscape: totalTrades >= 10,            // 10 trades
    moneyPile: totalTrades >= 25 && winRate >= 40,  // 25 trades + 40% WR
    lamborghini: totalTrades >= 50 && winRate >= 50, // 50 trades + 50% WR
    mansion: totalTrades >= 100 && winRate >= 55,    // 100 trades + 55% WR
    yacht: totalTrades >= 200 && winRate >= 60,      // 200 trades + 60% WR
    privateJet: totalTrades >= 500 && winRate >= 65, // 500 trades + 65% WR
    
    // Accessory unlocks
    briefcase: totalTrades >= 5,             // 5 trades
    rolex: bestStreak >= 3,                  // 3 win streak
    diamondChain: bestStreak >= 5,           // 5 win streak
    crown: bestStreak >= 10 && winRate >= 70, // 10 streak + 70% WR
    
    // Effect unlocks
    spotlight: totalTrades >= 15,            // 15 trades
    goldRain: winRate >= 60 && totalTrades >= 30,  // 60% WR + 30 trades
    fireworks: winRate >= 75 && totalTrades >= 50, // 75% WR + 50 trades
  };
}

interface HeroEnvironmentProps {
  unlocks: EnvironmentUnlocks;
  theme?: 'day' | 'night' | 'sunset' | 'asian' | 'london' | 'newyork';
  className?: string;
}

export function HeroEnvironment({ unlocks, theme = 'night', className = '' }: HeroEnvironmentProps) {
  const backgroundImage = useMemo(() => {
    switch (theme) {
      case 'asian':
        return '/images/trading-sessions/asian-session.jpg';
      case 'london':
        return '/images/trading-sessions/london-session.jpg';
      case 'newyork':
        return '/images/trading-sessions/newyork-session.jpg';
      default:
        return null;
    }
  }, [theme]);

  const gradients = useMemo(() => {
    switch (theme) {
      case 'day':
        return {
          sky: 'from-blue-400 via-blue-300 to-blue-100',
          ground: 'from-emerald-600 to-emerald-800',
        };
      case 'sunset':
        return {
          sky: 'from-orange-500 via-pink-400 to-purple-600',
          ground: 'from-orange-900 to-purple-900',
        };
      case 'asian':
        // Tokyo sunrise - pink, orange, purple
        return {
          sky: 'from-pink-300 via-orange-300 to-purple-400',
          ground: 'from-red-900 to-purple-900',
        };
      case 'london':
        // London grey/blue foggy morning
        return {
          sky: 'from-slate-400 via-blue-300 to-slate-200',
          ground: 'from-slate-700 to-slate-800',
        };
      case 'newyork':
        // NYC golden hour / Wall Street golden tones
        return {
          sky: 'from-amber-400 via-yellow-300 to-orange-400',
          ground: 'from-amber-900 to-orange-900',
        };
      default: // night
        return {
          sky: 'from-slate-900 via-purple-900/50 to-slate-900',
          ground: 'from-slate-800 to-slate-900',
        };
    }
  }, [theme]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Background Image or Sky gradient */}
      {backgroundImage ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {/* Multi-layer gradient overlay for smooth fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/5 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradients.sky}`} />
      )}
      
      {/* Stars (night only) */}
      {theme === 'night' && (
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* Cityscape */}
      {unlocks.cityscape && (
        <svg className="absolute bottom-20 left-0 right-0 h-32 opacity-40" viewBox="0 0 400 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="building-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Buildings */}
          <rect x="10" y="40" width="25" height="60" fill="url(#building-grad)" />
          <rect x="40" y="25" width="20" height="75" fill="url(#building-grad)" />
          <rect x="65" y="50" width="30" height="50" fill="url(#building-grad)" />
          <rect x="100" y="15" width="25" height="85" fill="url(#building-grad)" />
          <rect x="130" y="35" width="20" height="65" fill="url(#building-grad)" />
          <rect x="155" y="45" width="35" height="55" fill="url(#building-grad)" />
          <rect x="195" y="20" width="20" height="80" fill="url(#building-grad)" />
          <rect x="220" y="55" width="25" height="45" fill="url(#building-grad)" />
          <rect x="250" y="30" width="30" height="70" fill="url(#building-grad)" />
          <rect x="285" y="40" width="20" height="60" fill="url(#building-grad)" />
          <rect x="310" y="50" width="25" height="50" fill="url(#building-grad)" />
          <rect x="340" y="25" width="20" height="75" fill="url(#building-grad)" />
          <rect x="365" y="45" width="30" height="55" fill="url(#building-grad)" />
          
          {/* Building windows */}
          {[...Array(15)].map((_, i) => (
            <rect
              key={i}
              x={20 + (i * 25)}
              y={30 + (i % 3) * 20}
              width="3"
              height="4"
              fill={theme === 'night' ? '#FFD700' : '#FFFFFF'}
              opacity={theme === 'night' ? 0.8 : 0.3}
            />
          ))}
        </svg>
      )}

      {/* Ground/Floor */}
      <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${gradients.ground}`}>
        {/* Reflective floor effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5" />
      </div>

      {/* Trading Desk */}
      {unlocks.tradingDesk && (
        <svg className="absolute bottom-16 right-4 w-20 h-16 opacity-60" viewBox="0 0 80 60">
          {/* Desk */}
          <rect x="5" y="30" width="70" height="5" rx="1" fill="#2D2D2D" />
          <rect x="10" y="35" width="8" height="20" fill="#1a1a1a" />
          <rect x="62" y="35" width="8" height="20" fill="#1a1a1a" />
          {/* Monitors */}
          <rect x="15" y="10" width="22" height="18" rx="1" fill="#0a0a0a" stroke="#3D3D3D" strokeWidth="1" />
          <rect x="43" y="10" width="22" height="18" rx="1" fill="#0a0a0a" stroke="#3D3D3D" strokeWidth="1" />
          {/* Screen glow */}
          <rect x="17" y="12" width="18" height="14" fill="#10B981" opacity="0.3" />
          <rect x="45" y="12" width="18" height="14" fill="#EF4444" opacity="0.3" />
          {/* Chart lines */}
          <path d="M 18 20 L 22 18 L 26 22 L 30 16 L 34 19" stroke="#10B981" strokeWidth="1" fill="none" />
          <path d="M 46 18 L 50 22 L 54 17 L 58 21 L 62 15" stroke="#EF4444" strokeWidth="1" fill="none" />
        </svg>
      )}

      {/* Money Pile */}
      {unlocks.moneyPile && (
        <div className="absolute bottom-16 left-4">
          <svg className="w-16 h-12 opacity-70" viewBox="0 0 60 40">
            {/* Stack of bills */}
            {[...Array(5)].map((_, i) => (
              <g key={i} transform={`translate(${i * 2}, ${-i * 3})`}>
                <rect x="10" y="25" width="30" height="15" rx="2" fill="#22C55E" stroke="#15803D" strokeWidth="0.5" />
                <text x="25" y="35" textAnchor="middle" fontSize="8" fill="#15803D" fontWeight="bold">$</text>
              </g>
            ))}
            {/* Coins */}
            <circle cx="50" cy="35" r="6" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
            <circle cx="45" cy="30" r="5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
            <circle cx="52" cy="28" r="4" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Lamborghini */}
      {unlocks.lamborghini && (
        <svg className="absolute bottom-14 left-1/2 -translate-x-1/2 translate-x-16 w-28 h-14 opacity-80" viewBox="0 0 120 50">
          <defs>
            <linearGradient id="lambo-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="lambo-window" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
          </defs>
          {/* Body */}
          <path d="M 15 35 L 25 20 L 95 20 L 105 35 L 105 40 L 15 40 Z" fill="url(#lambo-body)" />
          {/* Windows */}
          <path d="M 30 22 L 35 30 L 55 30 L 50 22 Z" fill="url(#lambo-window)" />
          <path d="M 52 22 L 55 30 L 85 30 L 90 22 Z" fill="url(#lambo-window)" />
          {/* Front lights */}
          <rect x="15" y="32" width="8" height="3" rx="1" fill="#FFFFFF" opacity="0.9" />
          {/* Rear lights */}
          <rect x="97" y="32" width="8" height="3" rx="1" fill="#EF4444" opacity="0.9" />
          {/* Wheels */}
          <circle cx="32" cy="42" r="8" fill="#1a1a1a" stroke="#3a3a3a" strokeWidth="2" />
          <circle cx="32" cy="42" r="4" fill="#4a4a4a" />
          <circle cx="88" cy="42" r="8" fill="#1a1a1a" stroke="#3a3a3a" strokeWidth="2" />
          <circle cx="88" cy="42" r="4" fill="#4a4a4a" />
          {/* Shine effect */}
          <path d="M 25 25 L 95 25" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </svg>
      )}

      {/* Yacht (distant) */}
      {unlocks.yacht && (
        <svg className="absolute bottom-24 right-8 w-16 h-10 opacity-50" viewBox="0 0 60 40">
          <path d="M 5 25 L 15 15 L 55 15 L 55 25 Z" fill="#FFFFFF" />
          <path d="M 15 25 L 5 35 L 55 35 L 55 25 Z" fill="#E5E5E5" />
          <rect x="25" y="8" width="3" height="15" fill="#8B4513" />
          <path d="M 28 8 L 50 18 L 28 20 Z" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="0.5" />
          {/* Water reflection */}
          <ellipse cx="30" cy="38" rx="25" ry="3" fill="hsl(var(--primary))" opacity="0.2" />
        </svg>
      )}

      {/* Private Jet (flying) */}
      {unlocks.privateJet && (
        <svg 
          className="absolute top-8 right-12 w-14 h-8 opacity-60" 
          viewBox="0 0 60 30"
          style={{ animation: 'float 6s ease-in-out infinite' }}
        >
          <path d="M 5 15 L 20 12 L 45 12 L 55 15 L 45 18 L 20 18 Z" fill="#FFFFFF" />
          <path d="M 30 5 L 35 12 L 30 12 Z" fill="#E5E5E5" />
          <path d="M 40 12 L 50 8 L 55 12 Z" fill="#E5E5E5" />
          <path d="M 40 18 L 50 22 L 55 18 Z" fill="#E5E5E5" />
          {/* Contrail */}
          <path d="M 5 15 L -20 15" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="3,3" />
        </svg>
      )}

      {/* Mansion (distant) */}
      {unlocks.mansion && (
        <svg className="absolute bottom-20 left-2 w-20 h-16 opacity-40" viewBox="0 0 80 60">
          <rect x="15" y="30" width="50" height="25" fill="#8B7355" />
          <path d="M 10 30 L 40 10 L 70 30 Z" fill="#654321" />
          <rect x="35" y="40" width="10" height="15" fill="#3a2a1a" />
          <rect x="20" y="35" width="8" height="10" fill="#87CEEB" opacity="0.7" />
          <rect x="52" y="35" width="8" height="10" fill="#87CEEB" opacity="0.7" />
          {/* Columns */}
          <rect x="18" y="30" width="3" height="25" fill="#D4C4B0" />
          <rect x="59" y="30" width="3" height="25" fill="#D4C4B0" />
        </svg>
      )}

      {/* Gold Rain Effect */}
      {unlocks.goldRain && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-3 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"
              style={{
                left: `${5 + (i * 6.5)}%`,
                top: '-10px',
                animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Spotlight Effect */}
      {unlocks.spotlight && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-64 opacity-20"
          style={{
            background: 'linear-gradient(to top, hsl(var(--primary)), transparent)',
            clipPath: 'polygon(40% 100%, 60% 100%, 75% 0%, 25% 0%)',
          }}
        />
      )}

      {/* Fireworks */}
      {unlocks.fireworks && (
        <div className="absolute top-4 left-0 right-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${20 + i * 30}%`,
                animation: `firework ${3 + i}s ease-out infinite`,
                animationDelay: `${i * 1.2}s`,
              }}
            >
              {[...Array(8)].map((_, j) => (
                <div
                  key={j}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA'][i % 4],
                    transform: `rotate(${j * 45}deg) translateY(-12px)`,
                    animation: `sparkle 1s ease-out infinite`,
                    animationDelay: `${i * 0.3 + j * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(15deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(400px) rotate(15deg); opacity: 0; }
        }
        
        @keyframes firework {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1.2); opacity: 0; }
        }
        
        @keyframes sparkle {
          0% { transform: rotate(var(--angle)) translateY(-8px) scale(0); opacity: 0; }
          50% { transform: rotate(var(--angle)) translateY(-16px) scale(1); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(-24px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Accessory overlay for character
export function CharacterAccessories({ unlocks }: { unlocks: EnvironmentUnlocks }) {
  return (
    <g className="character-accessories">
      {/* Rolex Watch */}
      {unlocks.rolex && (
        <g transform="translate(44, 95)">
          <ellipse cx="0" cy="0" rx="4" ry="3" fill="#FFD700" stroke="#B8860B" strokeWidth="0.5" />
          <circle cx="0" cy="0" r="2" fill="#1a1a1a" />
          <line x1="0" y1="0" x2="0" y2="-1.5" stroke="#FFD700" strokeWidth="0.3" />
          <line x1="0" y1="0" x2="1" y2="0.5" stroke="#FFD700" strokeWidth="0.3" />
        </g>
      )}

      {/* Diamond Chain */}
      {unlocks.diamondChain && (
        <g>
          <path 
            d="M 62 64 Q 72 70 82 64" 
            stroke="url(#diamond-chain-grad)" 
            strokeWidth="2" 
            fill="none"
          />
          {/* Diamond pendant */}
          <path 
            d="M 72 70 L 70 73 L 72 78 L 74 73 Z" 
            fill="#87CEEB" 
            stroke="#B0E0E6" 
            strokeWidth="0.5"
          />
          <defs>
            <linearGradient id="diamond-chain-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
        </g>
      )}

      {/* Crown */}
      {unlocks.crown && (
        <g transform="translate(72, 18)">
          <path 
            d="M -12 8 L -10 0 L -5 5 L 0 -2 L 5 5 L 10 0 L 12 8 Z" 
            fill="#FFD700" 
            stroke="#B8860B" 
            strokeWidth="0.5"
          />
          {/* Jewels */}
          <circle cx="-5" cy="4" r="1.5" fill="#EF4444" />
          <circle cx="0" cy="2" r="2" fill="#3B82F6" />
          <circle cx="5" cy="4" r="1.5" fill="#10B981" />
        </g>
      )}

      {/* Briefcase */}
      {unlocks.briefcase && (
        <g transform="translate(98, 100)">
          <rect x="0" y="0" width="14" height="10" rx="1" fill="#8B4513" stroke="#654321" strokeWidth="0.5" />
          <rect x="4" y="-2" width="6" height="3" rx="0.5" fill="#654321" />
          <rect x="5" y="4" width="4" height="1" rx="0.5" fill="#FFD700" />
        </g>
      )}
    </g>
  );
}
