-- ============================================================================
-- 013_squash_remote_changes.sql
-- ============================================================================
-- Snapshot of remote schema changes applied to Supabase project
-- rexngdtweiivdyzrpfud between 2026-05-06 and 2026-05-17.
--
-- These 60+ migrations were applied directly to the cloud (via dashboard / MCP)
-- and were not previously tracked in source control. This file squashes them
-- into one snapshot so the repo is the source of truth going forward.
--
-- Granular per-migration history is preserved in Supabase's
-- supabase_migrations.schema_migrations table for forensic lookup.
-- ============================================================================

-- ============================================================
-- Migration: 20260506191615 — add_profile_avatar_bio_address_fields
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS house_number TEXT;


-- ============================================================
-- Migration: 20260506192425 — avatars_storage_policies
-- ============================================================

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');


-- ============================================================
-- Migration: 20260506192728 — delete_own_account_rpc
-- ============================================================

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- ============================================================
-- Migration: 20260507021608 — create_profile_from_oauth
-- ============================================================

CREATE OR REPLACE FUNCTION create_profile_from_oauth(
  p_role TEXT,
  p_full_name TEXT DEFAULT '',
  p_business_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_sp_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If profile already exists, return it as-is (handles re-login via OAuth)
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    SELECT id INTO v_sp_id FROM public.supplier_profiles WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'user_id', v_user_id,
      'supplier_profile_id', v_sp_id,
      'profile_existed', true
    );
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Create users row
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (v_user_id, v_email, p_full_name, p_role);

  -- If supplier, create supplier_profiles row
  IF p_role = 'supplier' THEN
    INSERT INTO public.supplier_profiles (user_id, business_name, city, category)
    VALUES (v_user_id, COALESCE(p_business_name, ''), COALESCE(p_city, ''), p_category)
    RETURNING id INTO v_sp_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'supplier_profile_id', v_sp_id,
    'profile_existed', false
  );
END;
$$;


-- ============================================================
-- Migration: 20260507023335 — register_basic_no_role
-- ============================================================

CREATE OR REPLACE FUNCTION register_basic(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    role, aud,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    json_build_object('provider', 'email', 'providers', ARRAY['email']),
    json_build_object('full_name', p_full_name),
    'authenticated', 'authenticated',
    '', '', '', ''
  );

  RETURN json_build_object('user_id', v_user_id, 'email', p_email);
END;
$$;


-- ============================================================
-- Migration: 20260507030838 — add_restaurant_name_to_users
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS restaurant_name text;

-- ============================================================
-- Migration: 20260507031531 — add_delivery_fee_and_discount_to_products
-- ============================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT NULL; ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT NULL;

-- ============================================================
-- Migration: 20260507033236 — add_rating_to_supplier_profiles
-- ============================================================
ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0; ALTER TABLE public.supplier_profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;

-- ============================================================
-- Migration: 20260507035209 — add_file_name_and_website_columns
-- ============================================================

ALTER TABLE halal_certificates ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS website text;


-- ============================================================
-- Migration: 20260507040239 — fix_halal_certs_storage_policy
-- ============================================================

DROP POLICY IF EXISTS "halal_certs_supplier_select" ON storage.objects;

CREATE POLICY "halal_certs_supplier_select"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'halal-certificates'
  AND (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'supplier'
      AND EXISTS (
        SELECT 1 FROM supplier_profiles
        WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
      )
    )
  )
);


-- ============================================================
-- Migration: 20260507040438 — add_halal_cert_delete_policies
-- ============================================================

-- Allow suppliers to delete their own certificate records
CREATE POLICY "halal_certs_delete_own"
ON halal_certificates FOR DELETE
USING (
  auth.uid() = (
    SELECT user_id FROM supplier_profiles WHERE id = supplier_id
  )
  OR get_my_role() = 'admin'
);

-- Allow suppliers to delete their own certificate files from storage
CREATE POLICY "halal_certs_supplier_delete"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'halal-certificates'
  AND (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'supplier'
      AND EXISTS (
        SELECT 1 FROM supplier_profiles
        WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
      )
    )
  )
);


-- ============================================================
-- Migration: 20260507064526 — allow_public_read_approved_certs
-- ============================================================

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS halal_certs_select ON halal_certificates;

-- New policy: supplier sees all their own certs; everyone else sees only approved ones
CREATE POLICY halal_certs_select ON halal_certificates
  FOR SELECT USING (
    auth.uid() = (
      SELECT supplier_profiles.user_id
      FROM supplier_profiles
      WHERE supplier_profiles.id = halal_certificates.supplier_id
    )
    OR get_my_role() = 'admin'
    OR status = 'approved'
  );


-- ============================================================
-- Migration: 20260507064657 — allow_owners_read_halal_certs_storage
-- ============================================================

CREATE POLICY halal_certs_owner_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'halal-certificates'
    AND get_my_role() = 'owner'
  );


-- ============================================================
-- Migration: 20260507064740 — fix_owners_read_halal_certs_storage_role
-- ============================================================

DROP POLICY IF EXISTS halal_certs_owner_select ON storage.objects;

CREATE POLICY halal_certs_owner_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'halal-certificates'
    AND get_my_role() = 'restaurant_owner'
  );


-- ============================================================
-- Migration: 20260507070646 — supplier_category_to_array
-- ============================================================
ALTER TABLE supplier_profiles
  ALTER COLUMN category TYPE text[]
  USING CASE WHEN category IS NULL THEN NULL ELSE ARRAY[category] END;

-- ============================================================
-- Migration: 20260507071152 — fix_role_assignment_flow
-- ============================================================

-- 1. Fix trigger: new users get role = NULL so they must choose
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL
  );
  RETURN NEW;
END;
$$;

-- 2. Fix create_profile_from_oauth: if profile exists but role is NULL, update it
CREATE OR REPLACE FUNCTION public.create_profile_from_oauth(
  p_role text,
  p_full_name text DEFAULT '',
  p_business_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_sp_id UUID;
  v_existing_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_existing_role FROM public.users WHERE id = v_user_id;

  -- Profile exists and role already set — return as-is (handles re-login)
  IF v_existing_role IS NOT NULL THEN
    SELECT id INTO v_sp_id FROM public.supplier_profiles WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'user_id', v_user_id,
      'supplier_profile_id', v_sp_id,
      'profile_existed', true
    );
  END IF;

  -- Profile exists (created by trigger) but role is NULL — update it now
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    UPDATE public.users SET role = p_role WHERE id = v_user_id;
  ELSE
    -- No profile row at all (edge case for some OAuth flows)
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (v_user_id, v_email, p_full_name, p_role);
  END IF;

  -- If supplier, create supplier_profiles row
  IF p_role = 'supplier' THEN
    INSERT INTO public.supplier_profiles (user_id, business_name, city, category)
    VALUES (v_user_id, COALESCE(p_business_name, ''), COALESCE(p_city, ''), p_category)
    RETURNING id INTO v_sp_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'supplier_profile_id', v_sp_id,
    'profile_existed', false
  );
END;
$$;


-- ============================================================
-- Migration: 20260507072207 — allow_null_role_on_users
-- ============================================================
ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;

-- ============================================================
-- Migration: 20260507072343 — fix_create_profile_category_type
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_profile_from_oauth(
  p_role text,
  p_full_name text DEFAULT '',
  p_business_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_sp_id UUID;
  v_existing_role TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_existing_role FROM public.users WHERE id = v_user_id;

  -- Profile exists and role already set — return as-is (handles re-login)
  IF v_existing_role IS NOT NULL THEN
    SELECT id INTO v_sp_id FROM public.supplier_profiles WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'user_id', v_user_id,
      'supplier_profile_id', v_sp_id,
      'profile_existed', true
    );
  END IF;

  -- Profile exists (trigger created it) but role is NULL — update it now
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    UPDATE public.users SET role = p_role WHERE id = v_user_id;
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (v_user_id, v_email, p_full_name, p_role);
  END IF;

  -- If supplier, create supplier_profiles row (category is text[], pass NULL)
  IF p_role = 'supplier' THEN
    INSERT INTO public.supplier_profiles (user_id, business_name, city)
    VALUES (v_user_id, COALESCE(p_business_name, ''), COALESCE(p_city, ''))
    RETURNING id INTO v_sp_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'supplier_profile_id', v_sp_id,
    'profile_existed', false
  );
END;
$$;


-- ============================================================
-- Migration: 20260507081155 — supplier_auto_certification_system
-- ============================================================

-- Function: check if supplier meets certification requirements and certify them
CREATE OR REPLACE FUNCTION check_supplier_certification(p_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_business_name text;
  v_has_bank boolean;
  v_has_approved_cert boolean;
  v_already_verified boolean;
BEGIN
  SELECT user_id, business_name, COALESCE(is_verified, false)
  INTO v_user_id, v_business_name, v_already_verified
  FROM supplier_profiles
  WHERE id = p_supplier_id;

  IF v_already_verified OR v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM supplier_bank_details
    WHERE supplier_id = p_supplier_id
      AND iban IS NOT NULL AND trim(iban) != ''
  ) INTO v_has_bank;

  SELECT EXISTS (
    SELECT 1 FROM halal_certificates
    WHERE supplier_id = p_supplier_id
      AND status = 'approved'
  ) INTO v_has_approved_cert;

  IF v_has_bank AND v_has_approved_cert THEN
    UPDATE supplier_profiles SET is_verified = true WHERE id = p_supplier_id;

    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
      v_user_id,
      'Your account is now certified!',
      'Congratulations! Your profile is verified and your products are now visible in the store.',
      'certification',
      false
    );
  END IF;
END;
$$;

-- Trigger function: fires when bank details are added/updated
CREATE OR REPLACE FUNCTION trigger_check_certification_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_supplier_certification(NEW.supplier_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bank_details_upsert ON supplier_bank_details;
CREATE TRIGGER on_bank_details_upsert
  AFTER INSERT OR UPDATE ON supplier_bank_details
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_certification_bank();

-- Trigger function: fires when a halal certificate is approved
CREATE OR REPLACE FUNCTION trigger_check_certification_cert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM check_supplier_certification(NEW.supplier_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cert_approved ON halal_certificates;
CREATE TRIGGER on_cert_approved
  AFTER INSERT OR UPDATE ON halal_certificates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_certification_cert();


-- ============================================================
-- Migration: 20260507083145 — full_order_system_v2
-- ============================================================

-- Create payment-receipts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for payment-receipts
DROP POLICY IF EXISTS "auth_upload_receipts" ON storage.objects;
CREATE POLICY "auth_upload_receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "auth_read_receipts" ON storage.objects;
CREATE POLICY "auth_read_receipts" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts');

-- Add refund_receipt_url to order_splits
ALTER TABLE order_splits ADD COLUMN IF NOT EXISTS refund_receipt_url text;

-- Create owner_bank_details table
CREATE TABLE IF NOT EXISTS owner_bank_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bank_name text,
  account_holder text,
  iban text,
  bic text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE owner_bank_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_bank" ON owner_bank_details;
CREATE POLICY "owner_manage_bank" ON owner_bank_details
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "supplier_read_owner_bank" ON owner_bank_details;
CREATE POLICY "supplier_read_owner_bank" ON owner_bank_details
  FOR SELECT TO authenticated USING (get_my_role() = 'supplier');

-- RPC: place_order (replaces Express /api/orders endpoint)
CREATE OR REPLACE FUNCTION place_order(
  p_owner_id uuid,
  p_total_amount numeric,
  p_groups jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_split_id uuid;
  v_group jsonb;
  v_item jsonb;
  v_supplier_user_id uuid;
  v_split_ids uuid[] := '{}';
BEGIN
  INSERT INTO orders (restaurant_owner_id, total_amount)
  VALUES (p_owner_id, p_total_amount)
  RETURNING id INTO v_order_id;

  FOR v_group IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    INSERT INTO order_splits (order_id, supplier_id, payment_method, receipt_url, subtotal, status)
    VALUES (
      v_order_id,
      (v_group->>'supplier_id')::uuid,
      v_group->>'payment_method',
      NULLIF(v_group->>'receipt_url', ''),
      (v_group->>'subtotal')::numeric,
      'pending_confirmation'
    )
    RETURNING id INTO v_split_id;

    v_split_ids := v_split_ids || v_split_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      INSERT INTO order_items (order_split_id, product_id, quantity, price_at_time, unit_type)
      VALUES (
        v_split_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::integer,
        (v_item->>'price')::numeric,
        v_item->>'unit_type'
      );
    END LOOP;

    SELECT user_id INTO v_supplier_user_id FROM supplier_profiles WHERE id = (v_group->>'supplier_id')::uuid;
    IF v_supplier_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
        v_supplier_user_id, 'New Order Received',
        'You have a new order for €' || round((v_group->>'subtotal')::numeric, 2)::text || '. Review and confirm it.',
        'order_placed', false
      );
    END IF;
  END LOOP;

  INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
    p_owner_id, 'Order Placed Successfully',
    'Your order of €' || round(p_total_amount, 2)::text || ' has been placed with ' || jsonb_array_length(p_groups)::text || ' supplier(s).',
    'order_placed', false
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'split_ids', v_split_ids);
END;
$$;

-- RPC: update_order_split_status (replaces Express PATCH endpoint)
CREATE OR REPLACE FUNCTION update_order_split_status(
  p_split_id uuid,
  p_status text,
  p_cancellation_reason text DEFAULT NULL,
  p_refund_receipt_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_supplier_user_id uuid;
BEGIN
  UPDATE order_splits SET
    status = p_status,
    cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
    refund_receipt_url = COALESCE(p_refund_receipt_url, refund_receipt_url),
    updated_at = now()
  WHERE id = p_split_id;

  SELECT o.restaurant_owner_id, sp.user_id
  INTO v_owner_id, v_supplier_user_id
  FROM order_splits os
  JOIN orders o ON o.id = os.order_id
  JOIN supplier_profiles sp ON sp.id = os.supplier_id
  WHERE os.id = p_split_id;

  IF p_status = 'confirmed' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_owner_id, 'Order Confirmed', 'Your order has been confirmed and is being prepared.', 'order_status_change', false);
  ELSIF p_status = 'out_for_delivery' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_owner_id, 'Order Out for Delivery', 'Your order is on its way!', 'order_status_change', false);
  ELSIF p_status = 'delivered' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_supplier_user_id, 'Order Delivered', 'The restaurant owner confirmed delivery of the order.', 'order_status_change', false);
  ELSIF p_status = 'cancelled' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_owner_id, 'Order Cancelled',
       'Your order was cancelled.' || CASE WHEN p_cancellation_reason IS NOT NULL THEN ' Reason: ' || p_cancellation_reason ELSE '' END,
       'order_status_change', false);
  ELSIF p_status = 'refund_uploaded' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_owner_id, 'Refund Receipt Uploaded', 'The supplier uploaded a refund receipt. Please verify and confirm.', 'refund', false);
  ELSIF p_status = 'completed' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_supplier_user_id, 'Refund Confirmed', 'The restaurant owner confirmed the refund.', 'refund', false);
  END IF;
END;
$$;


-- ============================================================
-- Migration: 20260507084936 — expand_notification_types
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'info', 'success', 'warning', 'error',
    'order_placed', 'order_status_change', 'refund'
  ]));


-- ============================================================
-- Migration: 20260507085723 — fix_order_splits_constraints
-- ============================================================

ALTER TABLE order_splits DROP CONSTRAINT IF EXISTS order_splits_status_check;
ALTER TABLE order_splits ADD CONSTRAINT order_splits_status_check
  CHECK (status = ANY (ARRAY[
    'pending_payment', 'pending_confirmation', 'confirmed',
    'shipped', 'out_for_delivery', 'delivered',
    'cancelled', 'refund_uploaded', 'completed'
  ]));

ALTER TABLE order_splits DROP CONSTRAINT IF EXISTS order_splits_payment_method_check;
ALTER TABLE order_splits ADD CONSTRAINT order_splits_payment_method_check
  CHECK (payment_method = ANY (ARRAY['cod', 'cash_on_delivery', 'bank_transfer']));


-- ============================================================
-- Migration: 20260507090217 — add_delivery_address_to_orders
-- ============================================================

-- Add delivery_address column to orders
ALTER TABLE orders ADD COLUMN delivery_address jsonb;

-- Replace place_order to accept and store delivery address
CREATE OR REPLACE FUNCTION place_order(
  p_owner_id uuid,
  p_total_amount numeric,
  p_groups jsonb,
  p_delivery_address jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id uuid;
  v_split_id uuid;
  v_group jsonb;
  v_item jsonb;
  v_supplier_user_id uuid;
  v_split_ids uuid[] := '{}';
BEGIN
  INSERT INTO orders (restaurant_owner_id, total_amount, delivery_address)
  VALUES (p_owner_id, p_total_amount, p_delivery_address)
  RETURNING id INTO v_order_id;

  FOR v_group IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    INSERT INTO order_splits (order_id, supplier_id, payment_method, receipt_url, subtotal, status)
    VALUES (
      v_order_id,
      (v_group->>'supplier_id')::uuid,
      v_group->>'payment_method',
      NULLIF(v_group->>'receipt_url', ''),
      (v_group->>'subtotal')::numeric,
      'pending_confirmation'
    )
    RETURNING id INTO v_split_id;

    v_split_ids := v_split_ids || v_split_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      INSERT INTO order_items (order_split_id, product_id, quantity, price_at_time, unit_type)
      VALUES (
        v_split_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::integer,
        (v_item->>'price')::numeric,
        v_item->>'unit_type'
      );
    END LOOP;

    SELECT user_id INTO v_supplier_user_id FROM supplier_profiles WHERE id = (v_group->>'supplier_id')::uuid;
    IF v_supplier_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
        v_supplier_user_id, 'New Order Received',
        'You have a new order for €' || round((v_group->>'subtotal')::numeric, 2)::text || '. Review and confirm it.',
        'order_placed', false
      );
    END IF;
  END LOOP;

  INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
    p_owner_id, 'Order Placed Successfully',
    'Your order of €' || round(p_total_amount, 2)::text || ' has been placed with ' || jsonb_array_length(p_groups)::text || ' supplier(s).',
    'order_placed', false
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'split_ids', v_split_ids);
END;
$$;


-- ============================================================
-- Migration: 20260507090840 — add_cancellation_requested_status
-- ============================================================

ALTER TABLE order_splits DROP CONSTRAINT IF EXISTS order_splits_status_check;
ALTER TABLE order_splits ADD CONSTRAINT order_splits_status_check
  CHECK (status IN (
    'pending_payment', 'pending_confirmation', 'confirmed', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled',
    'cancellation_requested', 'refund_uploaded', 'completed'
  ));

CREATE OR REPLACE FUNCTION public.update_order_split_status(
  p_split_id uuid,
  p_status text,
  p_cancellation_reason text DEFAULT NULL,
  p_refund_receipt_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_supplier_user_id uuid;
  v_reason text;
BEGIN
  UPDATE order_splits SET
    status = p_status,
    cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
    refund_receipt_url = COALESCE(p_refund_receipt_url, refund_receipt_url),
    updated_at = now()
  WHERE id = p_split_id;

  SELECT o.restaurant_owner_id, sp.user_id
  INTO v_owner_id, v_supplier_user_id
  FROM order_splits os
  JOIN orders o ON o.id = os.order_id
  JOIN supplier_profiles sp ON sp.id = os.supplier_id
  WHERE os.id = p_split_id;

  SELECT cancellation_reason INTO v_reason FROM order_splits WHERE id = p_split_id;

  IF p_status = 'confirmed' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_owner_id, 'Order Confirmed', 'Your order has been confirmed.', 'order_status_change', false);
  ELSIF p_status = 'cancellation_requested' THEN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
      (v_supplier_user_id, 'Cancellation Requested',
       'A restaurant owner has requested to cancel an order.' ||
       CASE WHEN v_reason IS NOT NULL THEN ' Reason: ' || v_reason ELSE '' END,
       'order_status_change', false);
  END IF;
END;
$$;


-- ============================================================
-- Migration: 20260507091630 — fix_cancelled_notification_message
-- ============================================================
-- (Superseded by 20260515023409. Skipped in squash.)


-- ============================================================
-- Migration: 20260507113327 — supplier_can_read_own_orders
-- ============================================================

CREATE POLICY "suppliers_can_read_their_orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_splits os
      JOIN supplier_profiles sp ON sp.id = os.supplier_id
      WHERE os.order_id = orders.id
        AND sp.user_id = auth.uid()
    )
  );


-- ============================================================
-- Migration: 20260507113700 — denormalize_owner_fields_onto_order_splits
-- ============================================================

ALTER TABLE order_splits
  ADD COLUMN IF NOT EXISTS restaurant_owner_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delivery_address jsonb;

UPDATE order_splits os
SET
  restaurant_owner_id = o.restaurant_owner_id,
  delivery_address    = o.delivery_address
FROM orders o
WHERE os.order_id = o.id;

CREATE OR REPLACE FUNCTION public.place_order(
  p_owner_id         uuid,
  p_total_amount     numeric,
  p_groups           jsonb,
  p_delivery_address jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id         uuid;
  v_split_id         uuid;
  v_group            jsonb;
  v_item             jsonb;
  v_supplier_user_id uuid;
  v_split_ids        uuid[] := '{}';
BEGIN
  INSERT INTO orders (restaurant_owner_id, total_amount, delivery_address)
  VALUES (p_owner_id, p_total_amount, p_delivery_address)
  RETURNING id INTO v_order_id;

  FOR v_group IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    INSERT INTO order_splits (
      order_id, supplier_id, payment_method, receipt_url, subtotal, status,
      restaurant_owner_id, delivery_address
    ) VALUES (
      v_order_id,
      (v_group->>'supplier_id')::uuid,
      v_group->>'payment_method',
      NULLIF(v_group->>'receipt_url', ''),
      (v_group->>'subtotal')::numeric,
      'pending_confirmation',
      p_owner_id,
      p_delivery_address
    )
    RETURNING id INTO v_split_id;

    v_split_ids := v_split_ids || v_split_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      INSERT INTO order_items (order_split_id, product_id, quantity, price_at_time, unit_type)
      VALUES (
        v_split_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::integer,
        (v_item->>'price')::numeric,
        v_item->>'unit_type'
      );
    END LOOP;

    SELECT user_id INTO v_supplier_user_id
    FROM supplier_profiles WHERE id = (v_group->>'supplier_id')::uuid;

    IF v_supplier_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
        v_supplier_user_id, 'New Order Received',
        'You have a new order for €' || round((v_group->>'subtotal')::numeric, 2)::text || '. Review and confirm it.',
        'order_placed', false
      );
    END IF;
  END LOOP;

  INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (
    p_owner_id, 'Order Placed Successfully',
    'Your order of €' || round(p_total_amount, 2)::text || ' has been placed with ' || jsonb_array_length(p_groups)::text || ' supplier(s).',
    'order_placed', false
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'split_ids', v_split_ids);
END;
$$;


-- ============================================================
-- Migration: 20260507114106 — fix_circular_rls_order_splits
-- ============================================================

DROP POLICY IF EXISTS "suppliers_can_read_their_orders" ON orders;

DROP POLICY IF EXISTS order_splits_select ON order_splits;
DROP POLICY IF EXISTS order_splits_insert ON order_splits;
DROP POLICY IF EXISTS order_splits_update ON order_splits;

CREATE POLICY order_splits_select ON order_splits FOR SELECT
  USING (
    auth.uid() = restaurant_owner_id
    OR auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = order_splits.supplier_id)
    OR get_my_role() = 'admin'
  );

CREATE POLICY order_splits_insert ON order_splits FOR INSERT
  WITH CHECK (
    auth.uid() = restaurant_owner_id
    OR get_my_role() = 'admin'
  );

CREATE POLICY order_splits_update ON order_splits FOR UPDATE
  USING (
    auth.uid() = restaurant_owner_id
    OR auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = order_splits.supplier_id)
    OR get_my_role() = 'admin'
  );


-- ============================================================
-- Migration: 20260507114706 — allow_authenticated_read_user_profiles
-- ============================================================

CREATE POLICY "authenticated_read_any_profile" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================
-- Migration: 20260507121358 — add_tax_id_to_users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- ============================================================
-- Migration: 20260507121724 — add_business_fields_to_owners
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS cuisine TEXT[];


-- ============================================================
-- Migration: 20260507141441 — create_reports_table
-- ============================================================

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('product', 'supplier')),
  target_id uuid NOT NULL,
  target_name text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own_or_admin" ON reports FOR SELECT USING (auth.uid() = reporter_id OR get_my_role() = 'admin');
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "reports_delete_admin" ON reports FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- Migration: 20260507142308 — notifications_admin_insert_policy
-- ============================================================

DROP POLICY IF EXISTS "notifications_own" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id OR get_my_role() = 'admin');


-- ============================================================
-- Migration: 20260507142510 — extend_notifications_type_check
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'info', 'success', 'warning', 'error',
    'order_placed', 'order_status_change', 'refund',
    'certificate_reviewed', 'admin_message'
  ])
);


-- ============================================================
-- Migration: 20260507142826 — admin_delete_user_function
-- ============================================================

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- ============================================================
-- Migration: 20260507143639 — halal_certs_supplier_update_policies
-- ============================================================

CREATE POLICY "halal_certs_update_own_pending" ON halal_certificates
  FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = halal_certificates.supplier_id)
    AND status = 'pending'
  )
  WITH CHECK (status = 'pending');

CREATE POLICY "halal_certs_update_own_approved" ON halal_certificates
  FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = halal_certificates.supplier_id)
    AND status = 'approved'
  )
  WITH CHECK (status = 'approved');


-- ============================================================
-- Migration: 20260507152218 — create_owner_profiles
-- ============================================================

CREATE TABLE owner_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_name text,
  bio         text,
  tax_id      text,
  city        text,
  website     text,
  cuisine     text[],
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_profiles_select_own" ON owner_profiles
  FOR SELECT USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "owner_profiles_insert_own" ON owner_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_profiles_update_own" ON owner_profiles
  FOR UPDATE USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "owner_profiles_delete_own" ON owner_profiles
  FOR DELETE USING (auth.uid() = user_id OR get_my_role() = 'admin');

ALTER TABLE users
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS restaurant_name,
  DROP COLUMN IF EXISTS tax_id,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS cuisine;


-- ============================================================
-- Migration: 20260514094006 — add_product_images_update_policy
-- ============================================================

CREATE POLICY "product_images_supplier_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND get_my_role() = 'supplier'
)
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND get_my_role() = 'supplier'
);


-- ============================================================
-- Migration: 20260514101855 — create_deleted_accounts_log
-- ============================================================

CREATE TABLE IF NOT EXISTS deleted_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text,
  role text,
  business_name text,
  deleted_at timestamptz DEFAULT now(),
  deleted_by_admin_id uuid REFERENCES auth.users(id)
);

ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_deleted" ON deleted_accounts
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "admin_insert_deleted" ON deleted_accounts
  FOR INSERT WITH CHECK (get_my_role() = 'admin');


-- ============================================================
-- Migration: 20260514110730 — add_delivery_dispute_flow
-- ============================================================

ALTER TABLE order_splits ADD COLUMN IF NOT EXISTS dispute_message text;

CREATE OR REPLACE FUNCTION public.update_order_split_status(
  p_split_id uuid,
  p_status text,
  p_cancellation_reason text DEFAULT NULL,
  p_refund_receipt_url text DEFAULT NULL,
  p_dispute_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_supplier_user_id uuid;
  v_reason text;
  v_disp_msg text;
BEGIN
  UPDATE order_splits SET
    status = p_status,
    cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
    refund_receipt_url = COALESCE(p_refund_receipt_url, refund_receipt_url),
    dispute_message = COALESCE(p_dispute_message, dispute_message),
    updated_at = now()
  WHERE id = p_split_id;

  SELECT cancellation_reason, dispute_message INTO v_reason, v_disp_msg FROM order_splits WHERE id = p_split_id;
END;
$$;


-- ============================================================
-- Migration: 20260514112128 — admin_notification_triggers
-- ============================================================

CREATE OR REPLACE FUNCTION notify_admin_new_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_id uuid := '68cb679d-a1ec-419c-bee3-e8cb045f0a36';
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    admin_id,
    'New Report Submitted',
    'A new ' || NEW.type || ' report has been filed for "' || COALESCE(NEW.target_name, 'an entity') || '".',
    'admin_message'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_admin_new_certificate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_id uuid := '68cb679d-a1ec-419c-bee3-e8cb045f0a36';
  supplier_name text;
BEGIN
  SELECT business_name INTO supplier_name FROM supplier_profiles WHERE id = NEW.supplier_id;
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    admin_id,
    'New Halal Certificate Uploaded',
    'Supplier "' || COALESCE(supplier_name, 'Unknown') || '" has uploaded a new Halal certificate for review.',
    'admin_message'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_admin_new_supplier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_id uuid := '68cb679d-a1ec-419c-bee3-e8cb045f0a36';
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    admin_id,
    'New Supplier Registered',
    'A new supplier "' || COALESCE(NEW.business_name, 'Unknown') || '" has registered.',
    'admin_message'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_admin_new_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_id uuid := '68cb679d-a1ec-419c-bee3-e8cb045f0a36';
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    admin_id,
    'New Restaurant Owner Registered',
    'A new restaurant owner "' || COALESCE(NEW.restaurant_name, 'Unknown') || '" has joined.',
    'admin_message'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_report ON reports;
CREATE TRIGGER on_new_report AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION notify_admin_new_report();
DROP TRIGGER IF EXISTS on_new_certificate ON halal_certificates;
CREATE TRIGGER on_new_certificate AFTER INSERT ON halal_certificates FOR EACH ROW EXECUTE FUNCTION notify_admin_new_certificate();
DROP TRIGGER IF EXISTS on_new_supplier ON supplier_profiles;
CREATE TRIGGER on_new_supplier AFTER INSERT ON supplier_profiles FOR EACH ROW EXECUTE FUNCTION notify_admin_new_supplier();
DROP TRIGGER IF EXISTS on_new_owner ON owner_profiles;
CREATE TRIGGER on_new_owner AFTER INSERT ON owner_profiles FOR EACH ROW EXECUTE FUNCTION notify_admin_new_owner();


-- ============================================================
-- Migration: 20260514112141 — supplier_ratings_table
-- ============================================================

CREATE TABLE supplier_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_split_id uuid NOT NULL REFERENCES order_splits(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (order_split_id)
);

ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_insert_rating" ON supplier_ratings
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "public_read_ratings" ON supplier_ratings
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION update_supplier_avg_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE supplier_profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM supplier_ratings
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_rating
  AFTER INSERT ON supplier_ratings
  FOR EACH ROW EXECUTE FUNCTION update_supplier_avg_rating();


-- ============================================================
-- Migration: 20260514112159 — fix_admin_owner_trigger
-- ============================================================

CREATE OR REPLACE FUNCTION notify_admin_new_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_id uuid := '68cb679d-a1ec-419c-bee3-e8cb045f0a36';
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    admin_id,
    'New Restaurant Owner Registered',
    'A new restaurant owner "' || COALESCE(NEW.restaurant_name, 'Unknown') || '" has joined the platform.',
    'admin_message'
  );
  RETURN NEW;
END;
$$;


-- ============================================================
-- Migration: 20260515023409 — fix_rpc_ambiguity_and_notifications
-- ============================================================

DROP FUNCTION IF EXISTS public.update_order_split_status(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.update_order_split_status(uuid, text, text, text, text);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'info', 'success', 'warning', 'error',
    'order_placed', 'order_status_change', 'refund',
    'certificate_reviewed', 'admin_message', 'receipt_uploaded'
  ]));

CREATE OR REPLACE FUNCTION public.update_order_split_status(
  p_split_id uuid,
  p_status text,
  p_cancellation_reason text DEFAULT NULL,
  p_refund_receipt_url text DEFAULT NULL,
  p_dispute_message text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_owner_id uuid;
  v_supplier_user_id uuid;
  v_reason text;
  v_disp_msg text;
BEGIN
  UPDATE order_splits SET
    status = p_status,
    cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
    refund_receipt_url = COALESCE(p_refund_receipt_url, refund_receipt_url),
    dispute_message = COALESCE(p_dispute_message, dispute_message),
    updated_at = now()
  WHERE id = p_split_id;
END;
$$;

ALTER TABLE supplier_profiles ALTER COLUMN rating SET DEFAULT 5;
UPDATE supplier_profiles SET rating = 5 WHERE rating IS NULL;


-- ============================================================
-- Migration: 20260515023425 — chat_system_tables
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, owner_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read_conversations" ON conversations FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = supplier_id)
  );
CREATE POLICY "participants_insert_conversations" ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id OR
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = supplier_id)
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read_messages" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (
        auth.uid() = c.owner_id OR
        auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = c.supplier_id)
      )
    )
  );
CREATE POLICY "participants_insert_messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (
        auth.uid() = c.owner_id OR
        auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = c.supplier_id)
      )
    )
  );
CREATE POLICY "participants_update_messages" ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (
        auth.uid() = c.owner_id OR
        auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = c.supplier_id)
      )
    )
  );

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_owner_id_idx ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS conversations_supplier_id_idx ON conversations(supplier_id);

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();


-- ============================================================
-- Migration: 20260515033516 — fix_critical_constraints_and_realtime
-- ============================================================

ALTER TABLE order_splits DROP CONSTRAINT order_splits_status_check;
ALTER TABLE order_splits ADD CONSTRAINT order_splits_status_check
  CHECK (status = ANY (ARRAY[
    'pending_payment','pending_confirmation','confirmed','shipped',
    'out_for_delivery','delivered','cancelled','cancellation_requested',
    'refund_uploaded','completed','delivery_dispute'
  ]));

ALTER TABLE order_splits ADD COLUMN IF NOT EXISTS cancelled_by text;

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;


-- ============================================================
-- Migration: 20260515045629 — fix_rpc_ambiguity_ratings_reports
-- ============================================================

DROP FUNCTION IF EXISTS public.update_order_split_status(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_order_split_status(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_order_split_status(
  p_split_id uuid,
  p_status text,
  p_cancellation_reason text DEFAULT NULL,
  p_refund_receipt_url text DEFAULT NULL,
  p_dispute_message text DEFAULT NULL,
  p_cancelled_by text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_supplier_user_id uuid;
  v_reason text;
  v_disp_msg text;
BEGIN
  UPDATE order_splits SET
    status = p_status,
    cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
    refund_receipt_url = COALESCE(p_refund_receipt_url, refund_receipt_url),
    dispute_message = COALESCE(p_dispute_message, dispute_message),
    cancelled_by = COALESCE(p_cancelled_by, cancelled_by),
    updated_at = now()
  WHERE id = p_split_id;
END;
$$;

UPDATE supplier_profiles SET rating = 5 WHERE rating IS NULL OR rating = 0;
ALTER TABLE supplier_profiles ALTER COLUMN rating SET DEFAULT 5;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_action text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_action_at timestamptz;


-- ============================================================
-- Migration: 20260515051006 — add_owner_coords_and_delivery_fee_rules
-- ============================================================

ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE TABLE IF NOT EXISTS delivery_fee_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  min_km numeric NOT NULL,
  max_km numeric,
  fee numeric(10,2) NOT NULL,
  label text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO delivery_fee_rules (min_km, max_km, fee, label)
VALUES
  (0,   50,   5.00,  '0–50 km'),
  (50,  100,  9.00,  '50–100 km'),
  (100, 200,  14.00, '100–200 km'),
  (200, NULL, 20.00, '200+ km')
ON CONFLICT DO NOTHING;

ALTER TABLE delivery_fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_delivery_fee_rules" ON delivery_fee_rules
  FOR SELECT USING (true);


-- ============================================================
-- Migration: 20260515052305 — add_phone_columns_and_stock_notifications
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE supplier_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES order_splits(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.stock_quantity IS NOT DISTINCT FROM OLD.stock_quantity THEN
    RETURN NEW;
  END IF;
  IF NEW.stock_quantity > 3 THEN
    RETURN NEW;
  END IF;
  SELECT user_id INTO v_user_id FROM supplier_profiles WHERE id = NEW.supplier_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.stock_quantity = 0 THEN
    INSERT INTO notifications(user_id, title, message, type, link)
    VALUES (v_user_id, 'Product out of stock: ' || NEW.name,
      'Your product "' || NEW.name || '" is now out of stock.',
      'warning', '/supplier/products');
  ELSIF NEW.stock_quantity <= 3 THEN
    INSERT INTO notifications(user_id, title, message, type, link)
    VALUES (v_user_id, 'Low stock alert: ' || NEW.name,
      'Only ' || NEW.stock_quantity || ' unit(s) left for "' || NEW.name || '".',
      'warning', '/supplier/products');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_low_stock_trigger ON products;
CREATE TRIGGER products_low_stock_trigger
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();


-- ============================================================
-- Migration: 20260515091159 — add_is_active_to_owner_profiles
-- ============================================================
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
UPDATE owner_profiles SET is_active = true WHERE is_active IS NULL;

-- ============================================================
-- Migration: 20260515092220 — add_admin_chat_tables
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_convs" ON admin_conversations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "user_own_admin_conv" ON admin_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_full_access_msgs" ON admin_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "user_own_admin_msgs" ON admin_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_conversations ac WHERE ac.id = admin_messages.conversation_id AND ac.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_conversations ac WHERE ac.id = admin_messages.conversation_id AND ac.user_id = auth.uid()));


-- ============================================================
-- Migration: 20260515093653 — fix_owner_profiles_admin_insert
-- ============================================================

DROP POLICY IF EXISTS "owner_profiles_insert_own" ON owner_profiles;
CREATE POLICY "owner_profiles_insert_own" ON owner_profiles
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id) OR (get_my_role() = 'admin'));


-- ============================================================
-- Migration: 20260515094217 — admin_set_owner_active_rpc
-- ============================================================

CREATE OR REPLACE FUNCTION admin_set_owner_active(p_user_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  UPDATE owner_profiles SET is_active = p_is_active WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO owner_profiles (user_id, is_active) VALUES (p_user_id, p_is_active);
  END IF;
END;
$$;

DROP POLICY IF EXISTS "owner_profiles_select_own" ON owner_profiles;
CREATE POLICY "owner_profiles_select_own" ON owner_profiles
  FOR SELECT TO public
  USING ((auth.uid() = user_id) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "owner_profiles_update_own" ON owner_profiles;
CREATE POLICY "owner_profiles_update_own" ON owner_profiles
  FOR UPDATE TO public
  USING ((auth.uid() = user_id) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- ============================================================
-- Migration: 20260515094644 — add_admin_messages_to_realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_conversations;

-- ============================================================
-- Migration: 20260515095936 — chat_attachments_and_unread
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

ALTER TABLE admin_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;

CREATE POLICY "chat_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments');


-- ============================================================
-- Migration: 20260515135716 — fix_reports_type_constraint
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'reports'::regclass AND contype = 'c' AND conname ILIKE '%type%') THEN
    EXECUTE (SELECT 'ALTER TABLE reports DROP CONSTRAINT ' || conname FROM pg_constraint WHERE conrelid = 'reports'::regclass AND contype = 'c' AND conname ILIKE '%type%' LIMIT 1);
  END IF;
END $$;

ALTER TABLE reports ADD CONSTRAINT reports_type_check CHECK (type IN ('product', 'supplier', 'order', 'user'));


-- ============================================================
-- Migration: 20260515135918 — fix_reports_rls_and_type
-- ============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert reports" ON reports;
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON reports;
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
DROP POLICY IF EXISTS "Admin can read all reports" ON reports;
DROP POLICY IF EXISTS "Admin can update reports" ON reports;

CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update reports"
  ON reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- ============================================================
-- Migration: 20260516094833 — add_link_to_notifications
-- ============================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- ============================================================
-- Migration: 20260516094856 — default_5star_rating_for_suppliers
-- ============================================================
ALTER TABLE supplier_profiles ALTER COLUMN rating SET DEFAULT 5;
UPDATE supplier_profiles SET rating = 5 WHERE rating IS NULL;


-- ============================================================
-- Migration: 20260516141447 — audit_security_fixes
-- ============================================================

CREATE POLICY "participants_delete_conversations" ON conversations
  FOR DELETE USING (
    auth.uid() = owner_id OR
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = conversations.supplier_id)
  );

CREATE POLICY "participants_delete_messages" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.owner_id OR auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = c.supplier_id))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert reports" ON reports;
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
DROP POLICY IF EXISTS "Admin can update reports" ON reports;

DROP POLICY IF EXISTS bank_details_select ON supplier_bank_details;
CREATE POLICY "bank_details_select" ON supplier_bank_details
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = supplier_bank_details.supplier_id)
    OR get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM order_splits os WHERE os.supplier_id = supplier_bank_details.supplier_id AND os.restaurant_owner_id = auth.uid())
  );

DROP POLICY IF EXISTS supplier_read_owner_bank ON owner_bank_details;
CREATE POLICY "order_counterparty_read_owner_bank" ON owner_bank_details
  FOR SELECT USING (
    owner_id = auth.uid()
    OR get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM order_splits os WHERE os.restaurant_owner_id = owner_bank_details.owner_id AND os.supplier_id = (SELECT id FROM supplier_profiles WHERE user_id = auth.uid()))
  );

-- Fix mutable search_path on DEFINER functions
ALTER FUNCTION public.notify_admin_new_certificate() SET search_path = public;
ALTER FUNCTION public.notify_admin_new_supplier() SET search_path = public;
ALTER FUNCTION public.notify_admin_new_owner() SET search_path = public;
ALTER FUNCTION public.notify_admin_new_report() SET search_path = public;
ALTER FUNCTION public.notify_low_stock() SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;
ALTER FUNCTION public.update_supplier_avg_rating() SET search_path = public;
ALTER FUNCTION public.trigger_check_certification_bank() SET search_path = public;
ALTER FUNCTION public.trigger_check_certification_cert() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.admin_delete_user(uuid) SET search_path = public;
ALTER FUNCTION public.admin_set_owner_active(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.check_supplier_certification(uuid) SET search_path = public;
ALTER FUNCTION public.create_profile_from_oauth(text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.delete_own_account() SET search_path = public;
ALTER FUNCTION public.place_order(uuid, numeric, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.register_basic(text, text, text) SET search_path = public;
ALTER FUNCTION public.update_order_split_status(uuid, text, text, text, text, text) SET search_path = public;

DROP FUNCTION IF EXISTS public.place_order(uuid, numeric, jsonb);

DROP POLICY IF EXISTS owner_profiles_select_own ON owner_profiles;
CREATE POLICY "owner_profiles_select" ON owner_profiles
  FOR SELECT USING (auth.uid() = user_id OR get_my_role() IN ('admin', 'supplier'));

CREATE POLICY "admin_manage_delivery_fees" ON delivery_fee_rules
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- ============================================================
-- Migration: 20260516145914 — conversation_soft_delete_and_pin
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deleted_for_owner_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_for_supplier_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pinned_by_owner        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by_supplier     boolean     DEFAULT false;


-- ============================================================
-- Migration: 20260516152020 — conversations_update_policy
-- ============================================================

CREATE POLICY "participants_update_conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = conversations.supplier_id))
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = (SELECT user_id FROM supplier_profiles WHERE id = conversations.supplier_id));


