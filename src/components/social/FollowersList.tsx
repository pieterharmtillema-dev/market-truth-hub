import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { isFakeTrader } from "@/hooks/usePublicPredictions";
import { FAKE_PROFILES } from "@/hooks/fakeTraderData";
import { CharacterAvatar } from "@/components/profile/CharacterAvatar";

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
  const navigate = useNavigate();

  useEffect(() => {
    if (followerIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const realIds = followerIds.filter((id) => !isFakeTrader(id));
        const fakeIds = followerIds.filter((id) => isFakeTrader(id));

        let realUsers: FollowerUser[] = [];
        if (realIds.length > 0) {
          const { data, error } = await supabase
            .from("public_profiles")
            .select("user_id, display_name, avatar_url, total_predictions, total_hits")
            .in("user_id", realIds);

          if (error) throw error;
          realUsers = data || [];
        }

        const fakeUsers: FollowerUser[] = fakeIds
          .map((id) => {
            const profile = FAKE_PROFILES[id];
            if (!profile) return null;
            return {
              user_id: id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              total_predictions: profile.total_predictions,
              total_hits: profile.total_hits,
            } as FollowerUser;
          })
          .filter((user): user is FollowerUser => Boolean(user));

        const lookup = new Map<string, FollowerUser>();
        [...realUsers, ...fakeUsers].forEach((user) => lookup.set(user.user_id, user));

        const orderedUsers = followerIds
          .map((id) => lookup.get(id))
          .filter((user): user is FollowerUser => Boolean(user));

        setUsers(orderedUsers);
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
          <button
            type="button"
            key={user.user_id}
            onClick={() => navigate(`/trader/${user.user_id}`)}
            className="w-full flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-2.5 text-left transition hover:border-primary/60 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <CharacterAvatar
              userId={user.user_id}
              avatarUrl={user.avatar_url}
              displayName={user.display_name}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.display_name || "Trader"}</p>
              {accuracy !== null && <p className="text-xs text-muted-foreground">{accuracy}% accuracy</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
