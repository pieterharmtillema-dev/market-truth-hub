import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TraderCategory } from "@/components/profile/CategoryBadge";

export interface CategoryStats {
  category: TraderCategory;
  userCount: number;
  avgWinRate: number | null;
  avgAccuracyScore: number | null;
  userPercentile: number | null;
  userRank: number | null;
}

export function useCategoryStats(userId: string | null | undefined) {
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryStats = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch user's trader_category
      const { data: userProfile, error: profileError } = await supabase
        .from("trader_profiles")
        .select("trader_category")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!userProfile?.trader_category) {
        // User doesn't have a category yet
        setStats(null);
        setLoading(false);
        return;
      }

      const category = userProfile.trader_category as TraderCategory;

      // Step 2: Get all users in the same category who have completed onboarding
      const { data: categoryProfiles, error: categoryError } = await supabase
        .from("trader_profiles")
        .select("user_id")
        .eq("trader_category", category)
        .eq("onboarding_completed", true);

      if (categoryError) {
        throw categoryError;
      }

      const categoryUserIds = categoryProfiles?.map((p) => p.user_id) || [];

      if (categoryUserIds.length === 0) {
        setStats({
          category,
          userCount: 0,
          avgWinRate: null,
          avgAccuracyScore: null,
          userPercentile: null,
          userRank: null,
        });
        setLoading(false);
        return;
      }

      // Step 3: Fetch user_trading_metrics for those users (filter to 30+ trades)
      const { data: metricsData, error: metricsError } = await supabase
        .from("user_trading_metrics")
        .select("user_id, win_rate, accuracy_score, total_verified_trades")
        .in("user_id", categoryUserIds)
        .gte("total_verified_trades", 30);

      if (metricsError) {
        throw metricsError;
      }

      if (!metricsData || metricsData.length === 0) {
        setStats({
          category,
          userCount: 0,
          avgWinRate: null,
          avgAccuracyScore: null,
          userPercentile: null,
          userRank: null,
        });
        setLoading(false);
        return;
      }

      // Step 4: Calculate averages
      const validWinRates = metricsData
        .filter((m) => m.win_rate !== null)
        .map((m) => m.win_rate as number);
      const validAccuracyScores = metricsData
        .filter((m) => m.accuracy_score !== null)
        .map((m) => m.accuracy_score as number);

      const avgWinRate =
        validWinRates.length > 0
          ? validWinRates.reduce((a, b) => a + b, 0) / validWinRates.length
          : null;

      const avgAccuracyScore =
        validAccuracyScores.length > 0
          ? validAccuracyScores.reduce((a, b) => a + b, 0) /
            validAccuracyScores.length
          : null;

      // Step 5: Calculate user's percentile and rank based on accuracy_score
      const userMetrics = metricsData.find((m) => m.user_id === userId);
      let userPercentile: number | null = null;
      let userRank: number | null = null;

      if (userMetrics?.accuracy_score !== null && userMetrics?.accuracy_score !== undefined) {
        // Sort by accuracy_score descending (higher is better)
        const sortedMetrics = [...metricsData]
          .filter((m) => m.accuracy_score !== null)
          .sort((a, b) => (b.accuracy_score || 0) - (a.accuracy_score || 0));

        userRank =
          sortedMetrics.findIndex((m) => m.user_id === userId) + 1;

        // Percentile: percentage of users this user performs better than
        const usersBelowCount = sortedMetrics.length - userRank;
        userPercentile = Math.round(
          (usersBelowCount / (sortedMetrics.length - 1)) * 100
        );
      }

      setStats({
        category,
        userCount: metricsData.length,
        avgWinRate,
        avgAccuracyScore,
        userPercentile,
        userRank,
      });
    } catch (err) {
      console.error("Error fetching category stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch category stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCategoryStats();
  }, [fetchCategoryStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchCategoryStats,
  };
}
