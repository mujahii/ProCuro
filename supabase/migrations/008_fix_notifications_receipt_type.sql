-- Add 'receipt_uploaded' to the allowed notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'info', 'success', 'warning', 'error',
    'order_placed', 'order_status_change', 'refund',
    'certificate_reviewed', 'admin_message', 'receipt_uploaded'
  ]));
