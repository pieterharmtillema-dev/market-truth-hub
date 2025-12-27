import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPredictionData } from "@/components/predictions/PublicPredictionCard";

// Fake demo profiles for testing/demo purposes
const FAKE_PROFILES: Record<string, { display_name: string; avatar_url: string; bio: string; current_streak: number; total_predictions: number; total_hits: number; streak_type: string }> = {
  '11111111-1111-1111-1111-111111111111': { display_name: 'CryptoKing', avatar_url: 'emoji:👑', bio: 'Full-time crypto trader. BTC maximalist.', current_streak: 7, total_predictions: 156, total_hits: 112, streak_type: 'hit' },
  '22222222-2222-2222-2222-222222222222': { display_name: 'ForexMaster', avatar_url: 'emoji:🧙‍♂️', bio: 'Forex scalper | 5+ years experience', current_streak: 3, total_predictions: 89, total_hits: 58, streak_type: 'hit' },
  '33333333-3333-3333-3333-333333333333': { display_name: 'StockWhisperer', avatar_url: 'emoji:🦊', bio: 'Value investor turned swing trader', current_streak: 2, total_predictions: 234, total_hits: 145, streak_type: 'miss' },
  '44444444-4444-4444-4444-444444444444': { display_name: 'TechTrader', avatar_url: 'emoji:🤖', bio: 'Tech stocks enthusiast. NASDAQ focused.', current_streak: 5, total_predictions: 67, total_hits: 41, streak_type: 'hit' },
  '55555555-5555-5555-5555-555555555555': { display_name: 'GoldBull', avatar_url: 'emoji:🦁', bio: 'Commodities specialist. Gold & Silver.', current_streak: 1, total_predictions: 42, total_hits: 28, streak_type: 'miss' },
  '66666666-6666-6666-6666-666666666666': { display_name: 'SwingKing', avatar_url: 'emoji:⚡', bio: 'Index ETF swing trader. SPY/QQQ specialist.', current_streak: 4, total_predictions: 98, total_hits: 67, streak_type: 'hit' },
  '77777777-7777-7777-7777-777777777777': { display_name: 'ScalpMaster', avatar_url: 'emoji:🥷', bio: 'Scalping forex pairs since 2018.', current_streak: 6, total_predictions: 312, total_hits: 198, streak_type: 'hit' },
  '88888888-8888-8888-8888-888888888888': { display_name: 'DiamondHands', avatar_url: 'emoji:💎', bio: 'HODL gang. Long-term crypto investor.', current_streak: 12, total_predictions: 24, total_hits: 21, streak_type: 'hit' },
  '99999999-9999-9999-9999-999999999999': { display_name: 'OptionsWizard', avatar_url: 'emoji:🎰', bio: 'Options strategies. Theta gang member.', current_streak: 3, total_predictions: 145, total_hits: 89, streak_type: 'hit' },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': { display_name: 'AlgoTrader', avatar_url: 'emoji:🧠', bio: 'Quantitative trading. Python & ML.', current_streak: 8, total_predictions: 456, total_hits: 298, streak_type: 'hit' },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': { display_name: 'MemeStockMaven', avatar_url: 'emoji:🚀', bio: 'Riding the meme wave 🚀', current_streak: 1, total_predictions: 78, total_hits: 42, streak_type: 'miss' },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': { display_name: 'OilBaron', avatar_url: 'emoji:🛢️', bio: 'Energy sector specialist.', current_streak: 2, total_predictions: 56, total_hits: 38, streak_type: 'hit' },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': { display_name: 'AsianSession', avatar_url: 'emoji:🌙', bio: 'Trading Tokyo & Sydney sessions.', current_streak: 5, total_predictions: 134, total_hits: 89, streak_type: 'hit' },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': { display_name: 'ValueHunter', avatar_url: 'emoji:🦅', bio: 'Buffett disciple. Deep value investing.', current_streak: 9, total_predictions: 34, total_hits: 28, streak_type: 'hit' },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': { display_name: 'CryptoWhale', avatar_url: 'emoji:🐋', bio: 'Alt season hunter. Finding the next 100x.', current_streak: 4, total_predictions: 89, total_hits: 52, streak_type: 'hit' },
};

const getFakeOrRealProfile = (userId: string, realProfile: any) => {
  if (realProfile) return realProfile;
  return FAKE_PROFILES[userId] || null;
};

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

      // Check which users have connected exchanges (verified)
      const { data: exchangeConnections } = await supabase
        .from("exchange_connections")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "connected");

      const verifiedUserIds = new Set((exchangeConnections || []).map(ec => ec.user_id));

      // Map profiles by user_id with verification status
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, { ...p, is_verified: verifiedUserIds.has(p.user_id) }])
      );

      // Combine predictions with profiles (use fake profiles as fallback)
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
        profile: getFakeOrRealProfile(prediction.user_id, profilesMap.get(prediction.user_id)),
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

      // Check which users have connected exchanges (verified)
      const { data: exchangeConnections } = await supabase
        .from("exchange_connections")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "connected");

      const verifiedUserIds = new Set((exchangeConnections || []).map(ec => ec.user_id));

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, { ...p, is_verified: verifiedUserIds.has(p.user_id) }])
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
        profile: getFakeOrRealProfile(prediction.user_id, profilesMap.get(prediction.user_id)),
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
