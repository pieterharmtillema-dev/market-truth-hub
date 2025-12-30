import { CharacterConfig } from "./characterConfig";
import { AvatarDisplay } from "./AvatarDisplay";

interface CharacterRendererProps {
  config: CharacterConfig;
  avatarUrl?: string | null;
  displayName?: string | null;
  className?: string;
}

export function CharacterRenderer({ config, avatarUrl, displayName, className = "" }: CharacterRendererProps) {
  const scale = config.height;

  // Body width adjustments based on body type
  const bodyWidthMultiplier = {
    slim: 0.85,
    athletic: 1.0,
    broad: 1.2,
  }[config.bodyType];

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
          <linearGradient id="body-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.skinTone} stopOpacity="1" />
            <stop offset="100%" stopColor={adjustBrightness(config.skinTone, -20)} stopOpacity="1" />
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
        <BottomRenderer config={config} bodyWidthMultiplier={bodyWidthMultiplier} />

        {/* Shoes */}
        <ShoesRenderer config={config} />

        {/* Body/Torso */}
        <g className="character-body">
          {/* Neck */}
          <rect
            x={72 - (3 * bodyWidthMultiplier)}
            y="60"
            width={6 * bodyWidthMultiplier}
            height="6"
            rx="3"
            fill="url(#body-gradient)"
            filter="url(#drop-shadow)"
          />

          {/* Torso */}
          <TopRenderer config={config} bodyWidthMultiplier={bodyWidthMultiplier} />

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
          <ArmRenderer config={config} side="left" bodyWidthMultiplier={bodyWidthMultiplier} />
        </g>
        <g className="character-arm-right" style={{ transformOrigin: '88px 70px' }}>
          <ArmRenderer config={config} side="right" bodyWidthMultiplier={bodyWidthMultiplier} />
        </g>

        {/* Backpack (behind character but above body) */}
        {config.accessories.backpack?.enabled && (
          <BackpackRenderer color={config.accessories.backpack.color} />
        )}

        {/* Head (Avatar) - positioned at correct spot */}
        <foreignObject x="56" y="28" width="32" height="32">
          <div className="w-full h-full">
            <AvatarDisplay
              avatarUrl={avatarUrl}
              displayName={displayName || "Trader"}
              size={32}
              className="border-2 border-cyan-400/40"
            />
          </div>
        </foreignObject>

        {/* Accessories on head/face */}
        <AccessoriesRenderer config={config} />

        {/* Special items */}
        <SpecialItemsRenderer config={config} />
      </svg>
    </div>
  );
}

// Helper component for rendering tops
function TopRenderer({ config, bodyWidthMultiplier }: { config: CharacterConfig; bodyWidthMultiplier: number }) {
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
          {/* Hood behind head */}
          <path
            d={`M 56 40 Q 52 30 56 24 L 88 24 Q 92 30 88 40 L 82 50 L 62 50 Z`}
            fill={color}
            opacity="0.9"
            filter="url(#drop-shadow)"
          />
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
          fill="url(#body-gradient)"
          filter="url(#drop-shadow)"
        />
      );
  }
}

// Helper component for rendering bottoms
function BottomRenderer({ config, bodyWidthMultiplier }: { config: CharacterConfig; bodyWidthMultiplier: number }) {
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
          <rect x={leftX} y="124" width={legWidth} height="44" rx="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
          <rect x={rightX} y="124" width={legWidth} height="44" rx="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
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
          <rect x={leftX} y="100" width={legWidth} height="68" rx="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
          <rect x={rightX} y="100" width={legWidth} height="68" rx="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
        </g>
      );
  }
}

// Helper component for rendering shoes
function ShoesRenderer({ config }: { config: CharacterConfig }) {
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
          <ellipse cx="65" cy="173" rx="6" ry="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
          <ellipse cx="79" cy="173" rx="6" ry="3" fill="url(#body-gradient)" filter="url(#drop-shadow)" />
        </g>
      );
  }
}

// Helper component for rendering arms
function ArmRenderer({ config, side, bodyWidthMultiplier }: { config: CharacterConfig; side: 'left' | 'right'; bodyWidthMultiplier: number }) {
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
        fill={sleeveColor || 'url(#body-gradient)'}
        className={sleeveColor ? 'cotton-fabric' : ''}
        filter="url(#drop-shadow)"
      />

      {/* Forearm */}
      <rect
        x={x - armWidth/2}
        y="88"
        width={armWidth}
        height="16"
        rx="3"
        fill={config.top.type === 'business' || config.top.type === 'suit' ? sleeveColor : 'url(#body-gradient)'}
        filter="url(#drop-shadow)"
      />

      {/* Hand */}
      <ellipse
        cx={x}
        cy="106"
        rx={armWidth * 0.7}
        ry="4"
        fill={config.special?.diamondHands ? '#60A5FA' : 'url(#body-gradient)'}
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
        <rect
          x={x - armWidth/2 - 1}
          y="102"
          width={armWidth + 2}
          height="4"
          rx="1"
          fill={config.accessories.watch.color}
          filter="url(#drop-shadow)"
        />
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
          <path d="M 66 62 Q 72 64 78 62" stroke="#FFD700" strokeWidth="1.5" fill="none" />
          {config.accessories.necklace.type === 'pendant' && (
            <circle cx="72" cy="66" r="2" fill="#FFD700" />
          )}
        </g>
      )}
    </g>
  );
}

// Helper component for backpack
function BackpackRenderer({ color }: { color: string }) {
  return (
    <g>
      <rect x="66" y="70" width="12" height="18" rx="2" fill={color} filter="url(#drop-shadow)" />
      <rect x="68" y="74" width="8" height="6" rx="1" fill={adjustBrightness(color, -20)} />
      <line x1="68" y1="70" x2="68" y2="86" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      <line x1="76" y1="70" x2="76" y2="86" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      {/* Straps */}
      <path d="M 66 72 L 60 78" stroke={adjustBrightness(color, -30)} strokeWidth="2" />
      <path d="M 78 72 L 84 78" stroke={adjustBrightness(color, -30)} strokeWidth="2" />
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
