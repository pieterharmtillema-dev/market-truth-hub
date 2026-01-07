export interface CharacterConfig {
  // Body
  skinTone: string; // hex color
  bodyType: 'slim' | 'athletic' | 'broad';
  height: number; // 0.85 to 1.15 scale multiplier

  // Face
  face?: {
    hairStyle: 'short' | 'medium' | 'long' | 'buzz' | 'bald' | 'mohawk' | 'ponytail' | 'afro';
    hairColor: string;
    eyeColor: string;
    facialHair?: 'none' | 'stubble' | 'beard' | 'goatee' | 'mustache';
    eyeSize?: number; // 0.8-1.4
    eyebrowSize?: number; // 0.6-1.6
    nose?: 'soft' | 'straight' | 'sharp';
    mouth?: 'thin' | 'normal' | 'wide';
    expression?: 'neutral' | 'focused' | 'smile' | 'smirk';
    skinDetails?: {
      scars?: boolean;
      wrinkles?: boolean;
      blush?: boolean;
    };
    hairPart?: 'none' | 'left' | 'center' | 'right';
    hairTexture?: 'straight' | 'wavy' | 'curly';
    hairHighlights?: boolean;
    hairFade?: number; // 0-1
    hairAccessory?: {
      type: 'none' | 'clip' | 'bandana';
      color?: string;
    };
  };

  // Clothing
  top: {
    type: 'tshirt' | 'hoodie' | 'business' | 'suit' | 'tank' | 'none';
    color: string; // hex
    secondaryColor?: string; // for details
    graphic?: 'bull' | 'bear' | 'moon' | 'diamond' | 'chart' | 'none';
    style?: 'tucked' | 'untucked' | 'open';
    pattern?: 'none' | 'pinstripe' | 'grid' | 'wave';
    patch?: 'none' | 'bull' | 'bear' | 'trax';
    patchColor?: string;
    tie?: {
      enabled: boolean;
      color: string;
      style: 'classic' | 'slim';
    };
    pocketSquare?: {
      enabled: boolean;
      color: string;
      fold: 'flat' | 'point';
    };
  };

  outerwear?: {
    type: 'none' | 'jacket' | 'vest';
    color: string;
    trimColor?: string;
    pattern?: 'none' | 'pinstripe' | 'grid';
  };

  bottom: {
    type: 'jeans' | 'dress' | 'shorts' | 'joggers' | 'none';
    color: string;
    style?: 'fitted' | 'loose' | 'slim';
  };

  shoes: {
    type: 'sneakers' | 'dress' | 'boots' | 'casual' | 'none';
    color: string;
  };

  // Accessories
  accessories: {
    sunglasses?: {
      enabled: boolean;
      style: 'aviator' | 'round' | 'square' | 'sport';
      color: string;
    };
    watch?: {
      enabled: boolean;
      style: 'digital' | 'analog' | 'smart';
      color: string;
    };
    necklace?: {
      enabled: boolean;
      type: 'chain' | 'pendant';
      color?: string;
    };
    backpack?: {
      enabled: boolean;
      color: string;
    };
    headset?: {
      enabled: boolean;
      style: 'over-ear' | 'earbuds';
    };
    belt?: {
      enabled: boolean;
      color: string;
    };
    ring?: {
      enabled: boolean;
      color: string;
    };
    bracelet?: {
      enabled: boolean;
      color: string;
    };
    lapelPin?: {
      enabled: boolean;
      style: 'bull' | 'bear' | 'trax';
      color: string;
    };
    lanyard?: {
      enabled: boolean;
      color: string;
      badge?: 'id' | 'vip' | 'press';
    };
    handheld?: {
      enabled: boolean;
      type: 'phone' | 'tablet' | 'coffee';
      color: string;
    };
  };

  // Trading-themed special items
  special?: {
    bullHorns?: boolean;
    bearEars?: boolean;
    diamondHands?: boolean; // glowing hands effect
    rocketBoots?: boolean; // flame effect
    chartHat?: boolean; // hat with chart pattern
  };

  // Effects
  effects?: {
    aura?: 'none' | 'green' | 'red' | 'gold'; // based on performance
    stance?: 'standing' | 'confident' | 'relaxed';
  };

  // Hero environment preferences
  environment?: {
    lamborghini?: boolean;
  };
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  skinTone: '#F5D0A9',
  bodyType: 'athletic',
  height: 1.0,
  face: {
    hairStyle: 'short',
    hairColor: '#2D1B0E',
    eyeColor: '#4A90D9',
    facialHair: 'none',
    eyeSize: 1,
    eyebrowSize: 1,
    nose: 'straight',
    mouth: 'normal',
    expression: 'neutral',
    skinDetails: {
      scars: false,
      wrinkles: false,
      blush: false,
    },
    hairPart: 'none',
    hairTexture: 'straight',
    hairHighlights: false,
    hairFade: 0,
    hairAccessory: {
      type: 'none',
      color: '#1a1a1a',
    },
  },
  top: {
    type: 'tshirt',
    color: '#06B6D4',
    graphic: 'none',
    pattern: 'none',
    patch: 'none',
    patchColor: '#FBBF24',
    tie: {
      enabled: false,
      color: '#1a1a1a',
      style: 'classic',
    },
    pocketSquare: {
      enabled: false,
      color: '#FFFFFF',
      fold: 'flat',
    },
  },
  outerwear: {
    type: 'none',
    color: '#1a1a1a',
    trimColor: '#E5E7EB',
    pattern: 'none',
  },
  bottom: {
    type: 'jeans',
    color: '#1E3A5F',
  },
  shoes: {
    type: 'sneakers',
    color: '#000000',
  },
  accessories: {},
  environment: {
    lamborghini: true,
  },
};

// Encoding functions
export function stringifyCharacterConfig(config: CharacterConfig): string {
  return `character:${btoa(JSON.stringify(config))}`;
}

export function parseCharacterConfig(encoded: string): CharacterConfig | null {
  // Support both 'character:' and 'char:' prefixes for backwards compatibility
  if (!encoded) return null;

  let base64Data: string;
  if (encoded.startsWith('character:')) {
    base64Data = encoded.slice(10);
  } else if (encoded.startsWith('char:')) {
    base64Data = encoded.slice(5);
  } else {
    return null;
  }

  try {
    return JSON.parse(atob(base64Data));
  } catch {
    return null;
  }
}

// Preset configurations
export const CHARACTER_PRESETS: Record<string, CharacterConfig> = {
  classicTrader: {
    skinTone: '#F5D0A9',
    bodyType: 'athletic',
    height: 1.0,
    face: { hairStyle: 'short', hairColor: '#2D1B0E', eyeColor: '#4A90D9', facialHair: 'none' },
    top: { type: 'business', color: '#FFFFFF', style: 'tucked' },
    bottom: { type: 'dress', color: '#1a1a1a', style: 'fitted' },
    shoes: { type: 'dress', color: '#000000' },
    accessories: {
      sunglasses: { enabled: true, style: 'square', color: '#000000' },
      watch: { enabled: true, style: 'analog', color: '#C0C0C0' },
      belt: { enabled: true, color: '#000000' },
    },
  },

  dayTrader: {
    skinTone: '#C68642',
    bodyType: 'slim',
    height: 0.95,
    face: { hairStyle: 'medium', hairColor: '#1a1a1a', eyeColor: '#8B4513', facialHair: 'stubble' },
    top: { type: 'hoodie', color: '#1a1a1a', graphic: 'chart' },
    bottom: { type: 'joggers', color: '#2a2a2a', style: 'fitted' },
    shoes: { type: 'sneakers', color: '#FFFFFF' },
    accessories: {
      headset: { enabled: true, style: 'over-ear' },
      backpack: { enabled: true, color: '#06B6D4' },
    },
  },

  bullGang: {
    skinTone: '#8D5524',
    bodyType: 'broad',
    height: 1.1,
    face: { hairStyle: 'buzz', hairColor: '#2D1B0E', eyeColor: '#6B8E23', facialHair: 'beard' },
    top: { type: 'tshirt', color: '#10B981', graphic: 'bull' },
    bottom: { type: 'jeans', color: '#2C5F8D', style: 'loose' },
    shoes: { type: 'boots', color: '#3a2a1a' },
    accessories: {
      sunglasses: { enabled: true, style: 'aviator', color: '#FFD700' },
      necklace: { enabled: true, type: 'chain' },
    },
    special: {
      bullHorns: true,
    },
  },

  bearMode: {
    skinTone: '#D1A684',
    bodyType: 'athletic',
    height: 1.0,
    face: { hairStyle: 'long', hairColor: '#4A3728', eyeColor: '#2F4F4F', facialHair: 'goatee' },
    top: { type: 'hoodie', color: '#7F1D1D', graphic: 'bear' },
    bottom: { type: 'jeans', color: '#1E3A5F', style: 'fitted' },
    shoes: { type: 'sneakers', color: '#1a1a1a' },
    accessories: {
      sunglasses: { enabled: true, style: 'round', color: '#000000' },
    },
    special: {
      bearEars: true,
    },
  },

  cryptoDegen: {
    skinTone: '#E3B778',
    bodyType: 'slim',
    height: 0.9,
    face: { hairStyle: 'mohawk', hairColor: '#8B5CF6', eyeColor: '#4B0082', facialHair: 'none' },
    top: { type: 'tshirt', color: '#8B5CF6', graphic: 'moon' },
    bottom: { type: 'shorts', color: '#4B5563', style: 'loose' },
    shoes: { type: 'casual', color: '#EF4444' },
    accessories: {
      sunglasses: { enabled: true, style: 'round', color: '#FFD700' },
      necklace: { enabled: true, type: 'chain' },
      headset: { enabled: true, style: 'earbuds' },
    },
  },
};

// Unlock checker based on trading achievements
export function checkUnlocks(totalTrades: number, winRate: number, streak: number) {
  return {
    bullHorns: streak >= 5,
    bearEars: true, // Always available
    diamondHands: totalTrades >= 100,
    rocketBoots: winRate >= 50,
    chartHat: totalTrades >= 1000,
    goldAura: winRate >= 70 && totalTrades >= 50,
  };
}
