-- Create exchange_connections table for storing encrypted exchange API credentials
CREATE TABLE public.exchange_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bitvavo', 'coinbase')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'invalid', 'revoked')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  verified_trades_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange)
);

-- Enable RLS
ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view their own exchange connections"
ON public.exchange_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can create their own exchange connections"
ON public.exchange_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update their own exchange connections"
ON public.exchange_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete their own exchange connections"
ON public.exchange_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_exchange_connections_updated_at
BEFORE UPDATE ON public.exchange_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();