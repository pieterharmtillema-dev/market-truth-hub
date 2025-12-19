-- Create trader_profiles table for onboarding questionnaire data
CREATE TABLE public.trader_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  
  -- Trading style dimension
  holding_time text, -- 'scalper' | 'day_trader' | 'swing_trader' | 'position_trader'
  
  -- Risk tolerance dimension
  risk_per_trade text, -- 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive'
  
  -- Trade frequency dimension
  trade_frequency text, -- 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
  
  -- Decision making style dimension
  decision_style text, -- 'systematic' | 'mostly_systematic' | 'balanced' | 'mostly_discretionary' | 'discretionary'
  
  -- Emotional response dimension
  loss_response text, -- 'analytical' | 'pause_reflect' | 'revenge_trade' | 'anxious' | 'unaffected'
  
  -- Experience level dimension
  experience_level text, -- 'beginner' | 'intermediate' | 'advanced' | 'professional'
  
  -- Onboarding state
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_skipped boolean NOT NULL DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trader_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own trader profile"
  ON public.trader_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trader profile"
  ON public.trader_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trader profile"
  ON public.trader_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trader_profiles_updated_at
  BEFORE UPDATE ON public.trader_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trader profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create main profile
  INSERT INTO public.profiles (user_id, display_name, api_key)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'display_name', 
    'md_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
  
  -- Create trader profile for onboarding
  INSERT INTO public.trader_profiles (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;