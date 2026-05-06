-- Role helper (SECURITY DEFINER to avoid RLS recursion on public.users)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halal_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_bank_details ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR get_my_role() = 'admin');

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id OR get_my_role() = 'admin');

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE POLICY "addresses_all_own" ON public.addresses
  FOR ALL USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- ============================================================
-- SUPPLIER PROFILES
-- ============================================================
CREATE POLICY "supplier_profiles_select_public" ON public.supplier_profiles
  FOR SELECT USING (
    (is_verified = TRUE AND is_active = TRUE)
    OR auth.uid() = user_id
    OR get_my_role() = 'admin'
  );

CREATE POLICY "supplier_profiles_insert_own" ON public.supplier_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "supplier_profiles_update_own" ON public.supplier_profiles
  FOR UPDATE USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- ============================================================
-- HALAL CERTIFICATES
-- ============================================================
CREATE POLICY "halal_certs_select" ON public.halal_certificates
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "halal_certs_insert_own" ON public.halal_certificates
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
  );

CREATE POLICY "halal_certs_update_admin" ON public.halal_certificates
  FOR UPDATE USING (get_my_role() = 'admin');

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT USING (
    is_active = TRUE
    OR auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "products_insert_own_supplier" ON public.products
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "products_update_own_supplier" ON public.products
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "products_delete_own_supplier" ON public.products
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (
    auth.uid() = restaurant_owner_id
    OR get_my_role() = 'admin'
  );

CREATE POLICY "orders_insert_owner" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = restaurant_owner_id OR get_my_role() = 'admin');

-- ============================================================
-- ORDER SPLITS
-- ============================================================
CREATE POLICY "order_splits_select" ON public.order_splits
  FOR SELECT USING (
    auth.uid() = (SELECT restaurant_owner_id FROM public.orders WHERE id = order_id)
    OR auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "order_splits_insert" ON public.order_splits
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT restaurant_owner_id FROM public.orders WHERE id = order_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY "order_splits_update" ON public.order_splits
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR auth.uid() = (SELECT restaurant_owner_id FROM public.orders WHERE id = order_id)
    OR get_my_role() = 'admin'
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.restaurant_owner_id FROM public.orders o
      JOIN public.order_splits os ON os.order_id = o.id
      WHERE os.id = order_split_id
    )
    OR auth.uid() = (
      SELECT sp.user_id FROM public.supplier_profiles sp
      JOIN public.order_splits os ON os.supplier_id = sp.id
      WHERE os.id = order_split_id
    )
    OR get_my_role() = 'admin'
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT o.restaurant_owner_id FROM public.orders o
      JOIN public.order_splits os ON os.order_id = o.id
      WHERE os.id = order_split_id
    )
    OR get_my_role() = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- ============================================================
-- SUPPLIER BANK DETAILS
-- ============================================================
CREATE POLICY "bank_details_select" ON public.supplier_bank_details
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() IN ('restaurant_owner', 'admin')
  );

CREATE POLICY "bank_details_insert_own" ON public.supplier_bank_details
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
  );

CREATE POLICY "bank_details_update_own" ON public.supplier_bank_details
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.supplier_profiles WHERE id = supplier_id)
    OR get_my_role() = 'admin'
  );
