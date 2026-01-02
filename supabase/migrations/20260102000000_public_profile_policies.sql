-- Enable public read access for trader profiles (for public profile viewing)
-- Users can view basic trader profile information for any user

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.trader_profiles FOR SELECT
  USING (true);

-- Allow public read access to user_trading_metrics for displaying stats
CREATE POLICY "Public trading metrics are viewable by everyone"
  ON public.user_trading_metrics FOR SELECT
  USING (true);

-- Allow public read access to profiles table for basic info
CREATE POLICY "Public profile info is viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow public read access to positions for calculating streaks and stats
-- This only allows reading, not modifying
CREATE POLICY "Public positions are viewable for stats"
  ON public.positions FOR SELECT
  USING (true);

-- Comment explaining the public access
COMMENT ON POLICY "Public profiles are viewable by everyone" ON public.trader_profiles IS
  'Allows anyone to view trader profile information for public profiles';

COMMENT ON POLICY "Public trading metrics are viewable by everyone" ON public.user_trading_metrics IS
  'Allows anyone to view trading metrics (win rate, avg R, etc.) for public profiles';

COMMENT ON POLICY "Public profile info is viewable by everyone" ON public.profiles IS
  'Allows anyone to view basic profile information (name, avatar, bio) for public profiles';

COMMENT ON POLICY "Public positions are viewable for stats" ON public.positions IS
  'Allows anyone to view position data needed for calculating public statistics like streaks';
