// Character Configuration Types and Utilities

export type BodyType = 'slim' | 'athletic' | 'broad';
export type TopType = 'tshirt' | 'hoodie' | 'suit' | 'tank' | 'casual';
export type BottomType = 'jeans' | 'dress' | 'shorts' | 'cargo';
export type SunglassesStyle = 'round' | 'square' | 'aviator';
export type TopGraphic = 'none' | 'moon' | 'diamond' | 'chart' | 'bull' | 'bear';

export interface CharacterConfig {
  // Body
  skinTone: string; // hex color
  bodyType: BodyType;
  height: number; // 0.8 to 1.2 scale multiplier
  
  // Clothing
  top: {
    type: TopType;
    color: string; // hex color
    graphic?: TopGraphic;
  };
  
  bottom: {
    type: BottomType;
    color: string;
  };
  
  // Accessories
  accessories: {
    sunglasses?: { style: SunglassesStyle };
    watch?: boolean;
    necklace?: boolean;
    headset?: boolean;
  };
  
  // Special items
  specialItems?: {
    bullHorns?: boolean;
    bearEars?: boolean;
  };
}

// Default character configuration
export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  skinTone: '#E8B89D',
  bodyType: 'athletic',
  height: 1.0,
  top: {
    type: 'tshirt',
    color: '#22D3EE', // cyan
    graphic: 'none',
  },
  bottom: {
    type: 'jeans',
    color: '#1E3A5F',
  },
  accessories: {},
  specialItems: {},
};

// Skin tone presets
export const SKIN_TONES = [
  { name: 'Light', color: '#FFDFC4' },
  { name: 'Fair', color: '#F0C8A0' },
  { name: 'Medium', color: '#E8B89D' },
  { name: 'Olive', color: '#C9A86C' },
  { name: 'Tan', color: '#A67B5B' },
  { name: 'Brown', color: '#8D5524' },
  { name: 'Dark', color: '#5C3317' },
  { name: 'Deep', color: '#3B1E0E' },
];

// Clothing color presets
export const CLOTHING_COLORS = [
  { name: 'Cyan', color: '#22D3EE' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Yellow', color: '#EAB308' },
  { name: 'Green', color: '#22C55E' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'White', color: '#F8FAFC' },
  { name: 'Gray', color: '#6B7280' },
  { name: 'Black', color: '#1F2937' },
];

// Pants color presets
export const PANTS_COLORS = [
  { name: 'Navy', color: '#1E3A5F' },
  { name: 'Black', color: '#1C1C1C' },
  { name: 'Gray', color: '#4B5563' },
  { name: 'Khaki', color: '#C3B091' },
  { name: 'Brown', color: '#5D4037' },
  { name: 'Olive', color: '#556B2F' },
  { name: 'Blue Denim', color: '#4169E1' },
  { name: 'Light Denim', color: '#87CEEB' },
];

// Top types with display names
export const TOP_TYPES: { type: TopType; name: string; description: string }[] = [
  { type: 'tshirt', name: 'T-Shirt', description: 'Classic casual tee' },
  { type: 'hoodie', name: 'Hoodie', description: 'Cozy trading hoodie' },
  { type: 'suit', name: 'Suit Jacket', description: 'Professional trader look' },
  { type: 'tank', name: 'Tank Top', description: 'Beach trader vibes' },
  { type: 'casual', name: 'Business Casual', description: 'Smart casual shirt' },
];

// Bottom types with display names
export const BOTTOM_TYPES: { type: BottomType; name: string; description: string }[] = [
  { type: 'jeans', name: 'Jeans', description: 'Classic denim' },
  { type: 'dress', name: 'Dress Pants', description: 'Professional look' },
  { type: 'shorts', name: 'Shorts', description: 'Casual comfort' },
  { type: 'cargo', name: 'Cargo Pants', description: 'Utility style' },
];

// Graphics for tops
export const TOP_GRAPHICS: { type: TopGraphic; name: string; icon: string }[] = [
  { type: 'none', name: 'Plain', icon: '' },
  { type: 'moon', name: 'To The Moon 🚀', icon: '🚀' },
  { type: 'diamond', name: 'Diamond Hands 💎', icon: '💎' },
  { type: 'chart', name: 'Chart Pattern 📈', icon: '📈' },
  { type: 'bull', name: 'Bull Mode 🐂', icon: '🐂' },
  { type: 'bear', name: 'Bear Mode 🐻', icon: '🐻' },
];

// Sunglasses styles
export const SUNGLASSES_STYLES: { style: SunglassesStyle; name: string }[] = [
  { style: 'round', name: 'Round' },
  { style: 'square', name: 'Square' },
  { style: 'aviator', name: 'Aviator' },
];

// Character presets
export const CHARACTER_PRESETS: { name: string; description: string; config: CharacterConfig }[] = [
  {
    name: 'Classic Trader',
    description: 'Business casual with sunglasses',
    config: {
      skinTone: '#E8B89D',
      bodyType: 'athletic',
      height: 1.0,
      top: { type: 'casual', color: '#3B82F6', graphic: 'none' },
      bottom: { type: 'dress', color: '#1C1C1C' },
      accessories: { sunglasses: { style: 'aviator' }, watch: true },
      specialItems: {},
    },
  },
  {
    name: 'Day Trader',
    description: 'Hoodie with headset ready',
    config: {
      skinTone: '#F0C8A0',
      bodyType: 'slim',
      height: 1.0,
      top: { type: 'hoodie', color: '#6B7280', graphic: 'chart' },
      bottom: { type: 'jeans', color: '#1E3A5F' },
      accessories: { headset: true },
      specialItems: {},
    },
  },
  {
    name: 'Bull Gang',
    description: 'Green everything with bull horns',
    config: {
      skinTone: '#C9A86C',
      bodyType: 'broad',
      height: 1.1,
      top: { type: 'tshirt', color: '#22C55E', graphic: 'bull' },
      bottom: { type: 'cargo', color: '#556B2F' },
      accessories: { sunglasses: { style: 'square' } },
      specialItems: { bullHorns: true },
    },
  },
  {
    name: 'Bear Mode',
    description: 'Red vibes with bear ears',
    config: {
      skinTone: '#8D5524',
      bodyType: 'broad',
      height: 1.05,
      top: { type: 'tshirt', color: '#EF4444', graphic: 'bear' },
      bottom: { type: 'jeans', color: '#5D4037' },
      accessories: {},
      specialItems: { bearEars: true },
    },
  },
  {
    name: 'Crypto Degen',
    description: 'Diamond hands, to the moon!',
    config: {
      skinTone: '#FFDFC4',
      bodyType: 'slim',
      height: 0.95,
      top: { type: 'tank', color: '#A855F7', graphic: 'moon' },
      bottom: { type: 'shorts', color: '#1C1C1C' },
      accessories: { necklace: true, sunglasses: { style: 'round' } },
      specialItems: {},
    },
  },
];

// Encode character config to string
export function stringifyCharacterConfig(config: CharacterConfig): string {
  try {
    const encoded = btoa(JSON.stringify(config));
    return `character:${encoded}`;
  } catch {
    return '';
  }
}

// Decode character config from string
export function parseCharacterConfig(configString: string | null): CharacterConfig | null {
  if (!configString || !configString.startsWith('character:')) {
    return null;
  }
  
  try {
    const encoded = configString.replace('character:', '');
    const decoded = JSON.parse(atob(encoded));
    return {
      ...DEFAULT_CHARACTER_CONFIG,
      ...decoded,
      top: { ...DEFAULT_CHARACTER_CONFIG.top, ...decoded.top },
      bottom: { ...DEFAULT_CHARACTER_CONFIG.bottom, ...decoded.bottom },
      accessories: { ...DEFAULT_CHARACTER_CONFIG.accessories, ...decoded.accessories },
      specialItems: { ...DEFAULT_CHARACTER_CONFIG.specialItems, ...decoded.specialItems },
    };
  } catch {
    return null;
  }
}

// Parse from JSONB (database format)
export function parseCharacterConfigFromJSON(config: unknown): CharacterConfig {
  if (!config || typeof config !== 'object') {
    return DEFAULT_CHARACTER_CONFIG;
  }
  
  const c = config as Partial<CharacterConfig>;
  
  return {
    skinTone: c.skinTone || DEFAULT_CHARACTER_CONFIG.skinTone,
    bodyType: c.bodyType || DEFAULT_CHARACTER_CONFIG.bodyType,
    height: c.height ?? DEFAULT_CHARACTER_CONFIG.height,
    top: {
      type: c.top?.type || DEFAULT_CHARACTER_CONFIG.top.type,
      color: c.top?.color || DEFAULT_CHARACTER_CONFIG.top.color,
      graphic: c.top?.graphic || DEFAULT_CHARACTER_CONFIG.top.graphic,
    },
    bottom: {
      type: c.bottom?.type || DEFAULT_CHARACTER_CONFIG.bottom.type,
      color: c.bottom?.color || DEFAULT_CHARACTER_CONFIG.bottom.color,
    },
    accessories: {
      sunglasses: c.accessories?.sunglasses,
      watch: c.accessories?.watch,
      necklace: c.accessories?.necklace,
      headset: c.accessories?.headset,
    },
    specialItems: {
      bullHorns: c.specialItems?.bullHorns,
      bearEars: c.specialItems?.bearEars,
    },
  };
}

// Adjust color brightness
export function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
