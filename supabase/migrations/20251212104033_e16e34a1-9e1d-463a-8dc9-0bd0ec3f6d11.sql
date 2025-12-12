-- Add is_simulation column to positions
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

-- Add is_simulation column to trade_log
ALTER TABLE public.trade_log 
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

-- Add check constraint for uppercase symbols on positions
ALTER TABLE public.positions 
ADD CONSTRAINT positions_symbol_uppercase CHECK (symbol = upper(symbol));

-- Add check constraint for uppercase symbols on trade_log
ALTER TABLE public.trade_log 
ADD CONSTRAINT trade_log_symbol_uppercase CHECK (symbol IS NULL OR symbol = upper(symbol));

-- Service role full access policy for positions
CREATE POLICY "Service role full access"
ON public.positions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Service role full access policy for trade_log
CREATE POLICY "Service role full access"
ON public.trade_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Service role full access policy for user_activity
CREATE POLICY "Service role full access"
ON public.user_activity
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);