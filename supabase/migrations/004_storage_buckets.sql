-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('halal-certificates', 'halal-certificates', FALSE, 10485760, ARRAY['application/pdf','image/jpeg','image/png']),
  ('payment-receipts', 'payment-receipts', FALSE, 10485760, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- product-images (public bucket)
-- ============================================================
CREATE POLICY "product_images_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_supplier_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND public.get_my_role() = 'supplier'
  );

CREATE POLICY "product_images_supplier_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND public.get_my_role() = 'supplier'
  );

-- ============================================================
-- halal-certificates (private bucket)
-- ============================================================
CREATE POLICY "halal_certs_supplier_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'halal-certificates'
    AND auth.uid() IS NOT NULL
    AND public.get_my_role() = 'supplier'
  );

CREATE POLICY "halal_certs_supplier_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'halal-certificates'
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'supplier'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
      )
    )
  );

-- ============================================================
-- payment-receipts (private bucket)
-- ============================================================
CREATE POLICY "payment_receipts_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-receipts'
    AND auth.uid() IS NOT NULL
    AND public.get_my_role() = 'restaurant_owner'
  );

CREATE POLICY "payment_receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-receipts'
    AND (
      public.get_my_role() = 'admin'
      OR public.get_my_role() = 'supplier'
      OR (
        public.get_my_role() = 'restaurant_owner'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
      )
    )
  );
