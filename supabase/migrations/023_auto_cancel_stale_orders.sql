-- Migration 023: Auto-cancel order_splits that have been stale for >7 days.
--
-- Two cases handled:
--   1. status = 'pending_confirmation' > 7 days → supplier never responded.
--   2. status = 'pending_payment' AND payment_method = 'bank_transfer' > 7 days
--      → owner never uploaded the bank transfer receipt.
--
-- Result is always 'cancelled', never 'completed'.
-- Notifications are sent to both the owner and the supplier.

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_supplier_user_id UUID;
BEGIN

  -- ── Case 1: pending_confirmation stale > 7 days ──────────────────────────
  FOR r IN
    SELECT os.id, os.restaurant_owner_id, os.supplier_id
    FROM order_splits os
    WHERE os.status = 'pending_confirmation'
      AND os.created_at < NOW() - INTERVAL '7 days'
  LOOP
    UPDATE order_splits SET
      status             = 'cancelled',
      cancellation_reason = 'Auto-cancelled: supplier did not confirm within 7 days.',
      cancelled_by       = 'system',
      updated_at         = NOW()
    WHERE id = r.id;

    -- Notify the owner
    PERFORM create_notification(
      r.restaurant_owner_id,
      'Order Auto-Cancelled',
      'Your order was automatically cancelled because the supplier did not respond within 7 days.',
      'warning'
    );

    -- Notify the supplier (look up user_id from supplier_profiles)
    SELECT user_id INTO v_supplier_user_id
    FROM supplier_profiles WHERE id = r.supplier_id;

    IF v_supplier_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_supplier_user_id,
        'Order Auto-Cancelled',
        'An order was automatically cancelled because you did not confirm it within 7 days.',
        'warning'
      );
    END IF;
  END LOOP;

  -- ── Case 2: pending_payment bank_transfer stale > 7 days ─────────────────
  FOR r IN
    SELECT os.id, os.restaurant_owner_id, os.supplier_id
    FROM order_splits os
    WHERE os.status = 'pending_payment'
      AND os.payment_method = 'bank_transfer'
      AND os.created_at < NOW() - INTERVAL '7 days'
  LOOP
    UPDATE order_splits SET
      status             = 'cancelled',
      cancellation_reason = 'Auto-cancelled: bank transfer receipt not uploaded within 7 days.',
      cancelled_by       = 'system',
      updated_at         = NOW()
    WHERE id = r.id;

    -- Notify the owner
    PERFORM create_notification(
      r.restaurant_owner_id,
      'Order Auto-Cancelled',
      'Your order was cancelled because the bank transfer receipt was not uploaded within 7 days.',
      'warning'
    );

    -- Notify the supplier
    SELECT user_id INTO v_supplier_user_id
    FROM supplier_profiles WHERE id = r.supplier_id;

    IF v_supplier_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_supplier_user_id,
        'Order Auto-Cancelled',
        'An order was cancelled because the buyer did not upload the bank transfer receipt within 7 days.',
        'warning'
      );
    END IF;
  END LOOP;

END;
$$;

-- Schedule to run daily at 02:00 UTC via pg_cron (enabled by default on Supabase).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any previously scheduled job with this name first.
    PERFORM cron.unschedule('auto-cancel-stale-orders');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auto-cancel-stale-orders',
      '0 2 * * *',
      'SELECT public.auto_cancel_stale_orders()'
    );
  END IF;
END;
$$;
