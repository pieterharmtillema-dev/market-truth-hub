-- =====================================================
-- COMPLETE DATABASE SETUP FOR MARKET TRUTH HUB
-- Run this in your NEW Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    character_config TEXT, -- NEW: For character customization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for character_config
CREATE INDEX IF NOT EXISTS idx_profiles_character_config ON public.profiles(character_config);

-- =====================================================
-- TRADER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trader_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    holding_time TEXT,
    risk_per_trade TEXT,
    decision_style TEXT,
    experience_level TEXT,
    trader_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.trader_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public trader profiles are viewable by everyone"
    ON public.trader_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own trader profile"
    ON public.trader_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trader profile"
    ON public.trader_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- POSITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    entry_price NUMERIC(18,8) NOT NULL,
    exit_price NUMERIC(18,8),
    quantity NUMERIC(18,8) NOT NULL,
    entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_timestamp TIMESTAMP WITH TIME ZONE,
    pnl NUMERIC(18,8),
    pnl_pct NUMERIC(10,4),
    risk_amount NUMERIC(18,8),
    risk_reward_ratio NUMERIC(10,2),
    open BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own positions"
    ON public.positions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
    ON public.positions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
    ON public.positions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions"
    ON public.positions FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_open ON public.positions(open);
CREATE INDEX IF NOT EXISTS idx_positions_entry_timestamp ON public.positions(entry_timestamp);

-- =====================================================
-- TRADING METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.trading_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_verified_trades INTEGER DEFAULT 0,
    accuracy_score NUMERIC(5,2) DEFAULT 0,
    average_r NUMERIC(10,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.trading_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own metrics"
    ON public.trading_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
    ON public.trading_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
    ON public.trading_metrics FOR UPDATE
    USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_trading_metrics_user_id ON public.trading_metrics(user_id);

-- =====================================================
-- SOCIAL FEATURES (FOLLOWERS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT followers_unique UNIQUE (follower_id, following_id),
    CONSTRAINT followers_no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view followers"
    ON public.followers FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.followers FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.followers FOR DELETE
    USING (auth.uid() = follower_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trader_profiles_updated_at
    BEFORE UPDATE ON public.trader_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_metrics_updated_at
    BEFORE UPDATE ON public.trading_metrics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON COLUMN public.profiles.character_config IS 'Stores serialized character customization config in format: character:base64(JSON)';
COMMENT ON TABLE public.trader_profiles IS 'Trading style and preferences';
COMMENT ON TABLE public.positions IS 'Trading positions and history';
COMMENT ON TABLE public.trading_metrics IS 'Calculated trading performance metrics';
COMMENT ON TABLE public.followers IS 'Social follow relationships';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
