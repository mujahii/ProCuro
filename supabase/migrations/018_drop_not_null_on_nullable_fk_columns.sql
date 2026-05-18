-- Migration 014 set ON DELETE SET NULL on these FK columns, but the NOT NULL
-- constraint was left in place, causing a constraint violation when an owner
-- account is deleted (Postgres tries to SET NULL but the column rejects it).
ALTER TABLE public.orders       ALTER COLUMN restaurant_owner_id DROP NOT NULL;
ALTER TABLE public.order_splits ALTER COLUMN restaurant_owner_id DROP NOT NULL;
