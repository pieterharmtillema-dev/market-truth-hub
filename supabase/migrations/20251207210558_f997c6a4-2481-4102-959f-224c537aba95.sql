-- Create past_trades table for Chrome extension imports
CREATE TABLE public.past_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  fill_price NUMERIC,
  exit_price NUMERIC,
  quantity NUMERIC,
  platform TEXT,
  account_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_status TEXT NOT NULL DEFAULT 'pending',
  verification_score NUMERIC
);

-- Enable RLS
ALTER TABLE public.past_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own past trades"
ON public.past_trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own past trades"
ON public.past_trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own past trades"
ON public.past_trades
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own past trades"
ON public.past_trades
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_past_trades_updated_at
BEFORE UPDATE ON public.past_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for duplicate detection (user_id, symbol, side, timestamp)
CREATE INDEX idx_past_trades_duplicate_check 
ON public.past_trades (user_id, symbol, side, timestamp);