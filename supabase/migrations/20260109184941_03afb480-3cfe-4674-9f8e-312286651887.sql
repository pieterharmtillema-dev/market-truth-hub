-- Add unique constraint for order upserts in alpaca_orders table
-- This allows ON CONFLICT to work properly when syncing orders

ALTER TABLE public.alpaca_orders
ADD CONSTRAINT alpaca_orders_order_id_user_id_key UNIQUE (order_id, user_id);