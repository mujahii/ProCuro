-- Fix FK constraints on public.users to allow account deletion.
-- Constraints previously used NO ACTION / RESTRICT, blocking DELETE FROM auth.users
-- when the user had any orders, order_splits, halal cert reviews, or admin deletion records.
-- Changed to ON DELETE SET NULL so order history is preserved but the user reference is cleared.

ALTER TABLE order_splits DROP CONSTRAINT order_splits_restaurant_owner_id_fkey;
ALTER TABLE order_splits ADD CONSTRAINT order_splits_restaurant_owner_id_fkey
  FOREIGN KEY (restaurant_owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders DROP CONSTRAINT orders_restaurant_owner_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_restaurant_owner_id_fkey
  FOREIGN KEY (restaurant_owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE deleted_accounts DROP CONSTRAINT deleted_accounts_deleted_by_admin_id_fkey;
ALTER TABLE deleted_accounts ADD CONSTRAINT deleted_accounts_deleted_by_admin_id_fkey
  FOREIGN KEY (deleted_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE halal_certificates DROP CONSTRAINT halal_certificates_reviewed_by_fkey;
ALTER TABLE halal_certificates ADD CONSTRAINT halal_certificates_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
