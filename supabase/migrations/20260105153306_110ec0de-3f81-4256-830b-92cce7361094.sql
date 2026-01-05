-- Drop the old constraint and add a new one with alpaca and tradestation
ALTER TABLE public.exchange_connections DROP CONSTRAINT exchange_connections_exchange_check;

ALTER TABLE public.exchange_connections ADD CONSTRAINT exchange_connections_exchange_check 
CHECK (exchange = ANY (ARRAY['binance'::text, 'bitvavo'::text, 'coinbase'::text, 'alpaca'::text, 'tradestation'::text]));