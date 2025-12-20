import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FollowData {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export function useFollows(userId: string | null) {
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollows = useCallback(async () => {
    if (!userId) {
      setFollowing([]);
      setFollowers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch who user is following
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      // Fetch user's followers
      const { data: followersData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      setFollowing((followingData || []).map(f => f.following_id));
      setFollowers((followersData || []).map(f => f.follower_id));
    } catch (err) {
      console.error("Error fetching follows:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const followUser = async (targetUserId: string) => {
    if (!userId || userId === targetUserId) return false;

    try {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: userId, following_id: targetUserId });

      if (error) throw error;
      setFollowing(prev => [...prev, targetUserId]);
      return true;
    } catch (err) {
      console.error("Error following user:", err);
      return false;
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetUserId);

      if (error) throw error;
      setFollowing(prev => prev.filter(id => id !== targetUserId));
      return true;
    } catch (err) {
      console.error("Error unfollowing user:", err);
      return false;
    }
  };

  const isFollowing = (targetUserId: string) => following.includes(targetUserId);

  return {
    following,
    followers,
    loading,
    followUser,
    unfollowUser,
    isFollowing,
    refetch: fetchFollows,
  };
}

export function useFollowingPredictions(userId: string | null, followingIds: string[]) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || followingIds.length === 0) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const fetchFollowingPredictions = async () => {
      try {
        setLoading(true);

        // Fetch predictions from followed users (both trade_sync and user-created)
        const { data: predictionsData, error } = await supabase
          .from("predictions")
          .select("*")
          .in("user_id", followingIds)
          .or("is_public.eq.true,data_source.eq.user") // Public trades or long-term predictions
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        if (!predictionsData || predictionsData.length === 0) {
          setPredictions([]);
          return;
        }

        // Fetch profiles
        const userIds = [...new Set(predictionsData.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from("public_profiles")
          .select("user_id, display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
          .in("user_id", userIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.user_id, p])
        );

        const enrichedPredictions = predictionsData.map(prediction => ({
          id: prediction.id,
          user_id: prediction.user_id,
          asset: prediction.asset,
          asset_type: prediction.asset_type,
          direction: prediction.direction,
          current_price: Number(prediction.current_price),
          target_price: Number(prediction.target_price),
          status: prediction.status,
          created_at: prediction.created_at,
          resolved_at: prediction.resolved_at,
          explanation: prediction.explanation,
          explanation_public: prediction.explanation_public,
          data_source: prediction.data_source,
          time_horizon: prediction.time_horizon,
          expiry_timestamp: prediction.expiry_timestamp,
          is_public: prediction.is_public,
          profile: profilesMap.get(prediction.user_id) || null,
          // Note: PnL is NOT included for privacy
        }));

        setPredictions(enrichedPredictions);
      } catch (err) {
        console.error("Error fetching following predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingPredictions();
  }, [userId, followingIds]);

  return { predictions, loading };
}
