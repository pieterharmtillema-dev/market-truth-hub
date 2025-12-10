-- Create positions table to track running positions per user/symbol
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  net_size numeric NOT NULL DEFAULT 0,
  avg_entry numeric NOT NULL DEFAULT 0,
  realized_pnl numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for positions
CREATE POLICY "Users can view their own positions" 
ON public.positions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own positions" 
ON public.positions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions" 
ON public.positions FOR UPDATE 
USING (auth.uid() = user_id);

-- Add position tracking columns to past_trades if they don't exist
ALTER TABLE public.past_trades 
ADD COLUMN IF NOT EXISTS position_size_after numeric,
ADD COLUMN IF NOT EXISTS avg_entry_after numeric;