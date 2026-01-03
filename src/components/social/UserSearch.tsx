import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "./FollowButton";
import { toast } from "sonner";
import { FAKE_PROFILES } from "@/hooks/fakeTraderData";
import { CharacterAvatar } from "@/components/profile/CharacterAvatar";

interface UserSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_predictions: number | null;
  total_hits: number | null;
}

interface UserSearchProps {
  currentUserId: string;
  isFollowing: (userId: string) => boolean;
  onFollow: (userId: string) => Promise<boolean>;
  onUnfollow: (userId: string) => Promise<boolean>;
}

export function UserSearch({ currentUserId, isFollowing, onFollow, onUnfollow }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fakeTraderEntries = Object.entries(FAKE_PROFILES).map(([userId, profile]) => ({
    user_id: userId,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    total_predictions: profile.total_predictions,
    total_hits: profile.total_hits,
  }));

  const filteredFakeTraders = fakeTraderEntries.filter((trader) =>
    trader.display_name?.toLowerCase().includes(query.trim().toLowerCase()) || query.trim() === ""
  );

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Enter a username to search");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, avatar_url, total_predictions, total_hits")
        .ilike("display_name", `%${query.trim()}%`)
        .neq("user_id", currentUserId)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Error searching users:", err);
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading} size="icon">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {searched && results.length === 0 && filteredFakeTraders.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No users found for "{query}"
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => {
            const accuracy = user.total_predictions && user.total_predictions > 0
              ? Math.round((user.total_hits || 0) / user.total_predictions * 100)
              : null;

            return (
              <Card key={user.user_id} variant="glass" className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CharacterAvatar
                      userId={user.user_id}
                      avatarUrl={user.avatar_url}
                      displayName={user.display_name}
                      size="md"
                    />
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
                    isFollowing={isFollowing(user.user_id)}
                    onFollow={onFollow}
                    onUnfollow={onUnfollow}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase text-muted-foreground tracking-wide">Featured fake traders</p>
        {filteredFakeTraders.length === 0 && query.trim() !== "" ? (
          <p className="text-sm text-muted-foreground">No featured traders match your search.</p>
        ) : (
          filteredFakeTraders.map((user) => {
            const accuracy = user.total_predictions && user.total_predictions > 0
              ? Math.round((user.total_hits || 0) / user.total_predictions * 100)
              : null;

            return (
              <Card key={user.user_id} variant="glass" className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CharacterAvatar
                      userId={user.user_id}
                      avatarUrl={user.avatar_url}
                      displayName={user.display_name}
                      size="md"
                    />
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
                    isFollowing={isFollowing(user.user_id)}
                    onFollow={onFollow}
                    onUnfollow={onUnfollow}
                  />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
