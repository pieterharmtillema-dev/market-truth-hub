import { useMemo } from "react";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, adjustBrightness } from "./characterConfig";
import { AvatarDisplay } from "../AvatarDisplay";

interface CharacterRendererProps {
  config: CharacterConfig;
  avatarUrl?: string | null;
  displayName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showGlow?: boolean;
}

export function CharacterRenderer({
  config,
  avatarUrl,
  displayName = "Trader",
  size = "md",
  className = "",
  showGlow = true,
}: CharacterRendererProps) {
  // Merge with defaults
  const c = useMemo(() => ({
    ...DEFAULT_CHARACTER_CONFIG,
    ...config,
    top: { ...DEFAULT_CHARACTER_CONFIG.top, ...config.top },
    bottom: { ...DEFAULT_CHARACTER_CONFIG.bottom, ...config.bottom },
    accessories: { ...DEFAULT_CHARACTER_CONFIG.accessories, ...config.accessories },
    specialItems: { ...DEFAULT_CHARACTER_CONFIG.specialItems, ...config.specialItems },
  }), [config]);

  // Size mappings
  const sizeMap = {
    sm: { container: "w-24 h-32", avatar: 40, body: "w-8 h-10", leg: "w-2.5 h-5" },
    md: { container: "w-36 h-48", avatar: 64, body: "w-12 h-16", leg: "w-4 h-8" },
    lg: { container: "w-48 h-64", avatar: 80, body: "w-16 h-20", leg: "w-5 h-10" },
  };

  const s = sizeMap[size];
  const scale = c.height;

  // Body type adjustments
  const bodyWidth = c.bodyType === 'slim' ? 0.85 : c.bodyType === 'broad' ? 1.15 : 1;
  
  // Get darker shade for shadows
  const skinShadow = adjustBrightness(c.skinTone, -20);
  const topShadow = adjustBrightness(c.top.color, -15);
  const bottomShadow = adjustBrightness(c.bottom.color, -15);

  // Render graphic on top
  const renderGraphic = () => {
    if (!c.top.graphic || c.top.graphic === 'none') return null;
    
    const graphicMap: Record<string, string> = {
      moon: '🚀',
      diamond: '💎',
      chart: '📈',
      bull: '🐂',
      bear: '🐻',
    };
    
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs opacity-80">
        {graphicMap[c.top.graphic]}
      </div>
    );
  };

  // Render top clothing
  const renderTop = () => {
    const baseStyle = {
      backgroundColor: c.top.color,
      borderColor: topShadow,
    };

    switch (c.top.type) {
      case 'hoodie':
        return (
          <div 
            className="relative rounded-2xl border"
            style={{ 
              ...baseStyle,
              width: `${3 * bodyWidth}rem`,
              height: size === 'sm' ? '2.5rem' : size === 'md' ? '4rem' : '5rem',
            }}
          >
            {/* Hood */}
            <div 
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-4/5 h-3 rounded-t-full border-x border-t"
              style={{ backgroundColor: c.top.color, borderColor: topShadow }}
            />
            {/* Pocket */}
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1.5 rounded-sm opacity-50"
              style={{ backgroundColor: topShadow }}
            />
            {renderGraphic()}
          </div>
        );
      
      case 'suit':
        return (
          <div 
            className="relative rounded-xl border"
            style={{ 
              ...baseStyle,
              width: `${3 * bodyWidth}rem`,
              height: size === 'sm' ? '2.5rem' : size === 'md' ? '4rem' : '5rem',
            }}
          >
            {/* Lapels */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <div 
                className="w-2 h-4 rotate-12 rounded-sm"
                style={{ backgroundColor: topShadow }}
              />
              <div 
                className="w-2 h-4 -rotate-12 rounded-sm"
                style={{ backgroundColor: topShadow }}
              />
            </div>
            {/* Button */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-800" />
          </div>
        );
      
      case 'tank':
        return (
          <div 
            className="relative rounded-xl border"
            style={{ 
              ...baseStyle,
              width: `${2.5 * bodyWidth}rem`,
              height: size === 'sm' ? '2.5rem' : size === 'md' ? '4rem' : '5rem',
            }}
          >
            {/* Straps cut effect */}
            <div className="absolute -top-1 left-0.5 w-1/4 h-2 rounded-t-lg" style={{ backgroundColor: c.skinTone }} />
            <div className="absolute -top-1 right-0.5 w-1/4 h-2 rounded-t-lg" style={{ backgroundColor: c.skinTone }} />
            {renderGraphic()}
          </div>
        );
      
      case 'casual':
        return (
          <div 
            className="relative rounded-xl border"
            style={{ 
              ...baseStyle,
              width: `${3 * bodyWidth}rem`,
              height: size === 'sm' ? '2.5rem' : size === 'md' ? '4rem' : '5rem',
            }}
          >
            {/* Collar */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 border-l border-r rounded-b-sm"
              style={{ borderColor: topShadow }}
            />
            {/* Buttons */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col gap-1">
              <div className="w-0.5 h-0.5 rounded-full bg-gray-600" />
              <div className="w-0.5 h-0.5 rounded-full bg-gray-600" />
            </div>
          </div>
        );
      
      default: // tshirt
        return (
          <div 
            className="relative rounded-2xl border"
            style={{ 
              ...baseStyle,
              width: `${3 * bodyWidth}rem`,
              height: size === 'sm' ? '2.5rem' : size === 'md' ? '4rem' : '5rem',
            }}
          >
            {renderGraphic()}
          </div>
        );
    }
  };

  // Render bottom clothing
  const renderBottom = () => {
    const baseStyle = {
      backgroundColor: c.bottom.color,
    };

    switch (c.bottom.type) {
      case 'shorts':
        return (
          <div className="flex gap-0.5">
            <div 
              className="rounded-lg border"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '0.75rem' : size === 'md' ? '1.25rem' : '1.5rem',
              }}
            />
            <div 
              className="rounded-lg border"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '0.75rem' : size === 'md' ? '1.25rem' : '1.5rem',
              }}
            />
          </div>
        );
      
      case 'cargo':
        return (
          <div className="flex gap-0.5">
            <div 
              className="rounded-lg border relative"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '1.25rem' : size === 'md' ? '2rem' : '2.5rem',
              }}
            >
              {/* Cargo pocket */}
              <div 
                className="absolute top-1/2 left-0 w-full h-1/4 rounded-sm"
                style={{ backgroundColor: bottomShadow }}
              />
            </div>
            <div 
              className="rounded-lg border relative"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '1.25rem' : size === 'md' ? '2rem' : '2.5rem',
              }}
            >
              <div 
                className="absolute top-1/2 left-0 w-full h-1/4 rounded-sm"
                style={{ backgroundColor: bottomShadow }}
              />
            </div>
          </div>
        );
      
      default: // jeans, dress
        return (
          <div className="flex gap-0.5">
            <div 
              className="rounded-lg border"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '1.25rem' : size === 'md' ? '2rem' : '2.5rem',
              }}
            />
            <div 
              className="rounded-lg border"
              style={{ 
                ...baseStyle,
                borderColor: bottomShadow,
                width: size === 'sm' ? '0.625rem' : size === 'md' ? '1rem' : '1.25rem',
                height: size === 'sm' ? '1.25rem' : size === 'md' ? '2rem' : '2.5rem',
              }}
            />
          </div>
        );
    }
  };

  // Render accessories
  const renderAccessories = () => {
    return (
      <>
        {/* Watch on arm */}
        {c.accessories.watch && (
          <div 
            className="absolute bg-gray-700 rounded-sm border border-gray-600"
            style={{
              width: size === 'sm' ? '0.5rem' : '0.75rem',
              height: size === 'sm' ? '0.25rem' : '0.375rem',
              left: size === 'sm' ? '-0.75rem' : '-1rem',
              top: size === 'sm' ? '2.25rem' : '3.5rem',
            }}
          >
            <div className="absolute inset-0.5 bg-cyan-400/50 rounded-[1px]" />
          </div>
        )}
        
        {/* Necklace/chain */}
        {c.accessories.necklace && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 border-2 border-yellow-400 rounded-b-full"
            style={{
              width: size === 'sm' ? '1rem' : '1.5rem',
              height: size === 'sm' ? '0.5rem' : '0.75rem',
              top: size === 'sm' ? '2.75rem' : '4.25rem',
              borderTop: 'none',
            }}
          />
        )}
        
        {/* Headset */}
        {c.accessories.headset && (
          <div 
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: size === 'sm' ? '0.25rem' : '0.5rem' }}
          >
            {/* Headband */}
            <div 
              className="border-2 border-gray-600 rounded-t-full bg-gray-700"
              style={{
                width: size === 'sm' ? '2.5rem' : '4rem',
                height: size === 'sm' ? '0.5rem' : '0.75rem',
              }}
            />
            {/* Ear pieces */}
            <div 
              className="absolute -left-1 top-0.5 bg-gray-600 rounded-full"
              style={{ width: size === 'sm' ? '0.5rem' : '0.75rem', height: size === 'sm' ? '0.75rem' : '1rem' }}
            />
            <div 
              className="absolute -right-1 top-0.5 bg-gray-600 rounded-full"
              style={{ width: size === 'sm' ? '0.5rem' : '0.75rem', height: size === 'sm' ? '0.75rem' : '1rem' }}
            />
            {/* Mic */}
            <div 
              className="absolute -bottom-1 -left-0.5 w-2 h-3 border-l-2 border-b-2 border-gray-500 rounded-bl-full"
            />
          </div>
        )}
      </>
    );
  };

  // Render special items
  const renderSpecialItems = () => {
    return (
      <>
        {/* Bull horns */}
        {c.specialItems?.bullHorns && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex justify-between"
            style={{ 
              width: size === 'sm' ? '2.5rem' : '4rem',
              top: size === 'sm' ? '-0.25rem' : '-0.5rem' 
            }}
          >
            <div 
              className="bg-gradient-to-t from-amber-700 to-amber-400 rounded-t-full -rotate-45"
              style={{ 
                width: size === 'sm' ? '0.375rem' : '0.5rem', 
                height: size === 'sm' ? '0.75rem' : '1rem' 
              }}
            />
            <div 
              className="bg-gradient-to-t from-amber-700 to-amber-400 rounded-t-full rotate-45"
              style={{ 
                width: size === 'sm' ? '0.375rem' : '0.5rem', 
                height: size === 'sm' ? '0.75rem' : '1rem' 
              }}
            />
          </div>
        )}
        
        {/* Bear ears */}
        {c.specialItems?.bearEars && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 flex justify-between"
            style={{ 
              width: size === 'sm' ? '2.25rem' : '3.5rem',
              top: size === 'sm' ? '-0.25rem' : '-0.5rem' 
            }}
          >
            <div 
              className="bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"
              style={{ 
                width: size === 'sm' ? '0.625rem' : '0.875rem', 
                height: size === 'sm' ? '0.625rem' : '0.875rem' 
              }}
            />
            <div 
              className="bg-gradient-to-t from-amber-900 to-amber-700 rounded-full"
              style={{ 
                width: size === 'sm' ? '0.625rem' : '0.875rem', 
                height: size === 'sm' ? '0.625rem' : '0.875rem' 
              }}
            />
          </div>
        )}
      </>
    );
  };

  // Render sunglasses on avatar area
  const renderSunglasses = () => {
    if (!c.accessories.sunglasses) return null;
    
    const style = c.accessories.sunglasses.style;
    const glassSize = size === 'sm' ? 'w-2 h-1.5' : size === 'md' ? 'w-3 h-2' : 'w-4 h-2.5';
    const glassShape = style === 'round' ? 'rounded-full' : style === 'aviator' ? 'rounded-b-full rounded-t-sm' : 'rounded-sm';
    
    return (
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5"
        style={{ top: size === 'sm' ? '1rem' : size === 'md' ? '1.5rem' : '2rem' }}
      >
        <div className={`${glassSize} ${glassShape} bg-gray-900/90 border border-gray-700`} />
        <div className="w-1 h-0.5 bg-gray-700" />
        <div className={`${glassSize} ${glassShape} bg-gray-900/90 border border-gray-700`} />
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} style={{ transform: `scale(${scale})` }}>
      {/* Glow effect */}
      {showGlow && (
        <>
          <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150 animate-pulse" />
          <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full scale-125" />
        </>
      )}
      
      <div className="relative flex flex-col items-center">
        {/* Special items (horns/ears) above head */}
        {renderSpecialItems()}
        
        {/* Head/Avatar */}
        <div className="relative">
          <AvatarDisplay
            avatarUrl={avatarUrl}
            displayName={displayName}
            size={s.avatar}
            className="border-2 border-primary/40 shadow-lg"
          />
          {renderSunglasses()}
        </div>
        
        {/* Neck */}
        <div 
          className="w-3 h-1 rounded-b-sm -mt-0.5"
          style={{ backgroundColor: c.skinTone }}
        />
        
        {/* Body with clothing */}
        <div className="relative -mt-1">
          {/* Arms behind body */}
          <div 
            className="absolute -left-4 top-1 w-8 h-2 rounded-full -rotate-45"
            style={{ backgroundColor: c.skinTone }}
          />
          <div 
            className="absolute -right-4 top-1 w-8 h-2 rounded-full rotate-45"
            style={{ backgroundColor: c.skinTone }}
          />
          
          {/* Clothing overlay on arms - sleeves */}
          {c.top.type !== 'tank' && (
            <>
              <div 
                className="absolute -left-2 top-0.5 w-4 h-2 rounded-full -rotate-45"
                style={{ backgroundColor: c.top.color }}
              />
              <div 
                className="absolute -right-2 top-0.5 w-4 h-2 rounded-full rotate-45"
                style={{ backgroundColor: c.top.color }}
              />
            </>
          )}
          
          {/* Top clothing */}
          {renderTop()}
          
          {/* Accessories layer */}
          {renderAccessories()}
        </div>
        
        {/* Legs with clothing */}
        <div className="mt-0.5">
          {renderBottom()}
        </div>
        
        {/* Feet/shoes */}
        <div className="flex gap-1 mt-0.5">
          <div 
            className="rounded-md bg-gray-800 border border-gray-700"
            style={{
              width: size === 'sm' ? '0.75rem' : size === 'md' ? '1.125rem' : '1.375rem',
              height: size === 'sm' ? '0.375rem' : size === 'md' ? '0.5rem' : '0.625rem',
            }}
          />
          <div 
            className="rounded-md bg-gray-800 border border-gray-700"
            style={{
              width: size === 'sm' ? '0.75rem' : size === 'md' ? '1.125rem' : '1.375rem',
              height: size === 'sm' ? '0.375rem' : size === 'md' ? '0.5rem' : '0.625rem',
            }}
          />
        </div>
      </div>
    </div>
  );
}
