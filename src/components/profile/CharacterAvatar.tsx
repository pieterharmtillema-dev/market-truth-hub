import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CharacterConfig, DEFAULT_CHARACTER_CONFIG, parseCharacterConfig } from "./characterConfig";
import { FAKE_PROFILES } from "@/hooks/fakeTraderData";

interface CharacterAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CharacterAvatar({
  userId,
  avatarUrl,
  displayName,
  size = "md",
  className = ""
}: CharacterAvatarProps) {
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [loading, setLoading] = useState(true);

  // Size mappings
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const emojiSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl"
  };

  useEffect(() => {
    const fetchCharacterConfig = async () => {
      setLoading(true);
      try {
        // Check if this is a fake profile first
        const fakeProfile = FAKE_PROFILES[userId];
        if (fakeProfile?.avatar_url) {
          const parsed = parseCharacterConfig(fakeProfile.avatar_url);
          if (parsed) {
            setCharacterConfig(parsed);
            setLoading(false);
            return;
          }
        }

        // If avatarUrl is provided and it's a character config, parse it
        if (avatarUrl && avatarUrl.startsWith('avatar:')) {
          const parsed = parseCharacterConfig(avatarUrl);
          if (parsed) {
            setCharacterConfig(parsed);
            setLoading(false);
            return;
          }
        }

        // Fetch real user's character config
        const { data } = await supabase
          .from("profiles")
          .select("character_config")
          .eq("user_id", userId)
          .single();

        if (data?.character_config && typeof data.character_config === 'string') {
          const parsed = parseCharacterConfig(data.character_config);
          if (parsed) {
            setCharacterConfig(parsed);
          }
        }
      } catch (error) {
        // Silently fail - will use default config
      } finally {
        setLoading(false);
      }
    };

    fetchCharacterConfig();
  }, [userId, avatarUrl]);

  // If avatar is an emoji (4 chars or less), show it
  if (avatarUrl && avatarUrl.length <= 4 && !avatarUrl.startsWith('avatar:')) {
    return (
      <Avatar className={`${sizeClasses[size]} border border-border/60 ${className}`}>
        <div className={`w-full h-full flex items-center justify-center ${emojiSizes[size]} bg-muted`}>
          {avatarUrl}
        </div>
      </Avatar>
    );
  }

  // If avatar is a URL (not character config), show image
  if (avatarUrl && !avatarUrl.startsWith('avatar:')) {
    return (
      <Avatar className={`${sizeClasses[size]} border border-border/60 ${className}`}>
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {(displayName || "U").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Render character avatar
  const uniqueId = `char-avatar-${userId}`;

  return (
    <div className={`${sizeClasses[size]} rounded-full border-2 border-primary/50 overflow-hidden flex-shrink-0 ${className}`} style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
      <svg viewBox="42 24 60 60" className="w-full h-full" preserveAspectRatio="xMidYMid slice" style={{ transform: 'scale(1.1)' }}>
        <defs>
          <linearGradient id={`${uniqueId}-head-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={adjustBrightness(characterConfig.skinTone, 10)} stopOpacity="1" />
            <stop offset="100%" stopColor={characterConfig.skinTone} stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`${uniqueId}-body-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={characterConfig.skinTone} stopOpacity="1" />
            <stop offset="100%" stopColor={adjustBrightness(characterConfig.skinTone, -20)} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Left Arm */}
        <rect x="54" y="72" width="4" height="16" rx="2"
          fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#${uniqueId}-body-gradient)`} />

        {/* Right Arm */}
        <rect x="86" y="72" width="4" height="16" rx="2"
          fill={characterConfig.top.type !== 'none' && characterConfig.top.type !== 'tank' ? characterConfig.top.color : `url(#${uniqueId}-body-gradient)`} />

        {/* Neck */}
        <rect x="69" y="60" width="6" height="8" rx="3" fill={`url(#${uniqueId}-body-gradient)`} />

        {/* Torso */}
        {characterConfig.top.type !== 'none' ? (
          <rect x="62" y="66" width="20" height="18" rx="6" fill={characterConfig.top.color} />
        ) : (
          <rect x="62" y="66" width="20" height="18" rx="6" fill={`url(#${uniqueId}-body-gradient)`} />
        )}

        {/* Hair back layer */}
        {characterConfig.face?.hairStyle === 'long' && (
          <ellipse cx="72" cy="52" rx="20" ry="16" fill={characterConfig.face?.hairColor || '#2D1B0E'} />
        )}

        {/* Head */}
        <ellipse cx="72" cy="44" rx="16" ry="18" fill={`url(#${uniqueId}-head-gradient)`} />

        {/* Ears */}
        <ellipse cx="56" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />
        <ellipse cx="88" cy="46" rx="3" ry="4" fill={characterConfig.skinTone} />

        {/* Hair */}
        <HairSVG hairStyle={characterConfig.face?.hairStyle || 'short'} hairColor={characterConfig.face?.hairColor || '#2D1B0E'} />

        {/* Eyes */}
        <ellipse cx="66" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
        <ellipse cx="78" cy="44" rx="3" ry="2.5" fill="#FFFFFF" />
        <circle cx="66" cy="44" r="1.5" fill={characterConfig.face?.eyeColor || '#4A90D9'} />
        <circle cx="78" cy="44" r="1.5" fill={characterConfig.face?.eyeColor || '#4A90D9'} />
        <circle cx="65" cy="43.5" r="0.5" fill="#FFFFFF" />
        <circle cx="77" cy="43.5" r="0.5" fill="#FFFFFF" />

        {/* Nose */}
        <path d="M 72 46 L 72 50 L 70 51" stroke={adjustBrightness(characterConfig.skinTone, -30)} strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Mouth */}
        <path d="M 68 54 Q 72 56 76 54" stroke={adjustBrightness(characterConfig.skinTone, -40)} strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Sunglasses */}
        {characterConfig.accessories.sunglasses?.enabled && (
          <g>
            {characterConfig.accessories.sunglasses.style === 'aviator' ? (
              <>
                <ellipse cx="64" cy="45" rx="6" ry="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <ellipse cx="80" cy="45" rx="6" ry="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <path d="M 58 44 L 52 42" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 70 44 L 74 44" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 86 44 L 92 42" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
              </>
            ) : characterConfig.accessories.sunglasses.style === 'round' ? (
              <>
                <circle cx="64" cy="45" r="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <circle cx="80" cy="45" r="5" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <path d="M 59 45 L 52 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 69 45 L 75 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 85 45 L 92 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
              </>
            ) : (
              <>
                <rect x="58" y="42" width="12" height="6" rx="1" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <rect x="74" y="42" width="12" height="6" rx="1" fill={characterConfig.accessories.sunglasses.color} opacity="0.8" />
                <path d="M 58 45 L 52 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 70 45 L 74 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
                <path d="M 86 45 L 92 45" stroke={characterConfig.accessories.sunglasses.color} strokeWidth="1" />
              </>
            )}
          </g>
        )}

        {/* Necklace */}
        {characterConfig.accessories.necklace?.enabled && (
          <g>
            <path d="M 62 64 Q 72 68 82 64" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="65" cy="65" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
            <circle cx="68" cy="66" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
            <circle cx="72" cy="66.5" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
            <circle cx="76" cy="66" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
            <circle cx="79" cy="65" r="1" fill="none" stroke={characterConfig.accessories.necklace.color || '#FFD700'} strokeWidth="0.7" />
            <path d="M 63 63 Q 72 67 81 63" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {characterConfig.accessories.necklace.type === 'pendant' && (
              <>
                <circle cx="72" cy="72" r="3.5" fill={characterConfig.accessories.necklace.color || '#FFD700'} />
                <circle cx="72" cy="72" r="2.5" fill={adjustBrightness(characterConfig.accessories.necklace.color || '#FFD700', -20)} />
                <circle cx="71" cy="71" r="0.8" fill="rgba(255,255,255,0.7)" />
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// Helper function to adjust brightness
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper component for hair
function HairSVG({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
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
      return <ellipse cx="72" cy="32" rx="14" ry="8" fill={hairColor} opacity="0.8" />;
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
      return <ellipse cx="72" cy="36" rx="22" ry="20" fill={hairColor} />;
    default:
      return <ellipse cx="72" cy="30" rx="12" ry="6" fill={hairColor} />;
  }
}
