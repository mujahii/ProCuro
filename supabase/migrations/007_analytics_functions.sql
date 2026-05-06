-- Supplier monthly revenue (last 12 months)
CREATE OR REPLACE FUNCTION public.get_supplier_monthly_revenue(p_supplier_id UUID)
RETURNS TABLE (month TEXT, revenue NUMERIC)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', os.created_at), 'Mon YY') AS month,
    COALESCE(SUM(os.subtotal), 0) AS revenue
  FROM public.order_splits os
  WHERE os.supplier_id = p_supplier_id
    AND os.status = 'delivered'
    AND os.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', os.created_at)
  ORDER BY DATE_TRUNC('month', os.created_at);
$$;

-- Owner monthly spend (last 12 months)
CREATE OR REPLACE FUNCTION public.get_owner_monthly_spend(p_owner_id UUID)
RETURNS TABLE (month TEXT, spend NUMERIC)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', os.created_at), 'Mon YY') AS month,
    COALESCE(SUM(os.subtotal), 0) AS spend
  FROM public.order_splits os
  JOIN public.orders o ON o.id = os.order_id
  WHERE o.restaurant_owner_id = p_owner_id
    AND os.status = 'delivered'
    AND os.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', os.created_at)
  ORDER BY DATE_TRUNC('month', os.created_at);
$$;

-- Platform GMV monthly (admin only — enforced in server layer)
CREATE OR REPLACE FUNCTION public.get_platform_gmv_monthly()
RETURNS TABLE (month TEXT, gmv NUMERIC)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', os.created_at), 'Mon YY') AS month,
    COALESCE(SUM(os.subtotal), 0) AS gmv
  FROM public.order_splits os
  WHERE os.status = 'delivered'
    AND os.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', os.created_at)
  ORDER BY DATE_TRUNC('month', os.created_at);
$$;

-- Category sales breakdown for a supplier
CREATE OR REPLACE FUNCTION public.get_category_sales_breakdown(p_supplier_id UUID)
RETURNS TABLE (category TEXT, revenue NUMERIC)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    p.category,
    COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS revenue
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.order_splits os ON os.id = oi.order_split_id
  WHERE os.supplier_id = p_supplier_id
    AND os.status = 'delivered'
  GROUP BY p.category
  ORDER BY revenue DESC;
$$;

-- Top products for a supplier
CREATE OR REPLACE FUNCTION public.get_top_products(p_supplier_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (product_name TEXT, units_sold BIGINT, revenue NUMERIC)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    p.name AS product_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.price_at_time) AS revenue
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.order_splits os ON os.id = oi.order_split_id
  WHERE os.supplier_id = p_supplier_id
    AND os.status = 'delivered'
  GROUP BY p.id, p.name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

-- User growth by month (admin)
CREATE OR REPLACE FUNCTION public.get_user_growth_monthly()
RETURNS TABLE (month TEXT, new_users BIGINT)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
    COUNT(*) AS new_users
  FROM public.users
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at);
$$;

-- Supplier verification breakdown (admin)
CREATE OR REPLACE FUNCTION public.get_supplier_verification_breakdown()
RETURNS TABLE (status TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    CASE WHEN is_verified THEN 'Verified' ELSE 'Pending' END AS status,
    COUNT(*) AS count
  FROM public.supplier_profiles
  GROUP BY is_verified;
$$;
