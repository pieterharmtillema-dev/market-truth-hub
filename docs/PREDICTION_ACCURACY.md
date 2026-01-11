# Prediction Accuracy System

## Overview

The Prediction Accuracy system calculates a historical accuracy score for users based on their **long-term predictions** (not trade-based predictions). This is separate from the TRAX score system, which measures trading performance.

**Important:** This is a historical metric only and should NOT be presented as financial advice or a performance guarantee.

## Key Concepts

### What is Prediction Accuracy?

Prediction Accuracy reflects the percentage of resolved predictions that were correct, with adjustments for:
- **Time decay** - Recent predictions are weighted more heavily
- **Stability caps** - Prevents early lucky streaks or bad starts from dominating
- **Minimum sample size** - Requires at least 5 resolved predictions

### Formula

```
Base Formula:
accuracy = correct_predictions / total_resolved_predictions

With Time Decay:
accuracy = sum(correct_i × weight_i) / sum(total_i × weight_i)

Final Accuracy:
clamped_accuracy = clamp(accuracy, 0.40, 0.70)
```

## Rules & Safeguards

### 1. What Counts as a Resolved Prediction

Only predictions with a finalized outcome are included:
- ✅ Status = `hit` (prediction was correct)
- ✅ Status = `missed` (prediction was incorrect)
- ❌ Status = `active` (still pending)
- ❌ Status = `expired` (expired without resolution)
- ✅ Data source = `user` (long-term predictions only)
- ❌ Data source = `trade_sync` (excluded - these are for TRAX)

### 2. Minimum Sample Size

**Requirement:** At least 5 resolved predictions

If `totalResolved < 5`:
- `accuracy = null`
- `hasSufficientData = false`
- Stats are stored but accuracy is not displayed or used for weighting

### 3. Caps & Stability

**Why caps exist:**
- **MIN (40%):** Prevents early bad luck from dominating future weighting
- **MAX (70%):** Prevents early lucky streaks from creating unrealistic expectations
- Both caps ensure the metric remains stable and fair over time

**Clamping:**
```typescript
const clampedAccuracy = Math.max(0.40, Math.min(0.70, rawAccuracy));
```

### 4. Time Decay

Recent predictions are weighted more than older ones:

| Age | Weight | Rationale |
|-----|--------|-----------|
| Last 90 days | 1.0 | Full weight - most relevant |
| 90-180 days | 0.7 | Medium weight - still recent |
| > 180 days | 0.4 | Low weight - historical context |

This ensures accuracy reflects current skill level rather than outdated performance.

## Database Schema

### Profiles Table (New Fields)

```sql
ALTER TABLE public.profiles
ADD COLUMN prediction_accuracy numeric(4,2) CHECK (prediction_accuracy >= 0 AND prediction_accuracy <= 1),
ADD COLUMN prediction_accuracy_correct integer DEFAULT 0,
ADD COLUMN prediction_accuracy_incorrect integer DEFAULT 0,
ADD COLUMN prediction_accuracy_total integer DEFAULT 0,
ADD COLUMN prediction_accuracy_last_calculated timestamptz;
```

### Public Profiles View

The `public_profiles` view is updated to include prediction accuracy fields:

```sql
SELECT
  p.user_id,
  p.display_name,
  -- ... other fields ...
  p.prediction_accuracy,
  p.prediction_accuracy_correct,
  p.prediction_accuracy_incorrect,
  p.prediction_accuracy_total,
  p.prediction_accuracy_last_calculated
FROM profiles p
-- ... joins ...
```

## API

### Edge Function: `calculate-prediction-accuracy`

**Endpoint:** `/functions/v1/calculate-prediction-accuracy`

**Method:** `POST`

**Authentication:** Required (Bearer token)

**Request:**
```json
// No body required - calculates for authenticated user
```

**Response (Sufficient Data):**
```json
{
  "predictionAccuracy": {
    "value": 0.62,
    "correct": 31,
    "incorrect": 19,
    "totalResolved": 50,
    "hasSufficientData": true
  },
  "predictions_processed": 50,
  "config": {
    "MIN_SAMPLE_SIZE": 5,
    "ACCURACY_MIN": 0.40,
    "ACCURACY_MAX": 0.70,
    "TIME_DECAY_RECENT_DAYS": 90,
    "TIME_DECAY_MID_DAYS": 180,
    "TIME_DECAY_OLD_WEIGHT": 0.4,
    "TIME_DECAY_MID_WEIGHT": 0.7,
    "TIME_DECAY_RECENT_WEIGHT": 1.0
  }
}
```

**Response (Insufficient Data):**
```json
{
  "predictionAccuracy": {
    "value": null,
    "correct": 3,
    "incorrect": 1,
    "totalResolved": 4,
    "hasSufficientData": false
  },
  "predictions_processed": 4
}
```

## React Hook

### `usePredictionAccuracy(userId?)`

```typescript
import { usePredictionAccuracy } from "@/hooks/usePredictionAccuracy";

function ProfileComponent({ userId }) {
  const { data, loading, calculating, recalculate } = usePredictionAccuracy(userId);

  if (loading) return <div>Loading...</div>;

  if (!data?.hasSufficientData) {
    return <div>Need at least 5 resolved predictions</div>;
  }

  return (
    <div>
      <h3>Prediction Accuracy</h3>
      <p>{formatAccuracy(data.value)}</p>
      <p>{data.correct} correct / {data.totalResolved} total</p>
      <button onClick={recalculate} disabled={calculating}>
        Recalculate
      </button>
    </div>
  );
}
```

### Helper Functions

```typescript
// Format accuracy as percentage
formatAccuracy(0.62) // "62.0%"

// Get color based on accuracy
getAccuracyColor(0.62) // "text-green-500"
getAccuracyColor(0.45) // "text-red-500"
getAccuracyColor(0.55) // "text-yellow-500"
```

## Edge Cases

### Division by Zero
Handled by checking `weightedTotal === 0` before division.

### Corrupted or Missing Outcomes
Only predictions with `resolved_at !== null` and status `hit`/`missed` are included.

### Prediction Invalidation
If a prediction is later invalidated, call `recalculate()` to recompute accuracy.

### Mixed Data Sources
Only `data_source='user'` predictions are counted. Trade-based predictions (`data_source='trade_sync'`) are excluded.

## Performance

### Precomputation
- Accuracy is calculated by the Edge Function
- Stored in the `profiles` table
- Not recalculated on every request
- Can be triggered manually via `recalculate()`

### Optimization
Recommended: Set up a nightly cron job to recalculate accuracy for all users with new resolved predictions.

```sql
-- Example query to find users needing recalculation
SELECT DISTINCT user_id
FROM predictions
WHERE data_source = 'user'
  AND (status = 'hit' OR status = 'missed')
  AND resolved_at > (
    SELECT prediction_accuracy_last_calculated
    FROM profiles
    WHERE profiles.user_id = predictions.user_id
  );
```

## Testing

### Run Unit Tests

```bash
cd supabase/functions/calculate-prediction-accuracy
deno test --allow-all test.ts
```

### Test Cases Covered

1. ✅ Insufficient data (< 5 predictions)
2. ✅ Sufficient data (>= 5 predictions)
3. ✅ Minimum cap enforcement (40%)
4. ✅ Maximum cap enforcement (70%)
5. ✅ Time decay weighting
6. ✅ Data source filtering (user vs trade_sync)
7. ✅ Status filtering (hit/missed vs active/expired)
8. ✅ Normal case (no capping needed)

## Important Disclaimers

### Not Financial Advice
This metric is purely historical and informational. It does NOT:
- Predict future performance
- Guarantee trading success
- Constitute financial advice
- Replace professional analysis

### Limitations
- Based on self-reported predictions
- Subject to selection bias
- Does not account for prediction difficulty
- Capped to prevent extremes (40%-70%)
- Requires minimum sample size (5 predictions)

### Future Use
This metric will be used later for:
- **Accuracy-weighted sentiment** - Weighting user predictions by their historical accuracy
- **Leaderboards** - Ranking users by prediction skill (requires sufficient data)
- **Trust indicators** - Showing users with proven track records

## Comparison: Prediction Accuracy vs TRAX Score

| Feature | Prediction Accuracy | TRAX Score |
|---------|-------------------|------------|
| **Data Source** | Long-term predictions (`data_source='user'`) | Trade-based predictions (`data_source='trade_sync'`) |
| **Basis** | Prediction correctness (hit/miss) | Trade performance (R-multiple, PnL, risk) |
| **Storage** | `profiles.prediction_accuracy` | `user_trading_metrics.accuracy_score` |
| **Minimum** | 5 resolved predictions | 30 verified trades |
| **Range** | 0.40 - 0.70 (40%-70%) | 0 - 100 |
| **Verification** | None | Exchange-verified trades |
| **Purpose** | Sentiment weighting | Trading skill ranking |

## Migration Guide

### Apply Migrations

```bash
# Apply database migrations
supabase migration up

# Or if using remote
supabase db push
```

### Generate Types

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.gen.ts
```

### Deploy Edge Function

```bash
supabase functions deploy calculate-prediction-accuracy
```

## Monitoring

### Check Accuracy Data

```sql
-- Users with calculated accuracy
SELECT
  user_id,
  display_name,
  prediction_accuracy,
  prediction_accuracy_correct,
  prediction_accuracy_incorrect,
  prediction_accuracy_total,
  prediction_accuracy_last_calculated
FROM profiles
WHERE prediction_accuracy IS NOT NULL
ORDER BY prediction_accuracy DESC;
```

### Find Users Needing Calculation

```sql
-- Users with resolved predictions but no accuracy calculated
SELECT
  p.user_id,
  COUNT(*) FILTER (WHERE pr.status = 'hit') AS hits,
  COUNT(*) FILTER (WHERE pr.status = 'missed') AS misses,
  COUNT(*) AS total_resolved
FROM profiles p
JOIN predictions pr ON pr.user_id = p.user_id
WHERE pr.data_source = 'user'
  AND pr.status IN ('hit', 'missed')
  AND p.prediction_accuracy IS NULL
GROUP BY p.user_id
HAVING COUNT(*) >= 5;
```

## Future Enhancements

### Potential Improvements
1. **Category-specific accuracy** - Track accuracy per asset class (stocks, crypto, forex)
2. **Time-horizon accuracy** - Different accuracy for short-term vs long-term predictions
3. **Confidence calibration** - Compare predicted confidence to actual success rate
4. **Prediction difficulty adjustment** - Weight by how hard the prediction was
5. **Streak tracking** - Current winning/losing streak for predictions
6. **Accuracy trends** - Track if accuracy is improving or declining over time

### Weighted Sentiment (Coming Soon)
Use prediction accuracy to weight user sentiment in aggregate market views:

```typescript
weightedSentiment = sum(prediction_i × accuracy_i) / sum(accuracy_i)
```

Only users with `hasSufficientData = true` will contribute to weighted sentiment.

## Support

For issues or questions:
- Check the logs: `supabase functions logs calculate-prediction-accuracy`
- Review test cases: `supabase/functions/calculate-prediction-accuracy/test.ts`
- Consult the source: `supabase/functions/calculate-prediction-accuracy/index.ts`
