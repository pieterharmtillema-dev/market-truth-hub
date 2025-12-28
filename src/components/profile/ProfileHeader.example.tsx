/**
 * ProfileHeader Component - Usage Examples
 *
 * This file demonstrates how to use the ProfileHeader component
 * with various configurations and states.
 */

import { ProfileHeader } from './ProfileHeader';

// Example 1: Own Profile (Full Controls)
export function OwnProfileExample() {
  return (
    <ProfileHeader
      displayName="John Trader"
      avatarUrl="https://example.com/avatar.jpg"
      bio="Day trader specializing in crypto and forex markets. 5+ years experience."
      isOwnProfile={true}
      onEditClick={() => console.log('Edit profile clicked')}
      onFriendsClick={() => console.log('Friends clicked')}
      onShareClick={() => console.log('Share clicked')}
      onSettingsClick={() => console.log('Settings clicked')}
    />
  );
}

// Example 2: Empty Profile (No Bio)
export function EmptyProfileExample() {
  return (
    <ProfileHeader
      displayName="New Trader"
      avatarUrl={null}
      bio={null}
      isOwnProfile={true}
      onEditClick={() => console.log('Edit profile clicked')}
      onFriendsClick={() => console.log('Friends clicked')}
      onShareClick={() => console.log('Share clicked')}
      onSettingsClick={() => console.log('Settings clicked')}
    />
  );
}

// Example 3: Public Profile (Viewing Someone Else)
export function PublicProfileExample() {
  return (
    <ProfileHeader
      displayName="Jane Investor"
      avatarUrl="avatar:premium_avatar_config_string"
      bio="Long-term investor focused on fundamental analysis and value investing."
      isOwnProfile={false}
      onFriendsClick={() => console.log('View friends')}
      onShareClick={() => console.log('Share profile')}
    />
  );
}

// Example 4: Premium Avatar
export function PremiumAvatarExample() {
  return (
    <ProfileHeader
      displayName="Premium Trader"
      avatarUrl="avatar:premium_config_string_here"
      bio="Professional trader with verified track record. Follow for daily market insights."
      isOwnProfile={false}
      onFriendsClick={() => console.log('View friends')}
      onShareClick={() => console.log('Share profile')}
    />
  );
}

// Example 5: Emoji Avatar
export function EmojiAvatarExample() {
  return (
    <ProfileHeader
      displayName="Crypto Bull"
      avatarUrl="emoji:🚀"
      bio="To the moon! Crypto enthusiast and swing trader."
      isOwnProfile={true}
      onEditClick={() => console.log('Edit profile clicked')}
      onFriendsClick={() => console.log('Friends clicked')}
      onShareClick={() => console.log('Share clicked')}
      onSettingsClick={() => console.log('Settings clicked')}
    />
  );
}

/**
 * RESPONSIVE BEHAVIOR NOTES:
 *
 * Desktop (md and up):
 * - 3-column grid: [Avatar] [User Info] [Actions]
 * - Left-aligned content
 * - Horizontal layout
 *
 * Mobile (below md):
 * - Vertical stack
 * - Center-aligned content
 * - Avatar at top
 * - User info in middle
 * - Action buttons at bottom
 *
 * STYLING SPECIFICATIONS:
 * - Background: linear-gradient(135deg, #1c4042 0%, #13161e 100%)
 * - Border: 1px solid #1b1f2a
 * - Border-radius: 16px (from Card component)
 * - Padding: 2rem (32px)
 * - Gap: 2rem (32px)
 *
 * AVATAR:
 * - Size: 100px × 100px
 * - Border: 3px solid #25c4b7
 * - Circular with shadow
 *
 * TYPOGRAPHY:
 * - Name: 2rem (32px), bold, white
 * - Bio: 0.875rem (14px), #9ca3af
 *
 * ACTION BUTTONS:
 * - Edit Profile: #25c4b7 background, hover: #1fa89d
 * - Icon buttons: 40px × 40px, transparent, border #1f2937, hover border #25c4b7
 *
 * INTEGRATION WITH PROFILE.TSX:
 *
 * ```tsx
 * import { ProfileHeader } from '@/components/profile/ProfileHeader';
 *
 * // In your Profile component:
 * const [showEditDialog, setShowEditDialog] = useState(false);
 * const [showSocialDialog, setShowSocialDialog] = useState(false);
 *
 * <ProfileHeader
 *   displayName={profile.display_name}
 *   avatarUrl={profile.avatar_url}
 *   bio={profile.bio}
 *   isOwnProfile={true}
 *   onEditClick={() => setShowEditDialog(true)}
 *   onFriendsClick={() => setShowSocialDialog(true)}
 *   onShareClick={() => {
 *     if (navigator.share) {
 *       navigator.share({
 *         title: `${profile.display_name || 'Trader'}'s Profile`,
 *         url: window.location.href,
 *       });
 *     }
 *   }}
 *   onSettingsClick={() => navigate('/settings')}
 * />
 * ```
 */
