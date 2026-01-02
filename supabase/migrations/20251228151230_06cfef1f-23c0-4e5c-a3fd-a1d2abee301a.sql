-- Add trader_category to trader_profiles as well (since code expects it there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'trader_profiles'
    AND column_name = 'trader_category'
  ) THEN
    ALTER TABLE public.trader_profiles
    ADD COLUMN trader_category public.trader_category DEFAULT NULL;
  END IF;
END $$;

-- Create the derive_trader_category function
CREATE OR REPLACE FUNCTION public.derive_trader_category(
  p_holding_time text,
  p_trade_frequency text,
  p_risk_per_trade text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  -- Derive category based on holding time and frequency
  IF p_holding_time = 'minutes' AND p_trade_frequency = 'multiple_daily' THEN
    result := 'scalper';
  ELSIF p_holding_time IN ('minutes', 'hours') AND p_trade_frequency IN ('multiple_daily', 'daily') THEN
    result := 'day_trader';
  ELSIF p_holding_time IN ('hours', 'days') AND p_trade_frequency IN ('daily', 'weekly') THEN
    result := 'swing_trader';
  ELSIF p_holding_time IN ('days', 'weeks') THEN
    result := 'position_trader';
  ELSIF p_holding_time IN ('months', 'years') THEN
    result := 'investor';
  ELSE
    -- Default based on just holding time
    CASE p_holding_time
      WHEN 'minutes' THEN result := 'scalper';
      WHEN 'hours' THEN result := 'day_trader';
      WHEN 'days' THEN result := 'swing_trader';
      WHEN 'weeks' THEN result := 'position_trader';
      WHEN 'months' THEN result := 'investor';
      WHEN 'years' THEN result := 'investor';
      ELSE result := 'swing_trader';
    END CASE;
  END IF;
  
  RETURN result;
END;
$$;