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
 * - Time decay (recent predictions weighted more)
 * - Clamped between 40%-70% to prevent extremes
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

      // Fetch from public_profiles view (includes accuracy data)
      const { data: profileData, error: profileError } = await supabase
        .from("public_profiles")
        .select("prediction_accuracy, prediction_accuracy_correct, prediction_accuracy_incorrect, prediction_accuracy_total, prediction_accuracy_last_calculated")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching prediction accuracy:", profileError);
        setError(profileError.message);
        setData(null);
        return;
      }

      if (!profileData) {
        setData(null);
        return;
      }

      const accuracyData: PredictionAccuracyData = {
        value: profileData.prediction_accuracy,
        correct: profileData.prediction_accuracy_correct || 0,
        incorrect: profileData.prediction_accuracy_incorrect || 0,
        totalResolved: profileData.prediction_accuracy_total || 0,
        hasSufficientData: (profileData.prediction_accuracy_total || 0) >= 5,
        lastCalculated: profileData.prediction_accuracy_last_calculated,
      };

      setData(accuracyData);
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
   * Calls the Edge Function to recalculate and store accuracy
   */
  const recalculate = async () => {
    try {
      setCalculating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/calculate-prediction-accuracy`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate accuracy");
      }

      const result = await response.json();
      console.log("Prediction accuracy recalculated:", result);

      // Refresh data after calculation
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
