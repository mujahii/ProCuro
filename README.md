# ProCuro

**Last Updated:** 2026-06-15 00:08 (MYT — Kuala Lumpur)

**Halal Supply Chain, Simplified** — a procurement marketplace connecting Halal-certified suppliers with restaurant owners across Germany.

ProCuro lets restaurants browse verified Halal suppliers, place multi-supplier orders in a single cart, and track every delivery from confirmation through to payment. Suppliers manage their catalog, certifications, and incoming orders from one dashboard, with AI-powered sales insights powered by Google Gemini. An admin console governs the entire platform: user management, certificate review, reports, analytics, and direct messaging with any user.

---

## User Roles

The platform has three distinct roles, stored in `public.users.role`:

| Role | Value | Description |
|---|---|---|
| Restaurant Owner | `restaurant_owner` | Browses suppliers, builds a cart, places and tracks orders |
| Supplier | `supplier` | Lists products, manages orders, uploads Halal certificates, receives payments |
| Admin | `admin` | Full platform oversight — users, certificates, reports, orders, analytics, chat |

---

## Authentication & Registration Flow

- **Email / Password** — Users register via `register_basic` (a `SECURITY DEFINER` RPC that inserts directly into `auth.users` using `pgcrypto`). On every new auth.users row, the `on_auth_user_created` trigger fires `handle_new_user()`, which inserts a corresponding row into `public.users` with `role = NULL`.
- **OAuth (Google)** — On first OAuth login the client calls `create_profile_from_oauth(p_role, ...)`. If the user row exists but `role` is NULL (trigger already created it), the RPC sets the role. If the row doesn't exist yet (edge case), it inserts it. Re-logins where `role` is already set return the existing profile unchanged.
- **Role selection** — New users are sent to `/select-role` before accessing any protected page. Role is written server-side by `create_profile_from_oauth`. After role creation, a **random avatar** from the 30-preset list is auto-assigned via `update_own_avatar` so every new account has a profile picture immediately. The `ChatbotFAB` is hidden on `/select-role` (onboarding is not yet complete).
- **Supplier onboarding** — Selecting the supplier role creates a `supplier_profiles` row at the same time.
- **Owner onboarding** — Selecting the owner role creates an `owner_profiles` row via the `on_new_owner` trigger (fires `notify_admin_new_owner`).
- **Protected routes** — `ProtectedRoute` and `PublicOnlyRoute` components gate access by role. Unauthenticated users are redirected to `/login`; authenticated users hitting public-only pages are redirected to their dashboard.
- **Session management** — Supabase Auth handles JWT issuance and refresh. `AuthContext` exposes the current user and session to the React tree.

---

## Database Schema

All tables are in the `public` schema with Row-Level Security (RLS) enabled. Every table uses UUID primary keys.

### `public.users`
Mirrors `auth.users`. Created by trigger on every sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users(id) ON DELETE CASCADE` |
| `email` | TEXT NOT NULL UNIQUE | |
| `full_name` | TEXT | |
| `phone` | TEXT | |
| `role` | TEXT | `restaurant_owner`, `supplier`, `admin` — nullable until role is chosen |
| `avatar_url` | TEXT | Public URL — either a Supabase `avatars` bucket URL (uploaded photo) or a DiceBear CDN URL (generated avatar) |
| `is_banned` | BOOLEAN DEFAULT false | Set by admin; bans prevent dashboard access |
| `created_at` | TIMESTAMPTZ | |

### `public.owner_profiles`
Extended profile data for restaurant owners (separated from `users` to avoid schema bloat).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE NOT NULL | References `users(id) ON DELETE CASCADE` |
| `restaurant_name` | TEXT | |
| `bio` | TEXT | Short description shown to suppliers |
| `tax_id` | TEXT | VAT / Steuernummer |
| `city` | TEXT | |
| `website` | TEXT | |
| `cuisine` | TEXT[] | Multi-select: Halal, Middle Eastern, Asian, etc. |
| `latitude` | DOUBLE PRECISION | GPS coordinate for distance calculation |
| `longitude` | DOUBLE PRECISION | |
| `is_active` | BOOLEAN DEFAULT true | Admin can deactivate an owner account |
| `created_at` | TIMESTAMPTZ | |

### `public.supplier_profiles`
Extended profile for suppliers. Public-facing when `is_verified = true AND is_active = true`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE NOT NULL | References `users(id) ON DELETE CASCADE` |
| `business_name` | TEXT NOT NULL | |
| `tax_id` | TEXT | |
| `description` | TEXT | |
| `category` | TEXT[] | Array: Meat, Poultry, Seafood, Dairy, Beverages, Vegetables, Fruits, Spices, Bakery, Other |
| `city` | TEXT | |
| `website` | TEXT | |
| `phone` | TEXT | |
| `avatar_url` | TEXT | |
| `latitude` | DOUBLE PRECISION | |
| `longitude` | DOUBLE PRECISION | |
| `rating` | NUMERIC DEFAULT 5 | Auto-updated by `update_supplier_avg_rating` trigger |
| `is_verified` | BOOLEAN DEFAULT false | Set automatically when bank details + approved cert are both present |
| `is_active` | BOOLEAN DEFAULT true | |
| `created_at` | TIMESTAMPTZ | |

### `public.addresses`
Address book for both owners and suppliers. Supports multiple addresses per user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | References `users(id) ON DELETE CASCADE` |
| `label` | TEXT DEFAULT 'Home' | User-defined label |
| `street` | TEXT NOT NULL | |
| `house_number` | TEXT | |
| `postal_code` | TEXT | |
| `city` | TEXT NOT NULL | |
| `country` | TEXT DEFAULT 'Germany' | |
| `latitude` | DOUBLE PRECISION | |
| `longitude` | DOUBLE PRECISION | |
| `is_default` | BOOLEAN DEFAULT false | Flagged address is pre-selected at checkout |
| `created_at` | TIMESTAMPTZ | |

### `public.halal_certificates`
Uploaded by suppliers, reviewed by admin.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `supplier_id` | UUID NOT NULL | References `supplier_profiles(id) ON DELETE CASCADE` |
| `file_url` | TEXT NOT NULL | URL in `halal-certificates` private storage bucket |
| `file_name` | TEXT | Original filename |
| `status` | TEXT | `pending`, `approved`, `rejected` |
| `reviewed_by` | UUID | References `users(id)` (admin who reviewed) |
| `reviewed_at` | TIMESTAMPTZ | |
| `rejection_reason` | TEXT | |
| `uploaded_at` | TIMESTAMPTZ | |

### `public.products`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `supplier_id` | UUID NOT NULL | References `supplier_profiles(id) ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `price` | NUMERIC(10,2) NOT NULL | |
| `unit_type` | TEXT | `kg`, `package`, `piece`, `liter` |
| `category` | TEXT | `Meat`, `Poultry`, `Seafood`, `Dairy`, `Beverages`, `Vegetables`, `Fruits`, `Spices`, `Bakery`, `Other` |
| `stock_quantity` | INTEGER DEFAULT 0 | Decremented atomically via `decrement_stock` RPC on order placement |
| `delivery_fee` | NUMERIC | Optional per-product delivery fee override |
| `discount_percent` | NUMERIC | Optional discount |
| `image_url` | TEXT | URL in public `product-images` bucket |
| `is_active` | BOOLEAN DEFAULT true | |
| `deleted_at` | TIMESTAMPTZ DEFAULT NULL | Set on soft-delete; NULL = active; non-NULL = archived |
| `deleted_by` | UUID | References `users(id) ON DELETE SET NULL` — who deleted it (supplier or admin) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `public.orders`
One order per checkout, potentially spanning multiple suppliers.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `restaurant_owner_id` | UUID NOT NULL | References `users(id)` |
| `total_amount` | NUMERIC(10,2) | Sum of all splits |
| `delivery_address` | JSONB | Snapshot of selected address at checkout |
| `created_at` | TIMESTAMPTZ | |

### `public.order_splits`
One row per supplier within an order. This is the unit of fulfilment, status tracking, payment, and cancellation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_id` | UUID NOT NULL | References `orders(id) ON DELETE CASCADE` |
| `supplier_id` | UUID NOT NULL | References `supplier_profiles(id)` |
| `restaurant_owner_id` | UUID | Denormalized from `orders` for RLS performance |
| `delivery_address` | JSONB | Denormalized from `orders` for supplier view |
| `status` | TEXT | See order status lifecycle below |
| `payment_method` | TEXT | `cod`, `cash_on_delivery`, `bank_transfer` |
| `receipt_url` | TEXT | Bank transfer receipt uploaded by owner |
| `refund_receipt_url` | TEXT | Refund receipt uploaded by supplier |
| `subtotal` | NUMERIC(10,2) | |
| `cancellation_reason` | TEXT | |
| `cancelled_by` | TEXT | `owner` or `supplier` |
| `dispute_message` | TEXT | Owner's message when raising a delivery dispute |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Order split status lifecycle:**

```
pending_confirmation → confirmed → shipped → out_for_delivery → delivered
                    ↘ cancelled
                    ↘ cancellation_requested → cancelled
pending_payment     → pending_confirmation (after receipt upload)
delivered           → delivery_dispute → refund_uploaded → completed
```

Full set of valid statuses: `pending_payment`, `pending_confirmation`, `confirmed`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`, `cancellation_requested`, `refund_uploaded`, `completed`, `delivery_dispute`.

### `public.order_items`
Line items within a split.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `order_split_id` | UUID NOT NULL | References `order_splits(id) ON DELETE CASCADE` |
| `product_id` | UUID NOT NULL | References `products(id) ON DELETE RESTRICT` |
| `quantity` | INTEGER NOT NULL | |
| `price_at_time` | NUMERIC(10,2) | Snapshot of price at order time |
| `unit_type` | TEXT | Snapshot of unit type at order time |

### `public.supplier_bank_details`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `supplier_id` | UUID UNIQUE NOT NULL | References `supplier_profiles(id) ON DELETE CASCADE` |
| `bank_name` | TEXT NOT NULL | |
| `account_holder` | TEXT NOT NULL | |
| `iban` | TEXT NOT NULL | |
| `bic` | TEXT NOT NULL | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `public.owner_bank_details`
Owner's bank details, exposed to suppliers only when they share a completed order.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `owner_id` | UUID UNIQUE NOT NULL | References `auth.users(id) ON DELETE CASCADE` |
| `bank_name` | TEXT | |
| `account_holder` | TEXT | |
| `iban` | TEXT | |
| `bic` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `public.notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | |
| `title` | TEXT NOT NULL | |
| `message` | TEXT NOT NULL | |
| `type` | TEXT | `info`, `success`, `warning`, `error`, `order_placed`, `order_status_change`, `refund`, `certificate_reviewed`, `admin_message`, `receipt_uploaded` |
| `link` | TEXT | Optional deep-link path (e.g. `/supplier/products`) |
| `is_read` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMPTZ | |

### `public.conversations`
One conversation per supplier–owner pair. Unique on `(supplier_id, owner_id)`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `supplier_id` | UUID NOT NULL | References `supplier_profiles(id)` |
| `owner_id` | UUID NOT NULL | References `auth.users(id)` |
| `last_message_at` | TIMESTAMPTZ | Updated by `update_conversation_last_message` trigger |
| `pinned_by_owner` | BOOLEAN DEFAULT false | |
| `pinned_by_supplier` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMPTZ | |

### `public.messages`
Messages within a supplier–owner conversation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `conversation_id` | UUID NOT NULL | References `conversations(id) ON DELETE CASCADE` |
| `sender_id` | UUID NOT NULL | References `auth.users(id)` |
| `content` | TEXT NOT NULL | |
| `attachment_url` | TEXT | URL in `chat-attachments` public bucket |
| `attachment_type` | TEXT | MIME type of attachment |
| `order_id` | UUID | Optional reference to an `order_splits` row (links message to an order) |
| `is_system` | BOOLEAN DEFAULT false | System-generated messages (e.g. order status updates) |
| `is_read` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMPTZ | |

### `public.admin_conversations`
One conversation per user with the admin. Unique on `user_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | References `auth.users(id) ON DELETE CASCADE` |
| `pinned_by_admin` | BOOLEAN DEFAULT false | Admin can pin conversations for quick access; pinned chats sort first |
| `created_at` | TIMESTAMPTZ | |

### `public.admin_messages`
Messages in admin support conversations.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `conversation_id` | UUID NOT NULL | References `admin_conversations(id) ON DELETE CASCADE` |
| `sender_id` | UUID NOT NULL | References `auth.users(id)` |
| `content` | TEXT NOT NULL | |
| `attachment_url` | TEXT | |
| `attachment_type` | TEXT | |
| `is_read` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMPTZ | |

### `public.supplier_ratings`
One rating per order split (owners rate after delivery).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `supplier_id` | UUID NOT NULL | References `supplier_profiles(id) ON DELETE CASCADE` |
| `owner_id` | UUID NOT NULL | References `auth.users(id) ON DELETE CASCADE` |
| `order_split_id` | UUID NOT NULL UNIQUE | References `order_splits(id) ON DELETE CASCADE` — one rating per split |
| `rating` | INTEGER | 1–5 |
| `created_at` | TIMESTAMPTZ | |

### `public.reports`
User-submitted abuse reports.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `reporter_id` | UUID | References `users(id) ON DELETE CASCADE` |
| `type` | TEXT | `product`, `supplier`, `order`, `user`, `restaurant` |
| `target_id` | UUID NOT NULL | ID of the reported entity |
| `target_name` | TEXT | Display name of entity |
| `reason` | TEXT NOT NULL | |
| `details` | TEXT | |
| `status` | TEXT DEFAULT 'pending' | `pending`, `reviewed`, `dismissed` |
| `admin_action` | TEXT | Admin's recorded action |
| `admin_action_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

### `public.deleted_accounts`
Audit log of all deleted accounts (self-deletion and admin deletion).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | Original user ID (no FK — user is gone) |
| `email` | TEXT | |
| `role` | TEXT | |
| `business_name` | TEXT | Captured before deletion |
| `deleted_at` | TIMESTAMPTZ | |
| `deleted_by_admin_id` | UUID | NULL = self-deleted; non-NULL = admin-initiated deletion |

### `public.ai_insights_cache`
Per-user cache for Gemini analytics summaries. TTL of 24 hours enforced in application code. Cache is language-aware: switching language invalidates the cache and forces a fresh generation.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK | References `users(id) ON DELETE CASCADE` |
| `scope` | TEXT DEFAULT 'analytics' | |
| `summary` | TEXT NOT NULL | Generated markdown from Gemini |
| `generated_at` | TIMESTAMPTZ | |
| `language` | TEXT DEFAULT 'en' | Language the summary was generated in (`en`/`de`); cache miss if language differs |

### `public.delivery_fee_rules`
Distance-based delivery fee tiers, readable by all authenticated users, managed by admin.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `min_km` | NUMERIC NOT NULL | |
| `max_km` | NUMERIC | NULL = no upper bound |
| `fee` | NUMERIC(10,2) NOT NULL | |
| `label` | TEXT | Display label (e.g. `0–50 km`) |
| `created_at` | TIMESTAMPTZ | |

**Seeded tiers:** 0–50 km → €5.00 | 50–100 km → €9.00 | 100–200 km → €14.00 | 200+ km → €20.00

### `public.platform_settings`
Key-value store for platform-wide configuration managed by admin. Publicly readable, admin-only writes.

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | Setting identifier |
| `value` | TEXT NOT NULL | Setting value (serialized as string) |

**Seeded defaults:**
- `tax_rate` = `0.07` — German reduced VAT rate for food (Lebensmittel); read by CartPage at checkout and by `invoiceGenerator.js` when generating PDF invoices

---

## Database Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_products_supplier_id` | products | supplier_id | Filter products by supplier |
| `idx_products_category` | products | category | Category browsing |
| `idx_products_is_active` | products | is_active | Active-product filter |
| `idx_products_deleted_at` | products | deleted_at | Partial index (WHERE deleted_at IS NOT NULL) — admin deleted-products query |
| `idx_orders_restaurant_owner_id` | orders | restaurant_owner_id | Owner order history |
| `idx_order_splits_supplier_id` | order_splits | supplier_id | Supplier order list |
| `idx_order_splits_status` | order_splits | status | Status-based filtering |
| `idx_order_splits_order_id` | order_splits | order_id | Order → splits join |
| `idx_order_splits_restaurant_owner_id` | order_splits | restaurant_owner_id | RLS + owner queries |
| `idx_notifications_user_id_is_read` | notifications | user_id, is_read | Unread count queries |
| `idx_halal_certificates_supplier_id` | halal_certificates | supplier_id | Cert lookup by supplier |
| `idx_halal_certificates_status` | halal_certificates | status | Admin certificate queue |
| `idx_reports_status` | reports | status | Admin report queue |
| `idx_reports_reporter_id` | reports | reporter_id | User's own reports |
| `messages_conversation_id_idx` | messages | conversation_id, created_at | Chat message ordering |
| `conversations_owner_id_idx` | conversations | owner_id | Owner's conversation list |
| `conversations_supplier_id_idx` | conversations | supplier_id | Supplier's conversation list |
| `ai_insights_cache_generated_at_idx` | ai_insights_cache | generated_at DESC | Cache freshness queries |
| `idx_addresses_user_id` | addresses | user_id | Foreign-key cover (join/cascade) |
| `idx_admin_messages_conversation_id` | admin_messages | conversation_id | Foreign-key cover |
| `idx_admin_messages_sender_id` | admin_messages | sender_id | Foreign-key cover |
| `idx_deleted_accounts_deleted_by_admin_id` | deleted_accounts | deleted_by_admin_id | Foreign-key cover |
| `idx_halal_certificates_reviewed_by` | halal_certificates | reviewed_by | Foreign-key cover |
| `idx_messages_order_id` | messages | order_id | Foreign-key cover |
| `idx_messages_sender_id` | messages | sender_id | Foreign-key cover |
| `idx_order_items_order_split_id` | order_items | order_split_id | Foreign-key cover |
| `idx_order_items_product_id` | order_items | product_id | Foreign-key cover |
| `idx_products_deleted_by` | products | deleted_by | Foreign-key cover |
| `idx_supplier_ratings_owner_id` | supplier_ratings | owner_id | Foreign-key cover |
| `idx_supplier_ratings_supplier_id` | supplier_ratings | supplier_id | Foreign-key cover |

> The 12 foreign-key cover indexes above were added to resolve the Supabase `unindexed_foreign_keys` performance advisory — unindexed FKs force sequential scans on joins and slow down `ON DELETE` cascade checks as data grows.

---

## Stored Functions (RPCs)

All functions are `SECURITY DEFINER` with `SET search_path = public` to prevent privilege escalation.

### Authentication & Registration

| Function | Signature | Description |
|---|---|---|
| `handle_new_user` | `TRIGGER` | Fires on `auth.users` INSERT; creates `public.users` row with `role = NULL` |
| `register_basic` | `(email, password, full_name) → JSON` | Inserts directly into `auth.users` using `pgcrypto`; used for email/password registration |
| `create_profile_from_oauth` | `(role, full_name, business_name, city, category) → JSONB` | Sets role after OAuth login; creates `supplier_profiles` row if role is supplier |
| `get_my_role` | `() → TEXT` | Helper that reads `role` from `public.users` without triggering RLS recursion |

### Order Management

| Function | Signature | Description |
|---|---|---|
| `place_order` | `(owner_id, total_amount, groups JSONB, delivery_address JSONB) → JSONB` | Atomic: creates `orders`, `order_splits`, `order_items`, decrements stock, fires notifications to supplier(s) and owner |
| `update_order_split_status` | `(split_id, status, cancellation_reason, refund_receipt_url, dispute_message, cancelled_by) → void` | Updates a split's status and writes audit fields |
| `decrement_stock` | `(product_id, quantity) → void` | `GREATEST(stock - qty, 0)` — prevents negative stock |

### Certification & Verification

| Function | Signature | Description |
|---|---|---|
| `check_supplier_certification` | `(supplier_id) → void` | Checks if supplier has approved cert + bank details; if so, sets `is_verified = true` and sends notification |
| `trigger_check_certification_bank` | `TRIGGER` | Fires after INSERT/UPDATE on `supplier_bank_details`; calls `check_supplier_certification` |
| `trigger_check_certification_cert` | `TRIGGER` | Fires after INSERT/UPDATE on `halal_certificates`; calls `check_supplier_certification` only when `status → 'approved'` |

### Notifications

| Function | Signature | Description |
|---|---|---|
| `create_notification` | `(user_id, title, message, type) → void` | General-purpose notification insert |
| `notify_admin_new_report` | `TRIGGER` | Fires on `reports` INSERT; sends `admin_message` notification to admin |
| `notify_admin_new_certificate` | `TRIGGER` | Fires on `halal_certificates` INSERT; notifies admin |
| `notify_admin_new_supplier` | `TRIGGER` | Fires on `supplier_profiles` INSERT; notifies admin |
| `notify_admin_new_owner` | `TRIGGER` | Fires on `owner_profiles` INSERT; notifies admin |
| `notify_low_stock` | `TRIGGER` | Fires on `products.stock_quantity` UPDATE; sends `warning` notification when stock ≤ 3 or reaches 0 |

### Analytics

> **Note:** All seven dedicated analytics RPCs (`get_supplier_monthly_revenue`, `get_owner_monthly_spend`, `get_platform_gmv_monthly`, `get_category_sales_breakdown`, `get_top_products`, `get_user_growth_monthly`, `get_supplier_verification_breakdown`) were **dropped in migration 017** as dead code. Analytics are now computed entirely client-side via direct Supabase queries to `order_splits`, `order_items`, `owner_profiles`, and `users` within each analytics page component.

### Chat

| Function | Signature | Description |
|---|---|---|
| `update_conversation_last_message` | `TRIGGER` | Fires on `messages` INSERT; updates `conversations.last_message_at` |

### Ratings

| Function | Signature | Description |
|---|---|---|
| `update_supplier_avg_rating` | `TRIGGER` | Fires on `supplier_ratings` INSERT; recalculates `supplier_profiles.rating` as a rounded average |

### Admin

| Function | Signature | Description |
|---|---|---|
| `admin_delete_user` | `(target_user_id) → void` | Admin-only; hard-deletes from `public.users` and `auth.users` |
| `admin_set_owner_active` | `(user_id, is_active) → void` | Admin-only; upserts `owner_profiles.is_active` |
| `delete_own_account` | `() → void` | Self-deletion: captures identity, writes to `deleted_accounts` (NULL `deleted_by_admin_id`), then hard-deletes from `auth.users` which cascades everywhere |
| `rls_auto_enable` | `() → void` | Internal utility (SECURITY DEFINER); automatically enables RLS on newly created tables |

---

## Row-Level Security Policies

RLS is enabled on all tables. `get_my_role()` is used throughout to avoid recursion.

> **Init-plan optimization:** all 53 policies that reference `auth.uid()` / `auth.role()` wrap the call in a scalar subquery — `(select auth.uid())` instead of `auth.uid()`. This lets Postgres evaluate the auth function **once per query** (as an InitPlan) rather than **once per row**, eliminating the Supabase `auth_rls_initplan` performance advisory. The access logic is unchanged — the subquery returns the same value.

| Table | Policy | Operation | Rule |
|---|---|---|---|
| users | `users_select_own` | SELECT | Own row or admin |
| users | `users_update_own` | UPDATE | Own row or admin |
| users | `authenticated_read_any_profile` | SELECT | Any authenticated user |
| addresses | `addresses_all_own` | ALL | Own row or admin |
| supplier_profiles | `supplier_profiles_select_public` | SELECT | `is_verified AND is_active`, own row, or admin |
| supplier_profiles | `supplier_profiles_insert_own` | INSERT | Own `user_id` |
| supplier_profiles | `supplier_profiles_update_own` | UPDATE | Own row or admin |
| halal_certificates | `halal_certs_select` | SELECT | Own supplier, admin, or `status = 'approved'` |
| halal_certificates | `halal_certs_insert_own` | INSERT | Own supplier |
| halal_certificates | `halal_certs_update_admin` | UPDATE | Admin only |
| halal_certificates | `halal_certs_delete_own` | DELETE | Own supplier or admin |
| products | `products_select_active` | SELECT | `is_active = true`, own supplier, or admin |
| products | `products_insert/update/delete_own_supplier` | ALL | Own supplier or admin |
| orders | `orders_select_own` | SELECT | Own owner or admin |
| orders | `orders_insert_owner` | INSERT | Own `restaurant_owner_id` or admin |
| order_splits | `order_splits_select` | SELECT | Own owner (denorm column), own supplier, or admin |
| order_splits | `order_splits_insert` | INSERT | Own owner or admin |
| order_splits | `order_splits_update` | UPDATE | Own owner or supplier or admin |
| order_items | `order_items_select/insert` | SELECT/INSERT | Derived from order + supplier join |
| notifications | `notifications_select/insert/update/delete_own` | ALL | Own `user_id` or admin |
| supplier_bank_details | `bank_details_select` | SELECT | Own supplier, admin, or owner with a shared order split |
| owner_bank_details | `order_counterparty_read_owner_bank` | SELECT | Own owner, admin, or supplier with a shared order split |
| conversations | `participants_*` | ALL | Owner or supplier participant |
| messages | `participants_*` | ALL | Participant in the parent conversation |
| admin_conversations | `admin_full_access_convs` / `user_own_admin_conv` | ALL | Admin or own `user_id` |
| admin_messages | `admin_full_access_msgs` / `user_own_admin_msgs` | ALL | Admin or member of parent conversation |
| supplier_ratings | `owner_insert_rating` / `public_read_ratings` | INSERT/SELECT | Owner inserts; everyone can read |
| reports | `Authenticated users can insert` / `Users can read own` / `Admin can update` | ALL | Standard CRUD by role |
| ai_insights_cache | `Users read own AI cache` | SELECT | Own `user_id` |
| deleted_accounts | `admin_read/insert_deleted` | SELECT/INSERT | Admin only |
| delivery_fee_rules | `read_delivery_fee_rules` / `admin_manage_delivery_fees` | SELECT/ALL | Public read; admin write |
| platform_settings | `platform_settings_read_all` / `platform_settings_admin_write` | SELECT/ALL | Public read; admin write |
| owner_profiles | `owner_profiles_select` | SELECT | Own row, admin, or supplier |
| owner_profiles | `owner_profiles_insert_own` | INSERT | Own row or admin |
| owner_profiles | `owner_profiles_update_own` | UPDATE | Own row or admin |

---

## Storage Buckets

| Bucket | Visibility | Max Size | Allowed Types | Access |
|---|---|---|---|---|
| `avatars` | Public | — | — | Owner uploads own; objects read via public URL |
| `product-images` | Public | 5 MB | JPEG, PNG, WEBP, GIF | Suppliers upload/update/delete; objects read via public URL |
| `halal-certificates` | Private | 10 MB | PDF, JPEG, PNG | Supplier uploads own folder; admin reads all; restaurant_owner reads approved |
| `payment-receipts` | Private | 10 MB | PDF, JPEG, PNG | Owner uploads; supplier and admin read |
| `chat-attachments` | Public | 5 MB | JPEG, PNG, GIF, WEBP, PDF | Any authenticated user uploads; objects read via public URL |

> **Listing hardened:** the broad public `SELECT` policies on `storage.objects` for the three public buckets (`avatars`, `chat-attachments`, `product-images`) were removed. Public buckets serve objects through the public URL endpoint (which bypasses RLS), so those policies only enabled anonymous **enumeration** of all files (`.list()`) — which the app never uses. Removing them resolves the Supabase `public_bucket_allows_listing` security advisory while leaving `getPublicUrl` access and uploads intact.

---

## Supabase Realtime

The following tables are added to the `supabase_realtime` publication so the client receives live updates via Supabase channels:

- `messages` — live chat messages between suppliers and owners
- `conversations` — conversation list updates (last_message_at, unread counts)
- `admin_messages` — live admin support chat
- `admin_conversations` — admin conversation list

---

## API Layer

### Express Dev Server (`server/`)

Used during local development only. In production, AI endpoints are replaced by Netlify Functions.

**Middleware**

| File | Purpose |
|---|---|
| `middleware/verifySupabaseJWT.js` | Validates the Supabase JWT from the `Authorization: Bearer` header; attaches `req.user` (with `id` and `role`) |

**Routes**

| Route | File | Endpoints |
|---|---|---|
| `/api/ai` | `routes/ai.js` | `POST /chat`, `POST /analytics-summary` |

### Netlify Functions (`netlify/functions/`)

Serverless equivalents of the AI routes, deployed to production alongside the Vite SPA.

| Function | Trigger | Description |
|---|---|---|
| `ai-chat.js` | `POST /.netlify/functions/ai-chat` | Proxies to Gemini 2.5 Flash (with 2.5-flash-lite → 2.0-flash-lite fallback chain); verifies Supabase JWT; accepts `language` field — appends German instruction to system prompt when `language === 'de'` |
| `ai-analytics-summary.js` | `POST /.netlify/functions/ai-analytics-summary` | Generates AI analytics summary; checks `ai_insights_cache` (24h TTL); falls back to a deterministic text summary if Gemini quota is exceeded; accepts `language` field — prefixes prompts with German instruction and uses German bullet headers when `language === 'de'` |
| `auto-cancel-orders.js` | CRON `0 2 * * *` (daily 02:00 UTC) | Automatically cancels orders stuck in `pending_payment` or `pending_confirmation` past their configured timeout window |
| `geocode-addresses.js` | CRON `0 3 * * *` (daily 03:00 UTC) | Finds all `addresses` rows where `latitude IS NULL AND city IS NOT NULL`, deduplicates by city, queries Nominatim (`postal_code + city, Germany`) for coordinates, and bulk-updates `latitude`/`longitude`. Respects Nominatim's 1 req/sec policy (1100ms sleep between requests). Processes up to 100 addresses per run. Ensures every user-added address is eventually geocodable for the admin Germany map. |

---

## AI Features

### In-App Chat Assistant (`ChatbotFAB` / `ChatbotDrawer`)
- Floating action button available on all authenticated pages.
- Sends user messages to `POST /api/ai/chat` (dev) or `/.netlify/functions/ai-chat` (prod).
- System prompt is role-aware: different instructions for `restaurant_owner`, `supplier`, and `admin`.
- Context data (e.g. recent orders, active products) is sent alongside the prompt so the model can give grounded answers.
- **Language-aware:** client sends `language` (`en`/`de`) with each request; the backend appends a German-response instruction when `language === 'de'`, ensuring Gemini replies in the active app language.
- Rate-limited to 20 requests/minute per user.

### Analytics Summary (`AnalyticsSummary`)
- Appears on the analytics pages for owners, suppliers, and admin.
- Sends business context (revenue, orders, products, etc.) to `POST /api/ai/analytics-summary`.
- **Caching:** Generated summaries are stored in `ai_insights_cache`. Subsequent page loads within 24 hours return the cached version without a Gemini API call.
- **Force refresh:** User can bypass the cache with an explicit refresh button.
- **Language-aware cache:** The `ai_insights_cache` table stores `language`. On load, if the cached language differs from the current UI language, the summary is regenerated. For in-session switches, a `force: true` request fires immediately. For switches made while the component was unmounted (e.g. navigating to Settings and back), a `localStorage` key (`procuro_ai_lang`) tracks the last generation language so remounts detect the mismatch and regenerate automatically.
- **Range-change stability:** On both owner and supplier analytics pages, the AI context is captured once (on the very first data load) via an `aiContextSet` ref gate and a stable `aiContext` state. `AnalyticsSummary` is rendered outside the `loading ? skeletons : content` block so it stays mounted across range changes. Switching between This Week / This Month / This Year / Custom does **not** trigger re-generation; only a language change or cache expiry does.
- **Stale fallback:** If Gemini is rate-limited and a stale cache entry exists, it is served with a `stale: true` flag.
- **Deterministic fallback:** If both Gemini and cache fail, a plain-text summary is built from the context data client-side so the user never sees a hard error.
- **Glow animation:** The dark card has a continuous `aiGlow` CSS keyframe animation cycling through blue → purple → teal → orange → pink (20s linear, `willChange: 'box-shadow'`). `box-shadow` is 32–36px blur with a 12–14px spread so the coloured halo visibly bleeds beyond the card edges on all screen sizes, including narrow mobile viewports.

---

## Notification System

Notifications are triggered by:

| Event | Recipient | Type |
|---|---|---|
| Order placed | Owner + each supplier | `order_placed` |
| Order confirmed | Owner | `order_status_change` |
| Order out for delivery | Owner | `order_status_change` |
| Order delivered (confirmed by owner) | Supplier | `order_status_change` |
| Order cancelled | Owner | `order_status_change` |
| Cancellation requested | Supplier | `order_status_change` |
| Refund receipt uploaded | Owner | `refund` |
| Refund confirmed | Supplier | `refund` |
| Low stock (≤ 3 units) | Supplier | `warning` |
| Out of stock | Supplier | `warning` |
| Supplier auto-certified | Supplier | `certification` |
| New Halal certificate uploaded | Admin | `admin_message` |
| New supplier registered | Admin | `admin_message` |
| New restaurant owner registered | Admin | `admin_message` |
| New report submitted | Admin | `admin_message` |

The `NotificationBell` component in the top nav shows an unread count badge. Clicking opens `NotificationDropdown`, which marks notifications as read and supports deep-linking via the `link` column.

---

## Supplier Verification Flow

1. Supplier registers → `supplier_profiles` row created with `is_verified = false`.
2. Supplier uploads bank details → `on_bank_details_upsert` trigger fires `check_supplier_certification`.
3. Supplier uploads Halal certificate → Admin reviews it in the Certificates panel.
4. Admin approves certificate → `on_cert_approved` trigger fires `check_supplier_certification`.
5. `check_supplier_certification` checks: has approved cert **AND** has bank details → sets `is_verified = true` and sends a certification notification to the supplier.
6. Verified supplier's products appear in the public store.

---

## Rating System

- After an order split reaches `delivered` status, the owner can submit a 1–5 star rating.
- One rating per `order_split_id` (enforced by UNIQUE constraint).
- On INSERT into `supplier_ratings`, the `on_new_rating` trigger fires `update_supplier_avg_rating`, which recomputes `supplier_profiles.rating` as `ROUND(AVG(rating), 1)`.
- Ratings are publicly readable; only owners can insert.

---

## Report System

- Any authenticated user can submit a report of type `product`, `supplier`, `order`, `user`, or `restaurant`. When a supplier reports a restaurant owner, `OwnerProfileModal` passes `type="restaurant"` to `ReportModal` so the admin sees the correct type label in the Reports panel.
- On INSERT, `notify_admin_new_report` trigger notifies the admin.
- Admin reviews reports in the Reports panel, can mark them as `reviewed` or `dismissed`, and records an `admin_action` with timestamp.
- **Restaurant reports**: Admin `ReportsPage` handles both `type="restaurant"` and `type="user"` (both represent restaurant owners — `user` is the value stored in DB for this role). `fetchTarget()` queries `owner_profiles` by `.eq('user_id', report.target_id)` (not by `id`) and falls back to the `users` table if no owner profile is found. The type filter dropdown has an option for both `user` (labelled "Restaurant Owners") and `restaurant` (labelled "Restaurants (legacy)"). Type badges for both use orange. `isRestaurantType()` helper unifies logic so suspend/warn/view actions work for both type values. Warning `userId` resolution: `targetInfo.user_id || report.target_id` for restaurant types, `targetInfo.user_id` for supplier types. Both `banSupplierAccount` and `banRestaurantAccount` guard against `null`/`undefined` `user_id` with an early-return toast error.

---

## Chat System

### Supplier–Owner Chat
- Accessible from `/chat` (shared page).
- One conversation per supplier–owner pair (UNIQUE constraint).
- Supports text messages, file/image attachments (stored in `chat-attachments` bucket), and system messages linked to specific order splits.
- Conversations can be pinned by either party (`pinned_by_owner`, `pinned_by_supplier`).
- Live updates via Supabase Realtime on `messages` and `conversations` tables.
- `last_message_at` is updated automatically by the `on_new_message` trigger.
- **Reconnect on tab focus**: A `visibilitychange` listener re-runs `loadConversations()` and `loadAdminConv()` whenever the browser tab becomes visible, recovering gracefully from dropped WebSocket connections without requiring a full page reload.
- **German date strings**: `formatDistanceToNow` calls pass `{ locale: de }` from `date-fns/locale` when `lang === 'de'`, so message timestamps like "6 days ago" render as "vor 6 Tagen" in German.

### Admin Support Chat
- Users can message the admin directly from the platform.
- Separate tables: `admin_conversations` and `admin_messages`.
- Admin views all support conversations in the Admin Chat page.
- Supports attachments and real-time updates.
- Admin can **pin** conversations via the ⋮ menu — pinned chats sort first in the list and show a gold pin indicator **outside the avatar** (absolutely positioned over the outer wrapper, not clipped by the avatar's `overflow-hidden`); state persisted in `pinned_by_admin` column.
- Admin can **delete** a conversation (and all its messages) via the ⋮ menu with a confirmation modal.
- **User directory panel** at the top of the conversations list: two tabs — "Suppliers" and "Owners" — show all registered users of that role (business/restaurant name + avatar). Clicking any user immediately opens or creates an admin conversation with them, without needing to navigate to the Users page. Directory is fetched once on mount from `users` joined with `supplier_profiles` and `owner_profiles`.

---

## Delivery Fee Calculation

- Distance between owner's GPS coordinates and supplier's GPS coordinates is calculated client-side using the **Haversine formula** (`client/src/lib/haversine.js`).
- The result is matched against `delivery_fee_rules` tiers to determine the fee at checkout.
- Admin can manage tiers from the dashboard.

---

## Invoice Generation

- `client/src/lib/invoiceGenerator.js` generates PDF invoices for completed orders, **fully in German** (RECHNUNG, Rechnungsempfänger, Lieferant, Produkt, Menge, Einzelpreis, Zwischensumme, GESAMT, etc.).
- Per split: items subtotal + **`{rate}%` MwSt. (Lebensmittel)** line (percentage shown dynamically from `platform_settings.tax_rate`) + supplier total + payment method (Barzahlung bei Lieferung / Banküberweisung).
- `generateInvoice(order, splits, ownerProfile, taxRate = 0.07)` — accepts an optional `taxRate` parameter (fetched from `platform_settings` by the caller); falls back to 0.07 if not supplied.
- Grand total box shows the full order total across all suppliers.
- **Download mechanism**: uses `doc.output('blob')` + `URL.createObjectURL()` + a programmatic anchor click. This approach works reliably across browsers, iOS, and PWA contexts — `doc.save()` (jsPDF's internal method) is not used as it fails in certain mobile/PWA environments.
- `OrdersPage` wraps every `generateInvoice()` call in a try/catch that shows a bilingual `toast.error` on failure. `taxRate` is passed as a prop from `OrdersPage` into `OrderDetailView` (which is a module-scope component and cannot close over `OrdersPage` state directly).
- `OrderDetailView` displays `order.delivery_address` (JSONB: `label`, `street`, `postal_code`, `city`) below the `OrderTracker` in a card alongside the estimated delivery date. Uses `orderDeliveryAddress` i18n key (EN + DE). `MapPin` icon (Lucide) identifies the block visually.
- File saved as `ProCuro-Rechnung-<ID>.pdf` (invoices) or `ProCuro-Quittung-<ID>.pdf` (receipts).

---

## Frontend Pages

### Public (`/`)

| Page | Route | Description |
|---|---|---|
| LandingPage | `/` | Marketing homepage, navy/teal/marigold design system. Self-contained component with `wy-` prefixed scoped CSS (`<style>` block, zero Tailwind collision). Fonts: IBM Plex Sans (body) + Plus Jakarta Sans (display headings). **Frosted-glass sticky header** (`backdrop-filter: blur(16px)`, `.wy-scrolled` adds shadow/border past 20px scroll) with logo, centre nav, Login + Get Started CTAs, and a ≤900px right-slide mobile drawer. **Hero**: dark `#052532` background with **six rising blob orbs** (`wy-rise` keyframes `translateY(680px → -680px)` 15s desktop / `wy-rise-mobile` 28s mobile; colours marigold/celeste/herb/lionsmane/rose/lavender), `rgba(5,37,50,0.6)` overlay, centered 4-zone layout (eyebrow badge → H1 → subtitle+CTAs → trust badges). **Stats bar**: `IntersectionObserver` count-up, gradient text (midnight→teal). Category filter chips, horizontal product scroll (marigold `+` button), supplier grid with Halal badge, **How It Works** 3 lift-cards. **CTA "Take ProCuro Everywhere"**: same dark `#052532` + rising-orb animation as hero, marigold CTA + ghost buttons, 3 frosted-glass app-store badges (Coming Soon modal). **Mission section**: white `#fff` section between the app-store CTA and footer — `landingMissionLabel` eyebrow + `landingMissionQuote` blockquote (2-line clamped via `-webkit-line-clamp: 2`, comma-separated, no em-dash) + gradient divider bar; scroll-reveal animated, fully i18n'd (EN + DE). **Footer**: dark navy 4-col grid — column 1: ProCuro logo, three icon buttons (`TrendingUp → /about`, `Users → /suppliers`, `ShoppingBag → /products`), `heroSubtitle` text (2-line clamped); columns 2–4: COMPANY / RESOURCES / CONTACT link lists. Footer bottom bar: `footerCopyright` text centered (`justify-content: center`). Scroll-reveal via `.wy-reveal → .wy-reveal--visible` (threshold 0.12, stagger `d1–d5`). All strings i18n'd. Was previously prototyped as `/homepage-2` (LandingPage2.jsx, now removed). **Header (`.wy-header`)**: always white frosted glass (`rgba(255,255,255,0.88)` + `backdrop-filter: blur(16px) saturate(160%)`); on scroll (`.wy-scrolled`) becomes `rgba(255,255,255,0.97)` with border + shadow. All text/icon colours are dark at all times. `landingMissionQuote` blockquote has no line-clamp — full sentence always visible. Authenticated `Navbar` uses `bg-white/85 backdrop-blur-md` + `max-w-[1280px] mx-auto` inner container to match the landing page frosted-glass identity. |
| LoginPage | `/login` | Email/password login; Google OAuth button |
| SelectRolePage | `/select-role` | Role picker for new users (owner vs supplier) |
| RegisterOwnerPage | `/register` | Owner registration form |
| RegisterSupplierPage | `/register/supplier` | Supplier registration form with business fields |
| ResetPasswordPage | `/reset-password` | Supabase Auth password reset |
| SupplierListPage | `/suppliers` | Browseable list of verified suppliers with distance, rating, categories |
| SupplierProfilePage | `/supplier/:id` | Full supplier profile: bio, cities, Halal badge, products. Also mounted at `/owner/supplier/:id` (with `noShell` prop) so restaurant owners see it inside their layout with the sidebar intact. |
| ProductsListPage | `/products` | All active products across all verified suppliers |
| AboutPage | `/about` | Company information |
| CareersPage | `/careers` | Careers page |
| PressPage | `/press` | Press and media page |
| HelpCenterPage | `/help` | Help center with **10-item FAQ accordion** (click to expand/collapse) covering: what ProCuro is, account creation, supplier verification, payment methods, order tracking, cancellation, delivery fees, delivery disputes, GDPR/privacy, and account deletion. Fully bilingual (EN/DE via `t()` keys). Below the FAQ is the contact form (name, email, topic, message → mailto). |
| PrivacyPolicyPage | `/privacy` | Privacy policy |
| TermsOfServicePage | `/terms` | Terms of service |
| AccountDeletedPage | `/account-deleted` | Farewell page shown after successful account deletion; bilingual (EN/DE) with a warm goodbye message and a back-to-homepage button |

### Owner (`/owner/`)

| Page | Route | Description |
|---|---|---|
| StorePage | `/owner/store` | Browse verified suppliers and products by category; categories, sort options, and search placeholder are fully i18n'd (DE: Fleisch, Geflügel, etc.); "See All" button navigates to AllProductsPage. Shows an **incomplete profile warning** banner when any of the following are missing: phone number, city/location, Tax ID, or **bank details** (IBAN in `owner_bank_details`) — each missing field is listed by name with a "Complete Profile" button. **Browse mode layout order**: Categories → Recommended Products (filtered by selected category) → Recommended Suppliers — tapping a category icon immediately updates the product grid directly below, with suppliers as a secondary discovery section underneath. **Mobile grid**: `grid-cols-2` on mobile (2 cards per row) vs 1 column on desktop-equivalent; card image `h-28 sm:h-40`, padding `p-2.5 sm:p-4`, description hidden on mobile to keep cards compact. |
| AllProductsPage | `/owner/products` | Browse all products with category/search filter |
| CartPage | `/owner/cart` | Multi-supplier cart; payment method selection; delivery address picker; checkout. Bank transfer step shows full bank info (bank name, IBAN, BIC, account holder). All cart and payment labels are fully i18n'd (EN/DE): items subtotal, delivery, VAT, amount, upload receipt, place order, back, cash on delivery note, free delivery label. **Supplier name is a clickable button** — clicking it opens `SupplierProfileModal` with the supplier's full profile card inline. |
| OrdersPage | `/owner/orders` | Order history and status tracking per split; cancellation policy displayed inline under the cancel button. **Cancellation window: 5 days** from supplier confirmation (`updated_at`). Pre-confirmation → always cancellable. Within 5 days of confirmation → active red Cancel button. Past 5 days OR `out_for_delivery` → greyed Cancel button that fires a toast ("cancellation period has passed — supplier is preparing your order"). Policy note (Info icon + text) shown whenever the cancel area is visible. Dispute filing available after delivery. **OrderTracker stepper** shown at the top of order detail: 4 steps (Clock → Pending Confirmation, CheckCircle → Confirmed, Truck → Out for Delivery, Package → Delivered) connected by ChevronRight arrows; completed steps fill herb-green, active step fills midnight, future steps are slate; cancelled/disputed orders add a red XCircle terminal step. |
| ProfilePage | `/owner/profile` | Full profile editor. **Pen icon on avatar** opens a combined modal for choosing/generating an avatar AND editing the user's display name — no separate "Edit Profile" button. **Business Details card** shows Restaurant Name, Description, Tax ID, City, Cuisine Type, and Bank Details — all editable from one "Edit" button. Restaurant name and description are persisted to `owner_profiles`. City pills derived live from `addresses` (AddressContext). |
| AnalyticsPage | `/owner/analytics` | Spending trend, top products, pie chart of spending by category (donut fills the card, legend below in a wrapping row), top categories bar chart (category names translated, fixed 288px height matching the other charts), AI summary at the bottom; week/month/year + custom date-range filter (all labels i18n'd) |

**Ban enforcement in OwnerLayout**: When `users.is_banned = true` for the logged-in owner, a dark red banner appears at the top of every owner dashboard page. All sidebar navigation links (Store, Cart, Orders, Analytics, Profile) are replaced with greyed-out non-clickable spans. The main content area is replaced with an "Account Banned" message and a button directing the user to Chat — the only feature that remains accessible. The layout adjusts its top padding dynamically based on how many banners (deactivated + banned) are visible simultaneously.

**Banned suppliers — restaurant owner view**: When an owner is browsing or interacting with a **supplier** whose user has `is_banned = true`, the owner still sees the supplier's existence everywhere (browse, profile, past orders, chat) but cannot place new orders:

| Surface | Behaviour |
|---|---|
| `SupplierListPage` (`/suppliers`) | Card shows a red "Banned" badge alongside Halal/Pending badges |
| `SupplierProfilePage` (`/supplier/:id`) | Big red banner at top: "This supplier has been banned…"; Add-to-cart buttons on every product become disabled (opacity 60, no click handler) |
| `AddToCartModal` | Fetches `supplier_profiles.users.is_banned` on mount; if true, shows an inline red banner and the "Add to Cart" button is disabled with the label replaced by "Banned" |
| `CartPage` | Joins all suppliers in the cart to `users.is_banned`; banned suppliers' grouped cart sections get a red border, "Banned" badge in the header, and a per-group warning row. The "Continue to Payment" button is disabled while any banned-supplier items remain in the cart |
| `ChatPage` (owner side) | The supplier's row in the conversation list and the open conversation both surface the banned status; the active conversation shows a red strip above the message list: "This supplier's account has been banned. Past orders remain accessible but new orders cannot be placed." Chat remains fully usable |
| `OrdersPage` (owner) | Past orders from a banned supplier remain visible and clickable. Clicking the supplier name still opens `SupplierProfileModal`, which now displays a red "Banned" pill and a red banner row explaining the supplier was banned |
| `SupplierProfileModal` | Same as profile page — fetches `users.is_banned`, shows red badge + banner inline |

All ban checks read `supplier_profiles → users(is_banned)` via Supabase's foreign-key embedding syntax (`users:user_id(is_banned)`), so the ban state propagates automatically once the admin toggles `users.is_banned`.

**Stock floor enforcement in `AddToCartModal` and `CartPage`**: `AddToCartModal` derives `stockQty` from `product.stock_quantity` and treats the product as out-of-stock when `stockQty === 0` (even if `is_active = true`). The `+` quantity button is disabled and clamped at `stockQty` so the owner cannot select more than available stock before adding to cart. A parallel cap in `CartContext.addItem` prevents the accumulated cart quantity from exceeding `stock_quantity` when the same product is added multiple times. The cart-page `+` button applies the same ceiling so the limit holds even after the modal is closed. Zero-stock products render a "Currently Out of Stock" banner and an "Unavailable" (disabled) primary button instead of the quantity selector.

**Banned restaurant owners — supplier view (mirror)**: When a restaurant owner has `users.is_banned = true`, the supplier sees the ban surfaced in two places:

| Surface | Behaviour |
|---|---|
| `OwnerProfileModal` (used by Supplier OrdersPage when viewing an order's owner card, and by ChatPage when tapping the owner avatar) | Fetches `users.is_banned`; if true, shows a red "Banned" pill under the owner's name + a red banner row inside the modal with the banned message |
| `ChatPage` (supplier side) | When the open conversation's owner has `is_banned = true`, shows a red strip above the message list: "This restaurant owner's account has been banned. Past orders remain accessible but no new orders can be placed." Chat remains usable so the supplier can still communicate |

**Germany Dot Map — real outline**: The map SVG was updated to `client/public/Deutschland.svg` (443 × 599 px, viewBox `0 0 443 599`). The component renders it as an `<image>` element inside its own SVG and projects address dots onto it using Mercator-vertical + equirectangular-horizontal projection with mainland bounds `lat 47.27–55.06, lng 5.87–15.04`. Each dot represents one saved `addresses` row (not one user), so a supplier or owner with multiple addresses appears as multiple distinct dots. Dot radius 5 units, colour-coded by role (supplier = `#083A4F` midnight, restaurant owner = `#A58D66` marigold), white stroke.

### Supplier (`/supplier/`)

| Page | Route | Description |
|---|---|---|
| DashboardPage | `/supplier/dashboard` | Overview: pending orders count, revenue KPIs, quick actions. **Active Orders** count uses the same ONGOING statuses as OrdersPage (`pending_payment`, `pending_confirmation`, `confirmed`, `out_for_delivery`, `cancellation_requested`, `delivery_dispute`) — `refund_uploaded` and `completed` are excluded so the badge always matches the "Ongoing" tab count. **Account status banner** shows when any of the following are incomplete: Halal certificate (approved), bank details (IBAN), business address, or city. The banner lists each item with a checkmark (complete) or alert icon (missing) and "Go →" shortcuts. The "all complete" green banner requires bank details in addition to the other checks. |
| ProductsPage | `/supplier/products` | Product catalog CRUD: add, edit, toggle active, manage stock; soft-delete with confirmation modal (sets `deleted_at` + `deleted_by`, removes from list without destroying order history); delivery fee table loaded live from `delivery_fee_rules` DB table. **Dual layout**: Mobile (`md:hidden`) shows product cards with image, name, category, price, status badge, and a **⋮ menu** (in-stock/out-of-stock toggle, edit, delete) as the call-to-action. Desktop (`hidden md:block`) shows the full table where clicking any row opens the edit modal. |
| OrdersPage | `/supplier/orders` | Incoming order management: confirm, ship, deliver, cancel, upload refund. **OrderTracker stepper** shown at the top of each order detail view: 4 steps (Clock → Pending Confirmation, CheckCircle → Confirmed, Truck → Out for Delivery, Package → Delivered) connected by ChevronRight arrows; completed steps fill herb-green, active step fills midnight, future steps are slate; cancelled/disputed orders append a red XCircle terminal step. Mirrors the same tracker shown to the restaurant owner. |
| BankDetailsPage | `/supplier/bank-details` | IBAN, BIC, account holder management |
| ProfilePage | `/supplier/profile` | Full supplier profile editor. **Pen icon on avatar** opens a combined modal for choosing/generating an avatar AND editing the user's display name — no separate "Edit Profile" button. **Certificates card** appears directly below the My Sales / View Analysis action buttons — suppliers see their cert status, upload new certificates, edit or delete existing ones, and view signed certificate PDFs without leaving the page. **Business Details card** (below Certificates) shows Business Name, Description, Tax ID, City, Categories, and Bank Details — all editable from one "Edit" button. **Halal certification badge** (green "Halal Certified" / amber "Certificate Under Review" / red "Not Certified") appears under the supplier name in the profile header, always visible. **Account Active badge** inside Business Details shows completeness based on tax ID + city + bank — independent of Halal cert status. The standalone `/supplier/certificates` route has been removed; all certificate management is consolidated into this page. |
| AnalyticsPage | `/supplier/analytics` | Revenue trend, category breakdown, top products, top clients, AI summary; week/month/year + custom date-range filter. **Revenue by Product** horizontal bar chart: `height={240}`, `margin={{ top: 8, right: 10, left: 0, bottom: 8 }}` so top and bottom bars are never clipped by the container edge; YAxis `width={90}` for long product names. **Top Restaurant Clients** bar chart: labels are angled (−35°) with truncation at 14 chars; Y-axis uses integer ticks only (`allowDecimals={false}`). **Date bucketing**: span ≤ 60 days → daily (YYYY-MM-DD) buckets; span > 60 days → monthly (YYYY-MM) buckets — so Week and Month views show per-day bars, Year view shows per-month bars. **Sales by Product %** donut chart fills the card width with legend below (same fixed-height flex-column pattern as owner analytics). |

### Admin (`/admin/`)

| Page | Route | Description |
|---|---|---|
| AdminLoginPage | `/admin/login` | Separate admin login page |
| DashboardPage | `/admin/dashboard` | Platform KPIs (title: "Overview"): GMV, user count, order count. Charts: Platform GMV Over Time (filtered), **Orders by Status (column/bar chart — one bar per status, colour-coded)**, **Orders by Payment Type** (COD vs Bank Transfer donut — left column), **User Growth** (cumulative line chart — right column), **City Comparison (radar/spider chart, all cities)** + **Germany Dot Map**. Both location charts merge two sources — each user's home city from `supplier_profiles`/`owner_profiles` (where most users live, with coordinates) **and** every row in the `addresses` table (relocations) — deduplicated per `(user, city)`. So a relocated user appears as one dot per distinct city, and every listed city shows on the radar (not just cities that have address rows). AI summary. Week/month/year + custom date-range filter on all charts. |
| UsersPage | `/admin/users` | List all users; ban/unban; delete; view details; deleted accounts log. Per-row actions (View, Chat, Send Notification, Toggle Listing, Reset Password, Ban/Unban, Delete) are collapsed into a single **⋮ menu**. **Mobile card layout** (`md:hidden`): each user renders as a compact card showing name, email, role badge, status badges (Banned/Active + Listed/Unlisted), and the ⋮ menu — replaces the wide table on small screens. Desktop shows the full table (`hidden md:block`). Same dual-layout for the Deleted Accounts tab. |
| SuppliersPage | `/admin/suppliers` | List suppliers; verify/unverify; activate/deactivate |
| OrdersPage | `/admin/orders` | Platform-wide order list with status filters |
| ProductsPage | `/admin/products` | Two tabs — **Active** (`deleted_at IS NULL`) and **Deleted** (`deleted_at IS NOT NULL`), mirroring the Users page Active/Deleted pattern. Active tab: activate/deactivate, view details, soft-delete with confirmation modal (sets `deleted_at`, moves the product to the Deleted tab). Deleted tab: archived products with supplier, category, price, deletion date, and a **Restore** button. Soft-deleted products are preserved in `order_items` so analytics retain history. **Mobile card layout** (`md:hidden`) for both tabs: Active card shows product name, supplier, price, status badge, and View/Toggle/Delete icon buttons; Deleted card shows name, supplier, price, deletion date, and Restore button. Desktop shows the full table (`hidden md:block`). |
| CertificatesPage | `/admin/certificates` | Certificate review queue: approve or reject with reason. **Mobile card layout** (`md:hidden`): each cert shows supplier name, status badge, city + upload date, and a "Review →" tap target — clicking opens the review modal. Desktop shows the full table. |
| ReportsPage | `/admin/reports` | Abuse report queue: review, record action, dismiss. Supports all report types: `product`, `supplier`, `restaurant`, `order`, `user`. ActionModal shows who filed the report ("Reported by"), the target details, and role-appropriate actions — warns/bans for suppliers, warns/suspends for restaurant accounts, deletes for products. Type filter dropdown includes all types including `restaurant`. Type badges are colour-coded (blue = product, purple = supplier, orange = restaurant). |
| AdminChatPage | `/admin/chat` | Support chat with all users (admin_conversations). **User directory** at the top of the left panel: Suppliers / Owners tabs list every registered user by business name — click to instantly open or create a conversation (calls `openOrCreateConv(userId)`). Each conversation row has a **⋮ menu** with **Pin** (toggles `pinned_by_admin`, shows gold pin indicator outside the avatar so it is not clipped by `overflow-hidden`, sorts pinned chats to top) and **Delete** (confirmation modal). Delete uses a modal overlay. Mirrors the user ChatPage ⋮ menu pattern. |
| DeliveryFeesPage | `/admin/delivery-fees` | CRUD for `delivery_fee_rules` table — add, edit, and delete distance-based delivery fee tiers; changes are reflected live in the supplier Products page delivery fee table. **Tax rate section** at the bottom: displays the current VAT rate from `platform_settings` and allows the admin to edit it via a modal (value stored as a decimal in DB, displayed as a percentage in the UI) |

### Shared

| Page | Route | Description |
|---|---|---|
| ChatPage | `/owner/chat` and `/supplier/chat` | Supplier–owner real-time messaging; shared component rendered inside OwnerLayout and SupplierLayout respectively; per-conversation delete via modal overlay with pin/unpin. **Reconnect on tab focus**: a `visibilitychange` listener reloads conversations and messages whenever the tab becomes visible, preventing stale state after the browser suspends the Supabase Realtime WebSocket. **German date strings**: all `formatDistanceToNow` calls pass `{ locale: de }` when the active language is DE, so timestamps display in German ("vor 6 Tagen" etc.). |

---

## Frontend Components

### Layout
- `Navbar` — Top navigation; role-aware links; `NotificationBell`; language toggle. **Address selector** is responsive: on mobile (< `md`), shows a `MapPin` icon + truncated city/label text (max 72px) so owners can see their selected delivery location at a glance; on desktop shows the full "Delivered to / address" two-line button. Click-outside detection uses a shared `ref`.
- `Footer` — Site-wide footer with links
- `OwnerLayout` — Wrapper with owner sidebar navigation. **Live orders badge** on the "Orders" nav item (both desktop and mobile drawer): counts `order_splits` in ONGOING statuses (`pending_payment`, `pending_confirmation`, `confirmed`, `out_for_delivery`, `refund_uploaded`, `cancellation_requested`, `delivery_dispute`) joined through `orders.user_id`; no count for completed/cancelled splits. Updates via Supabase Realtime subscription on `order_splits`. In collapsed desktop mode, the badge renders as a small absolute-positioned dot (`top-1 right-1`).
- `SupplierLayout` — Wrapper with supplier sidebar navigation. **Live orders badge** on the "Orders" nav item: counts `order_splits` in ONGOING statuses filtered by `supplier_id` (the supplier_profiles row id). Realtime subscription filtered to `supplier_id=eq.{id}` for minimal noise. Badge position adapts to collapsed sidebar (absolute dot) vs expanded (right-aligned pill).
- `AdminLayout` — Wrapper with admin sidebar navigation. **Live certificates badge** (amber) on the "Certificates" nav item: counts `halal_certificates` where `status = 'pending'`; updates via Realtime subscription on `halal_certificates`. Joins existing red reports badge and green unread-chat badge in the sidebar, each independently tracked.

### Routing
- `ProtectedRoute` — Redirects unauthenticated users to `/login`; enforces role access. Uses `loading || profileLoading` to avoid a flash of the SelectRole page during the async gap between `setAuthUser` and `setProfile` (React 18 batching only applies within the same synchronous block).
- `PublicOnlyRoute` — Redirects authenticated users to their dashboard

### Profile
- `AvatarModal` — Combined avatar + name editor. **Name field** at top edits `users.full_name` (saved alongside avatar on submit). Two avatar tabs: **"Choose a photo"** (upload from device → `avatars` bucket as `{userId}/avatar.{ext}`) and **"Generate Avatar"** — cycles through all **30 pre-defined DiceBear avatars** without repetition (Fisher-Yates shuffle on mount; reshuffles after all 30 are shown). On save, calls `update_own_avatar(p_url)` SECURITY DEFINER RPC + `users.update({full_name})`. All labels fully i18n'd.
- `DeleteAccountModal` — Confirmation dialog for account deletion
- `Modal` — Base modal wrapper
- `OwnerProfileModal` — Supplier-side modal showing an owner's details when viewing their order
- `SupplierProfileModal` — Owner-side modal for supplier details
- `PasswordModal` — Change email & password modal. Email section shows current email pre-filled with an inline "Change" sub-popup (no password required) for entering a new email. Password section (New Password + Confirm) is independent and unchanged.
- `PhoneModal` — Update phone number form; shows formatted current phone above the input. The `+49` country code is rendered as a fixed non-editable prefix pill (outside the `<input>`); the editable field only accepts the digits after it, auto-spaced as `NNN XXXXXXXX` on every keystroke. On save, stores as `+49 NNN XXXXXXXX`. The input container has `border border-slate-200 rounded-xl` (matching every other input on the site) with `focus-within:ring-2 focus-within:ring-herb` on focus; the `<input>` itself has `border-0 outline-none` so no native iOS underline border bleeds through. Phone display formatting is provided by the shared `formatPhone(raw)` helper in `client/src/lib/formatPhone.js` (handles both `+49XXXXXXXXX` and local `0XXX XXXXXXX` formats) — imported here and reused by the owner/supplier profile pages, the owner profile modal, and the public supplier profile (previously each defined its own copy).
- `SettingRow` — Reusable row component for the settings card; accepts optional `value` prop to show a secondary value (used to display formatted phone number)

### Store
- `ProductCard` — Product listing card with add-to-cart
- `AddToCartModal` — Quantity selector and unit type confirmation before adding to cart

### Supplier
- `ProductForm` — Add/edit product form with image upload

### Charts (Recharts)
- `RevenueChart` — Monthly revenue area chart (also used as Platform GMV Over Time, owner Spending Trend, supplier Revenue Trend); stroke and gradient use brand herb `#407E8C`; buckets by day for ≤ 60-day ranges, by month for longer ones. All three charts only count `delivered` or `completed` order_splits; all time periods in the selected range are rendered with 0 for empty periods so the timeline is always continuous. Dates use browser-local time (not UTC) to avoid timezone mismatch on the x-axis.
- `CategorySalesChart` — Category revenue horizontal bar chart
- `TopProductsChart` — Top products by revenue; bar fill uses brand midnight `#083A4F`.
- `OrdersByStatusChart` — **Column/bar chart** showing order-split status distribution (admin) — one bar per status, each using a unique brand token: marigold-light `#BFA988` (pending_payment) → marigold `#A58D66` (pending_confirmation) → celeste `#C0D5D6` (confirmed) → herb-light `#5E96A4` (out_for_delivery) → herb `#407E8C` (shipped) → midnight-light `#1B5468` (delivered) → midnight `#083A4F` (completed) → red `#EF4444` (cancelled); x-axis labels angled −35°; replaced the previous Treemap.
- `UserGrowthChart` — Cumulative line chart of owners + suppliers, fed by `users.created_at` grouped by month and filtered by the active date range (admin); owners line uses midnight `#083A4F`, suppliers line uses marigold `#A58D66`.
- `PaymentTypeChart` — Donut + breakdown card showing Bank Transfer vs Cash on Delivery counts and GMV (admin); bank transfer uses midnight `#083A4F`, cash on delivery uses marigold `#A58D66`; replaced the old Certificate Status card.
- `CityComparisonRadar` — Radar (spider) chart showing **all** cities in the system (no cap). Two filled Radar series: Suppliers (midnight `#083A4F`) and Owners (marigold `#A58D66`). The `PolarRadiusAxis` uses `domain={[0, maxVal]}` where `maxVal` is derived from the actual highest data value, so the axis rings always reflect the real maximum rather than a rounded "nice" number. Label font size shrinks to 8px when more than 12 cities are present. Cities outside Germany are included. Sorted by combined count descending.
- `GermanyDotMap` — Germany outline loaded from `/public/Deutschland.svg` (443 × 599 px) as an `<image>` inside an SVG. Renders **one dot per `(user, city)` location**, sourced from both profile home cities and the addresses table (see Admin DashboardPage). Colour-coded by role: supplier = `#083A4F` (midnight), restaurant owner = `#A58D66` (marigold). lat/lng → SVG coordinates via Mercator-vertical + equirectangular-horizontal projection using mainland bounds `lat 47.27–55.06, lng 5.87–15.04`, scaled to the 443-unit viewBox. Dots that project to the same point (multiple users in one city) **fan out into a small ring** so each stays individually visible. Coordinates are resolved through a `city → {lat,lng}` lookup learned from single-city rows that carry coords, with a fallback table of major German cities. Hover shows city name + role tooltip.
- `SupplierVerificationChart` — Defined but currently **unused** (not imported by any page). Intended to show verified vs unverified supplier breakdown; the analytics RPC it was built for (`get_supplier_verification_breakdown`) was dropped in migration 017.
- `DateRangeFilter` (in `components/ui/`) — Reusable presets (This Week / This Month / This Year) plus a custom from-to date picker. Drives the analytics queries on owner, supplier, and admin pages. All labels (presets, custom range header, From/To, Clear, Apply) are fully i18n'd via `t()`.

### AI
- `AnalyticsSummary` — AI insight card with cache indicator and force-refresh button; refresh is disabled (dimmed) for 24 hours after the last generation — the button re-enables only once the `ai_insights_cache` TTL expires. **Language-aware**: regenerates automatically whenever the active language differs from the language the cached summary was generated in — both for in-session switches (via `prevLanguage` ref) and post-navigate remounts (via `localStorage` key `procuro_ai_lang`).
- `ChatbotFAB` — Floating action button that opens the AI assistant. Hidden on `/select-role` (onboarding page) and all `/chat` routes.
- `ChatbotDrawer` — Slide-in chat drawer for AI assistant. **Language-aware**: welcome message and suggestion chips are in the active language (EN/DE); sends `language` to the backend so Gemini responds in the selected language. Send button is wider on mobile. **Markdown rendering**: `FormattedMessage` parses bold (`**`), italic (`*`), and inline links (`[text](url)`); internal `/supplier/id` links use React Router `<Link>`, external links open in a new tab. Pre-normalizes the text to collapse `]\n(` sequences that can appear when the AI wraps a link across a line break. **Safe-area header**: on mobile the drawer is full-screen (`inset-y-0 right-0 w-full`); the header uses `paddingTop: calc(1rem + var(--sat))` so it clears the phone status bar and the X close button is always tappable. **Safe-area input**: the input bar uses `paddingBottom: calc(0.75rem + var(--sab))` where `--sab: max(env(safe-area-inset-bottom, 0px), 12px)` — guarantees at least 12px breathing room on all mobile browsers, more on notched devices.

### UI
- `Badge` — Generic badge/chip component
- `Card` — Base card layout
- `ChatIcon` — Chat icon with unread count badge
- `CookieConsent` — GDPR cookie consent banner
- `HalalBadge` — Green Halal certification badge
- `ModalPortal` — React portal for modals (prevents z-index issues)
- `NotificationBell` — Bell icon with unread count; opens `NotificationDropdown`
- `NotificationDropdown` — Notification list with read/unread state and deep-links
- `PWAInstallPrompt` — Progressive Web App install prompt
- `ReportModal` — Abuse report submission form. Types: `product`, `supplier`, `order`, `user`, `restaurant`. The `restaurant` type is used when a supplier reports a restaurant owner; `OwnerProfileModal` now passes `type="restaurant"` so the admin sees the correct report type.
- `Skeleton` — Loading skeleton placeholders
- `StatusBadge` — Color-coded order status badge, **language-aware** via `useLanguage()`: maps each status slug to a `t('statusXxx')` key so labels render in the active language (EN/DE). Statuses covered: `pending_payment`, `pending_confirmation`, `pending`, `confirmed`, `shipped`, `out_for_delivery`, `delivered`, `refund_uploaded`, `completed`, `cancellation_requested`, `cancelled`, `verified`, `approved`, `rejected`.

---

## React Contexts

| Context | File | Provides |
|---|---|---|
| `AuthContext` | `context/AuthContext.jsx` | `user`, `authUser`, `profile`, `role`, `loading`, `profileLoading`, `signIn`, `signOut`, `refreshProfile`, `updateProfileState`. The provider `value` is memoized (`useMemo`) and the `onAuthStateChange` handler only refetches the profile when the **user id actually changes** — Supabase fires `SIGNED_IN`/`TOKEN_REFRESHED` on every tab refocus, so unconditional refetching previously caused a refetch storm. The profile query is deferred out of the auth callback (`setTimeout(0)`) to avoid the documented `onAuthStateChange` deadlock; `profileLoading` is set to `true` before the deferred fetch and `false` after, so `ProtectedRoute` shows a spinner rather than flashing `/select-role`. In `signIn()`, the profile is fetched before calling `setAuthUser`/`setProfile` so both state updates are batched into one render (no flash). |
| `AddressContext` | `context/AddressContext.jsx` | Address book CRUD, default address management. When a new address is added, automatically syncs the city into `supplier_profiles.city` / `owner_profiles.city` (appending to the comma-separated list if not already present) so the Business Details card reflects new addresses immediately without requiring an edit+save cycle. |
| `CartContext` | `context/CartContext.jsx` | Cart items, add/remove/clear, grouped by supplier. Persisted to **`localStorage`** (`procuro_cart` key) — cart survives page navigation within the same browser session but does not sync across devices or tabs |
| `LanguageContext` | `context/LanguageContext.jsx` | `lang` (`en`/`de`), `t(key)` translation function, persisted to `localStorage` |

---

## Client Libraries (`client/src/lib/`)

| File | Purpose |
|---|---|
| `supabase.js` | Initialises the Supabase JS client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| `gemini.js` | Client-side helpers: `askGemini(prompt, context, token, { language })` for chat; `getAnalyticsSummary(context, token, { force, language })` for analytics — both pass `language` to the backend |
| `geocode.js` | Reverse geocoding via browser Geolocation API + OpenStreetMap Nominatim |
| `haversine.js` | Haversine great-circle distance formula (returns km) |
| `formatIBAN.js` | Formats raw IBAN string with spaces (e.g. `DE89 3704 0044 …`) |
| `formatPhone.js` | Normalises phone number display |
| `invoiceGenerator.js` | Generates downloadable PDF invoices for completed orders |

---

## Internationalisation (i18n)

- Two languages: **English** (`en`) and **German** (`de`).
- Dictionary-based: `LanguageContext` holds a key–value map (~200+ keys); all UI strings use `t('key')`.
- **All toast messages are fully bilingual** — every `react-hot-toast` call across all 25+ pages and components (`ProductCard`, `AddToCartModal`, `ReportModal`, `PhoneModal`, `PasswordModal`, `AvatarModal`, all admin pages, all supplier pages, all owner pages, LoginPage, ChatPage, etc.) uses `t()` keys. Dynamic toasts with user data (e.g. product name, email) interpolate the translated static part: `` `${product.name} ${t('addedToCart')}` ``. Admin-only pages (AdminLoginPage, AdminChatPage, all 6 admin panel pages) had `useLanguage` added in this update. ~120 new toast keys added to both EN and DE blocks in `LanguageContext.jsx`.
- Language is toggled in the Account Settings card and persisted in `localStorage`.
- On toggle, `<html lang>` is updated for screen readers and OS integrations.
- No page reload; no third-party library.
- **Coverage (as of May 2026):** Login/Register/Role-select flows, Reset Password, Navbar address dropdown, Owner Store (search placeholder, categories, sort options, "See All" button at bottom of Recommended Products), AllProducts, Public Products List, AddToCartModal, Cart & Checkout (items subtotal, delivery, 7% MwSt., amount, upload receipt, place order, back, "Continue to Payment", cash on delivery note, free delivery label, bank transfer fields: bank name / IBAN / BIC / account holder), Owner Orders (full lifecycle), Owner Analytics (chart titles, KPI labels, category names, date-range filter), Supplier Dashboard, Supplier Analytics (chart titles, KPI labels, date-range filter), Supplier Orders, Supplier Products (delivery fee table, delete modal), Supplier Bank Details, SupplierListPage, ChatPage ("No conversations yet", "No messages yet", "Type a message…", "Visit a supplier…"; date/time strings use German locale when DE is active via `date-fns/locale/de`), ChatbotDrawer (welcome message, suggestion chips, placeholder), Notifications bell, **all profile modal titles** (Edit Profile, Manage Addresses, Bank Details, Business Details, Upload/Edit Certificate, Update Profile Picture — both owner and supplier ProfilePage), **order status labels** (pending_payment → Zahlung ausstehend, confirmed → Bestätigt, delivered → Geliefert, cancelled → Storniert, etc. — via language-aware `StatusBadge`), **avatar modal** (Choose a photo, Generate Avatar, Generating…), AI Insights (auto-regenerates in active language on toggle). Meta description and Open Graph tags in German.
- **Category name translations** — DB category names (Meat/Poultry/Seafood/Dairy/Vegetables/Fruits/Bakery/Beverages/Spices/Other) are translated everywhere they appear in the UI via `catMeat`/`catPoultry`/… keys; DB values remain English for query filtering. Dictionary has **470+ keys** (EN+DE, including ~120 toast message keys).

---

## Progressive Web App (PWA)

- `PWAInstallPrompt` component intercepts the browser's `beforeinstallprompt` event and shows a custom install CTA.
- Allows users to add ProCuro to their home screen on Android and desktop Chrome.
- **Early event capture fix**: `beforeinstallprompt` fires very early in the page lifecycle — often before React has mounted and `useEffect` has run — causing the banner to never appear. `main.jsx` now registers a global listener (`window.__pwaInstallEvent`) before `ReactDOM.createRoot`, so the event is never missed. `PWAInstallPrompt` reads `window.__pwaInstallEvent` on mount; falls back to a live listener for cases where the event fires later.
- **SW update toast** (`main.jsx` `onNeedRefresh`): only appears when a **new version is deployed** and the browser has downloaded the new service worker in the background. There is no bug — if no update toast is visible, the app is already on the latest version.
- **Service-worker updates are prompt-based** (`registerType: 'prompt'`, `vite.config.js`). The SW never auto-reloads; instead `main.jsx` registers it explicitly (`virtual:pwa-register`) and shows a small "A new version is available — Update" toast that reloads only when the user clicks it. This replaced `registerType: 'autoUpdate'`, which force-reloaded the page on every detected SW change — and because browsers re-check for SW updates on every tab refocus, that produced a repeated reload loop when returning to the tab.
- **Precache** (`workbox.globPatterns`) covers app JS/CSS/HTML/icons; `og-image.png` is excluded via `globIgnores` since it is only used for social link previews. App icons are served at sensible sizes (favicon 16/32 px, `apple-touch-icon` 180 px, PWA icon 512 px) so the offline precache stays small (~2.7 MB, down from ~5.8 MB).
- **iOS safe area**: `index.html` sets `viewport-fit=cover` so the app extends edge-to-edge on notched iPhones. `apple-mobile-web-app-status-bar-style: black-translucent` makes the status bar transparent. The CSS variable `--sat = env(safe-area-inset-top, 0px)` is defined in `index.css`. Every fixed/sticky bar receives `padding-top: var(--sat)`: the `<nav>` in `Navbar.jsx`, the `<header>` in `AdminLayout`, and all three mobile side drawers (`AdminLayout` sidebar, `OwnerLayout` drawer, `SupplierLayout` drawer). All layout content-area offsets in `OwnerLayout` and `SupplierLayout` use `calc(Xrem + var(--sat))` so content stays flush on all devices. **All 9 public pages** (About, Help Center, Privacy Policy, Terms, Press, Careers, Supplier List, Products List, Reset Password) also use `calc(4rem + var(--sat))` as inline `paddingTop` style (replacing `pt-16`) so the back-button and page title are never hidden behind the Navbar on devices where `--sat > 0`.
- **Mobile browser scroll (app-shell pattern)**: Both `SupplierLayout` and `OwnerLayout` use the app-shell pattern where `<main>` is the scroll container instead of `<body>`. `<main>` receives `overflow-y-auto` and a computed `height: calc(100dvh - navbarH - bannerH - var(--sat))`. `100dvh` (dynamic viewport height) adjusts as the browser chrome auto-shows/hides, so content is always reachable and the sidebar stays pinned. `pb-24 lg:pb-6` on the inner content wrapper ensures the last item clears the mobile browser toolbar. Additionally, `html { overflow-x: hidden }` is now set alongside `body { overflow-x: hidden }` to prevent the BFC that body-only `overflow-x: hidden` can create on iOS Safari.

---

## Performance & Optimization

This section documents the load-speed and stability work, organized by the symptom each fix addresses.

### Fixing the "page reloads repeatedly on tab return" loop

Returning to the browser tab caused the app to reload over and over (~every 2 s) on every page. Three compounding client-side causes were addressed:

1. **PWA auto-update** (primary) — `registerType: 'autoUpdate'` force-reloaded the page whenever the browser detected a "new" service worker, and browsers re-check for SW updates on tab refocus. Switched to `registerType: 'prompt'` with an explicit, user-triggered update toast (see PWA section). A prompt-mode SW only `skipWaiting()`s on an explicit message, so it can no longer auto-reload.
2. **Auth refetch storm** — `AuthContext` re-ran a 3-table profile join and reset all auth state on **every** `onAuthStateChange` event (Supabase fires `SIGNED_IN`/`TOKEN_REFRESHED` on focus). Now guarded by a user-id ref so the profile only refetches when the user actually changes; the context `value` is memoized so consumers stop re-rendering on token refresh.
3. **ChatPage visibility refetch** — the `visibilitychange` handler that reloads conversations (to recover dropped WebSockets) is now throttled to at most once per 5 s so rapid focus/blur cycles can't trigger a refetch loop.

### Faster initial load

- **Favicon**: the icon in `index.html` was a 1 MB `Picture1.png` loaded on every page. Replaced with dedicated 32 px / 16 px favicons (~1 KB total).
- **Image weight**: `ProCuroIcon.png` (970 KB → 233 KB, resized to 512 px), `apple-touch-icon.png` (758 KB → 26 KB, resized to 180 px), `Deutschland.svg` (208 KB → 112 KB via SVGO). Unused `germany.svg` (365 KB) and the orphaned `Picture1.png` were removed. Public-asset weight dropped from ~3.9 MB to ~0.6 MB.
- **Code splitting**: routes are already lazy-loaded via `React.lazy` in `App.jsx`; heavy report/export libraries (`jspdf`, `html2canvas`) and the date-range filter only load on the routes that use them.

### Database

The database itself was confirmed **not** to be the source of slow page loads — the largest application table holds ~100 rows, so query time is negligible. The DB changes below are scale/quality/security hardening, not latency fixes: the RLS init-plan rewrite (53 policies), the 12 foreign-key cover indexes, and the storage-bucket listing lockdown (see the respective sections above).

> **Known deferred items (Supabase advisories, low priority):** `multiple_permissive_policies` (~29) — multiple permissive RLS policies on the same table/action; safe to leave on a small dataset and risky to merge automatically because several mix `FOR ALL` admin policies with `FOR SELECT` user policies. `security_definer_function_executable` (~44) — flags `SECURITY DEFINER` helpers (e.g. `get_my_role()`) executable by `anon`/`authenticated`; these are required for RLS evaluation and should not be revoked without review. `auth_leaked_password_protection` — enable HaveIBeenPwned password checking in the Supabase Auth dashboard. Database region is `ap-northeast-2` (Seoul); end users in Germany see ~250 ms round-trips, but the region was intentionally kept.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, TailwindCSS 3, Lucide icons, Recharts |
| State / data | Supabase JS SDK (Postgres + Auth + Storage + Realtime), React Context |
| Backend | Express on Node (`server/`) for local dev; Netlify Functions for production AI endpoints |
| Database | Supabase (PostgreSQL 17.6) with Row-Level Security on all tables |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) — with automatic fallback chain |
| Hosting | Netlify (frontend + serverless functions) |
| Notifications | `react-hot-toast` for toast UX; Postgres-backed in-app notifications |
| PDF | Client-side invoice generation |
| i18n | Custom dictionary-based EN/DE translation via React Context |

---

## Project Structure

```
ProCuro/
├── client/                     React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── owner/          Profile, Orders, Store, Cart, AllProducts, Analytics
│       │   ├── supplier/       Profile, Dashboard, Orders, Products, Analytics,
│       │   │                   Certificates, BankDetails
│       │   ├── admin/          Login, Dashboard, Users, Suppliers, Orders, Products,
│       │   │                   Certificates, Reports, Chat, DeliveryFees
│       │   ├── public/         Landing, Login, Register (Owner/Supplier), SelectRole,
│       │   │                   ResetPassword, SupplierList, SupplierProfile, ProductsList,
│       │   │                   About, Careers, Press, HelpCenter, PrivacyPolicy, Terms,
│       │   │                   AccountDeleted
│       │   └── shared/         Chat
│       ├── components/
│       │   ├── ai/             AnalyticsSummary, ChatbotFAB, ChatbotDrawer
│       │   ├── charts/         RevenueChart, CategorySalesChart, TopProductsChart,
│       │   │                   OrdersByStatusChart, UserGrowthChart, PaymentTypeChart,
│       │   │                   CityComparisonRadar, GermanyDotMap
│       │   ├── layout/         Navbar, Footer, OwnerLayout, SupplierLayout, AdminLayout
│       │   ├── profile/        AvatarModal, DeleteAccountModal, Modal, OwnerProfileModal,
│       │   │                   PasswordModal, PhoneModal, SettingRow, SupplierProfileModal
│       │   ├── routing/        ProtectedRoute, PublicOnlyRoute
│       │   ├── store/          ProductCard, AddToCartModal
│       │   ├── supplier/       ProductForm
│       │   └── ui/             Badge, Card, ChatIcon, CookieConsent, HalalBadge,
│       │                       ModalPortal, NotificationBell, NotificationDropdown,
│       │                       PWAInstallPrompt, ReportModal, Skeleton, StatusBadge
│       ├── context/            AuthContext, AddressContext, CartContext, LanguageContext
│       └── lib/                supabase.js, gemini.js, geocode.js, haversine.js,
│                               formatIBAN.js, formatPhone.js, invoiceGenerator.js
├── server/                     Express dev server
│   ├── routes/ai.js            POST /api/ai/chat, POST /api/ai/analytics-summary
│   └── middleware/             verifySupabaseJWT.js
├── netlify/functions/          Production serverless AI endpoints
│   ├── ai-chat.js
│   └── ai-analytics-summary.js
└── supabase/migrations/        19 versioned SQL migrations (schema, RLS, RPCs, triggers)
```

---

## Database Migrations

| File | Description |
|---|---|
| `001_create_tables.sql` | Core tables: users, addresses, supplier_profiles, halal_certificates, products, orders, order_splits, order_items, notifications, supplier_bank_details |
| `002_auth_trigger.sql` | `on_auth_user_created` trigger → `handle_new_user` |
| `003_rls_policies.sql` | Initial RLS policies for all core tables + `get_my_role` helper |
| `004_storage_buckets.sql` | product-images, halal-certificates, payment-receipts buckets + storage RLS |
| `005_notifications_function.sql` | `create_notification` RPC |
| `006_rpc_decrement_stock.sql` | `decrement_stock` RPC |
| `007_analytics_functions.sql` | All analytics RPCs (revenue, spend, GMV, categories, top products, user growth, verification breakdown) |
| `008_fix_notifications_receipt_type.sql` | Notification type constraint fix |
| `009_fix_place_order_status_and_stock.sql` | Order status and stock constraint corrections |
| `010_add_missing_indexes.sql` | `idx_order_splits_restaurant_owner_id`, `idx_reports_*` |
| `011_fix_admin_role_escalation.sql` | Security fix: prevent non-admins from escalating role |
| `012_ai_insights_cache.sql` | `ai_insights_cache` table + RLS |
| `013_squash_remote_changes.sql` | Squash of 60+ incremental cloud migrations: avatars, oauth flow, owner_profiles, order system v2, chat, admin chat, ratings, reports, delivery fees, stock notifications, realtime, PWA, certification triggers, admin notification triggers, security audit |
| `014_fix_user_fk_constraints_set_null.sql` | Relax NOT NULL on nullable FK columns |
| `015_self_delete_records_to_deleted_accounts.sql` | `delete_own_account` RPC updated to write audit row |
| `016_drop_conversations_soft_delete_columns.sql` | Remove `deleted_for_*_at` soft-delete columns |
| `017_drop_dead_analytics_functions.sql` | Remove 7 unused analytics RPCs |
| `018_drop_not_null_on_nullable_fk_columns.sql` | Further FK constraint corrections for account deletion cascade |
| `019_certificate_status_keeps_verification.sql` | Supplier verification follows approved-certificate count: `sync_supplier_verification()` + `halal_cert_status_resync` trigger keep `supplier_profiles.is_verified`/`is_active` in sync, so rejecting one cert no longer un-verifies a supplier who still has another approved cert. Includes one-off backfill |
| `020_update_own_avatar_rpc.sql` | `update_own_avatar(p_url)` SECURITY DEFINER RPC: updates both `users.avatar_url` and `supplier_profiles.avatar_url` in one call, bypassing the `users_update_own` WITH CHECK constraint that rejects updates when `role IS NULL` (which happens for users created via OAuth before role selection) |
| `soft_delete_products` (applied remotely via Supabase MCP) | Adds `deleted_at TIMESTAMPTZ` and `deleted_by UUID` columns to `products` plus partial index `idx_products_deleted_at`. Powers the Admin Products → **Deleted** tab; soft-deleted products stay in `order_items` so analytics keep history |
| `rls_initplan_wrap_auth_functions` (applied remotely via Supabase MCP) | Rewrites all 53 RLS policies that call `auth.uid()`/`auth.role()` to wrap them in `(select …)` so Postgres evaluates them once per query instead of once per row. Access logic unchanged; clears the `auth_rls_initplan` advisory |
| `add_missing_fk_indexes` (applied remotely via Supabase MCP) | Adds 12 foreign-key cover indexes (addresses, admin_messages, deleted_accounts, halal_certificates, messages, order_items, products, supplier_ratings); clears `unindexed_foreign_keys` |
| `storage_drop_public_bucket_listing` (applied remotely via Supabase MCP) | Drops the broad public `SELECT` policies on `storage.objects` for `avatars`, `chat-attachments`, `product-images` to prevent anonymous file enumeration; clears `public_bucket_allows_listing`. Public URL access and uploads unaffected |

---

## Running Locally

**Prerequisites:** Node 18+, a Supabase project (URL + anon key + service-role key), Google Generative AI API key.

```bash
# Install all workspace dependencies
npm run install:all

# Start the client (Vite :5173) and server (nodemon :3000) concurrently
npm run dev
```

Environment variables:

- `client/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`
- `server/.env` → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` (see `server/.env.example`)

Apply migrations in order via the Supabase CLI or dashboard.

---

## Deployment

- **Frontend**: Netlify, auto-deployed from `main` branch. `netlify.toml` sets the build command (`npm run build` in `client/`) and publish directory (`client/dist`).
- **AI endpoints**: Netlify Functions (`netlify/functions/ai-chat.js`, `ai-analytics-summary.js`). These replace the Express routes in production — the client points to `/.netlify/functions/*`.
- **Database**: Supabase (hosted PostgreSQL). Schema changes are applied as new numbered migration files committed to `supabase/migrations/`.
