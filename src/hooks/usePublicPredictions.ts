import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicPredictionData } from "@/components/predictions/PublicPredictionCard";

// Fake demo profiles for testing/demo purposes
const FAKE_PROFILES: Record<string, { display_name: string; avatar_url: string; bio: string; current_streak: number; total_predictions: number; total_hits: number; streak_type: string; is_verified: boolean }> = {
  '11111111-1111-1111-1111-111111111111': { display_name: 'CryptoKing', avatar_url: 'emoji:👑', bio: 'Full-time crypto trader. BTC maximalist.', current_streak: 7, total_predictions: 156, total_hits: 112, streak_type: 'hit', is_verified: true },
  '22222222-2222-2222-2222-222222222222': { display_name: 'ForexMaster', avatar_url: 'emoji:🧙‍♂️', bio: 'Forex scalper | 5+ years experience', current_streak: 3, total_predictions: 89, total_hits: 58, streak_type: 'hit', is_verified: true },
  '33333333-3333-3333-3333-333333333333': { display_name: 'StockWhisperer', avatar_url: 'emoji:🦊', bio: 'Value investor turned swing trader', current_streak: 2, total_predictions: 234, total_hits: 145, streak_type: 'miss', is_verified: false },
  '44444444-4444-4444-4444-444444444444': { display_name: 'TechTrader', avatar_url: 'emoji:🤖', bio: 'Tech stocks enthusiast. NASDAQ focused.', current_streak: 5, total_predictions: 67, total_hits: 41, streak_type: 'hit', is_verified: true },
  '55555555-5555-5555-5555-555555555555': { display_name: 'GoldBull', avatar_url: 'emoji:🦁', bio: 'Commodities specialist. Gold & Silver.', current_streak: 1, total_predictions: 42, total_hits: 28, streak_type: 'miss', is_verified: false },
  '66666666-6666-6666-6666-666666666666': { display_name: 'SwingKing', avatar_url: 'emoji:⚡', bio: 'Index ETF swing trader. SPY/QQQ specialist.', current_streak: 4, total_predictions: 98, total_hits: 67, streak_type: 'hit', is_verified: true },
  '77777777-7777-7777-7777-777777777777': { display_name: 'ScalpMaster', avatar_url: 'emoji:🥷', bio: 'Scalping forex pairs since 2018.', current_streak: 6, total_predictions: 312, total_hits: 198, streak_type: 'hit', is_verified: true },
  '88888888-8888-8888-8888-888888888888': { display_name: 'DiamondHands', avatar_url: 'emoji:💎', bio: 'HODL gang. Long-term crypto investor.', current_streak: 12, total_predictions: 24, total_hits: 21, streak_type: 'hit', is_verified: true },
  '99999999-9999-9999-9999-999999999999': { display_name: 'OptionsWizard', avatar_url: 'emoji:🎰', bio: 'Options strategies. Theta gang member.', current_streak: 3, total_predictions: 145, total_hits: 89, streak_type: 'hit', is_verified: false },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': { display_name: 'AlgoTrader', avatar_url: 'emoji:🧠', bio: 'Quantitative trading. Python & ML.', current_streak: 8, total_predictions: 456, total_hits: 298, streak_type: 'hit', is_verified: true },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': { display_name: 'MemeStockMaven', avatar_url: 'emoji:🚀', bio: 'Riding the meme wave 🚀', current_streak: 1, total_predictions: 78, total_hits: 42, streak_type: 'miss', is_verified: false },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': { display_name: 'OilBaron', avatar_url: 'emoji:🛢️', bio: 'Energy sector specialist.', current_streak: 2, total_predictions: 56, total_hits: 38, streak_type: 'hit', is_verified: true },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': { display_name: 'AsianSession', avatar_url: 'emoji:🌙', bio: 'Trading Tokyo & Sydney sessions.', current_streak: 5, total_predictions: 134, total_hits: 89, streak_type: 'hit', is_verified: true },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': { display_name: 'ValueHunter', avatar_url: 'emoji:🦅', bio: 'Buffett disciple. Deep value investing.', current_streak: 9, total_predictions: 34, total_hits: 28, streak_type: 'hit', is_verified: false },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': { display_name: 'CryptoWhale', avatar_url: 'emoji:🐋', bio: 'Alt season hunter. Finding the next 100x.', current_streak: 4, total_predictions: 89, total_hits: 52, streak_type: 'hit', is_verified: true },
};

// Generate realistic fake trades with explanations
const generateFakePredictions = (): PublicPredictionData[] => {
  const now = new Date();
  const fakeTrades: PublicPredictionData[] = [
    {
      id: 'fake-1',
      user_id: '11111111-1111-1111-1111-111111111111',
      asset: 'BTC/USD',
      asset_type: 'crypto',
      direction: 'long',
      current_price: 94250,
      target_price: 97850,
      status: 'hit',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      explanation: 'Strong support at 94k with bullish divergence on 4H RSI. Institutional buying pressure evident from CME futures premium. Targeting 98k resistance.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['11111111-1111-1111-1111-111111111111'],
    },
    {
      id: 'fake-2',
      user_id: '22222222-2222-2222-2222-222222222222',
      asset: 'EUR/USD',
      asset_type: 'forex',
      direction: 'short',
      current_price: 1.0892,
      target_price: 1.0845,
      status: 'hit',
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      explanation: 'ECB dovish comments and strong US jobs data. Breaking below 1.09 with momentum. Target: previous support at 1.0845.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['22222222-2222-2222-2222-222222222222'],
    },
    {
      id: 'fake-3',
      user_id: '44444444-4444-4444-4444-444444444444',
      asset: 'NVDA',
      asset_type: 'stock',
      direction: 'long',
      current_price: 138.50,
      target_price: 145.20,
      status: 'hit',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      explanation: 'AI chip demand continues to surge. Earnings beat expectations. Cup and handle pattern completed on daily chart.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['44444444-4444-4444-4444-444444444444'],
    },
    {
      id: 'fake-4',
      user_id: '66666666-6666-6666-6666-666666666666',
      asset: 'SPY',
      asset_type: 'stock',
      direction: 'long',
      current_price: 598.20,
      target_price: 605.50,
      status: 'hit',
      created_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      explanation: 'Santa rally momentum. Seasonality favors longs. Holding above 20 EMA with increasing volume.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['66666666-6666-6666-6666-666666666666'],
    },
    {
      id: 'fake-5',
      user_id: '88888888-8888-8888-8888-888888888888',
      asset: 'ETH/USD',
      asset_type: 'crypto',
      direction: 'long',
      current_price: 3380,
      target_price: 3650,
      status: 'hit',
      created_at: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      explanation: 'ETH/BTC ratio bottoming. DeFi TVL increasing. Network upgrades bullish catalyst. Diamond hands pay off.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['88888888-8888-8888-8888-888888888888'],
    },
    {
      id: 'fake-6',
      user_id: '77777777-7777-7777-7777-777777777777',
      asset: 'GBP/JPY',
      asset_type: 'forex',
      direction: 'long',
      current_price: 196.85,
      target_price: 197.45,
      status: 'hit',
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      explanation: 'Quick scalp on Asian session breakout. BoJ keeping rates low while UK data stronger than expected.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['77777777-7777-7777-7777-777777777777'],
    },
    {
      id: 'fake-7',
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      asset: 'AAPL',
      asset_type: 'stock',
      direction: 'short',
      current_price: 258.30,
      target_price: 252.10,
      status: 'missed',
      created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      explanation: 'Algo flagged overbought conditions. iPhone sales concerns. Stop hit at 260.50 - market stronger than expected.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
    },
    {
      id: 'fake-8',
      user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      asset: 'XOM',
      asset_type: 'stock',
      direction: 'long',
      current_price: 107.80,
      target_price: 112.50,
      status: 'hit',
      created_at: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      explanation: 'Oil prices stabilizing above $70. Winter demand kicking in. Dividend yield attractive for institutions.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['cccccccc-cccc-cccc-cccc-cccccccccccc'],
    },
    {
      id: 'fake-9',
      user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      asset: 'SOL/USD',
      asset_type: 'crypto',
      direction: 'long',
      current_price: 185.40,
      target_price: 210.00,
      status: 'hit',
      created_at: new Date(now.getTime() - 120 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      explanation: 'Solana ecosystem exploding. NFT volume up 300%. Meme coin season on SOL chain. This is the way.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['ffffffff-ffff-ffff-ffff-ffffffffffff'],
    },
    {
      id: 'fake-10',
      user_id: '33333333-3333-3333-3333-333333333333',
      asset: 'MSFT',
      asset_type: 'stock',
      direction: 'long',
      current_price: 428.50,
      target_price: 445.00,
      status: 'missed',
      created_at: new Date(now.getTime() - 168 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      explanation: 'Azure cloud growth thesis. Entry at support but stopped out on broader tech selloff. Will re-enter lower.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['33333333-3333-3333-3333-333333333333'],
    },
    {
      id: 'fake-11',
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      asset: 'USD/JPY',
      asset_type: 'forex',
      direction: 'long',
      current_price: 157.20,
      target_price: 158.50,
      status: 'hit',
      created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      explanation: 'Tokyo session open breakout. BoJ intervention risk low at these levels. Clean move to 158.50.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['dddddddd-dddd-dddd-dddd-dddddddddddd'],
    },
    {
      id: 'fake-12',
      user_id: '55555555-5555-5555-5555-555555555555',
      asset: 'GC (Gold)',
      asset_type: 'commodity',
      direction: 'long',
      current_price: 2635,
      target_price: 2700,
      status: 'missed',
      created_at: new Date(now.getTime() - 200 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      explanation: 'Safe haven demand thesis. Strong dollar headwind proved too much. Stopped out at 2610.',
      explanation_public: true,
      data_source: 'trade_sync',
      profile: FAKE_PROFILES['55555555-5555-5555-5555-555555555555'],
    },
  ];

  return fakeTrades;
};

const getFakeOrRealProfile = (userId: string, realProfile: any) => {
  if (realProfile) return realProfile;
  return FAKE_PROFILES[userId] || null;
};

// Check if a user ID is a fake trader
export const isFakeTrader = (userId: string): boolean => {
  return userId in FAKE_PROFILES;
};

// Get all fake trader IDs
export const getFakeTraderIds = (): string[] => {
  return Object.keys(FAKE_PROFILES);
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

      let enrichedPredictions: PublicPredictionData[] = [];

      if (predictionsData && predictionsData.length > 0) {
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
          profile: getFakeOrRealProfile(prediction.user_id, profilesMap.get(prediction.user_id)),
        }));
      }

      // Add fake predictions if we don't have enough real ones
      const fakePredictions = generateFakePredictions();
      const allPredictions = [...enrichedPredictions, ...fakePredictions];
      
      // Sort by resolved_at and limit
      allPredictions.sort((a, b) => {
        const dateA = new Date(a.resolved_at || a.created_at).getTime();
        const dateB = new Date(b.resolved_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setPredictions(allPredictions.slice(0, limit));
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch predictions");
      // On error, still show fake predictions
      setPredictions(generateFakePredictions().slice(0, limit));
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
