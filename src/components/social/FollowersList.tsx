import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface FollowerUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_predictions: number | null;
  total_hits: number | null;
}

interface FollowersListProps {
  followerIds: string[];
}

export function FollowersList({ followerIds }: FollowersListProps) {
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (followerIds.length === 0) {
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
          .in("user_id", followerIds);

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching followers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [followerIds]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-4">
        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No followers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => {
        const accuracy = user.total_predictions && user.total_predictions > 0
          ? Math.round((user.total_hits || 0) / user.total_predictions * 100)
          : null;

        return (
          <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
            <Avatar className="w-9 h-9 border border-border">
              {user.avatar_url && user.avatar_url.length <= 4 ? (
                <div className="w-full h-full flex items-center justify-center text-base bg-muted">
                  {user.avatar_url}
                </div>
              ) : (
                <>
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {(user.display_name || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.display_name || "Trader"}</p>
              {accuracy !== null && (
                <p className="text-xs text-muted-foreground">
                  {accuracy}% accuracy
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
