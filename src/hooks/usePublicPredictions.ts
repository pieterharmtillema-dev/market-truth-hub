import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPredictionData } from "@/components/predictions/PublicPredictionCard";

// Trade-based predictions (from real trades via extension)
export function usePublicPredictions(limit = 20) {
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      
      // Fetch resolved predictions from real trades that are PUBLIC
      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("*")
        .in("status", ["hit", "missed"])
        .eq("data_source", "trade_sync")
        .eq("is_public", true) // Only show trades user chose to share
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

// User's trade-based predictions only (includes PnL from linked positions)
export function useUserTradePredictions(userId: string | null) {
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

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
          .eq("user_id", userId)
          .maybeSingle();

        // Fetch PnL data from linked positions (only for user's own trades)
        const positionIds = (data || [])
          .filter(p => p.source_position_id)
          .map(p => p.source_position_id);

        let positionsMap = new Map<number, { pnl: number | null; pnl_pct: number | null }>();
        
        if (positionIds.length > 0) {
          const { data: positionsData } = await supabase
            .from("positions")
            .select("id, pnl, pnl_pct")
            .in("id", positionIds);
          
          if (positionsData) {
            positionsMap = new Map(positionsData.map(p => [p.id, { pnl: p.pnl, pnl_pct: p.pnl_pct }]));
          }
        }

        const enrichedPredictions: PublicPredictionData[] = (data || []).map(prediction => {
          const positionData = prediction.source_position_id 
            ? positionsMap.get(prediction.source_position_id) 
            : null;
          
          return {
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
            pnl: positionData?.pnl ?? null,
            pnl_pct: positionData?.pnl_pct ?? null,
            is_public: prediction.is_public ?? false,
            profile: profile || null,
          };
        });

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

// User-created long-term predictions (not tied to trades)
export function useLongTermPredictions(limit = 20) {
  const [predictions, setPredictions] = useState<PublicPredictionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      
      // Fetch user-created predictions (active, hit, or missed)
      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("*")
        .eq("data_source", "user")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (predictionsError) throw predictionsError;

      if (!predictionsData || predictionsData.length === 0) {
        setPredictions([]);
        return;
      }

      const userIds = [...new Set(predictionsData.map(p => p.user_id))];

      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, avatar_url, current_streak, streak_type, total_predictions, total_hits")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

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
        data_source: prediction.data_source,
        time_horizon: prediction.time_horizon,
        expiry_timestamp: prediction.expiry_timestamp,
        profile: profilesMap.get(prediction.user_id) || null,
      }));

      setPredictions(enrichedPredictions);
    } catch (err) {
      console.error("Error fetching long-term predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [limit]);

  return { predictions, loading, refetch: fetchPredictions };
}

// User's own long-term predictions
export function useUserLongTermPredictions(userId: string | null) {
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
          .eq("data_source", "user")
          .order("created_at", { ascending: false });

        if (error) throw error;

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
          data_source: prediction.data_source,
          time_horizon: prediction.time_horizon,
          expiry_timestamp: prediction.expiry_timestamp,
          profile: profile || null,
        }));

        setPredictions(enrichedPredictions);
      } catch (err) {
        console.error("Error fetching user long-term predictions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPredictions();
  }, [userId]);

  return { predictions, loading };
}

// Legacy alias for backward compatibility
export const useUserPredictions = useUserTradePredictions;
