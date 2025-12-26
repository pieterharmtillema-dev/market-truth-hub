// Premium Avatar Customization System for TRAX
// Semi-realistic, fintech-grade avatars

export interface PremiumAvatarConfig {
  // Face & Head
  faceShape: 'round' | 'oval' | 'angular' | 'square';
  skinTone: string;
  skinUndertone: 'warm' | 'neutral' | 'cool';
  freckles: boolean;
  beautyMark: 'none' | 'left' | 'right';
  
  // Eyes
  eyeShape: 'focused' | 'relaxed' | 'sharp' | 'friendly';
  irisColor: string;
  eyebrowShape: 'natural' | 'arched' | 'straight' | 'thick';
  eyebrowThickness: number; // 0.5-1.5
  
  // Hair
  hairStyle: 'none' | 'short' | 'fade' | 'undercut' | 'waves' | 'bun' | 'ponytail' | 'curls' | 'buzz' | 'slick';
  hairColor: string;
  hairHighlights: boolean;
  facialHair: 'none' | 'stubble' | 'beard' | 'goatee' | 'mustache';
  facialHairDensity: number; // 0.3-1.0
  
  // Clothing
  outfit: 'hoodie' | 'jacket' | 'tee' | 'blazer' | 'sweater' | 'polo';
  outfitColor: string;
  brandAccent: boolean;
  
  // Accessories
  glasses: 'none' | 'clear' | 'dark' | 'metal';
  headphones: boolean;
  earring: 'none' | 'left' | 'right' | 'both';
  cap: boolean;
  watch: boolean;
  
  // Background
  background: 'none' | 'solid' | 'gradient' | 'glow';
  backgroundColor: string;
}

export const DEFAULT_PREMIUM_CONFIG: PremiumAvatarConfig = {
  faceShape: 'oval',
  skinTone: '#E8B89D',
  skinUndertone: 'neutral',
  freckles: false,
  beautyMark: 'none',
  
  eyeShape: 'friendly',
  irisColor: '#5D4037',
  eyebrowShape: 'natural',
  eyebrowThickness: 1,
  
  hairStyle: 'short',
  hairColor: '#3D2314',
  hairHighlights: false,
  facialHair: 'none',
  facialHairDensity: 0.5,
  
  outfit: 'hoodie',
  outfitColor: '#1C1C1C',
  brandAccent: true,
  
  glasses: 'none',
  headphones: false,
  earring: 'none',
  cap: false,
  watch: false,
  
  background: 'glow',
  backgroundColor: '#10B981',
};

// Skin tones with undertone variations
export const SKIN_TONES = [
  { id: 'fair-cool', color: '#FFF0E6', undertone: 'cool' as const },
  { id: 'fair-neutral', color: '#FFE4D6', undertone: 'neutral' as const },
  { id: 'fair-warm', color: '#FFDDC8', undertone: 'warm' as const },
  { id: 'light-cool', color: '#F5D0C5', undertone: 'cool' as const },
  { id: 'light-neutral', color: '#EECBBA', undertone: 'neutral' as const },
  { id: 'light-warm', color: '#E8C4A8', undertone: 'warm' as const },
  { id: 'medium-cool', color: '#D4A574', undertone: 'cool' as const },
  { id: 'medium-neutral', color: '#C69C6D', undertone: 'neutral' as const },
  { id: 'medium-warm', color: '#C49A6C', undertone: 'warm' as const },
  { id: 'tan-cool', color: '#A67B5B', undertone: 'cool' as const },
  { id: 'tan-neutral', color: '#9E7653', undertone: 'neutral' as const },
  { id: 'tan-warm', color: '#8B6914', undertone: 'warm' as const },
  { id: 'brown-cool', color: '#7B5544', undertone: 'cool' as const },
  { id: 'brown-neutral', color: '#704F3E', undertone: 'neutral' as const },
  { id: 'brown-warm', color: '#6B4A36', undertone: 'warm' as const },
  { id: 'dark-cool', color: '#5C4033', undertone: 'cool' as const },
  { id: 'dark-neutral', color: '#4A332C', undertone: 'neutral' as const },
  { id: 'dark-warm', color: '#3D2B24', undertone: 'warm' as const },
];

// Iris colors with depth
export const IRIS_COLORS = [
  { id: 'brown-dark', color: '#3D2314', name: 'Dark Brown' },
  { id: 'brown', color: '#5D4037', name: 'Brown' },
  { id: 'hazel', color: '#8B7355', name: 'Hazel' },
  { id: 'amber', color: '#B8860B', name: 'Amber' },
  { id: 'green', color: '#4A7C59', name: 'Green' },
  { id: 'blue-green', color: '#5F9EA0', name: 'Blue-Green' },
  { id: 'blue', color: '#4A90D9', name: 'Blue' },
  { id: 'blue-light', color: '#87CEEB', name: 'Light Blue' },
  { id: 'gray', color: '#708090', name: 'Gray' },
  { id: 'violet', color: '#7B68EE', name: 'Violet' },
];

// Hair colors with natural options
export const HAIR_COLORS = [
  { id: 'black', color: '#1A1A1A', name: 'Black' },
  { id: 'dark-brown', color: '#3D2314', name: 'Dark Brown' },
  { id: 'brown', color: '#5C4033', name: 'Brown' },
  { id: 'light-brown', color: '#8B7355', name: 'Light Brown' },
  { id: 'auburn', color: '#8B4513', name: 'Auburn' },
  { id: 'ginger', color: '#B7410E', name: 'Ginger' },
  { id: 'blonde', color: '#D4AF37', name: 'Blonde' },
  { id: 'platinum', color: '#E5E4E2', name: 'Platinum' },
  { id: 'gray', color: '#808080', name: 'Gray' },
  { id: 'white', color: '#F5F5F5', name: 'White' },
  // Fashion colors
  { id: 'blue', color: '#4169E1', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#DB7093', name: 'Pink' },
  { id: 'green', color: '#228B22', name: 'Green' },
];

// Outfit colors - professional palette
export const OUTFIT_COLORS = [
  { id: 'black', color: '#1C1C1C', name: 'Black' },
  { id: 'charcoal', color: '#36454F', name: 'Charcoal' },
  { id: 'navy', color: '#1B2838', name: 'Navy' },
  { id: 'slate', color: '#708090', name: 'Slate' },
  { id: 'white', color: '#F8F8F8', name: 'White' },
  { id: 'cream', color: '#FFF8DC', name: 'Cream' },
  { id: 'burgundy', color: '#722F37', name: 'Burgundy' },
  { id: 'forest', color: '#228B22', name: 'Forest' },
  { id: 'royal', color: '#4169E1', name: 'Royal Blue' },
  { id: 'camel', color: '#C19A6B', name: 'Camel' },
];

// Background colors - brand aligned
export const BACKGROUND_COLORS = [
  { id: 'brand', color: '#10B981', name: 'TRAX Green' },
  { id: 'cyan', color: '#06B6D4', name: 'Cyan' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'rose', color: '#F43F5E', name: 'Rose' },
  { id: 'amber', color: '#F59E0B', name: 'Amber' },
  { id: 'slate', color: '#475569', name: 'Slate' },
  { id: 'zinc', color: '#27272A', name: 'Zinc' },
];

export type EditorStep = 'face' | 'eyes' | 'hair' | 'clothing' | 'accessories' | 'background';

export const EDITOR_STEPS: { id: EditorStep; label: string; icon: string }[] = [
  { id: 'face', label: 'Face', icon: '👤' },
  { id: 'eyes', label: 'Eyes', icon: '👁️' },
  { id: 'hair', label: 'Hair', icon: '💇' },
  { id: 'clothing', label: 'Clothing', icon: '👔' },
  { id: 'accessories', label: 'Accessories', icon: '🎩' },
  { id: 'background', label: 'Background', icon: '🎨' },
];

// Serialization helpers
export function stringifyPremiumConfig(config: PremiumAvatarConfig): string {
  return `avatar:${JSON.stringify(config)}`;
}

export function parsePremiumConfig(str: string): PremiumAvatarConfig | null {
  if (!str?.startsWith('avatar:')) return null;
  try {
    return JSON.parse(str.replace('avatar:', ''));
  } catch {
    return null;
  }
}
