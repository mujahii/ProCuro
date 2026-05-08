-- Index for order_splits RLS checks and owner queries (restaurant_owner_id was added later without an index)
CREATE INDEX IF NOT EXISTS idx_order_splits_restaurant_owner_id
  ON public.order_splits(restaurant_owner_id);

-- Indexes for reports table (admin filters by status; RLS checks reporter_id)
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON public.reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
  ON public.reports(reporter_id);
