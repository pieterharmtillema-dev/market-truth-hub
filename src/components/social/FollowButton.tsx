import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
  onFollow: (userId: string) => Promise<boolean>;
  onUnfollow: (userId: string) => Promise<boolean>;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
}

export function FollowButton({
  targetUserId,
  isFollowing,
  onFollow,
  onUnfollow,
  size = "sm",
  variant = "outline",
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        const success = await onUnfollow(targetUserId);
        if (success) {
          toast.success("Unfollowed");
        } else {
          toast.error("Failed to unfollow");
        }
      } else {
        const success = await onFollow(targetUserId);
        if (success) {
          toast.success("Following!");
        } else {
          toast.error("Failed to follow");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? "default" : variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-3.5 h-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          Follow
        </>
      )}
    </Button>
  );
}
