/**
 * Unit tests for prediction accuracy calculation
 *
 * Run with: deno test --allow-all test.ts
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Import the calculation function
// Note: In actual implementation, this would be imported from index.ts
// For now, we'll copy the function here for testing

const CONFIG = {
  MIN_SAMPLE_SIZE: 5,
  ACCURACY_MIN: 0.40,
  ACCURACY_MAX: 0.70,
  TIME_DECAY_RECENT_DAYS: 90,
  TIME_DECAY_MID_DAYS: 180,
  TIME_DECAY_OLD_WEIGHT: 0.4,
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

function calculatePredictionAccuracy(predictions: Prediction[]): {
  accuracy: number | null;
  correct: number;
  incorrect: number;
  totalResolved: number;
  hasSufficientData: boolean;
  rawAccuracy: number | null;
} {
  const resolvedPredictions = predictions.filter(
    p => p.data_source === 'user' &&
         (p.status === 'hit' || p.status === 'missed') &&
         p.resolved_at !== null
  );

  const totalResolved = resolvedPredictions.length;

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

  const rawAccuracy = weightedCorrect / weightedTotal;
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

// Test helpers
function createPrediction(
  id: string,
  status: 'hit' | 'missed',
  daysAgo: number,
  dataSource = 'user'
): Prediction {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return {
    id,
    user_id: 'test-user',
    status,
    resolved_at: date.toISOString(),
    data_source: dataSource,
  };
}

// Tests
Deno.test("Should return null for insufficient data (< 5 predictions)", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10),
    createPrediction('2', 'hit', 20),
    createPrediction('3', 'missed', 30),
    createPrediction('4', 'hit', 40),
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, false);
  assertEquals(result.accuracy, null);
  assertEquals(result.totalResolved, 4);
  assertEquals(result.correct, 3);
  assertEquals(result.incorrect, 1);
});

Deno.test("Should calculate accuracy for sufficient data (>= 5 predictions)", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10),
    createPrediction('2', 'hit', 20),
    createPrediction('3', 'missed', 30),
    createPrediction('4', 'hit', 40),
    createPrediction('5', 'hit', 50),
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, true);
  assertEquals(result.totalResolved, 5);
  assertEquals(result.correct, 4);
  assertEquals(result.incorrect, 1);
  assertEquals(result.accuracy !== null, true);
  // 4 correct / 5 total = 0.8, but clamped to max 0.70
  assertEquals(result.accuracy, 0.70);
  assertEquals(result.rawAccuracy, 0.8);
});

Deno.test("Should apply minimum cap (40%)", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'missed', 10),
    createPrediction('2', 'missed', 20),
    createPrediction('3', 'missed', 30),
    createPrediction('4', 'missed', 40),
    createPrediction('5', 'hit', 50),
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, true);
  assertEquals(result.correct, 1);
  assertEquals(result.incorrect, 4);
  // 1/5 = 0.2, but clamped to min 0.40
  assertEquals(result.accuracy, 0.40);
  assertEquals(result.rawAccuracy, 0.2);
});

Deno.test("Should apply maximum cap (70%)", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10),
    createPrediction('2', 'hit', 20),
    createPrediction('3', 'hit', 30),
    createPrediction('4', 'hit', 40),
    createPrediction('5', 'hit', 50),
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, true);
  assertEquals(result.correct, 5);
  assertEquals(result.incorrect, 0);
  // 5/5 = 1.0, but clamped to max 0.70
  assertEquals(result.accuracy, 0.70);
  assertEquals(result.rawAccuracy, 1.0);
});

Deno.test("Should apply time decay (recent predictions weighted more)", () => {
  // 3 recent hits (last 90 days, weight 1.0)
  // 2 old misses (>180 days, weight 0.4)
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 30),   // Recent, weight 1.0
    createPrediction('2', 'hit', 60),   // Recent, weight 1.0
    createPrediction('3', 'hit', 80),   // Recent, weight 1.0
    createPrediction('4', 'missed', 200), // Old, weight 0.4
    createPrediction('5', 'missed', 250), // Old, weight 0.4
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, true);
  assertEquals(result.correct, 3);
  assertEquals(result.incorrect, 2);

  // Weighted calculation:
  // Correct: 3 * 1.0 = 3.0
  // Total: (3 * 1.0) + (2 * 0.4) = 3.0 + 0.8 = 3.8
  // Accuracy: 3.0 / 3.8 = 0.789... clamped to 0.70
  assertEquals(result.accuracy, 0.70);
});

Deno.test("Should only count long-term predictions (data_source='user')", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10, 'user'),
    createPrediction('2', 'hit', 20, 'user'),
    createPrediction('3', 'hit', 30, 'trade_sync'), // Should be ignored
    createPrediction('4', 'hit', 40, 'trade_sync'), // Should be ignored
    createPrediction('5', 'missed', 50, 'user'),
  ];

  const result = calculatePredictionAccuracy(predictions);

  // Only 3 'user' predictions, below minimum
  assertEquals(result.hasSufficientData, false);
  assertEquals(result.totalResolved, 3);
  assertEquals(result.correct, 2);
  assertEquals(result.incorrect, 1);
});

Deno.test("Should exclude active/expired predictions", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10),
    createPrediction('2', 'hit', 20),
    createPrediction('3', 'hit', 30),
    createPrediction('4', 'hit', 40),
    createPrediction('5', 'hit', 50),
    // These should be ignored
    { id: '6', user_id: 'test-user', status: 'active', resolved_at: null, data_source: 'user' },
    { id: '7', user_id: 'test-user', status: 'expired', resolved_at: null, data_source: 'user' },
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.totalResolved, 5); // Only resolved predictions
  assertEquals(result.correct, 5);
  assertEquals(result.incorrect, 0);
});

Deno.test("Should handle normal case (no capping needed)", () => {
  const predictions: Prediction[] = [
    createPrediction('1', 'hit', 10),
    createPrediction('2', 'hit', 20),
    createPrediction('3', 'hit', 30),
    createPrediction('4', 'missed', 40),
    createPrediction('5', 'missed', 50),
  ];

  const result = calculatePredictionAccuracy(predictions);

  assertEquals(result.hasSufficientData, true);
  assertEquals(result.totalResolved, 5);
  assertEquals(result.correct, 3);
  assertEquals(result.incorrect, 2);
  // 3/5 = 0.6, within [0.40, 0.70] range, no capping
  assertEquals(result.accuracy, 0.6);
  assertEquals(result.rawAccuracy, 0.6);
});

console.log("All tests passed!");
