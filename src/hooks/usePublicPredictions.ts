import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPredictionData } from "@/components/predictions/PublicPredictionCard";

export function usePublicPredictions(limit = 20) {
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      
      // Fetch resolved predictions (only hit/missed, not active)
      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("*")
        .in("status", ["hit", "missed"])
        .eq("data_source", "trade_sync") // Only auto-published from real trades
        .order("resolved_at", { ascending: false })
        .limit(limit);

      if (predictionsError) throw predictionsError;

      if (!predictionsData || predictionsData.length === 0) {
        setPredictions([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(predictionsData.map(p => p.user_id))];

      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
        .in("user_id", userIds);

      // Map profiles by user_id
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Combine predictions with profiles
      const enrichedPredictions: PublicPredictionData[] = predictionsData.map(prediction => ({
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
        profile: profilesMap.get(prediction.user_id) || null,
      }));

      setPredictions(enrichedPredictions);
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [limit]);

  return { predictions, loading, error, refetch: fetchPredictions };
}

export function useUserPredictions(userId: string | null) {
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const fetchUserPredictions = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", userId)
          .eq("data_source", "trade_sync")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
          .eq("user_id", userId)
          .maybeSingle();

        const enrichedPredictions: PublicPredictionData[] = (data || []).map(prediction => ({
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
          profile: profile || null,
        }));

        setPredictions(enrichedPredictions);
      } catch (err) {
        console.error("Error fetching user predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPredictions();
  }, [userId]);

  return { predictions, loading };
}
