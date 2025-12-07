CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: trader_trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trader_trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset text NOT NULL,
    direction text NOT NULL,
    entry_price numeric(18,8) NOT NULL,
    exit_price numeric(18,8),
    entry_date timestamp with time zone NOT NULL,
    exit_date timestamp with time zone,
    quantity numeric(18,8),
    profit_loss numeric(18,8),
    profit_loss_percent numeric(10,4),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trader_trades_direction_check CHECK ((direction = ANY (ARRAY['long'::text, 'short'::text])))
);


--
-- Name: trader_trades trader_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trader_trades
    ADD CONSTRAINT trader_trades_pkey PRIMARY KEY (id);


--
-- Name: trader_trades Anyone can view trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view trades" ON public.trader_trades FOR SELECT USING (true);


--
-- Name: trader_trades Users can delete their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trades" ON public.trader_trades FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trader_trades Users can insert their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own trades" ON public.trader_trades FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trader_trades Users can update their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trades" ON public.trader_trades FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trader_trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trader_trades ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


