-- Fix PUBLIC_DATA_EXPOSURE: Replace public SELECT policy with user-scoped policy
DROP POLICY IF EXISTS "Anyone can view trades" ON public.trader_trades;

CREATE POLICY "Users can view their own trades" 
ON public.trader_trades 
FOR SELECT 
USING (auth.uid() = user_id);