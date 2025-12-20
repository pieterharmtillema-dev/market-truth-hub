import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "./FollowButton";
import { Skeleton } from "@/components/ui/skeleton";

interface FollowingUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_predictions: number | null;
  total_hits: number | null;
}

interface FollowingListProps {
  followingIds: string[];
  onFollow: (userId: string) => Promise<boolean>;
  onUnfollow: (userId: string) => Promise<boolean>;
}

export function FollowingList({ followingIds, onFollow, onUnfollow }: FollowingListProps) {
  const [users, setUsers] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (followingIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("public_profiles")
          .select("user_id, display_name, avatar_url, total_predictions, total_hits")
          .in("user_id", followingIds);

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching following users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [followingIds]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Card variant="glass" className="p-6 text-center">
        <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">You're not following anyone yet</p>
        <p className="text-xs text-muted-foreground mt-1">Search for traders to follow</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => {
        const accuracy = user.total_predictions && user.total_predictions > 0
          ? Math.round((user.total_hits || 0) / user.total_predictions * 100)
          : null;

        return (
          <Card key={user.user_id} variant="glass" className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-border">
                  {user.avatar_url && user.avatar_url.length <= 4 ? (
                    <div className="w-full h-full flex items-center justify-center text-lg bg-muted">
                      {user.avatar_url}
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {(user.display_name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.display_name || "Trader"}</p>
                  {accuracy !== null && (
                    <p className="text-xs text-muted-foreground">
                      {accuracy}% accuracy • {user.total_predictions} trades
                    </p>
                  )}
                </div>
              </div>
              <FollowButton
                targetUserId={user.user_id}
                isFollowing={true}
                onFollow={onFollow}
                onUnfollow={onUnfollow}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
