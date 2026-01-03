import { useMemo } from "react";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG } from "./characterConfig";

interface CharacterRendererProps {
  config: CharacterConfig;
  className?: string;
}

export function CharacterRenderer({ config: inputConfig, className = "" }: CharacterRendererProps) {
  // Merge with defaults to prevent undefined errors
  const config: CharacterConfig = {
    ...DEFAULT_CHARACTER_CONFIG,
    ...inputConfig,
    // Ensure nested objects are properly merged AFTER spreading inputConfig
    top: { ...DEFAULT_CHARACTER_CONFIG.top, ...inputConfig?.top },
    bottom: { ...DEFAULT_CHARACTER_CONFIG.bottom, ...inputConfig?.bottom },
    shoes: { ...DEFAULT_CHARACTER_CONFIG.shoes, ...inputConfig?.shoes },
    accessories: { ...DEFAULT_CHARACTER_CONFIG.accessories, ...inputConfig?.accessories },
    special: { ...DEFAULT_CHARACTER_CONFIG.special, ...inputConfig?.special },
    face: { ...DEFAULT_CHARACTER_CONFIG.face, ...inputConfig?.face },
  };

  const scale = config.height;

  // Generate unique IDs for gradients based on skinTone to ensure reactivity when color changes
  const gradientId = useMemo(() => {
    return config.skinTone.replace('#', '');
  }, [config.skinTone]);

  // Body width adjustments based on body type
  const bodyWidthMultiplier = {
    slim: 0.85,
    athletic: 1.0,
    broad: 1.2,
  }[config.bodyType] || 1.0;

  return (
    <div className={`relative ${className}`} style={{ transform: `scale(${scale})`, transformOrigin: 'center bottom' }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.02); }
        }

        @keyframes arm-sway-left {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }

        @keyframes arm-sway-right {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-5deg); }
        }

        @keyframes flame-flicker {
          0%, 100% { opacity: 0.8; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-2px) scale(1.1); }
        }

        @keyframes aura-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes blink-eyelid {
          0%, 45%, 55%, 100% { transform: scaleY(0); }
          50% { transform: scaleY(1); }
        }

        .character-body {
          animation: breathe 3s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .character-arm-left {
          animation: arm-sway-left 4s ease-in-out infinite;
          transform-origin: top center;
        }

        .character-arm-right {
          animation: arm-sway-right 4s ease-in-out infinite;
          transform-origin: top center;
        }

        .eyelid-left {
          animation: blink-eyelid 4s ease-in-out infinite;
          transform-origin: 66px 44px;
        }

        .eyelid-right {
          animation: blink-eyelid 4s ease-in-out infinite;
          transform-origin: 78px 44px;
        }

        .denim-texture {
          position: relative;
        }
        .denim-texture::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px),
            radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 50%);
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .cotton-fabric::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
          pointer-events: none;
        }

        .leather::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 100%);
          filter: brightness(0.9) contrast(1.1);
          pointer-events: none;
        }
      `}</style>

      <svg
        viewBox="0 0 144 192"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
      >
        <defs>
          {/* Gradients for depth */}
          <linearGradient id={`body-gradient-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.skinTone} stopOpacity="1" />
            <stop offset="100%" stopColor={adjustBrightness(config.skinTone, -20)} stopOpacity="1" />
          </linearGradient>

          <linearGradient id={`head-gradient-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={adjustBrightness(config.skinTone, 10)} stopOpacity="1" />
            <stop offset="100%" stopColor={config.skinTone} stopOpacity="1" />
          </linearGradient>

          <linearGradient id="clothing-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" stopOpacity="1" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" stopOpacity="1" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="drop-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Aura effect */}
        {config.effects?.aura && config.effects.aura !== 'none' && (
          <g className="aura" style={{ animation: 'aura-pulse 2s ease-in-out infinite' }}>
            <ellipse
              cx="72"
              cy="140"
              rx="50"
              ry="60"
              fill={config.effects.aura === 'green' ? '#10B981' : config.effects.aura === 'red' ? '#EF4444' : '#FFD700'}
              opacity="0.2"
              filter="url(#drop-shadow)"
            />
          </g>
        )}

        {/* Rocket boots flames */}
        {config.special?.rocketBoots && (
          <g style={{ animation: 'flame-flicker 0.5s ease-in-out infinite' }}>
            <path d="M 50 180 Q 48 185 46 190 L 50 188 L 54 190 Q 52 185 50 180 Z" fill="#FF6B00" opacity="0.8" />
            <path d="M 50 182 Q 49 185 48 188 L 50 187 L 52 188 Q 51 185 50 182 Z" fill="#FFD700" opacity="0.9" />

            <path d="M 94 180 Q 92 185 90 190 L 94 188 L 98 190 Q 96 185 94 180 Z" fill="#FF6B00" opacity="0.8" />
            <path d="M 94 182 Q 93 185 92 188 L 94 187 L 96 188 Q 95 185 94 182 Z" fill="#FFD700" opacity="0.9" />
          </g>
        )}

        {/* Legs */}
        <BottomRenderer config={config} bodyWidthMultiplier={bodyWidthMultiplier} gradientId={gradientId} />

        {/* Shoes */}
        <ShoesRenderer config={config} gradientId={gradientId} />

        {/* Body/Torso */}
        <g className="character-body">
          {/* Neck */}
          <rect
            x={72 - (3 * bodyWidthMultiplier)}
            y="60"
            width={6 * bodyWidthMultiplier}
            height="8"
            rx="3"
            fill={`url(#body-gradient-${gradientId})`}
            filter="url(#drop-shadow)"
          />

          {/* Torso */}
          <TopRenderer config={config} bodyWidthMultiplier={bodyWidthMultiplier} gradientId={gradientId} />

          {/* Belt */}
          {config.accessories.belt?.enabled && (
            <rect
              x={72 - (10 * bodyWidthMultiplier)}
              y="98"
              width={20 * bodyWidthMultiplier}
              height="3"
              rx="1"
              fill={config.accessories.belt.color}
              filter="url(#drop-shadow)"
            />
          )}
        </g>

        {/* Arms */}
        <g className="character-arm-left" style={{ transformOrigin: '56px 70px' }}>
          <ArmRenderer config={config} side="left" bodyWidthMultiplier={bodyWidthMultiplier} gradientId={gradientId} />
        </g>
        <g className="character-arm-right" style={{ transformOrigin: '88px 70px' }}>
          <ArmRenderer config={config} side="right" bodyWidthMultiplier={bodyWidthMultiplier} gradientId={gradientId} />
        </g>

        {/* Backpack (behind character but above body) */}
        {config.accessories.backpack?.enabled && (
          <BackpackRenderer color={config.accessories.backpack.color} />
        )}

        {/* Head - Unified with body skin tone */}
        <HeadRenderer config={config} gradientId={gradientId} />

        {/* Accessories on head/face */}
        <AccessoriesRenderer config={config} />

        {/* Special items */}
        <SpecialItemsRenderer config={config} />
      </svg>
    </div>
  );
}

// Helper component for rendering the head with matching skin tone
function HeadRenderer({ config, gradientId }: { config: CharacterConfig; gradientId: string }) {
  const hairColor = config.face?.hairColor || '#2D1B0E';
  const hairStyle = config.face?.hairStyle || 'short';
  const eyeColor = config.face?.eyeColor || '#4A90D9';

  return (
    <g>
      {/* Hair back layer (for styles that go behind head) */}
      {hairStyle === 'long' && (
        <ellipse cx="72" cy="52" rx="20" ry="16" fill={hairColor} filter="url(#drop-shadow)" />
      )}

      {/* Head shape */}
      <ellipse
        cx="72"
        cy="44"
        rx="16"
        ry="18"
        fill={`url(#head-gradient-${gradientId})`}
        filter="url(#drop-shadow)"
      />

      {/* Ears */}
      <ellipse cx="56" cy="46" rx="3" ry="4" fill={config.skinTone} />
      <ellipse cx="88" cy="46" rx="3" ry="4" fill={config.skinTone} />

      {/* Hair front layer */}
      <HairRenderer hairStyle={hairStyle} hairColor={hairColor} />

      {/* Face features */}
      <g>
        {/* Eyes */}
        <ellipse cx="66" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
        <ellipse cx="78" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
        {/* Pupils */}
        <circle cx="66" cy="44" r="1.5" fill={eyeColor} />
        <circle cx="78" cy="44" r="1.5" fill={eyeColor} />
        {/* Eye highlights */}
        <circle cx="65" cy="43.5" r="0.5" fill="#FFFFFF" />
        <circle cx="77" cy="43.5" r="0.5" fill="#FFFFFF" />

        {/* Eyelids - animated to close over eyes */}
        <ellipse className="eyelid-left" cx="66" cy="44" rx="3.5" ry="3" fill={config.skinTone} />
        <ellipse className="eyelid-right" cx="78" cy="44" rx="3.5" ry="3" fill={config.skinTone} />
      </g>

      {/* Eyebrows */}
      <path d="M 63 40 Q 66 39 69 40" stroke={adjustBrightness(hairColor, -20)} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M 75 40 Q 78 39 81 40" stroke={adjustBrightness(hairColor, -20)} strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <path d="M 72 46 L 72 50 L 70 51" stroke={adjustBrightness(config.skinTone, -30)} strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Mouth */}
      <path d="M 68 54 Q 72 56 76 54" stroke={adjustBrightness(config.skinTone, -40)} strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Beard/facial hair */}
      {config.face?.facialHair && config.face.facialHair !== 'none' && (
        <FacialHairRenderer style={config.face.facialHair} color={hairColor} />
      )}
    </g>
  );
}

// Helper component for hair styles
function HairRenderer({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
  switch (hairStyle) {
    case 'short':
      return (
        <g>
          <path d="M 58 36 Q 60 28 72 26 Q 84 28 86 36 Q 84 32 72 30 Q 60 32 58 36" fill={hairColor} />
          <ellipse cx="72" cy="30" rx="12" ry="6" fill={hairColor} />
        </g>
      );
    case 'medium':
      return (
        <g>
          <path d="M 56 40 Q 56 28 72 24 Q 88 28 88 40" fill={hairColor} />
          <path d="M 56 40 Q 54 48 56 52" fill={hairColor} />
          <path d="M 88 40 Q 90 48 88 52" fill={hairColor} />
        </g>
      );
    case 'long':
      return (
        <g>
          <path d="M 54 40 Q 52 28 72 22 Q 92 28 90 40" fill={hairColor} />
          <path d="M 54 40 Q 50 56 54 68" fill={hairColor} />
          <path d="M 90 40 Q 94 56 90 68" fill={hairColor} />
        </g>
      );
    case 'buzz':
      return (
        <ellipse cx="72" cy="32" rx="14" ry="8" fill={hairColor} opacity="0.8" />
      );
    case 'bald':
      return null;
    case 'mohawk':
      return (
        <g>
          <rect x="68" y="20" width="8" height="18" rx="2" fill={hairColor} />
          <path d="M 68 20 L 72 14 L 76 20" fill={hairColor} />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <ellipse cx="72" cy="30" rx="14" ry="8" fill={hairColor} />
          <path d="M 72 38 Q 80 40 85 50 Q 88 60 86 70" stroke={hairColor} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'afro':
      return (
        <ellipse cx="72" cy="36" rx="22" ry="20" fill={hairColor} filter="url(#drop-shadow)" />
      );
    default:
      return (
        <ellipse cx="72" cy="30" rx="12" ry="6" fill={hairColor} />
      );
  }
}

// Helper component for facial hair
function FacialHairRenderer({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'stubble':
      return (
        <g opacity="0.4">
          <ellipse cx="72" cy="56" rx="8" ry="4" fill={color} />
        </g>
      );
    case 'beard':
      return (
        <path d="M 64 52 Q 64 62 72 64 Q 80 62 80 52" fill={color} filter="url(#drop-shadow)" />
      );
    case 'goatee':
      return (
        <ellipse cx="72" cy="58" rx="4" ry="5" fill={color} />
      );
    case 'mustache':
      return (
        <path d="M 66 52 Q 72 54 78 52" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      );
    default:
      return null;
  }
}

// Helper component for rendering tops
function TopRenderer({ config, bodyWidthMultiplier, gradientId }: { config: CharacterConfig; bodyWidthMultiplier: number; gradientId: string }) {
  const baseX = 72 - (10 * bodyWidthMultiplier);
  const width = 20 * bodyWidthMultiplier;
  const color = config.top.color;

  switch (config.top.type) {
    case 'tshirt':
      return (
        <g>
          {/* Body shape */}
          <rect
            x={baseX}
            y="66"
            width={width}
            height="32"
            rx="6"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Collar */}
          <ellipse cx="72" cy="68" rx={4 * bodyWidthMultiplier} ry="2" fill={adjustBrightness(color, -20)} />
          {/* Highlight line */}
          <line x1={baseX + 2} y1="70" x2={baseX + 2} y2="92" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {/* Graphic */}
          {config.top.graphic && config.top.graphic !== 'none' && (
            <GraphicRenderer graphic={config.top.graphic} x={72} y={82} />
          )}
        </g>
      );

    case 'hoodie':
      return (
        <g>
          {/* Body */}
          <rect
            x={baseX}
            y="66"
            width={width}
            height="32"
            rx="6"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Kangaroo pocket */}
          <rect
            x={baseX + 4}
            y="82"
            width={width - 8}
            height="10"
            rx="2"
            fill={adjustBrightness(color, -15)}
            filter="url(#drop-shadow)"
          />
          {/* Drawstrings */}
          <line x1="68" y1="68" x2="66" y2="76" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="76" y1="68" x2="78" y2="76" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* Hood collar visible at neckline */}
          <path
            d="M 64 66 Q 72 63 80 66"
            fill={adjustBrightness(color, -10)}
            stroke={adjustBrightness(color, -20)}
            strokeWidth="0.5"
          />
        </g>
      );

    case 'business':
      return (
        <g>
          {/* Shirt body */}
          <rect
            x={baseX}
            y="66"
            width={width}
            height="32"
            rx="6"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Collar */}
          <path d="M 66 66 L 72 70 L 78 66" fill={color} stroke={adjustBrightness(color, -20)} strokeWidth="1" />
          {/* Button line */}
          <line x1="72" y1="70" x2="72" y2="96" stroke={adjustBrightness(color, -30)} strokeWidth="1" />
          {/* Buttons */}
          <circle cx="72" cy="74" r="1" fill={adjustBrightness(color, -40)} />
          <circle cx="72" cy="82" r="1" fill={adjustBrightness(color, -40)} />
          <circle cx="72" cy="90" r="1" fill={adjustBrightness(color, -40)} />
          {/* Pocket */}
          <rect x="64" y="72" width="6" height="6" rx="1" fill="none" stroke={adjustBrightness(color, -20)} strokeWidth="0.5" />
        </g>
      );

    case 'suit':
      return (
        <g>
          {/* Shirt underneath */}
          <rect x={baseX + 2} y="68" width={width - 4} height="8" fill="#FFFFFF" />
          {/* Jacket */}
          <rect
            x={baseX}
            y="72"
            width={width}
            height="26"
            rx="6"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Lapels */}
          <path d="M 62 72 L 72 78 L 72 72 Z" fill={adjustBrightness(color, -10)} />
          <path d="M 82 72 L 72 78 L 72 72 Z" fill={adjustBrightness(color, -10)} />
          {/* Buttons */}
          <circle cx="72" cy="80" r="1.5" fill="#FFD700" />
          <circle cx="72" cy="88" r="1.5" fill="#FFD700" />
        </g>
      );

    case 'tank':
      return (
        <g>
          {/* Body */}
          <rect
            x={baseX + 2}
            y="66"
            width={width - 4}
            height="32"
            rx="6"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Straps */}
          <rect x="66" y="66" width="3" height="8" rx="1" fill={adjustBrightness(color, -10)} />
          <rect x="75" y="66" width="3" height="8" rx="1" fill={adjustBrightness(color, -10)} />
        </g>
      );

    default:
      // None - just show skin
      return (
        <rect
          x={baseX}
          y="66"
          width={width}
          height="32"
          rx="6"
          fill={`url(#body-gradient-${gradientId})`}
          filter="url(#drop-shadow)"
        />
      );
  }
}

// Helper component for rendering bottoms
function BottomRenderer({ config, bodyWidthMultiplier, gradientId }: { config: CharacterConfig; bodyWidthMultiplier: number; gradientId: string }) {
  const color = config.bottom.color;
  const leftX = 72 - (8 * bodyWidthMultiplier);
  const rightX = 72 + (1 * bodyWidthMultiplier);
  const legWidth = 7 * bodyWidthMultiplier;

  switch (config.bottom.type) {
    case 'jeans':
      return (
        <g>
          {/* Left leg */}
          <rect
            x={leftX}
            y="100"
            width={legWidth}
            height="68"
            rx="3"
            fill={color}
            className="denim-texture"
            filter="url(#drop-shadow)"
          />
          {/* Stitching left */}
          <line x1={leftX + 1} y1="105" x2={leftX + 1} y2="165" stroke="#E5C65A" strokeWidth="0.5" opacity="0.6" />
          {/* Crease left */}
          <line x1={leftX + legWidth/2} y1="100" x2={leftX + legWidth/2} y2="168" stroke={adjustBrightness(color, -10)} strokeWidth="0.5" />

          {/* Right leg */}
          <rect
            x={rightX}
            y="100"
            width={legWidth}
            height="68"
            rx="3"
            fill={color}
            className="denim-texture"
            filter="url(#drop-shadow)"
          />
          {/* Stitching right */}
          <line x1={rightX + legWidth - 1} y1="105" x2={rightX + legWidth - 1} y2="165" stroke="#E5C65A" strokeWidth="0.5" opacity="0.6" />
          {/* Crease right */}
          <line x1={rightX + legWidth/2} y1="100" x2={rightX + legWidth/2} y2="168" stroke={adjustBrightness(color, -10)} strokeWidth="0.5" />
        </g>
      );

    case 'dress':
      return (
        <g>
          {/* Left leg */}
          <rect
            x={leftX}
            y="100"
            width={legWidth}
            height="68"
            rx="2"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Crease left */}
          <line x1={leftX + legWidth/2} y1="100" x2={leftX + legWidth/2} y2="168" stroke={adjustBrightness(color, -15)} strokeWidth="1" />

          {/* Right leg */}
          <rect
            x={rightX}
            y="100"
            width={legWidth}
            height="68"
            rx="2"
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Crease right */}
          <line x1={rightX + legWidth/2} y1="100" x2={rightX + legWidth/2} y2="168" stroke={adjustBrightness(color, -15)} strokeWidth="1" />
        </g>
      );

    case 'shorts':
      return (
        <g>
          {/* Left leg */}
          <rect
            x={leftX}
            y="100"
            width={legWidth}
            height="24"
            rx="3"
            fill={color}
            className="denim-texture"
            filter="url(#drop-shadow)"
          />
          {/* Hemline left */}
          <line x1={leftX} y1="123" x2={leftX + legWidth} y2="123" stroke={adjustBrightness(color, -10)} strokeWidth="1" />

          {/* Right leg */}
          <rect
            x={rightX}
            y="100"
            width={legWidth}
            height="24"
            rx="3"
            fill={color}
            className="denim-texture"
            filter="url(#drop-shadow)"
          />
          {/* Hemline right */}
          <line x1={rightX} y1="123" x2={rightX + legWidth} y2="123" stroke={adjustBrightness(color, -10)} strokeWidth="1" />

          {/* Bare legs below shorts */}
          <rect x={leftX} y="124" width={legWidth} height="44" rx="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
          <rect x={rightX} y="124" width={legWidth} height="44" rx="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
        </g>
      );

    case 'joggers':
      return (
        <g>
          {/* Left leg - tapered */}
          <path
            d={`M ${leftX} 100 L ${leftX + legWidth} 100 L ${leftX + legWidth - 1} 165 L ${leftX + 1} 165 Z`}
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Ribbed cuff left */}
          <rect x={leftX + 1} y="163" width={legWidth - 2} height="5" rx="1" fill={adjustBrightness(color, -20)} />

          {/* Right leg - tapered */}
          <path
            d={`M ${rightX} 100 L ${rightX + legWidth} 100 L ${rightX + legWidth - 1} 165 L ${rightX + 1} 165 Z`}
            fill={color}
            className="cotton-fabric"
            filter="url(#drop-shadow)"
          />
          {/* Ribbed cuff right */}
          <rect x={rightX + 1} y="163" width={legWidth - 2} height="5" rx="1" fill={adjustBrightness(color, -20)} />
        </g>
      );

    default:
      // None - bare legs
      return (
        <g>
          <rect x={leftX} y="100" width={legWidth} height="68" rx="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
          <rect x={rightX} y="100" width={legWidth} height="68" rx="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
        </g>
      );
  }
}

// Helper component for rendering shoes
function ShoesRenderer({ config, gradientId }: { config: CharacterConfig; gradientId: string }) {
  const color = config.shoes.color;

  switch (config.shoes.type) {
    case 'sneakers':
      return (
        <g>
          {/* Left sneaker */}
          <ellipse cx="65" cy="172" rx="8" ry="4" fill={color} filter="url(#drop-shadow)" />
          <path d="M 57 172 L 57 176 L 73 176 L 73 172" fill={adjustBrightness(color, 20)} />
          <line x1="62" y1="172" x2="62" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="65" y1="172" x2="65" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="68" y1="172" x2="68" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />

          {/* Right sneaker */}
          <ellipse cx="79" cy="172" rx="8" ry="4" fill={color} filter="url(#drop-shadow)" />
          <path d="M 71 172 L 71 176 L 87 176 L 87 172" fill={adjustBrightness(color, 20)} />
          <line x1="76" y1="172" x2="76" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="79" y1="172" x2="79" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="82" y1="172" x2="82" y2="176" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        </g>
      );

    case 'dress':
      return (
        <g>
          {/* Left shoe */}
          <ellipse cx="65" cy="172" rx="7" ry="3" fill={color} className="leather" filter="url(#drop-shadow)" />
          <path d="M 58 172 L 58 174 L 72 174 L 72 172" fill={adjustBrightness(color, 30)} />

          {/* Right shoe */}
          <ellipse cx="79" cy="172" rx="7" ry="3" fill={color} className="leather" filter="url(#drop-shadow)" />
          <path d="M 72 172 L 72 174 L 86 174 L 86 172" fill={adjustBrightness(color, 30)} />
        </g>
      );

    case 'boots':
      return (
        <g>
          {/* Left boot */}
          <rect x="58" y="160" width="14" height="12" rx="2" fill={color} className="leather" filter="url(#drop-shadow)" />
          <path d="M 58 172 L 58 176 L 72 176 L 72 172" fill={adjustBrightness(color, -10)} />
          <line x1="62" y1="165" x2="68" y2="165" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          <line x1="62" y1="169" x2="68" y2="169" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

          {/* Right boot */}
          <rect x="72" y="160" width="14" height="12" rx="2" fill={color} className="leather" filter="url(#drop-shadow)" />
          <path d="M 72 172 L 72 176 L 86 176 L 86 172" fill={adjustBrightness(color, -10)} />
          <line x1="76" y1="165" x2="82" y2="165" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          <line x1="76" y1="169" x2="82" y2="169" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        </g>
      );

    case 'casual':
      return (
        <g>
          {/* Left shoe */}
          <ellipse cx="65" cy="173" rx="8" ry="4" fill={color} filter="url(#drop-shadow)" />
          <ellipse cx="65" cy="171" rx="7" ry="2" fill={adjustBrightness(color, 20)} />

          {/* Right shoe */}
          <ellipse cx="79" cy="173" rx="8" ry="4" fill={color} filter="url(#drop-shadow)" />
          <ellipse cx="79" cy="171" rx="7" ry="2" fill={adjustBrightness(color, 20)} />
        </g>
      );

    default:
      // None - bare feet
      return (
        <g>
          <ellipse cx="65" cy="173" rx="6" ry="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
          <ellipse cx="79" cy="173" rx="6" ry="3" fill={`url(#body-gradient-${gradientId})`} filter="url(#drop-shadow)" />
        </g>
      );
  }
}

// Helper component for rendering arms
function ArmRenderer({ config, side, bodyWidthMultiplier, gradientId }: { config: CharacterConfig; side: 'left' | 'right'; bodyWidthMultiplier: number; gradientId: string }) {
  const x = side === 'left' ? 56 : 88;
  const armWidth = 6 * bodyWidthMultiplier;

  // Determine sleeve color based on top
  const sleeveColor = config.top.type !== 'none' && config.top.type !== 'tank'
    ? config.top.color
    : null;

  return (
    <g>
      {/* Upper arm */}
      <rect
        x={x - armWidth/2}
        y="70"
        width={armWidth}
        height="20"
        rx="3"
        fill={sleeveColor || `url(#body-gradient-${gradientId})`}
        className={sleeveColor ? 'cotton-fabric' : ''}
        filter="url(#drop-shadow)"
      />

      {/* Forearm - show skin for tank tops and none */}
      <rect
        x={x - armWidth/2}
        y="88"
        width={armWidth}
        height="16"
        rx="3"
        fill={config.top.type === 'business' || config.top.type === 'suit' ? sleeveColor : `url(#body-gradient-${gradientId})`}
        filter="url(#drop-shadow)"
      />

      {/* Hand */}
      <ellipse
        cx={x}
        cy="106"
        rx={armWidth * 0.7}
        ry="4"
        fill={config.special?.diamondHands ? '#60A5FA' : `url(#body-gradient-${gradientId})`}
        filter="url(#drop-shadow)"
      />

      {/* Diamond hands sparkle effect */}
      {config.special?.diamondHands && (
        <g style={{ animation: 'sparkle 1s ease-in-out infinite' }}>
          <circle cx={x - 2} cy="104" r="1" fill="#FFFFFF" opacity="0.8" />
          <circle cx={x + 2} cy="106" r="1" fill="#FFFFFF" opacity="0.8" />
          <circle cx={x} cy="108" r="1" fill="#FFFFFF" opacity="0.8" />
        </g>
      )}

      {/* Watch on left wrist */}
      {side === 'left' && config.accessories.watch?.enabled && (
        <g>
          {config.accessories.watch.style === 'digital' ? (
            // Digital Watch
            <>
              {/* Watch band */}
              <rect
                x={x - armWidth/2 - 0.5}
                y="100"
                width={armWidth + 1}
                height="6"
                rx="1"
                fill={adjustBrightness(config.accessories.watch.color, -30)}
                filter="url(#drop-shadow)"
              />
              {/* Watch face - rectangular digital */}
              <rect
                x={x - 4}
                y="100.5"
                width="8"
                height="5"
                rx="0.5"
                fill={config.accessories.watch.color}
                filter="url(#drop-shadow)"
              />
              {/* Digital screen */}
              <rect
                x={x - 3.5}
                y="101"
                width="7"
                height="4"
                rx="0.3"
                fill="#1a1a1a"
                opacity="0.9"
              />
              {/* Digital display numbers */}
              <text x={x} y="104" fontSize="2" fill="#00FF00" textAnchor="middle" fontFamily="monospace">12:30</text>
            </>
          ) : config.accessories.watch.style === 'smart' ? (
            // Smart Watch
            <>
              {/* Watch band - sporty */}
              <rect
                x={x - armWidth/2 - 0.5}
                y="100"
                width={armWidth + 1}
                height="6"
                rx="1.5"
                fill={adjustBrightness(config.accessories.watch.color, -20)}
                filter="url(#drop-shadow)"
              />
              {/* Watch face - rounded square */}
              <rect
                x={x - 3.5}
                y="100.5"
                width="7"
                height="5"
                rx="1.5"
                fill={config.accessories.watch.color}
                filter="url(#drop-shadow)"
              />
              {/* Smart screen */}
              <rect
                x={x - 3}
                y="101"
                width="6"
                height="4"
                rx="1"
                fill="#1a1a1a"
                opacity="0.9"
              />
              {/* Screen glow */}
              <rect
                x={x - 2.5}
                y="101.5"
                width="5"
                height="3"
                rx="0.8"
                fill="rgba(59, 130, 246, 0.3)"
              />
              {/* Digital elements */}
              <circle cx={x - 1} cy="102.5" r="0.3" fill="#3B82F6" />
              <circle cx={x + 1} cy="102.5" r="0.3" fill="#10B981" />
            </>
          ) : (
            // Analog Watch
            <>
              {/* Watch band */}
              <rect
                x={x - armWidth/2 - 0.5}
                y="100"
                width={armWidth + 1}
                height="6"
                rx="1"
                fill={adjustBrightness(config.accessories.watch.color, -20)}
                filter="url(#drop-shadow)"
              />
              {/* Watch bezel */}
              <circle
                cx={x}
                cy="103"
                r="3.5"
                fill={config.accessories.watch.color}
                filter="url(#drop-shadow)"
              />
              {/* Watch face */}
              <circle
                cx={x}
                cy="103"
                r="2.8"
                fill="#F5F5F5"
              />
              {/* Hour markers */}
              <circle cx={x} cy="100.5" r="0.3" fill="#1a1a1a" />
              <circle cx={x + 2.3} cy="103" r="0.3" fill="#1a1a1a" />
              <circle cx={x} cy="105.5" r="0.3" fill="#1a1a1a" />
              <circle cx={x - 2.3} cy="103" r="0.3" fill="#1a1a1a" />
              {/* Hour hand */}
              <line x1={x} y1="103" x2={x + 0.8} y2="101.5" stroke="#1a1a1a" strokeWidth="0.4" strokeLinecap="round" />
              {/* Minute hand */}
              <line x1={x} y1="103" x2={x + 1.5} y2="104" stroke="#1a1a1a" strokeWidth="0.3" strokeLinecap="round" />
              {/* Center dot */}
              <circle cx={x} cy="103" r="0.4" fill="#C0C0C0" />
            </>
          )}
        </g>
      )}
    </g>
  );
}

// Helper component for rendering accessories
function AccessoriesRenderer({ config }: { config: CharacterConfig }) {
  return (
    <g>
      {/* Sunglasses */}
      {config.accessories.sunglasses?.enabled && (
        <g>
          {config.accessories.sunglasses.style === 'aviator' ? (
            <>
              <ellipse cx="64" cy="45" rx="6" ry="5" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <ellipse cx="80" cy="45" rx="6" ry="5" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <path d="M 58 44 L 52 42" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 70 44 L 74 44" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 86 44 L 92 42" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
            </>
          ) : config.accessories.sunglasses.style === 'round' ? (
            <>
              <circle cx="64" cy="45" r="5" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <circle cx="80" cy="45" r="5" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <path d="M 59 45 L 52 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 69 45 L 75 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 85 45 L 92 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
            </>
          ) : (
            <>
              <rect x="58" y="42" width="12" height="6" rx="1" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <rect x="74" y="42" width="12" height="6" rx="1" fill={config.accessories.sunglasses.color} opacity="0.8" />
              <path d="M 58 45 L 52 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 70 45 L 74 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
              <path d="M 86 45 L 92 45" stroke={config.accessories.sunglasses.color} strokeWidth="1" />
            </>
          )}
        </g>
      )}

      {/* Headset */}
      {config.accessories.headset?.enabled && (
        <g>
          {config.accessories.headset.style === 'over-ear' ? (
            <>
              <path d="M 56 40 Q 56 28 72 28 Q 88 28 88 40" stroke="#1a1a1a" strokeWidth="3" fill="none" />
              <rect x="52" y="38" width="8" height="12" rx="4" fill="#1a1a1a" />
              <rect x="84" y="38" width="8" height="12" rx="4" fill="#1a1a1a" />
              <circle cx="56" cy="44" r="2" fill="#3B82F6" />
              <circle cx="88" cy="44" r="2" fill="#3B82F6" />
            </>
          ) : (
            <>
              <circle cx="56" cy="46" r="2" fill="#1a1a1a" />
              <circle cx="88" cy="46" r="2" fill="#1a1a1a" />
            </>
          )}
        </g>
      )}

      {/* Necklace */}
      {config.accessories.necklace?.enabled && (
        <g>
          {/* Get chain color - default to gold if not specified */}
          {(() => {
            const chainColor = config.accessories.necklace.color || '#FFD700';
            return (
              <>
                {/* Chain wrapping around neck naturally - lower on neck */}
                <path
                  d="M 62 64 Q 72 68 82 64"
                  stroke={chainColor}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Chain detail - individual links */}
                <circle cx="65" cy="65" r="1" fill="none" stroke={chainColor} strokeWidth="0.7" />
                <circle cx="68" cy="66" r="1" fill="none" stroke={chainColor} strokeWidth="0.7" />
                <circle cx="72" cy="66.5" r="1" fill="none" stroke={chainColor} strokeWidth="0.7" />
                <circle cx="76" cy="66" r="1" fill="none" stroke={chainColor} strokeWidth="0.7" />
                <circle cx="79" cy="65" r="1" fill="none" stroke={chainColor} strokeWidth="0.7" />
                {/* Chain highlight for metallic shine */}
                <path
                  d="M 63 63 Q 72 67 81 63"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="0.8"
                  fill="none"
                  strokeLinecap="round"
                />
                {config.accessories.necklace.type === 'pendant' && (
                  <>
                    <circle cx="72" cy="72" r="3.5" fill={chainColor} filter="url(#drop-shadow)" />
                    <circle cx="72" cy="72" r="2.5" fill={adjustBrightness(chainColor, -20)} />
                    <circle cx="71" cy="71" r="0.8" fill="rgba(255,255,255,0.7)" />
                  </>
                )}
              </>
            );
          })()}
        </g>
      )}
    </g>
  );
}

// Helper component for backpack - only shows straps, body is behind character
function BackpackRenderer({ color }: { color: string }) {
  return (
    <g>
      {/* Left strap - from behind character over left shoulder */}
      <path
        d="M 64 70 Q 61 73 59 80"
        stroke={adjustBrightness(color, -30)}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#drop-shadow)"
      />
      {/* Left strap highlight */}
      <path
        d="M 64.5 70 Q 61.5 73 59.5 79"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right strap - from behind character over right shoulder */}
      <path
        d="M 80 70 Q 83 73 85 80"
        stroke={adjustBrightness(color, -30)}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#drop-shadow)"
      />
      {/* Right strap highlight */}
      <path
        d="M 79.5 70 Q 82.5 73 84.5 79"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Strap buckles/clips on chest */}
      <rect x="57.5" y="80" width="3" height="2.5" rx="0.5" fill={color} filter="url(#drop-shadow)" />
      <circle cx="59" cy="81.2" r="0.4" fill="rgba(255,255,255,0.3)" />

      <rect x="83.5" y="80" width="3" height="2.5" rx="0.5" fill={color} filter="url(#drop-shadow)" />
      <circle cx="85" cy="81.2" r="0.4" fill="rgba(255,255,255,0.3)" />
    </g>
  );
}

// Helper component for special items
function SpecialItemsRenderer({ config }: { config: CharacterConfig }) {
  return (
    <g>
      {/* Bull Horns */}
      {config.special?.bullHorns && (
        <g>
          <path d="M 56 32 Q 52 28 48 26 Q 46 24 48 22" stroke="#8B4513" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 88 32 Q 92 28 96 26 Q 98 24 96 22" stroke="#8B4513" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* Bear Ears */}
      {config.special?.bearEars && (
        <g>
          <circle cx="60" cy="30" r="6" fill="#4A2511" />
          <circle cx="60" cy="30" r="3" fill="#8B6F47" />
          <circle cx="84" cy="30" r="6" fill="#4A2511" />
          <circle cx="84" cy="30" r="3" fill="#8B6F47" />
        </g>
      )}

      {/* Chart Hat */}
      {config.special?.chartHat && (
        <g>
          <ellipse cx="72" cy="26" rx="16" ry="4" fill="#1a1a1a" />
          <rect x="56" y="20" width="32" height="6" rx="1" fill="#06B6D4" />
          <path d="M 60 22 L 64 24 L 68 21 L 72 23 L 76 20 L 80 22 L 84 23" stroke="#10B981" strokeWidth="1" fill="none" />
        </g>
      )}
    </g>
  );
}

// Helper component for graphics on shirts
function GraphicRenderer({ graphic, x, y }: { graphic: string; x: number; y: number }) {
  switch (graphic) {
    case 'bull':
      return (
        <g>
          <circle cx={x} cy={y} r="6" fill="rgba(16, 185, 129, 0.3)" />
          <path d={`M ${x-3} ${y+2} L ${x} ${y-2} L ${x+3} ${y+2}`} stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'bear':
      return (
        <g>
          <circle cx={x} cy={y} r="6" fill="rgba(239, 68, 68, 0.3)" />
          <path d={`M ${x-3} ${y-2} L ${x} ${y+2} L ${x+3} ${y-2}`} stroke="#EF4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case 'moon':
      return (
        <g>
          <circle cx={x} cy={y} r="6" fill="rgba(251, 191, 36, 0.3)" />
          <path d={`M ${x-2} ${y-3} Q ${x+2} ${y} ${x-2} ${y+3} Q ${x-4} ${y} ${x-2} ${y-3}`} fill="#FBB F24" />
        </g>
      );
    case 'diamond':
      return (
        <g>
          <circle cx={x} cy={y} r="6" fill="rgba(96, 165, 250, 0.3)" />
          <path d={`M ${x} ${y-3} L ${x+3} ${y} L ${x} ${y+3} L ${x-3} ${y} Z`} fill="#60A5FA" stroke="#3B82F6" strokeWidth="1" />
        </g>
      );
    case 'chart':
      return (
        <g>
          <circle cx={x} cy={y} r="6" fill="rgba(6, 182, 212, 0.3)" />
          <path d={`M ${x-4} ${y+2} L ${x-2} ${y} L ${x} ${y-2} L ${x+2} ${y+1} L ${x+4} ${y-1}`} stroke="#06B6D4" strokeWidth="1.5" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

// Utility function to adjust brightness
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
