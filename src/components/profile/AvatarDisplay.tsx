import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CharacterAvatar, parseCharacterConfig } from './CharacterBuilder';
import { PremiumAvatarRenderer, parsePremiumConfig } from './avatar';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: number;
  className?: string;
}

export function AvatarDisplay({ avatarUrl, displayName, size = 40, className }: AvatarDisplayProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle premium avatar config
  if (avatarUrl?.startsWith('avatar:')) {
    const config = parsePremiumConfig(avatarUrl);
    if (config) {
      return <PremiumAvatarRenderer config={config} size={size} className={className} />;
    }
  }

  // Handle character config
  if (avatarUrl?.startsWith('char:')) {
    const config = parseCharacterConfig(avatarUrl);
    if (config) {
      return <CharacterAvatar config={config} size={size} className={className} />;
    }
  }

  // Handle emoji
  if (avatarUrl?.startsWith('emoji:')) {
    const emoji = avatarUrl.replace('emoji:', '');
    return (
      <Avatar className={cn("border-2 border-border", className)} style={{ width: size, height: size }}>
        <AvatarFallback 
          className="bg-muted"
          style={{ fontSize: size * 0.45 }}
        >
          {emoji}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Handle plain emoji (legacy support - 4 chars or less)
  if (avatarUrl && avatarUrl.length <= 4 && !avatarUrl.startsWith('http')) {
    return (
      <Avatar className={cn("border-2 border-border", className)} style={{ width: size, height: size }}>
        <AvatarFallback 
          className="bg-muted"
          style={{ fontSize: size * 0.45 }}
        >
          {avatarUrl}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Handle URL or fallback
  return (
    <Avatar className={cn("border-2 border-border", className)} style={{ width: size, height: size }}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={displayName} />
      )}
      <AvatarFallback 
        className="bg-primary/20 text-primary font-medium"
        style={{ fontSize: size * 0.35 }}
      >
        {displayName ? getInitials(displayName) : '??'}
      </AvatarFallback>
    </Avatar>
  );
}
