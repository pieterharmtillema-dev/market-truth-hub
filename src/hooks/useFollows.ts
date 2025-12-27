import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isFakeTrader, getFakeTraderIds } from "./usePublicPredictions";
import { PublicPredictionData } from "@/components/predictions/PublicPredictionCard";

export interface FollowData {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Local storage key for fake trader follows
const FAKE_FOLLOWS_KEY = 'trax_fake_follows';

const getFakeFollows = (): string[] => {
  try {
    const stored = localStorage.getItem(FAKE_FOLLOWS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveFakeFollows = (follows: string[]) => {
  localStorage.setItem(FAKE_FOLLOWS_KEY, JSON.stringify(follows));
};

export function useFollows(userId: string | null) {
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [fakeFollowing, setFakeFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load fake follows from localStorage on mount
  useEffect(() => {
    setFakeFollowing(getFakeFollows());
  }, []);

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

    // Handle fake trader follows locally
    if (isFakeTrader(targetUserId)) {
      const newFakeFollows = [...fakeFollowing, targetUserId];
      setFakeFollowing(newFakeFollows);
      saveFakeFollows(newFakeFollows);
      return true;
    }

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

    // Handle fake trader unfollows locally
    if (isFakeTrader(targetUserId)) {
      const newFakeFollows = fakeFollowing.filter(id => id !== targetUserId);
      setFakeFollowing(newFakeFollows);
      saveFakeFollows(newFakeFollows);
      return true;
    }

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

  // Combine real and fake follows for isFollowing check
  const isFollowing = (targetUserId: string) => {
    if (isFakeTrader(targetUserId)) {
      return fakeFollowing.includes(targetUserId);
    }
    return following.includes(targetUserId);
  };

  // Combined following list (real + fake)
  const allFollowing = [...following, ...fakeFollowing];

  return {
    following: allFollowing,
    followers,
    loading,
    followUser,
    unfollowUser,
    isFollowing,
    refetch: fetchFollows,
  };
}

// Import fake predictions generator
import { usePublicPredictions } from "./usePublicPredictions";

export function useFollowingPredictions(userId: string | null, followingIds: string[]) {
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { predictions: allFakePredictions } = usePublicPredictions(30);

  useEffect(() => {
    if (!userId || followingIds.length === 0) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const fetchFollowingPredictions = async () => {
      try {
        setLoading(true);

        // Separate real and fake user IDs
        const realUserIds = followingIds.filter(id => !isFakeTrader(id));
        const fakeUserIds = followingIds.filter(id => isFakeTrader(id));

        let enrichedPredictions: PublicPredictionData[] = [];

        // Fetch real predictions if we have real users
        if (realUserIds.length > 0) {
          const { data: predictionsData, error } = await supabase
            .from("predictions")
            .select("*")
            .in("user_id", realUserIds)
            .or("is_public.eq.true,data_source.eq.user")
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && predictionsData && predictionsData.length > 0) {
            const userIds = [...new Set(predictionsData.map(p => p.user_id))];
            const { data: profilesData } = await supabase
              .from("public_profiles")
              .select("user_id, display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
              .in("user_id", userIds);

            const profilesMap = new Map(
              (profilesData || []).map(p => [p.user_id, p])
            );

            enrichedPredictions = predictionsData.map(prediction => ({
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
            }));
          }
        }

        // Add fake predictions for followed fake traders
        if (fakeUserIds.length > 0) {
          const fakePredictions = allFakePredictions.filter(p => 
            fakeUserIds.includes(p.user_id)
          );
          enrichedPredictions = [...enrichedPredictions, ...fakePredictions];
        }

        // Sort by date
        enrichedPredictions.sort((a, b) => {
          const dateA = new Date(a.resolved_at || a.created_at).getTime();
          const dateB = new Date(b.resolved_at || b.created_at).getTime();
          return dateB - dateA;
        });

        setPredictions(enrichedPredictions);
      } catch (err) {
        console.error("Error fetching following predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingPredictions();
  }, [userId, followingIds, allFakePredictions]);

  return { predictions, loading };
}
