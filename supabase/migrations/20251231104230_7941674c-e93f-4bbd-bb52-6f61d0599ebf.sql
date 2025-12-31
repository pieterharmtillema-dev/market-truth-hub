-- Grant access to all public tables for anon and authenticated roles
-- This enables PostgREST/Supabase client to access the tables

-- exchange_connections
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exchange_connections TO authenticated;
GRANT SELECT ON TABLE public.exchange_connections TO anon;

-- follows
GRANT SELECT, INSERT, DELETE ON TABLE public.follows TO authenticated;
GRANT SELECT ON TABLE public.follows TO anon;

-- notifications
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.notifications TO anon;

-- positions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.positions TO authenticated;
GRANT SELECT ON TABLE public.positions TO anon;

-- predictions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.predictions TO authenticated;
GRANT SELECT ON TABLE public.predictions TO anon;

-- price_cache
GRANT SELECT ON TABLE public.price_cache TO authenticated;
GRANT SELECT ON TABLE public.price_cache TO anon;

-- profiles
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- trade_attachments
GRANT SELECT, INSERT, DELETE ON TABLE public.trade_attachments TO authenticated;
GRANT SELECT ON TABLE public.trade_attachments TO anon;

-- trade_log
GRANT SELECT, INSERT, DELETE ON TABLE public.trade_log TO authenticated;
GRANT SELECT ON TABLE public.trade_log TO anon;

-- trader_profiles
GRANT SELECT, INSERT, UPDATE ON TABLE public.trader_profiles TO authenticated;
GRANT SELECT ON TABLE public.trader_profiles TO anon;

-- user_activity
GRANT SELECT, INSERT ON TABLE public.user_activity TO authenticated;
GRANT SELECT ON TABLE public.user_activity TO anon;

-- user_roles
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO anon;

-- user_trading_metrics
GRANT SELECT ON TABLE public.user_trading_metrics TO authenticated;
GRANT SELECT ON TABLE public.user_trading_metrics TO anon;

-- public_profiles (view)
GRANT SELECT ON TABLE public.public_profiles TO authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon;

-- trader_activity (view)
GRANT SELECT ON TABLE public.trader_activity TO authenticated;
GRANT SELECT ON TABLE public.trader_activity TO anon;

-- Grant usage on sequences for identity columns
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;