import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PredictionAccuracyData {
  value: number | null;
  correct: number;
  incorrect: number;
  totalResolved: number;
  hasSufficientData: boolean;
  lastCalculated: string | null;
}

/**
 * Hook to fetch prediction accuracy stats for a user
 *
 * This fetches the LONG-TERM prediction accuracy (data_source='user'),
 * which is separate from TRAX score (trade-based predictions).
 *
 * Accuracy is calculated based on:
 * - Correct predictions (status='hit')
 * - Incorrect predictions (status='missed')
 * - Requires minimum 5 resolved predictions
 *
 * @param userId - User ID to fetch accuracy for (null for current user)
 * @returns Prediction accuracy data and loading state
 */
export function usePredictionAccuracy(userId?: string | null) {
  const [data, setData] = useState<PredictionAccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccuracy();
  }, [userId]);

  const fetchAccuracy = async () => {
    try {
      setLoading(true);
      setError(null);

      let targetUserId = userId;

      // If no userId provided, get current user
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData(null);
          setLoading(false);
          return;
        }
        targetUserId = user.id;
      }

      // Calculate from predictions table directly
      // Only count user-created long-term predictions (data_source = 'user')
      const { data: predictions, error: predictionsError } = await supabase
        .from("predictions")
        .select("status, resolved_at")
        .eq("user_id", targetUserId)
        .eq("data_source", "user")
        .in("status", ["hit", "missed"]);

      if (predictionsError) {
        console.error("Error fetching predictions:", predictionsError);
        setError(predictionsError.message);
        setData(null);
        return;
      }

      if (!predictions || predictions.length === 0) {
        setData({
          value: null,
          correct: 0,
          incorrect: 0,
          totalResolved: 0,
          hasSufficientData: false,
          lastCalculated: null,
        });
        return;
      }

      const correct = predictions.filter(p => p.status === "hit").length;
      const incorrect = predictions.filter(p => p.status === "missed").length;
      const totalResolved = correct + incorrect;
      const accuracy = totalResolved > 0 ? correct / totalResolved : null;

      // Find last resolved timestamp
      const lastResolved = predictions
        .filter(p => p.resolved_at)
        .sort((a, b) => new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime())[0];

      setData({
        value: accuracy,
        correct,
        incorrect,
        totalResolved,
        hasSufficientData: totalResolved >= 5,
        lastCalculated: lastResolved?.resolved_at || null,
      });
    } catch (err) {
      console.error("Error in usePredictionAccuracy:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trigger recalculation of prediction accuracy
   * Simply refetches from the database
   */
  const recalculate = async () => {
    try {
      setCalculating(true);
      setError(null);
      await fetchAccuracy();
    } catch (err) {
      console.error("Error recalculating prediction accuracy:", err);
      setError(err instanceof Error ? err.message : "Failed to recalculate");
    } finally {
      setCalculating(false);
    }
  };

  return {
    data,
    loading,
    calculating,
    error,
    refetch: fetchAccuracy,
    recalculate,
  };
}

/**
 * Format accuracy as percentage
 */
export function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null) return "N/A";
  return `${(accuracy * 100).toFixed(1)}%`;
}

/**
 * Get accuracy color based on value
 * - Red: < 50%
 * - Yellow: 50-60%
 * - Green: > 60%
 */
export function getAccuracyColor(accuracy: number | null): string {
  if (accuracy === null) return "text-muted-foreground";
  if (accuracy < 0.5) return "text-red-500";
  if (accuracy < 0.6) return "text-yellow-500";
  return "text-green-500";
}
