import { PremiumAvatarConfig } from './types';
import { cn } from '@/lib/utils';

interface PremiumAvatarRendererProps {
  config: PremiumAvatarConfig;
  size?: number;
  className?: string;
  animated?: boolean;
}

export function PremiumAvatarRenderer({ 
  config, 
  size = 120, 
  className,
  animated = false 
}: PremiumAvatarRendererProps) {
  const viewBox = "0 0 200 200";
  
  // Adjust skin tone based on undertone
  const getAdjustedSkinTone = () => {
    const base = config.skinTone;
    return base;
  };

  // Generate gradient IDs unique to this instance
  const gradientId = `avatar-${Math.random().toString(36).substr(2, 9)}`;
  
  const renderBackground = () => {
    switch (config.background) {
      case 'solid':
        return <circle cx="100" cy="100" r="98" fill={config.backgroundColor} />;
      case 'gradient':
        return (
          <>
            <defs>
              <linearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={config.backgroundColor} />
                <stop offset="100%" stopColor={adjustColorBrightness(config.backgroundColor, -30)} />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="98" fill={`url(#${gradientId}-bg)`} />
          </>
        );
      case 'glow':
        return (
          <>
            <defs>
              <radialGradient id={`${gradientId}-glow`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={config.backgroundColor} stopOpacity="0.4" />
                <stop offset="60%" stopColor={config.backgroundColor} stopOpacity="0.1" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="98" fill="#0f172a" />
            <circle cx="100" cy="100" r="98" fill={`url(#${gradientId}-glow)`} />
          </>
        );
      default:
        return <circle cx="100" cy="100" r="98" fill="#1e293b" />;
    }
  };

  const renderFaceShape = () => {
    const skin = getAdjustedSkinTone();
    const shadowColor = adjustColorBrightness(skin, -20);
    const highlightColor = adjustColorBrightness(skin, 20);
    
    const shapes: Record<string, string> = {
      round: 'M100,40 C145,40 165,70 165,115 C165,160 145,175 100,175 C55,175 35,160 35,115 C35,70 55,40 100,40',
      oval: 'M100,35 C150,35 165,65 165,110 C165,165 140,180 100,180 C60,180 35,165 35,110 C35,65 50,35 100,35',
      angular: 'M100,35 C150,35 170,55 170,100 C170,150 155,175 100,180 C45,175 30,150 30,100 C30,55 50,35 100,35',
      square: 'M100,40 C155,40 170,55 170,105 C170,155 155,175 100,175 C45,175 30,155 30,105 C30,55 45,40 100,40',
    };

    return (
      <>
        <defs>
          <linearGradient id={`${gradientId}-face`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="50%" stopColor={skin} />
            <stop offset="100%" stopColor={shadowColor} />
          </linearGradient>
          <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        
        {/* Neck */}
        <ellipse cx="100" cy="175" rx="25" ry="30" fill={skin} />
        
        {/* Face */}
        <path 
          d={shapes[config.faceShape]} 
          fill={`url(#${gradientId}-face)`}
          filter={`url(#${gradientId}-shadow)`}
        />
        
        {/* Ears */}
        <ellipse cx="35" cy="105" rx="8" ry="15" fill={skin} />
        <ellipse cx="165" cy="105" rx="8" ry="15" fill={skin} />
        <ellipse cx="35" cy="105" rx="4" ry="8" fill={shadowColor} opacity="0.3" />
        <ellipse cx="165" cy="105" rx="4" ry="8" fill={shadowColor} opacity="0.3" />
        
        {/* Freckles */}
        {config.freckles && (
          <g fill={shadowColor} opacity="0.4">
            <circle cx="75" cy="115" r="1.5" />
            <circle cx="80" cy="120" r="1" />
            <circle cx="85" cy="112" r="1.2" />
            <circle cx="70" cy="118" r="1" />
            <circle cx="125" cy="115" r="1.5" />
            <circle cx="120" cy="120" r="1" />
            <circle cx="115" cy="112" r="1.2" />
            <circle cx="130" cy="118" r="1" />
          </g>
        )}
        
        {/* Beauty mark */}
        {config.beautyMark === 'left' && (
          <circle cx="70" cy="130" r="2" fill="#3D2B24" />
        )}
        {config.beautyMark === 'right' && (
          <circle cx="130" cy="130" r="2" fill="#3D2B24" />
        )}
        
        {/* Nose */}
        <path 
          d="M100,100 L95,128 Q100,132 105,128 Z" 
          fill={shadowColor}
          opacity="0.15"
        />
        <ellipse cx="95" cy="128" rx="4" ry="2.5" fill={shadowColor} opacity="0.1" />
        <ellipse cx="105" cy="128" rx="4" ry="2.5" fill={shadowColor} opacity="0.1" />
      </>
    );
  };

  const renderEyes = () => {
    const eyeConfigs = {
      focused: { width: 18, height: 12, pupilSize: 6 },
      relaxed: { width: 20, height: 10, pupilSize: 5 },
      sharp: { width: 16, height: 14, pupilSize: 7 },
      friendly: { width: 20, height: 14, pupilSize: 6 },
    };
    
    const eye = eyeConfigs[config.eyeShape];
    const browThickness = config.eyebrowThickness * 3;
    
    return (
      <>
        <defs>
          <radialGradient id={`${gradientId}-iris`} cx="40%" cy="40%">
            <stop offset="0%" stopColor={adjustColorBrightness(config.irisColor, 30)} />
            <stop offset="50%" stopColor={config.irisColor} />
            <stop offset="100%" stopColor={adjustColorBrightness(config.irisColor, -30)} />
          </radialGradient>
        </defs>
        
        {/* Eye whites */}
        <ellipse cx="70" cy="95" rx={eye.width} ry={eye.height} fill="white" />
        <ellipse cx="130" cy="95" rx={eye.width} ry={eye.height} fill="white" />
        
        {/* Irises with gradient */}
        <circle cx="70" cy="95" r={eye.pupilSize + 3} fill={`url(#${gradientId}-iris)`} />
        <circle cx="130" cy="95" r={eye.pupilSize + 3} fill={`url(#${gradientId}-iris)`} />
        
        {/* Pupils */}
        <circle cx="70" cy="95" r={eye.pupilSize - 1} fill="#1a1a1a" />
        <circle cx="130" cy="95" r={eye.pupilSize - 1} fill="#1a1a1a" />
        
        {/* Eye highlights */}
        <circle cx="73" cy="92" r="2.5" fill="white" opacity="0.9" />
        <circle cx="133" cy="92" r="2.5" fill="white" opacity="0.9" />
        <circle cx="68" cy="97" r="1" fill="white" opacity="0.5" />
        <circle cx="128" cy="97" r="1" fill="white" opacity="0.5" />
        
        {/* Eyebrows */}
        {renderEyebrows(browThickness)}
        
        {/* Eyelashes (subtle) */}
        <path 
          d={`M${55},${95 - eye.height} Q70,${90 - eye.height} ${85},${95 - eye.height}`}
          stroke="#2D2D2D"
          strokeWidth="1.5"
          fill="none"
          opacity="0.3"
        />
        <path 
          d={`M${115},${95 - eye.height} Q130,${90 - eye.height} ${145},${95 - eye.height}`}
          stroke="#2D2D2D"
          strokeWidth="1.5"
          fill="none"
          opacity="0.3"
        />
      </>
    );
  };

  const renderEyebrows = (thickness: number) => {
    const browColor = adjustColorBrightness(config.hairColor, -10);
    
    const shapes: Record<string, { left: string; right: string }> = {
      natural: {
        left: 'M50,75 Q65,70 85,78',
        right: 'M115,78 Q135,70 150,75',
      },
      arched: {
        left: 'M50,80 Q65,65 85,78',
        right: 'M115,78 Q135,65 150,80',
      },
      straight: {
        left: 'M50,75 L85,75',
        right: 'M115,75 L150,75',
      },
      thick: {
        left: 'M48,75 Q65,68 87,78',
        right: 'M113,78 Q135,68 152,75',
      },
    };
    
    const brow = shapes[config.eyebrowShape];
    const finalThickness = config.eyebrowShape === 'thick' ? thickness * 1.5 : thickness;
    
    return (
      <>
        <path d={brow.left} stroke={browColor} strokeWidth={finalThickness} fill="none" strokeLinecap="round" />
        <path d={brow.right} stroke={browColor} strokeWidth={finalThickness} fill="none" strokeLinecap="round" />
      </>
    );
  };

  const renderMouth = () => {
    return (
      <>
        {/* Lips */}
        <path 
          d="M80,145 Q100,155 120,145" 
          stroke="#C4756E"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Subtle smile line */}
        <path 
          d="M85,147 Q100,153 115,147" 
          fill="#B8625B"
          opacity="0.3"
        />
      </>
    );
  };

  const renderHair = () => {
    if (config.hairStyle === 'none') return null;
    
    const hairColor = config.hairColor;
    const highlightColor = config.hairHighlights 
      ? adjustColorBrightness(hairColor, 40) 
      : adjustColorBrightness(hairColor, 15);
    
    const styles: Record<string, JSX.Element> = {
      short: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-hair`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightColor} />
              <stop offset="100%" stopColor={hairColor} />
            </linearGradient>
          </defs>
          <path 
            d="M35,80 Q35,35 100,30 Q165,35 165,80 L160,70 Q100,45 40,70 Z" 
            fill={`url(#${gradientId}-hair)`}
          />
          <path d="M40,75 Q60,60 80,70" stroke={highlightColor} strokeWidth="3" fill="none" opacity="0.5" />
        </>
      ),
      fade: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-hair`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightColor} />
              <stop offset="100%" stopColor={hairColor} />
            </linearGradient>
          </defs>
          <path 
            d="M50,75 Q50,35 100,28 Q150,35 150,75 L145,65 Q100,40 55,65 Z" 
            fill={`url(#${gradientId}-hair)`}
          />
          {/* Fade effect on sides */}
          <path d="M35,90 Q38,70 50,65" stroke={hairColor} strokeWidth="8" fill="none" opacity="0.3" />
          <path d="M165,90 Q162,70 150,65" stroke={hairColor} strokeWidth="8" fill="none" opacity="0.3" />
        </>
      ),
      undercut: (
        <>
          <path 
            d="M45,70 Q45,30 100,25 Q155,30 155,70 L150,55 Q100,35 50,55 Z" 
            fill={hairColor}
          />
          <path d="M50,62 Q75,50 100,50 Q125,50 150,62" fill={highlightColor} opacity="0.4" />
          <path d="M35,95 Q38,80 48,72" stroke={hairColor} strokeWidth="4" fill="none" opacity="0.2" />
          <path d="M165,95 Q162,80 152,72" stroke={hairColor} strokeWidth="4" fill="none" opacity="0.2" />
        </>
      ),
      waves: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-hair`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightColor} />
              <stop offset="100%" stopColor={hairColor} />
            </linearGradient>
          </defs>
          <path 
            d="M30,90 Q25,40 100,25 Q175,40 170,90 Q160,70 140,75 Q120,60 100,70 Q80,60 60,75 Q40,70 30,90" 
            fill={`url(#${gradientId}-hair)`}
          />
          <path d="M40,80 Q55,65 75,75 Q90,68 105,72" stroke={highlightColor} strokeWidth="2" fill="none" opacity="0.5" />
        </>
      ),
      bun: (
        <>
          <path 
            d="M40,75 Q40,40 100,35 Q160,40 160,75 L155,65 Q100,45 45,65 Z" 
            fill={hairColor}
          />
          <ellipse cx="100" cy="25" rx="25" ry="20" fill={hairColor} />
          <ellipse cx="100" cy="22" rx="15" ry="10" fill={highlightColor} opacity="0.3" />
        </>
      ),
      ponytail: (
        <>
          <path 
            d="M40,75 Q40,40 100,35 Q160,40 160,75 L155,65 Q100,45 45,65 Z" 
            fill={hairColor}
          />
          <path d="M155,60 Q175,50 180,80 Q175,110 165,130" stroke={hairColor} strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d="M160,55 Q175,50 178,75" stroke={highlightColor} strokeWidth="3" fill="none" opacity="0.4" />
        </>
      ),
      curls: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-hair`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightColor} />
              <stop offset="100%" stopColor={hairColor} />
            </linearGradient>
          </defs>
          <path 
            d="M25,95 Q20,30 100,20 Q180,30 175,95" 
            fill={`url(#${gradientId}-hair)`}
          />
          {/* Curl texture */}
          <g fill={highlightColor} opacity="0.3">
            <circle cx="40" cy="55" r="8" />
            <circle cx="55" cy="45" r="7" />
            <circle cx="75" cy="35" r="9" />
            <circle cx="100" cy="30" r="8" />
            <circle cx="125" cy="35" r="9" />
            <circle cx="145" cy="45" r="7" />
            <circle cx="160" cy="55" r="8" />
          </g>
        </>
      ),
      buzz: (
        <>
          <path 
            d="M40,82 Q40,50 100,42 Q160,50 160,82 L155,75 Q100,55 45,75 Z" 
            fill={hairColor}
            opacity="0.8"
          />
          {/* Buzz texture dots */}
          <g fill={hairColor}>
            {Array.from({ length: 15 }).map((_, i) => (
              <circle 
                key={i} 
                cx={50 + (i % 5) * 25} 
                cy={50 + Math.floor(i / 5) * 10} 
                r="1.5" 
                opacity="0.3"
              />
            ))}
          </g>
        </>
      ),
      slick: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-hair`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={hairColor} />
              <stop offset="50%" stopColor={highlightColor} />
              <stop offset="100%" stopColor={hairColor} />
            </linearGradient>
          </defs>
          <path 
            d="M35,80 Q35,35 100,28 Q165,35 165,80 Q160,60 100,50 Q40,60 35,80" 
            fill={`url(#${gradientId}-hair)`}
          />
          {/* Slick shine lines */}
          <path d="M50,60 Q75,50 100,52 Q125,50 150,60" stroke={highlightColor} strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M60,55 Q80,48 100,48" stroke={highlightColor} strokeWidth="1" fill="none" opacity="0.4" />
        </>
      ),
    };
    
    return styles[config.hairStyle] || null;
  };

  const renderFacialHair = () => {
    if (config.facialHair === 'none') return null;
    
    const color = adjustColorBrightness(config.hairColor, -10);
    const opacity = config.facialHairDensity;
    
    const styles: Record<string, JSX.Element> = {
      stubble: (
        <g fill={color} opacity={opacity * 0.6}>
          {Array.from({ length: 30 }).map((_, i) => (
            <circle 
              key={i} 
              cx={70 + (i % 6) * 10 + Math.random() * 5} 
              cy={150 + Math.floor(i / 6) * 5 + Math.random() * 3} 
              r="0.8" 
            />
          ))}
        </g>
      ),
      beard: (
        <path 
          d="M60,145 Q60,175 100,185 Q140,175 140,145 Q130,160 100,165 Q70,160 60,145" 
          fill={color}
          opacity={opacity}
        />
      ),
      goatee: (
        <>
          <path 
            d="M85,145 Q85,165 100,175 Q115,165 115,145" 
            fill={color}
            opacity={opacity}
          />
          <path 
            d="M90,138 L90,148 M100,140 L100,150 M110,138 L110,148" 
            stroke={color}
            strokeWidth="3"
            opacity={opacity}
          />
        </>
      ),
      mustache: (
        <path 
          d="M75,138 Q85,145 100,142 Q115,145 125,138 Q115,150 100,148 Q85,150 75,138" 
          fill={color}
          opacity={opacity}
        />
      ),
    };
    
    return styles[config.facialHair] || null;
  };

  const renderClothing = () => {
    const color = config.outfitColor;
    const accentColor = config.brandAccent ? '#10B981' : adjustColorBrightness(color, 20);
    const shadowColor = adjustColorBrightness(color, -20);
    
    const styles: Record<string, JSX.Element> = {
      hoodie: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-outfit`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={shadowColor} />
            </linearGradient>
          </defs>
          <path 
            d="M40,200 L40,175 Q60,165 100,168 Q140,165 160,175 L160,200" 
            fill={`url(#${gradientId}-outfit)`}
          />
          {/* Hood */}
          <path 
            d="M50,175 Q45,165 50,155 Q75,145 100,148 Q125,145 150,155 Q155,165 150,175" 
            fill={color}
            opacity="0.8"
          />
          {/* Brand accent stripe */}
          {config.brandAccent && (
            <path d="M95,168 L95,200 M105,168 L105,200" stroke={accentColor} strokeWidth="2" opacity="0.7" />
          )}
          {/* Drawstrings */}
          <path d="M85,160 L85,185" stroke={shadowColor} strokeWidth="1.5" />
          <path d="M115,160 L115,185" stroke={shadowColor} strokeWidth="1.5" />
        </>
      ),
      jacket: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-outfit`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={shadowColor} />
            </linearGradient>
          </defs>
          <path 
            d="M35,200 L35,170 Q60,162 100,165 Q140,162 165,170 L165,200" 
            fill={`url(#${gradientId}-outfit)`}
          />
          {/* Lapels */}
          <path d="M85,165 L75,200" stroke={shadowColor} strokeWidth="3" />
          <path d="M115,165 L125,200" stroke={shadowColor} strokeWidth="3" />
          {/* Collar */}
          <path d="M70,168 Q100,175 130,168" fill="white" opacity="0.9" />
          {config.brandAccent && (
            <circle cx="75" cy="180" r="3" fill={accentColor} />
          )}
        </>
      ),
      tee: (
        <>
          <path 
            d="M45,200 L45,172 Q70,165 100,168 Q130,165 155,172 L155,200" 
            fill={color}
          />
          {/* Collar */}
          <path 
            d="M75,168 Q100,175 125,168" 
            stroke={shadowColor}
            strokeWidth="3"
            fill="none"
          />
        </>
      ),
      blazer: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-outfit`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={shadowColor} />
            </linearGradient>
          </defs>
          <path 
            d="M30,200 L30,168 Q60,158 100,162 Q140,158 170,168 L170,200" 
            fill={`url(#${gradientId}-outfit)`}
          />
          {/* Lapels */}
          <path d="M75,162 L60,200" fill={shadowColor} />
          <path d="M125,162 L140,200" fill={shadowColor} />
          {/* Shirt collar underneath */}
          <path d="M80,165 Q100,172 120,165" fill="white" />
          {/* Buttons */}
          <circle cx="100" cy="185" r="2.5" fill={shadowColor} />
          <circle cx="100" cy="195" r="2.5" fill={shadowColor} />
        </>
      ),
      sweater: (
        <>
          <defs>
            <linearGradient id={`${gradientId}-outfit`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={shadowColor} />
            </linearGradient>
          </defs>
          <path 
            d="M40,200 L40,170 Q65,162 100,165 Q135,162 160,170 L160,200" 
            fill={`url(#${gradientId}-outfit)`}
          />
          {/* Collar ribbing */}
          <path 
            d="M65,168 Q100,175 135,168" 
            stroke={shadowColor}
            strokeWidth="6"
            fill="none"
          />
          {/* Knit texture lines */}
          <path d="M50,180 L50,200 M70,178 L70,200 M90,180 L90,200 M110,180 L110,200 M130,178 L130,200 M150,180 L150,200" 
            stroke={shadowColor} 
            strokeWidth="0.5" 
            opacity="0.3" 
          />
        </>
      ),
      polo: (
        <>
          <path 
            d="M42,200 L42,170 Q68,162 100,165 Q132,162 158,170 L158,200" 
            fill={color}
          />
          {/* Collar */}
          <path d="M68,168 L85,175 L100,168 L115,175 L132,168" fill="white" />
          <path d="M68,168 L85,175 L100,168" fill={color} opacity="0.3" />
          <path d="M100,168 L115,175 L132,168" fill={color} opacity="0.3" />
          {/* Buttons */}
          <circle cx="100" cy="180" r="2" fill={shadowColor} />
          <circle cx="100" cy="188" r="2" fill={shadowColor} />
          {config.brandAccent && (
            <rect x="140" y="175" width="8" height="5" rx="1" fill={accentColor} opacity="0.8" />
          )}
        </>
      ),
    };
    
    return styles[config.outfit] || styles.tee;
  };

  const renderAccessories = () => {
    return (
      <>
        {/* Glasses */}
        {config.glasses !== 'none' && renderGlasses()}
        
        {/* Headphones */}
        {config.headphones && (
          <g>
            <path 
              d="M25,95 Q20,50 100,40 Q180,50 175,95" 
              stroke="#2D2D2D"
              strokeWidth="6"
              fill="none"
            />
            <ellipse cx="28" cy="100" rx="12" ry="18" fill="#2D2D2D" />
            <ellipse cx="172" cy="100" rx="12" ry="18" fill="#2D2D2D" />
            <ellipse cx="28" cy="100" rx="8" ry="14" fill="#10B981" opacity="0.8" />
            <ellipse cx="172" cy="100" rx="8" ry="14" fill="#10B981" opacity="0.8" />
          </g>
        )}
        
        {/* Earrings */}
        {(config.earring === 'left' || config.earring === 'both') && (
          <circle cx="32" cy="115" r="3" fill="#FFD700" />
        )}
        {(config.earring === 'right' || config.earring === 'both') && (
          <circle cx="168" cy="115" r="3" fill="#FFD700" />
        )}
        
        {/* Cap */}
        {config.cap && (
          <g>
            <path 
              d="M30,75 Q30,35 100,28 Q170,35 170,75 L165,65 Q100,42 35,65 Z" 
              fill="#1C1C1C"
            />
            <path 
              d="M20,78 L0,70 L0,82 L25,85 Z" 
              fill="#1C1C1C"
            />
            <rect x="70" y="50" width="60" height="15" rx="2" fill="#10B981" opacity="0.9" />
          </g>
        )}
      </>
    );
  };

  const renderGlasses = () => {
    const styles: Record<string, JSX.Element> = {
      clear: (
        <g>
          <rect x="48" y="82" width="30" height="26" rx="4" fill="none" stroke="#C0C0C0" strokeWidth="2" />
          <rect x="122" y="82" width="30" height="26" rx="4" fill="none" stroke="#C0C0C0" strokeWidth="2" />
          <rect x="48" y="82" width="30" height="26" rx="4" fill="rgba(200,220,255,0.1)" />
          <rect x="122" y="82" width="30" height="26" rx="4" fill="rgba(200,220,255,0.1)" />
          <path d="M78,95 L122,95" stroke="#C0C0C0" strokeWidth="2" />
          <path d="M48,95 L35,90" stroke="#C0C0C0" strokeWidth="2" />
          <path d="M152,95 L165,90" stroke="#C0C0C0" strokeWidth="2" />
        </g>
      ),
      dark: (
        <g>
          <rect x="46" y="80" width="34" height="28" rx="5" fill="#1a1a1a" />
          <rect x="120" y="80" width="34" height="28" rx="5" fill="#1a1a1a" />
          <path d="M80,94 L120,94" stroke="#1a1a1a" strokeWidth="3" />
          <path d="M46,94 L32,89" stroke="#1a1a1a" strokeWidth="3" />
          <path d="M154,94 L168,89" stroke="#1a1a1a" strokeWidth="3" />
          {/* Lens reflection */}
          <path d="M50,85 L60,85" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <path d="M124,85 L134,85" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
        </g>
      ),
      metal: (
        <g>
          <ellipse cx="63" cy="95" rx="18" ry="14" fill="none" stroke="#B8860B" strokeWidth="1.5" />
          <ellipse cx="137" cy="95" rx="18" ry="14" fill="none" stroke="#B8860B" strokeWidth="1.5" />
          <ellipse cx="63" cy="95" rx="18" ry="14" fill="rgba(200,220,255,0.08)" />
          <ellipse cx="137" cy="95" rx="18" ry="14" fill="rgba(200,220,255,0.08)" />
          <path d="M81,95 L119,95" stroke="#B8860B" strokeWidth="1.5" />
          <path d="M45,95 L32,90" stroke="#B8860B" strokeWidth="1.5" />
          <path d="M155,95 L168,90" stroke="#B8860B" strokeWidth="1.5" />
        </g>
      ),
    };
    
    return styles[config.glasses] || null;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={cn("rounded-full overflow-hidden", animated && "transition-all duration-300", className)}
    >
      {renderBackground()}
      {renderClothing()}
      {renderFaceShape()}
      {renderEyes()}
      {renderMouth()}
      {renderFacialHair()}
      {renderHair()}
      {renderAccessories()}
      
      {/* Outer ring for polish */}
      <circle 
        cx="100" 
        cy="100" 
        r="98" 
        fill="none" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth="2"
      />
    </svg>
  );
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}
