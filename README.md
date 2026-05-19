# ProCuro

**Last Updated:** 2026-05-19 22:22 (MYT — Kuala Lumpur)

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
- **Role selection** — New users are sent to `/select-role` before accessing any protected page. Role is written server-side by `create_profile_from_oauth`.
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
| `avatar_url` | TEXT | Signed URL from `avatars` storage bucket |
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
| `type` | TEXT | `product`, `supplier`, `order`, `user` |
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
Per-user cache for Gemini analytics summaries. TTL of 24 hours enforced in application code.

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK | References `users(id) ON DELETE CASCADE` |
| `scope` | TEXT DEFAULT 'analytics' | |
| `summary` | TEXT NOT NULL | Generated markdown from Gemini |
| `generated_at` | TIMESTAMPTZ | |

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

---

## Database Indexes

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_products_supplier_id` | products | supplier_id | Filter products by supplier |
| `idx_products_category` | products | category | Category browsing |
| `idx_products_is_active` | products | is_active | Active-product filter |
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
| owner_profiles | `owner_profiles_select` | SELECT | Own row, admin, or supplier |
| owner_profiles | `owner_profiles_insert_own` | INSERT | Own row or admin |
| owner_profiles | `owner_profiles_update_own` | UPDATE | Own row or admin |

---

## Storage Buckets

| Bucket | Visibility | Max Size | Allowed Types | Access |
|---|---|---|---|---|
| `avatars` | Public | — | — | Owner uploads own; public read |
| `product-images` | Public | 5 MB | JPEG, PNG, WEBP, GIF | Suppliers upload/update/delete; public read |
| `halal-certificates` | Private | 10 MB | PDF, JPEG, PNG | Supplier uploads own folder; admin reads all; restaurant_owner reads approved |
| `payment-receipts` | Private | 10 MB | PDF, JPEG, PNG | Owner uploads; supplier and admin read |
| `chat-attachments` | Public | 5 MB | JPEG, PNG, GIF, WEBP, PDF | Any authenticated user uploads; public read |

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
| `ai-chat.js` | `POST /.netlify/functions/ai-chat` | Proxies to Gemini 2.5 Flash (with 2.5-flash-lite → 2.0-flash-lite fallback chain); verifies Supabase JWT; rate-limited |
| `ai-analytics-summary.js` | `POST /.netlify/functions/ai-analytics-summary` | Generates AI analytics summary; checks `ai_insights_cache` (24h TTL); falls back to a deterministic text summary if Gemini quota is exceeded |

---

## AI Features

### In-App Chat Assistant (`ChatbotFAB` / `ChatbotDrawer`)
- Floating action button available on all authenticated pages.
- Sends user messages to `POST /api/ai/chat` (dev) or `/.netlify/functions/ai-chat` (prod).
- System prompt is role-aware: different instructions for `restaurant_owner`, `supplier`, and `admin`.
- Context data (e.g. recent orders, active products) is sent alongside the prompt so the model can give grounded answers.
- Rate-limited to 20 requests/minute per user.

### Analytics Summary (`AnalyticsSummary`)
- Appears on the analytics pages for owners, suppliers, and admin.
- Sends business context (revenue, orders, products, etc.) to `POST /api/ai/analytics-summary`.
- **Caching:** Generated summaries are stored in `ai_insights_cache`. Subsequent page loads within 24 hours return the cached version without a Gemini API call.
- **Force refresh:** User can bypass the cache with an explicit refresh button.
- **Stale fallback:** If Gemini is rate-limited and a stale cache entry exists, it is served with a `stale: true` flag.
- **Deterministic fallback:** If both Gemini and cache fail, a plain-text summary is built from the context data client-side so the user never sees a hard error.

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

- Any authenticated user can submit a report of type `product`, `supplier`, `order`, or `user`.
- On INSERT, `notify_admin_new_report` trigger notifies the admin.
- Admin reviews reports in the Reports panel, can mark them as `reviewed` or `dismissed`, and records an `admin_action` with timestamp.

---

## Chat System

### Supplier–Owner Chat
- Accessible from `/chat` (shared page).
- One conversation per supplier–owner pair (UNIQUE constraint).
- Supports text messages, file/image attachments (stored in `chat-attachments` bucket), and system messages linked to specific order splits.
- Conversations can be pinned by either party (`pinned_by_owner`, `pinned_by_supplier`).
- Live updates via Supabase Realtime on `messages` and `conversations` tables.
- `last_message_at` is updated automatically by the `on_new_message` trigger.

### Admin Support Chat
- Users can message the admin directly from the platform.
- Separate tables: `admin_conversations` and `admin_messages`.
- Admin views all support conversations in the Admin Chat page.
- Supports attachments and real-time updates.

---

## Delivery Fee Calculation

- Distance between owner's GPS coordinates and supplier's GPS coordinates is calculated client-side using the **Haversine formula** (`client/src/lib/haversine.js`).
- The result is matched against `delivery_fee_rules` tiers to determine the fee at checkout.
- Admin can manage tiers from the dashboard.

---

## Invoice Generation

- `client/src/lib/invoiceGenerator.js` generates PDF invoices/delivery receipts for completed orders.
- Includes order details, line items, supplier and owner business info, IBAN, tax ID, and amounts.

---

## Frontend Pages

### Public (`/`)

| Page | Route | Description |
|---|---|---|
| LandingPage | `/` | Marketing homepage with hero, features, and CTA |
| LoginPage | `/login` | Email/password login; Google OAuth button |
| SelectRolePage | `/select-role` | Role picker for new users (owner vs supplier) |
| RegisterOwnerPage | `/register` | Owner registration form |
| RegisterSupplierPage | `/register/supplier` | Supplier registration form with business fields |
| ResetPasswordPage | `/reset-password` | Supabase Auth password reset |
| SupplierListPage | `/suppliers` | Browseable list of verified suppliers with distance, rating, categories |
| SupplierProfilePage | `/supplier/:id` | Full supplier profile: bio, cities, Halal badge, products |
| ProductsListPage | `/products` | All active products across all verified suppliers |
| AboutPage | `/about` | Company information |
| CareersPage | `/careers` | Careers page |
| PressPage | `/press` | Press and media page |
| HelpCenterPage | `/help` | Help center and FAQs |
| PrivacyPolicyPage | `/privacy` | Privacy policy |
| TermsOfServicePage | `/terms` | Terms of service |
| AccountDeletedPage | `/account-deleted` | Farewell page shown after successful account deletion; bilingual (EN/DE) with a warm goodbye message and a back-to-homepage button |

### Owner (`/owner/`)

| Page | Route | Description |
|---|---|---|
| StorePage | `/owner/store` | Browse verified suppliers in card layout |
| AllProductsPage | `/owner/products` | Browse all products with category/search filter |
| CartPage | `/owner/cart` | Multi-supplier cart; payment method selection; delivery address picker; checkout |
| OrdersPage | `/owner/orders` | Order history and status tracking per split; cancellation; dispute filing |
| ProfilePage | `/owner/profile` | Full profile editor: avatar, bio, restaurant name, tax ID, cuisine, cities (auto-populated from saved addresses — no manual checkbox), bank details, account settings |
| AnalyticsPage | `/owner/analytics` | Spending trend, top products, **pie chart** of spending by category, top categories bar chart, AI summary at the bottom; week/month/year + custom date-range filter |

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

**Banned restaurant owners — supplier view (mirror)**: When a restaurant owner has `users.is_banned = true`, the supplier sees the ban surfaced in two places:

| Surface | Behaviour |
|---|---|
| `OwnerProfileModal` (used by Supplier OrdersPage when viewing an order's owner card, and by ChatPage when tapping the owner avatar) | Fetches `users.is_banned`; if true, shows a red "Banned" pill under the owner's name + a red banner row inside the modal with the banned message |
| `ChatPage` (supplier side) | When the open conversation's owner has `is_banned = true`, shows a red strip above the message list: "This restaurant owner's account has been banned. Past orders remain accessible but no new orders can be placed." Chat remains usable so the supplier can still communicate |

**Germany Dot Map — real outline**: The map SVG was updated to `client/public/Deutschland.svg` (443 × 599 px, viewBox `0 0 443 599`). The component renders it as an `<image>` element inside its own SVG and projects city dots onto it using Mercator-vertical + equirectangular-horizontal projection with mainland bounds `lat 47.27–55.06, lng 5.87–15.04`. Dot radius (`4–12 units`) and stroke width (`2 units`) are scaled to the 443-unit viewBox.

### Supplier (`/supplier/`)

| Page | Route | Description |
|---|---|---|
| DashboardPage | `/supplier/dashboard` | Overview: pending orders count, revenue KPIs, quick actions |
| ProductsPage | `/supplier/products` | Product catalog CRUD: add, edit, toggle active, manage stock |
| OrdersPage | `/supplier/orders` | Incoming order management: confirm, ship, deliver, cancel, upload refund |
| CertificatesPage | `/supplier/certificates` | Upload and manage Halal certificates; see approval status |
| BankDetailsPage | `/supplier/bank-details` | IBAN, BIC, account holder management |
| ProfilePage | `/supplier/profile` | Business profile: avatar, bio, categories, cities (auto-populated from saved addresses — no manual checkbox), website, phone, account settings |
| AnalyticsPage | `/supplier/analytics` | Revenue trend, category breakdown, top products, top clients, AI summary; week/month/year + custom date-range filter. **Top Restaurant Clients** bar chart: labels are angled (−35°) with truncation at 14 chars; Y-axis uses integer ticks only (`allowDecimals={false}`). **Date bucketing**: span ≤ 60 days → daily (YYYY-MM-DD) buckets; span > 60 days → monthly (YYYY-MM) buckets — so Week and Month views show per-day bars, Year view shows per-month bars. |

### Admin (`/admin/`)

| Page | Route | Description |
|---|---|---|
| AdminLoginPage | `/admin/login` | Separate admin login page |
| DashboardPage | `/admin/dashboard` | Platform KPIs: GMV, user count, order count. Charts: Platform GMV Over Time (filtered), Orders by Status, **User Growth** (cumulative, fed by real `users.created_at` data), **Payment Type** (COD vs Bank Transfer donut, replaces old Certificate Status), **City Comparison Radar** (suppliers vs owners per top city), **Germany Dot Map** (per-city dots, one colour per role), AI summary. Week/month/year + custom date-range filter on all charts. |
| UsersPage | `/admin/users` | List all users; ban/unban; delete; view details; deleted accounts log |
| SuppliersPage | `/admin/suppliers` | List suppliers; verify/unverify; activate/deactivate |
| OrdersPage | `/admin/orders` | Platform-wide order list with status filters |
| ProductsPage | `/admin/products` | All products across all suppliers; activate/deactivate |
| CertificatesPage | `/admin/certificates` | Certificate review queue: approve or reject with reason |
| ReportsPage | `/admin/reports` | Abuse report queue: review, record action, dismiss |
| AdminChatPage | `/admin/chat` | Support chat with all users (admin_conversations); per-conversation delete via modal overlay (same pattern as ChatPage) |

### Shared

| Page | Route | Description |
|---|---|---|
| ChatPage | `/owner/chat` and `/supplier/chat` | Supplier–owner real-time messaging; shared component rendered inside OwnerLayout and SupplierLayout respectively; per-conversation delete via modal overlay with pin/unpin |

---

## Frontend Components

### Layout
- `Navbar` — Top navigation; role-aware links; `NotificationBell`; language toggle
- `Footer` — Site-wide footer with links
- `OwnerLayout` — Wrapper with owner sidebar navigation
- `SupplierLayout` — Wrapper with supplier sidebar navigation
- `AdminLayout` — Wrapper with admin sidebar navigation

### Routing
- `ProtectedRoute` — Redirects unauthenticated users to `/login`; enforces role access
- `PublicOnlyRoute` — Redirects authenticated users to their dashboard

### Profile
- `AvatarModal` — Avatar upload and preview with lightbox
- `DeleteAccountModal` — Confirmation dialog for account deletion
- `Modal` — Base modal wrapper
- `OwnerProfileModal` — Supplier-side modal showing an owner's details when viewing their order
- `SupplierProfileModal` — Owner-side modal for supplier details
- `PasswordModal` — Change password form
- `PhoneModal` — Update phone number form
- `SettingRow` — Reusable row component for the settings card

### Store
- `ProductCard` — Product listing card with add-to-cart
- `AddToCartModal` — Quantity selector and unit type confirmation before adding to cart

### Supplier
- `ProductForm` — Add/edit product form with image upload

### Charts (Recharts)
- `RevenueChart` — Monthly revenue area chart (also used as Platform GMV Over Time, owner Spending Trend, supplier Revenue Trend); buckets by day for ≤ 60-day ranges, by month for longer ones
- `CategorySalesChart` — Category revenue horizontal bar chart
- `TopProductsChart` — Top products by revenue
- `OrdersByStatusChart` — Donut showing order-split status distribution (admin)
- `UserGrowthChart` — Cumulative line chart of owners + suppliers, fed by `users.created_at` grouped by month and filtered by the active date range (admin)
- `PaymentTypeChart` — Donut + breakdown card showing Bank Transfer vs Cash on Delivery counts and GMV (admin) — replaced the old Certificate Status card
- `CityComparisonRadar` — Polar/radar chart with one axis per top city, two overlaid series (Suppliers + Owners). Intentionally a different chart family from everything else on the dashboard. **Domain is dynamic**: computed as `Math.ceil(max(all series values) × 1.15)` so the radar shape proportionally reflects actual differences rather than being artificially scaled.
- `GermanyDotMap` — Germany outline loaded from `/public/Deutschland.svg` (443 × 599 px) as an `<image>` inside an SVG. Two coloured dots per city (supplier = midnight, owner = marigold); dot radius scales with user count (4–12 units). lat/lng → SVG coordinates via Mercator-vertical + equirectangular-horizontal projection using mainland bounds `lat 47.27–55.06, lng 5.87–15.04`, scaled to the 443-unit viewBox.
- `SupplierVerificationChart` — Defined but currently **unused** (not imported by any page). Intended to show verified vs unverified supplier breakdown; the analytics RPC it was built for (`get_supplier_verification_breakdown`) was dropped in migration 017.
- `DateRangeFilter` (in `components/ui/`) — Reusable presets (This Week / This Month / This Year) plus a custom from-to date picker. Drives the analytics queries on owner, supplier, and admin pages.

### AI
- `AnalyticsSummary` — AI insight card with cache indicator and force-refresh button; refresh is disabled (dimmed) for 24 hours after the last generation — the button re-enables only once the `ai_insights_cache` TTL expires
- `ChatbotFAB` — Floating action button that opens the AI assistant
- `ChatbotDrawer` — Slide-in chat drawer for AI assistant

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
- `ReportModal` — Abuse report submission form
- `Skeleton` — Loading skeleton placeholders
- `StatusBadge` — Color-coded order status badge

---

## React Contexts

| Context | File | Provides |
|---|---|---|
| `AuthContext` | `context/AuthContext.jsx` | `user`, `session`, `loading`, `signOut` |
| `AddressContext` | `context/AddressContext.jsx` | Address book CRUD, default address management |
| `CartContext` | `context/CartContext.jsx` | Cart items, add/remove/clear, grouped by supplier |
| `LanguageContext` | `context/LanguageContext.jsx` | `lang` (`en`/`de`), `t(key)` translation function, persisted to `localStorage` |

---

## Client Libraries (`client/src/lib/`)

| File | Purpose |
|---|---|
| `supabase.js` | Initialises the Supabase JS client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| `gemini.js` | Initialises the Google Generative AI client; wraps `generateContent` calls |
| `geocode.js` | Reverse geocoding via browser Geolocation API + OpenStreetMap Nominatim |
| `haversine.js` | Haversine great-circle distance formula (returns km) |
| `formatIBAN.js` | Formats raw IBAN string with spaces (e.g. `DE89 3704 0044 …`) |
| `formatPhone.js` | Normalises phone number display |
| `invoiceGenerator.js` | Generates downloadable PDF invoices for completed orders |

---

## Internationalisation (i18n)

- Two languages: **English** (`en`) and **German** (`de`).
- Dictionary-based: `LanguageContext` holds a key–value map (~200+ keys); all UI strings use `t('key')`.
- Language is toggled in the Account Settings card and persisted in `localStorage`.
- On toggle, `<html lang>` is updated for screen readers and OS integrations.
- No page reload; no third-party library.
- **Coverage:** Every user-facing string across all pages is translated including: Login/Register/Role-select flows, Reset Password page, Navbar address dropdown (Delivered to, Select Address, form placeholders), Owner store (search, categories, sort), AllProducts (categories, sort, product card), Public Products List (search, categories, sort, empty states), AddToCartModal (delivery fee states, quantity, discount), Owner Orders (full lifecycle: modals, rating, dispute, refund), Owner Analytics (all chart titles and KPI labels), Supplier Dashboard (certification status banners, KPI cards), Supplier Analytics (all chart titles and KPI labels), Supplier Orders (full lifecycle: Cancel/RefundSection/DisputeResponse modals, detail view, list page), Supplier Products (table headers, add/edit modal, delivery fee table), Supplier Bank Details (labels, validation errors), Supplier Certificates (upload/edit/delete modals), SupplierListPage (categories, sort), Notifications bell. Dictionary has **300+ keys** (EN+DE).

---

## Progressive Web App (PWA)

- `PWAInstallPrompt` component intercepts the browser's `beforeinstallprompt` event and shows a custom install CTA.
- Allows users to add ProCuro to their home screen on Android and desktop Chrome.
- **iOS safe area**: `index.html` sets `viewport-fit=cover` so the app extends edge-to-edge on notched iPhones. `apple-mobile-web-app-status-bar-style: black-translucent` makes the status bar transparent. The `<nav>` element receives `padding-top: var(--sat)` (where `--sat = env(safe-area-inset-top, 0px)` defined in `index.css`) so the navbar content always sits below the notch/Dynamic Island. All layout offset values in `OwnerLayout` and `SupplierLayout` (`paddingTop`, sidebar `top`) use `calc(Xrem + var(--sat))` inline styles to stay flush regardless of device.

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
│       │   │                   Certificates, Reports, Chat
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
└── supabase/migrations/        18 versioned SQL migrations (schema, RLS, RPCs, triggers)
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
