-- Hard-delete (commit 9c64f27) replaced the soft-delete flow on conversations,
-- so these per-side timestamps are never written and always NULL.
ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS deleted_for_owner_at,
  DROP COLUMN IF EXISTS deleted_for_supplier_at;
