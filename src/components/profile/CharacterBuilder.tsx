import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CharacterConfig {
  base: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyes: string;
  mouth: string;
  accessory: string;
  background: string;
}

const DEFAULT_CONFIG: CharacterConfig = {
  base: 'round',
  skinTone: '#F5D0C5',
  hairStyle: 'short',
  hairColor: '#4A3728',
  eyes: 'normal',
  mouth: 'smile',
  accessory: 'none',
  background: 'none',
};

// Skin tone options
const SKIN_TONES = [
  { id: 'light1', color: '#FFECD8' },
  { id: 'light2', color: '#F5D0C5' },
  { id: 'medium1', color: '#E8B89D' },
  { id: 'medium2', color: '#D4956A' },
  { id: 'tan1', color: '#C68642' },
  { id: 'tan2', color: '#A67B5B' },
  { id: 'dark1', color: '#8D5524' },
  { id: 'dark2', color: '#6B4423' },
];

// Hair colors
const HAIR_COLORS = [
  { id: 'black', color: '#1C1C1C' },
  { id: 'darkBrown', color: '#4A3728' },
  { id: 'brown', color: '#6B4423' },
  { id: 'lightBrown', color: '#A67B5B' },
  { id: 'blonde', color: '#E6C67C' },
  { id: 'platinum', color: '#F0E68C' },
  { id: 'ginger', color: '#C45628' },
  { id: 'red', color: '#8B2942' },
  { id: 'blue', color: '#4A90D9' },
  { id: 'purple', color: '#8B5CF6' },
  { id: 'pink', color: '#EC4899' },
  { id: 'green', color: '#22C55E' },
];

// Hair styles
const HAIR_STYLES = [
  { id: 'none', label: 'Bald' },
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
  { id: 'curly', label: 'Curly' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'ponytail', label: 'Ponytail' },
];

// Eye styles
const EYE_STYLES = [
  { id: 'normal', label: '👁️' },
  { id: 'happy', label: '😊' },
  { id: 'wink', label: '😉' },
  { id: 'sleepy', label: '😴' },
  { id: 'star', label: '🤩' },
  { id: 'heart', label: '😍' },
];

// Mouth styles
const MOUTH_STYLES = [
  { id: 'smile', label: '😊' },
  { id: 'grin', label: '😁' },
  { id: 'neutral', label: '😐' },
  { id: 'smirk', label: '😏' },
  { id: 'open', label: '😮' },
  { id: 'tongue', label: '😛' },
];

// Accessories
const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: '👓' },
  { id: 'sunglasses', label: '🕶️' },
  { id: 'hat', label: '🎩' },
  { id: 'cap', label: '🧢' },
  { id: 'headphones', label: '🎧' },
  { id: 'crown', label: '👑' },
  { id: 'mask', label: '🎭' },
];

// Background colors
const BACKGROUNDS = [
  { id: 'none', color: 'transparent' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'purple', color: '#8B5CF6' },
  { id: 'pink', color: '#EC4899' },
  { id: 'green', color: '#22C55E' },
  { id: 'orange', color: '#F97316' },
  { id: 'red', color: '#EF4444' },
  { id: 'cyan', color: '#06B6D4' },
];

export function parseCharacterConfig(configString: string): CharacterConfig | null {
  if (!configString?.startsWith('char:')) return null;
  try {
    return JSON.parse(configString.replace('char:', ''));
  } catch {
    return null;
  }
}

export function stringifyCharacterConfig(config: CharacterConfig): string {
  return `char:${JSON.stringify(config)}`;
}

interface CharacterBuilderProps {
  initialConfig?: CharacterConfig;
  onConfigChange: (config: CharacterConfig) => void;
}

export function CharacterBuilder({ initialConfig, onConfigChange }: CharacterBuilderProps) {
  const [config, setConfig] = useState<CharacterConfig>(initialConfig || DEFAULT_CONFIG);

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (key: keyof CharacterConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <CharacterAvatar config={config} size={96} />
      </div>

      <ScrollArea className="h-[280px] pr-4">
        <div className="space-y-4">
          {/* Skin Tone */}
          <div className="space-y-2">
            <Label className="text-xs">Skin Tone</Label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => updateConfig('skinTone', tone.color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    config.skinTone === tone.color
                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{ backgroundColor: tone.color }}
                />
              ))}
            </div>
          </div>

          {/* Hair Style */}
          <div className="space-y-2">
            <Label className="text-xs">Hair Style</Label>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig('hairStyle', style.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-all",
                    config.hairStyle === style.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          {config.hairStyle !== 'none' && (
            <div className="space-y-2">
              <Label className="text-xs">Hair Color</Label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => updateConfig('hairColor', color.color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      config.hairColor === color.color
                        ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: color.color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eyes */}
          <div className="space-y-2">
            <Label className="text-xs">Eyes</Label>
            <div className="flex flex-wrap gap-1.5">
              {EYE_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig('eyes', style.id)}
                  className={cn(
                    "w-9 h-9 text-lg rounded-md transition-all flex items-center justify-center",
                    config.eyes === style.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mouth */}
          <div className="space-y-2">
            <Label className="text-xs">Mouth</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOUTH_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig('mouth', style.id)}
                  className={cn(
                    "w-9 h-9 text-lg rounded-md transition-all flex items-center justify-center",
                    config.mouth === style.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-2">
            <Label className="text-xs">Accessory</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACCESSORIES.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => updateConfig('accessory', acc.id)}
                  className={cn(
                    "px-2.5 py-1.5 text-sm rounded-md transition-all",
                    config.accessory === acc.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <Label className="text-xs">Background</Label>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => updateConfig('background', bg.color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    config.background === bg.color
                      ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "border-border hover:border-primary/50",
                    bg.id === 'none' && "bg-gradient-to-br from-gray-200 to-gray-400"
                  )}
                  style={{ backgroundColor: bg.id !== 'none' ? bg.color : undefined }}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// SVG-based Character Avatar Component
interface CharacterAvatarProps {
  config: CharacterConfig;
  size?: number;
  className?: string;
}

export function CharacterAvatar({ config, size = 40, className }: CharacterAvatarProps) {
  const renderHair = () => {
    if (config.hairStyle === 'none') return null;
    
    const hairPaths: Record<string, string> = {
      short: 'M10,22 Q20,8 50,10 Q80,8 90,22 Q85,15 50,12 Q15,15 10,22',
      medium: 'M8,28 Q10,10 50,8 Q90,10 92,28 L90,40 Q85,30 50,28 Q15,30 10,40 Z',
      long: 'M5,30 Q8,8 50,5 Q92,8 95,30 L95,70 Q90,55 50,55 Q10,55 5,70 Z',
      curly: 'M8,25 Q5,15 15,12 Q25,8 35,12 Q45,5 55,12 Q65,8 75,12 Q85,8 92,15 Q95,25 90,35 Q92,30 50,28 Q8,30 10,35 Z',
      mohawk: 'M40,5 Q50,-5 60,5 L65,25 Q50,20 35,25 Z',
      spiky: 'M20,20 L15,5 L30,18 L35,2 L45,16 L50,0 L55,16 L65,2 L70,18 L85,5 L80,20 Q50,15 20,20',
      ponytail: 'M10,22 Q20,8 50,10 Q80,8 90,22 Q85,15 50,12 Q15,15 10,22 M75,25 Q95,30 92,55 Q88,45 75,40',
    };

    return (
      <path
        d={hairPaths[config.hairStyle] || hairPaths.short}
        fill={config.hairColor}
      />
    );
  };

  const renderEyes = () => {
    const eyeConfigs: Record<string, JSX.Element> = {
      normal: (
        <>
          <ellipse cx="35" cy="42" rx="5" ry="6" fill="#1C1C1C" />
          <ellipse cx="65" cy="42" rx="5" ry="6" fill="#1C1C1C" />
          <circle cx="36" cy="40" r="2" fill="white" />
          <circle cx="66" cy="40" r="2" fill="white" />
        </>
      ),
      happy: (
        <>
          <path d="M28,42 Q35,38 42,42" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M58,42 Q65,38 72,42" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ),
      wink: (
        <>
          <ellipse cx="35" cy="42" rx="5" ry="6" fill="#1C1C1C" />
          <circle cx="36" cy="40" r="2" fill="white" />
          <path d="M58,42 Q65,38 72,42" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ),
      sleepy: (
        <>
          <path d="M28,44 Q35,40 42,44" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M58,44 Q65,40 72,44" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ),
      star: (
        <>
          <text x="30" y="47" fontSize="14" fill="#FFD700">★</text>
          <text x="60" y="47" fontSize="14" fill="#FFD700">★</text>
        </>
      ),
      heart: (
        <>
          <text x="29" y="47" fontSize="12" fill="#EC4899">♥</text>
          <text x="59" y="47" fontSize="12" fill="#EC4899">♥</text>
        </>
      ),
    };

    return eyeConfigs[config.eyes] || eyeConfigs.normal;
  };

  const renderMouth = () => {
    const mouthConfigs: Record<string, JSX.Element> = {
      smile: <path d="M35,62 Q50,72 65,62" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />,
      grin: (
        <>
          <path d="M32,60 Q50,75 68,60" stroke="#1C1C1C" strokeWidth="3" fill="white" strokeLinecap="round" />
          <path d="M35,65 L65,65" stroke="#1C1C1C" strokeWidth="1" />
        </>
      ),
      neutral: <path d="M38,64 L62,64" stroke="#1C1C1C" strokeWidth="3" strokeLinecap="round" />,
      smirk: <path d="M40,62 Q55,68 65,60" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />,
      open: <ellipse cx="50" cy="65" rx="10" ry="8" fill="#1C1C1C" />,
      tongue: (
        <>
          <path d="M35,60 Q50,72 65,60" stroke="#1C1C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="70" rx="6" ry="5" fill="#EC4899" />
        </>
      ),
    };

    return mouthConfigs[config.mouth] || mouthConfigs.smile;
  };

  const renderAccessory = () => {
    const accessoryConfigs: Record<string, JSX.Element | null> = {
      none: null,
      glasses: (
        <g stroke="#1C1C1C" strokeWidth="2" fill="none">
          <rect x="23" y="36" width="20" height="14" rx="3" fill="rgba(255,255,255,0.3)" />
          <rect x="57" y="36" width="20" height="14" rx="3" fill="rgba(255,255,255,0.3)" />
          <line x1="43" y1="43" x2="57" y2="43" />
          <line x1="23" y1="43" x2="15" y2="40" />
          <line x1="77" y1="43" x2="85" y2="40" />
        </g>
      ),
      sunglasses: (
        <g stroke="#1C1C1C" strokeWidth="2">
          <rect x="22" y="35" width="22" height="16" rx="4" fill="#1C1C1C" />
          <rect x="56" y="35" width="22" height="16" rx="4" fill="#1C1C1C" />
          <line x1="44" y1="43" x2="56" y2="43" stroke="#1C1C1C" />
          <line x1="22" y1="43" x2="12" y2="40" />
          <line x1="78" y1="43" x2="88" y2="40" />
        </g>
      ),
      hat: (
        <g>
          <rect x="15" y="12" width="70" height="8" fill="#1C1C1C" rx="2" />
          <rect x="30" y="0" width="40" height="15" fill="#1C1C1C" rx="4" />
          <rect x="35" y="8" width="30" height="4" fill="#C45628" />
        </g>
      ),
      cap: (
        <g>
          <path d="M20,25 Q50,5 80,25 L75,18 Q50,8 25,18 Z" fill="#3B82F6" />
          <path d="M18,24 L0,22 L0,28 L20,28 Z" fill="#3B82F6" />
        </g>
      ),
      headphones: (
        <g>
          <path d="M15,45 Q10,25 50,15 Q90,25 85,45" stroke="#1C1C1C" strokeWidth="4" fill="none" />
          <rect x="8" y="40" width="12" height="18" rx="4" fill="#1C1C1C" />
          <rect x="80" y="40" width="12" height="18" rx="4" fill="#1C1C1C" />
        </g>
      ),
      crown: (
        <g>
          <path d="M20,25 L25,5 L35,18 L50,2 L65,18 L75,5 L80,25 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          <circle cx="50" cy="8" r="3" fill="#EC4899" />
          <circle cx="30" cy="14" r="2" fill="#3B82F6" />
          <circle cx="70" cy="14" r="2" fill="#22C55E" />
        </g>
      ),
      mask: (
        <g>
          <path d="M25,55 Q50,75 75,55 L75,70 Q50,85 25,70 Z" fill="#1C1C1C" />
        </g>
      ),
    };

    return accessoryConfigs[config.accessory] || null;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ borderRadius: '50%' }}
    >
      {/* Background */}
      {config.background !== 'transparent' && config.background !== 'none' ? (
        <circle cx="50" cy="50" r="50" fill={config.background} />
      ) : (
        <circle cx="50" cy="50" r="50" fill="#E5E7EB" />
      )}
      
      {/* Face */}
      <ellipse cx="50" cy="52" rx="35" ry="38" fill={config.skinTone} />
      
      {/* Ears */}
      <ellipse cx="15" cy="50" rx="6" ry="10" fill={config.skinTone} />
      <ellipse cx="85" cy="50" rx="6" ry="10" fill={config.skinTone} />
      
      {/* Hair (behind if long) */}
      {config.hairStyle === 'long' && renderHair()}
      
      {/* Eyes */}
      {renderEyes()}
      
      {/* Eyebrows */}
      <path d="M28,34 Q35,30 42,34" stroke={config.hairColor} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M58,34 Q65,30 72,34" stroke={config.hairColor} strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Nose */}
      <path d="M50,48 L47,56 Q50,58 53,56 Z" fill={config.skinTone} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      
      {/* Mouth */}
      {renderMouth()}
      
      {/* Hair (on top) */}
      {config.hairStyle !== 'long' && renderHair()}
      
      {/* Accessory */}
      {renderAccessory()}
    </svg>
  );
}
