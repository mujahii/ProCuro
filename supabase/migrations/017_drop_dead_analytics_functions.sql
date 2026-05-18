-- These RPCs were defined in 007_analytics_functions.sql and migration 013
-- (squash) but never wired to any client / server / netlify / trigger / view /
-- RLS policy. The dashboards compute their metrics inline via supabase.from()
-- queries instead. SQL is preserved in 007 if a re-introduction is ever
-- needed.
DROP FUNCTION IF EXISTS public.get_category_sales_breakdown(p_supplier_id uuid);
DROP FUNCTION IF EXISTS public.get_owner_monthly_spend(p_owner_id uuid);
DROP FUNCTION IF EXISTS public.get_platform_gmv_monthly();
DROP FUNCTION IF EXISTS public.get_supplier_monthly_revenue(p_supplier_id uuid);
DROP FUNCTION IF EXISTS public.get_supplier_verification_breakdown();
DROP FUNCTION IF EXISTS public.get_top_products(p_supplier_id uuid, p_limit integer);
DROP FUNCTION IF EXISTS public.get_user_growth_monthly();

-- register_user was superseded by register_basic; the sign-up flow only
-- calls register_basic.
DROP FUNCTION IF EXISTS public.register_user(p_email text, p_password text, p_full_name text, p_role text, p_business_name text, p_city text);
