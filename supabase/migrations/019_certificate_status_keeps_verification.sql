-- Migration 019 — Supplier verification follows approved-certificate count
--
-- Bug: when an admin rejects ONE certificate of a supplier who has
-- multiple approved certificates, the supplier was being un-verified
-- and de-listed even though they still had at least one approved cert.
--
-- Fix:
--   1) trigger_recheck_supplier_verification on halal_certificates UPDATE
--      keeps supplier_profiles.is_verified / is_active in sync with the
--      number of approved certs.
--   2) One-off backfill repairs any supplier that currently has
--      is_verified = false but actually has an approved certificate.

CREATE OR REPLACE FUNCTION public.sync_supplier_verification(p_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_approved boolean;
  v_user_id      uuid;
  v_was_verified boolean;
BEGIN
  SELECT user_id, COALESCE(is_verified, false)
    INTO v_user_id, v_was_verified
  FROM supplier_profiles
  WHERE id = p_supplier_id;

  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM halal_certificates
    WHERE supplier_id = p_supplier_id
      AND status = 'approved'
  ) INTO v_has_approved;

  UPDATE supplier_profiles
  SET
    is_verified = v_has_approved,
    is_active   = CASE WHEN v_has_approved THEN true ELSE is_active END
  WHERE id = p_supplier_id;

  -- Notify the supplier when verification flips back on (e.g. another approved cert exists)
  IF v_has_approved AND NOT v_was_verified THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
      v_user_id,
      'Verification restored',
      'Your account is verified again — you still have an approved Halal certificate on file.',
      'certification',
      false
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recheck_supplier_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM sync_supplier_verification(COALESCE(NEW.supplier_id, OLD.supplier_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS halal_cert_status_resync ON public.halal_certificates;
CREATE TRIGGER halal_cert_status_resync
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.halal_certificates
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recheck_supplier_verification();

-- Backfill: repair every supplier whose flag does not match their cert state
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT id FROM supplier_profiles LOOP
    PERFORM sync_supplier_verification(rec.id);
  END LOOP;
END $$;
