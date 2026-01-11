import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const CONFIG = {
  MIN_SAMPLE_SIZE: 5,           // Minimum resolved predictions required
  ACCURACY_MIN: 0.40,            // Minimum accuracy cap (40%)
  ACCURACY_MAX: 0.70,            // Maximum accuracy cap (70%)
  TIME_DECAY_RECENT_DAYS: 90,   // Last 90 days: weight 1.0
  TIME_DECAY_MID_DAYS: 180,     // 90-180 days: weight 0.7
  TIME_DECAY_OLD_WEIGHT: 0.4,   // >180 days: weight 0.4
  TIME_DECAY_MID_WEIGHT: 0.7,
  TIME_DECAY_RECENT_WEIGHT: 1.0,
};

interface Prediction {
  id: string;
  user_id: string;
  status: 'hit' | 'missed' | 'active' | 'expired';
  resolved_at: string | null;
  data_source: string;
}

/**
 * Calculate time decay weight based on how old the prediction is
 * - Last 90 days: 1.0 (full weight)
 * - 90-180 days: 0.7
 * - >180 days: 0.4
 */
function getTimeDecayWeight(resolvedAt: string): number {
  const now = new Date();
  const resolvedDate = new Date(resolvedAt);
  const daysDiff = (now.getTime() - resolvedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= CONFIG.TIME_DECAY_RECENT_DAYS) {
    return CONFIG.TIME_DECAY_RECENT_WEIGHT;
  } else if (daysDiff <= CONFIG.TIME_DECAY_MID_DAYS) {
    return CONFIG.TIME_DECAY_MID_WEIGHT;
  } else {
    return CONFIG.TIME_DECAY_OLD_WEIGHT;
  }
}

/**
 * Calculate prediction accuracy for a user
 *
 * Formula with time decay:
 * accuracy = sum(correct_i × weight_i) / sum((correct_i + incorrect_i) × weight_i)
 *
 * Rules:
 * 1. Only count resolved predictions (status='hit' or 'missed')
 * 2. Only count long-term predictions (data_source='user')
 * 3. Exclude active, expired, or unresolved predictions
 * 4. Apply time decay to give more weight to recent predictions
 * 5. Clamp final accuracy between 40% and 70% to prevent extremes
 * 6. Return null if < 5 resolved predictions (insufficient data)
 *
 * Why caps exist:
 * - MIN (40%): Prevents early bad luck from dominating future weighting
 * - MAX (70%): Prevents early lucky streaks from creating unrealistic expectations
 * - Both caps ensure the metric remains stable and fair over time
 */
export function calculatePredictionAccuracy(predictions: Prediction[]): {
  accuracy: number | null;
  correct: number;
  incorrect: number;
  totalResolved: number;
  hasSufficientData: boolean;
  rawAccuracy: number | null; // Before clamping
} {
  // Filter to only resolved long-term predictions
  const resolvedPredictions = predictions.filter(
    p => p.data_source === 'user' &&
         (p.status === 'hit' || p.status === 'missed') &&
         p.resolved_at !== null
  );

  const totalResolved = resolvedPredictions.length;

  // Check minimum sample size
  if (totalResolved < CONFIG.MIN_SAMPLE_SIZE) {
    const correctCount = resolvedPredictions.filter(p => p.status === 'hit').length;
    const incorrectCount = resolvedPredictions.filter(p => p.status === 'missed').length;

    return {
      accuracy: null,
      correct: correctCount,
      incorrect: incorrectCount,
      totalResolved,
      hasSufficientData: false,
      rawAccuracy: null,
    };
  }

  // Calculate weighted accuracy
  let weightedCorrect = 0;
  let weightedTotal = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  for (const prediction of resolvedPredictions) {
    const weight = getTimeDecayWeight(prediction.resolved_at!);
    const isCorrect = prediction.status === 'hit';

    if (isCorrect) {
      weightedCorrect += weight;
      correctCount++;
    } else {
      incorrectCount++;
    }

    weightedTotal += weight;
  }

  // Avoid division by zero (should never happen if we have predictions, but safety check)
  if (weightedTotal === 0) {
    return {
      accuracy: null,
      correct: correctCount,
      incorrect: incorrectCount,
      totalResolved,
      hasSufficientData: false,
      rawAccuracy: null,
    };
  }

  // Calculate raw accuracy
  const rawAccuracy = weightedCorrect / weightedTotal;

  // Apply caps to prevent extremes
  // This ensures early lucky streaks or bad starts don't dominate
  const clampedAccuracy = Math.max(
    CONFIG.ACCURACY_MIN,
    Math.min(CONFIG.ACCURACY_MAX, rawAccuracy)
  );

  return {
    accuracy: clampedAccuracy,
    correct: correctCount,
    incorrect: incorrectCount,
    totalResolved,
    hasSufficientData: true,
    rawAccuracy,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating prediction accuracy for user ${user.id}`);

    // Fetch all long-term predictions for this user
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('id, user_id, status, resolved_at, data_source')
      .eq('user_id', user.id)
      .eq('data_source', 'user'); // Only long-term predictions

    if (predError) {
      console.error('Error fetching predictions:', predError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch predictions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!predictions || predictions.length === 0) {
      console.log('No long-term predictions found');

      // Update profile with zero stats
      await supabase
        .from('profiles')
        .update({
          prediction_accuracy: null,
          prediction_accuracy_correct: 0,
          prediction_accuracy_incorrect: 0,
          prediction_accuracy_total: 0,
          prediction_accuracy_last_calculated: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          predictionAccuracy: {
            value: null,
            correct: 0,
            incorrect: 0,
            totalResolved: 0,
            hasSufficientData: false,
          },
          predictions_processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${predictions.length} long-term predictions`);

    // Calculate accuracy
    const result = calculatePredictionAccuracy(predictions as Prediction[]);

    console.log(`Prediction accuracy calculated:
      - Total predictions: ${predictions.length}
      - Resolved: ${result.totalResolved}
      - Correct: ${result.correct}
      - Incorrect: ${result.incorrect}
      - Raw accuracy: ${result.rawAccuracy ? (result.rawAccuracy * 100).toFixed(1) + '%' : 'N/A'}
      - Clamped accuracy: ${result.accuracy ? (result.accuracy * 100).toFixed(1) + '%' : 'N/A'}
      - Sufficient data: ${result.hasSufficientData}`);

    // Update profile with calculated metrics
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        prediction_accuracy: result.accuracy,
        prediction_accuracy_correct: result.correct,
        prediction_accuracy_incorrect: result.incorrect,
        prediction_accuracy_total: result.totalResolved,
        prediction_accuracy_last_calculated: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        predictionAccuracy: {
          value: result.accuracy,
          correct: result.correct,
          incorrect: result.incorrect,
          totalResolved: result.totalResolved,
          hasSufficientData: result.hasSufficientData,
        },
        predictions_processed: predictions.length,
        config: CONFIG, // Return config for transparency
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in calculate-prediction-accuracy:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
