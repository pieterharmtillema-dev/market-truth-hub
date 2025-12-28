import { AvatarDisplay } from '@/components/profile/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Edit, Users, Share2, Settings } from 'lucide-react';
import { CategoryBadge, TraderCategory } from '@/components/profile/CategoryBadge';
import { TraderProfileSection } from '@/components/profile/TraderProfileSection';

interface ProfileHeaderProps {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  onFriendsClick?: () => void;
  onShareClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
  userId?: string;
  traderCategory?: TraderCategory | null;
}

export function ProfileHeader({
  displayName,
  avatarUrl,
  bio,
  isOwnProfile = true,
  onEditClick,
  onFriendsClick,
  onShareClick,
  onSettingsClick,
  className,
  userId,
  traderCategory,
}: ProfileHeaderProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-[#1b1f2a]",
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #1c4042 0%, #13161e 100%)',
      }}
    >
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-8 items-center">
          {/* Left: Avatar Section */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <AvatarDisplay
                avatarUrl={avatarUrl}
                displayName={displayName || 'User'}
                size={100}
                className="border-[3px] border-[#25c4b7] shadow-lg"
              />
            </div>
          </div>

          {/* Center: User Info Section */}
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-[2rem] font-bold text-white leading-tight">
              {displayName || 'Set your name'}
            </h1>
            <p className="text-[0.875rem] text-[#9ca3af] leading-relaxed">
              {bio || 'Add a bio to tell others about your trading journey'}
            </p>
          </div>

          {/* Right: Action Buttons Section */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center md:justify-end">
            {isOwnProfile && (
              <Button
                onClick={onEditClick}
                className="bg-[#25c4b7] hover:bg-[#1fa89d] text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-[0_0_20px_rgba(37,196,183,0.3)] hover:shadow-[0_0_30px_rgba(37,196,183,0.4)] gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            )}

            <div className="flex gap-2">
              {/* Friends Button */}
              <button
                onClick={onFriendsClick}
                className="w-10 h-10 flex items-center justify-center bg-transparent border border-[#1f2937] rounded-lg hover:border-[#25c4b7] transition-colors"
                title="Friends"
              >
                <Users className="w-4 h-4 text-[#9ca3af]" />
              </button>

              {/* Share Button */}
              <button
                onClick={onShareClick}
                className="w-10 h-10 flex items-center justify-center bg-transparent border border-[#1f2937] rounded-lg hover:border-[#25c4b7] transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4 text-[#9ca3af]" />
              </button>

              {/* Settings Button */}
              {isOwnProfile && (
                <button
                  onClick={onSettingsClick}
                  className="w-10 h-10 flex items-center justify-center bg-transparent border border-[#1f2937] rounded-lg hover:border-[#25c4b7] transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-[#9ca3af]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trader Category Badge */}
        {traderCategory && (
          <div className="flex justify-center mt-6 pt-6 border-t border-[#1f2937]">
            <CategoryBadge category={traderCategory} size="sm" />
          </div>
        )}

        {/* Trader Profile Section */}
        {userId && (
          <div className="mt-4">
            <TraderProfileSection userId={userId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
