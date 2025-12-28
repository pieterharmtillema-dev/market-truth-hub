-- Add trader_category column to trader_profiles table
-- This column categorizes traders based on their trading style and preferences

-- Step 1: Add the trader_category column
ALTER TABLE trader_profiles
ADD COLUMN trader_category text;

-- Step 2: Add CHECK constraint to ensure valid category values
ALTER TABLE trader_profiles
ADD CONSTRAINT trader_category_check
CHECK (trader_category IN ('scalper', 'day_trader', 'swing_trader', 'long_term_trader'));

-- Step 3: Create index for performance
CREATE INDEX idx_trader_profiles_category ON trader_profiles(trader_category);

-- Step 4: Add comment to document the column
COMMENT ON COLUMN trader_profiles.trader_category IS 'Automatically derived trader category based on holding_time and trade_frequency. One of: scalper, day_trader, swing_trader, long_term_trader';

-- Step 5: Create function to derive trader category
CREATE OR REPLACE FUNCTION derive_trader_category(
  p_holding_time text,
  p_trade_frequency text,
  p_risk_per_trade text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Primary categorization based on holding_time
  IF p_holding_time = 'scalper' THEN
    RETURN 'scalper';
  ELSIF p_holding_time = 'day_trader' THEN
    RETURN 'day_trader';
  ELSIF p_holding_time = 'position_trader' OR p_trade_frequency = 'very_low' THEN
    RETURN 'long_term_trader';
  ELSE
    -- Default to swing_trader for swing_trader holding_time or other cases
    RETURN 'swing_trader';
  END IF;
END;
$$;

-- Step 6: Add comment to document the function
COMMENT ON FUNCTION derive_trader_category(text, text, text) IS 'Derives a trader category (scalper, day_trader, swing_trader, long_term_trader) based on questionnaire responses. Primarily uses holding_time with trade_frequency as secondary factor.';

-- Step 7: Backfill existing users' categories
UPDATE trader_profiles
SET trader_category = derive_trader_category(holding_time, trade_frequency, risk_per_trade)
WHERE onboarding_completed = true
  AND holding_time IS NOT NULL
  AND trader_category IS NULL;
