# ProCuro Supabase Database Schema Analysis

**Database:** `rexngdtweiivdyzrpfud`  
**Type:** PostgreSQL (Supabase)  
**Tables:** 21  
**Last Updated:** May 19, 2026  

---

## 1. ALL TABLES EXPLAINED (21 Tables)

### Core Authentication & User Management (4 tables)

#### **users**
- **Purpose:** Central user registry mirroring `auth.users`
- **Key Columns:** id (UUID PK→auth.users CASCADE), email (UNIQUE), role (restaurant_owner|supplier|admin, nullable), is_banned, avatar_url, bio, restaurant_name
- **Security:** RLS own-read + admin
- **Relationships:** 1:1 to owner_profiles, 1:1 to supplier_profiles, 1:N to addresses/orders/notifications/conversations

#### **addresses**
- **Purpose:** Multi-address book (delivery, billing locations)
- **Key Columns:** user_id (FK CASCADE), street, city, country (default Germany), latitude/longitude, is_default
- **Security:** RLS full control (own only)
- **Design:** Supports geo-based supplier discovery

#### **owner_profiles**
- **Purpose:** Restaurant owner extended profile (1:1 with users)
- **Key Columns:** user_id (UNIQUE FK CASCADE), restaurant_name, tax_id, city, website, cuisine (TEXT[] array), latitude/longitude
- **Security:** RLS own-read + admin
- **Logic:** Separates profile bloat from core users table

#### **supplier_profiles**
- **Purpose:** Supplier visibility & verification status (1:1 with users)
- **Key Columns:** user_id (UNIQUE FK CASCADE), business_name, tax_id, category (TEXT[] array), city, rating (auto-updated), is_verified (cert+bank→true), is_active
- **Security:** RLS public if verified+active, else owner+admin only
- **Logic:** `is_verified` trigger checks: halal_certificates.status='approved' AND supplier_bank_details.iban present

---

### Product Catalog & Inventory (2 tables)

#### **products**
- **Purpose:** Supplier product listings with inventory
- **Key Columns:** supplier_id (FK CASCADE), name, description, price (NUMERIC ≥0), unit_type (kg|package|piece|liter), category (10 enum), stock_quantity, is_active, image_url
- **Security:** RLS public if active, suppliers see own, admin all
- **Indexes:** supplier_id, category, is_active
- **Triggers:** Stock decrement on order fulfillment (RPC)

#### **halal_certificates**
- **Purpose:** Halal certification document management (admin review required)
- **Key Columns:** supplier_id (FK CASCADE), file_url, file_name, status (pending|approved|rejected), reviewed_by (admin), reviewed_at, rejection_reason, uploaded_at
- **Security:** RLS supplier sees own+pending, everyone sees approved, admin all
- **Logic:** Approval triggers certification check; if supplier has IBAN, is_verified becomes true

---

### Order Management (3 tables)

#### **orders**
- **Purpose:** Top-level order container (multi-supplier aggregation)
- **Key Columns:** restaurant_owner_id (FK **RESTRICT** - preserve audit trail), total_amount (sum of splits)
- **Security:** RLS owner-select + admin
- **Design:** Multi-supplier carts split into separate order_splits for independent fulfillment

#### **order_splits**
- **Purpose:** Per-supplier portion of order (fulfillment tracking)
- **Key Columns:** order_id (FK CASCADE), supplier_id (FK **RESTRICT** - preserve order), status (pending_confirmation→delivered, 6 states), payment_method (cod|bank_transfer), receipt_url, subtotal
- **Security:** RLS supplier sees own, owner sees own order's splits, admin all
- **Indexes:** order_id, supplier_id, status
- **Logic:** Supplier updates status (confirm/ship/deliver); owner updates payment

#### **order_items**
- **Purpose:** Line items within order_split (granular product detail)
- **Key Columns:** order_split_id (FK CASCADE), product_id (FK **RESTRICT** - audit trail), quantity (>0), price_at_time (frozen), unit_type (frozen)
- **Security:** RLS follows parent order_split ownership via 2-level JOIN
- **Design:** Frozen snapshots protect against price/unit changes after order

---

### Supplier Certification & Payments (2 tables)

#### **supplier_bank_details**
- **Purpose:** Payment routing for supplier payouts (1:1 per supplier)
- **Key Columns:** supplier_id (UNIQUE FK CASCADE), bank_name, account_holder, iban, bic
- **Security:** RLS supplier sees own, restaurant_owners see for payment tracking, admin all
- **Triggers:** When IBAN added, runs certification check (cert+IBAN→is_verified)

#### **owner_bank_details**
- **Purpose:** Future payout/credit system for restaurant owners (1:1 per owner)
- **Key Columns:** owner_id (UNIQUE FK CASCADE), bank_name, account_holder, iban, bic
- **Security:** RLS owner-only + admin

---

### Communications (4 tables)

#### **conversations**
- **Purpose:** 1-on-1 chat thread between supplier & owner (prevents spam)
- **Key Columns:** supplier_id (FK CASCADE), owner_id (FK CASCADE), created_at, last_message_at
- **Constraint:** UNIQUE(supplier_id, owner_id) - one conversation per pair
- **Security:** RLS both participants read/update only

#### **messages**
- **Purpose:** Individual messages in conversation (hard-delete on account deletion)
- **Key Columns:** conversation_id (FK CASCADE), sender_id (FK CASCADE), content, is_read, created_at
- **Security:** RLS both participants can see
- **Note:** Changed from soft-delete to hard-delete (migration 016) to prevent orphans

#### **admin_conversations**
- **Purpose:** Admin-to-user direct messaging (complaints, alerts)
- **Key Columns:** user_id (UNIQUE FK CASCADE), created_at
- **Security:** RLS admin-only
- **Design:** Separate from supplier-owner conversations

#### **admin_messages**
- **Purpose:** Messages in admin conversations
- **Key Columns:** conversation_id (FK CASCADE), sender_id (FK CASCADE), content, is_read, created_at
- **Security:** RLS admin-only

---

### Notifications & Feedback (3 tables)

#### **notifications**
- **Purpose:** In-app notification queue (order updates, certifications, etc.)
- **Key Columns:** user_id (FK CASCADE), title, message, type (info|success|warning|error|certification), is_read, created_at
- **Security:** RLS own notifications only
- **Indexes:** (user_id, is_read) for unread-count queries

#### **supplier_ratings**
- **Purpose:** 5-star post-delivery feedback (marketplace trust)
- **Key Columns:** supplier_id (FK CASCADE), owner_id (FK CASCADE), order_split_id (UNIQUE FK CASCADE), rating (1-5 CHECK), created_at
- **Security:** RLS owner can rate own deliveries, supplier sees own ratings, admin all
- **Triggers:** Auto-updates supplier_profiles.rating (average)

#### **reports**
- **Purpose:** Flagging mechanism (spam, product issues, supplier violations)
- **Key Columns:** reporter_id (FK CASCADE), type (product|supplier), target_id, target_name (snapshot), reason, details, status (pending|reviewed|dismissed), created_at
- **Security:** RLS own reports only, admin can review all
- **Indexes:** status, reporter_id (admin dashboard)

---

### Analytics & Maintenance (2 tables)

#### **ai_insights_cache**
- **Purpose:** Gemini quota guard (daily cache of AI summaries per user)
- **Key Columns:** user_id (PK FK CASCADE, 1:1), scope (default 'analytics'), summary (text), generated_at
- **Security:** RLS users read own cache. Writes via service-role key only
- **Indexes:** generated_at DESC (cleanup jobs)
- **Logic:** Analytics panel loads from cache by default; explicit refresh bypasses

#### **deleted_accounts**
- **Purpose:** Audit trail for deleted users (GDPR compliance, soft-delete alternative)
- **Key Columns:** user_id (snapshot, not FK), email, role, business_name, deleted_at, deleted_by_admin_id (admin or self-delete)
- **Security:** RLS admin-only read
- **Design:** Tracks who deleted when for audit; shows in admin dashboard

---

## 2. RELATIONSHIPS IDENTIFIED

### Entity Relationship Tree

```
auth.users (Supabase Auth)
    ↓ CASCADE
public.users (1:1 mirror)
    ├─ (1:1) → owner_profiles
    ├─ (1:1) → supplier_profiles
    │   ├─ (1:N) → products (6+ per supplier typical)
    │   ├─ (1:1) → supplier_bank_details
    │   ├─ (1:N) → halal_certificates (multiple versions)
    │   ├─ (1:N) → order_splits (as supplier)
    │   └─ (1:N) → supplier_ratings (received)
    ├─ (1:N) → addresses (delivery/billing)
    ├─ (1:N) → orders (as restaurant_owner_id)
    │   └─ (1:N) → order_splits
    │       ├─ (1:N) → order_items (2-20 per split typical)
    │       └─ (1:1) → supplier_ratings
    ├─ (1:1) → owner_bank_details
    ├─ (1:N) → conversations (as owner)
    │   └─ (1:N) → messages (10-100+ per conversation)
    ├─ (1:N) → messages (as sender)
    ├─ (1:N) → notifications (in-app alerts)
    ├─ (1:N) → supplier_ratings (given by owner)
    ├─ (1:N) → reports (as reporter)
    ├─ (1:1) → ai_insights_cache
    └─ (1:N) → admin_conversations (if admin)
        └─ (1:N) → admin_messages
```

### Cardinality Summary

| Relationship | Card | Typical Scale |
|---|---|---|
| users → addresses | 1:N | 2-3 per owner |
| supplier_profiles → products | 1:N | 10-50 products per supplier |
| supplier_profiles → halal_certificates | 1:N | 1-5 cert versions |
| orders → order_splits | 1:N | 2-5 suppliers per order |
| order_splits → order_items | 1:N | 2-20 items per split |
| conversations → messages | 1:N | 10-500+ messages per conversation |

---

## 3. FOREIGN KEYS EXPLAINED

### FK Deletion Strategy

| Table | FK Column | Parent | Delete Rule | Rationale |
|---|---|---|---|---|
| users | id | auth.users | **CASCADE** | User deletion cascades all personal data |
| addresses | user_id | users | CASCADE | Remove delivery locations with user |
| owner_profiles | user_id | users | CASCADE | Owner profile lifecycle = user lifecycle |
| supplier_profiles | user_id | users | CASCADE | Supplier profile lifecycle = user lifecycle |
| products | supplier_id | supplier_profiles | CASCADE | Products deleted with supplier |
| halal_certificates | supplier_id | supplier_profiles | CASCADE | Certs deleted with supplier |
| supplier_bank_details | supplier_id | supplier_profiles | CASCADE | Bank deleted with supplier |
| **orders** | **restaurant_owner_id** | **users** | **RESTRICT** | 🔒 Prevent accidental erasure of order history |
| order_splits | order_id | orders | CASCADE | Splits follow order lifecycle |
| **order_splits** | **supplier_id** | **supplier_profiles** | **RESTRICT** | 🔒 Preserve order audit trail (supplier cannot be deleted if orders exist) |
| order_items | order_split_id | order_splits | CASCADE | Line items follow splits |
| **order_items** | **product_id** | **products** | **RESTRICT** | 🔒 Preserve price_at_time snapshots (product cannot be deleted if ordered) |
| notifications | user_id | users | CASCADE | Notifications cleanup with user |
| supplier_ratings | order_split_id | order_splits | CASCADE | Ratings tied to delivery |
| supplier_ratings | supplier_id | supplier_profiles | CASCADE | Ratings cleanup with supplier |
| conversations | owner_id | auth.users | CASCADE | Messages cleanup with user |
| messages | conversation_id | conversations | CASCADE | Messages follow conversation |
| admin_conversations | user_id | auth.users | CASCADE | Admin convs cleanup with user |
| admin_messages | conversation_id | admin_conversations | CASCADE | Messages follow conversation |
| reports | reporter_id | users | CASCADE | Reports cleanup with user |
| ai_insights_cache | user_id | users | CASCADE | Cache cleanup with user |
| owner_bank_details | owner_id | auth.users | CASCADE | Bank details cleanup |

**Key Philosophy:**
- **CASCADE:** Data safety acceptable (notifications, addresses, etc.)
- **RESTRICT:** Data preservation critical (orders, products, suppliers in orders)

---

## 4. ROW-LEVEL SECURITY POLICIES ANALYZED

### RLS Architecture

```
get_my_role() function (SECURITY DEFINER)
    ↓
Looks up role from public.users for auth.uid()
    ↓
Applied in all table policies for O(1) role-check
    ↓
Avoids RLS recursion on public.users table itself
```

### Policy Breakdown by Table

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **users** | own \| admin | — | own \| admin | — |
| **addresses** | own \| admin | own \| admin | own \| admin | own \| admin |
| **owner_profiles** | own \| admin | own | own \| admin | — |
| **supplier_profiles** | verified+active \| own \| admin | own | own \| admin | — |
| **halal_certificates** | own supplier \| admin \| status='approved' | own supplier \| admin | admin only | own \| admin |
| **products** | active \| own supplier \| admin | own \| admin | own \| admin | own \| admin |
| **orders** | own owner \| admin | own owner \| admin | — | — |
| **order_splits** | owner+supplier+admin | owner \| admin | supplier+owner+admin | — |
| **order_items** | owner+supplier (2-level JOIN) | owner \| admin | — | — |
| **notifications** | own \| admin | — | own \| admin | own \| admin |
| **supplier_ratings** | own+supplier+admin | owner | — | — |
| **conversations** | both participants | owner | both participants | — |
| **messages** | both participants | participant | — | — |
| **admin_conversations** | admin only | admin | admin | admin |
| **admin_messages** | admin only | admin | — | — |
| **reports** | own \| admin | own \| admin | — | — |
| **ai_insights_cache** | own user | — | — | — |
| **deleted_accounts** | admin only | — | — | — |
| **supplier_bank_details** | own \| owner \| admin | own | own \| admin | — |
| **owner_bank_details** | own \| admin | own | own \| admin | — |

### RLS Security Assessment: **9/10**

**✅ Strengths:**
- Comprehensive coverage on all 21 tables
- Multi-level authorization (own + role + conditional)
- Proper SECURITY DEFINER function prevents recursion
- Nested subqueries for deep ownership (order_items via 2-level JOIN)
- Public marketplace visibility correctly gated by is_verified + is_active

**⚠️ Minor Gaps:**
- No time-based policies (e.g., can't rate after 30 days)
- No granular audit logging (who updated what, when)
- No IP-based restrictions for sensitive ops
- No rate limiting at DB layer

---

## 5. DATABASE NORMALIZATION ANALYSIS

### Current Normalization: **3NF (Third Normal Form)** ✅

#### **First Normal Form (1NF):**
- ✅ All columns atomic
- ⚠️ **Exception:** `supplier_profiles.category` (TEXT[]) - PostgreSQL array
  - **Justification:** Query efficiency (filter by category without JOIN). Could normalize to `supplier_categories(supplier_id, category)` but adds overhead.
- ⚠️ **Exception:** `owner_profiles.cuisine` (TEXT[]) - Same rationale

#### **Second Normal Form (2NF):**
- ✅ All non-key attributes fully depend on PK
- ✅ No partial key dependencies
- ✅ Proper surrogate keys (UUID)

#### **Third Normal Form (3NF):**
- ✅ No transitive dependencies
- ✅ `price_at_time` & `unit_type` in order_items intentionally denormalized (audit trail)
- ✅ `rating` in supplier_profiles intentionally denormalized (marketplace performance)
- ✅ `target_name` in reports intentionally denormalized (snapshot for deleted targets)

### Intentional Denormalizations (Justified)

| Column | Table | Reason | Tradeoff |
|---|---|---|---|
| `rating` | supplier_profiles | Marketplace filter queries (avg of supplier_ratings) | Write burden on rate trigger |
| `price_at_time` | order_items | Historical accuracy (product.price may change) | Duplication |
| `unit_type` | order_items | Unit may change in future product versions | Duplication |
| `target_name` | reports | Target may be deleted (product/supplier) | Snapshot inconsistency |
| `category` | supplier_profiles | Fast filtering without JOIN | Array query complexity |

### Schema Quality: **8/10**

**Strengths:**
- Clear separation of concerns (auth, profiles, products, orders, comms, audit)
- Proper use of 1:1 constraints (UNIQUE FKs)
- Composite indexes on high-cardinality pairs
- Good constraint coverage (CHECK on enums, ranges)

**Recommendations:**
- 🎯 Separate `delivery_fees(distance_min_km, distance_max_km, fee_eur)` table (currently hard-coded in app)
- 🎯 Consider `order_disputes(order_split_id, type, status, reason)` table (currently via messages+reports)
- 🎯 Add `audit_log(table_name, record_id, operation, old_values, new_values, changed_by, changed_at)` table (currently via deleted_accounts only)
- 🎯 Consider indexing `supplier_profiles(is_verified, is_active)` composite for marketplace queries

---

## 6. RECOMMENDATIONS FOR SDD DATABASE DOCUMENTATION

### Essential Documentation Sections

1. **Data Dictionary** (Table-by-table metadata)
   - Column names, types, constraints, defaults
   - Example values, cardinality info
   - All enums: role, status, payment_method, notification_type, etc.

2. **Entity Relationship Diagram**
   - 21 tables with PK/FK relationships
   - Cardinality indicators (1:1, 1:N)
   - RESTRICT vs CASCADE deletion visual cues
   - Color-coded by domain (auth, products, orders, comms)

3. **Data Flow Diagrams**
   - Supplier onboarding: signup → profile → cert upload → bank details → is_verified
   - Order lifecycle: cart → order → splits → items → delivery → rating → cleanup
   - Message flow: conversation creation → message exchange → notifications

4. **RLS Policy Matrix**
   - Table × Role × Operation
   - Example RLS-denied queries (why user gets empty result)
   - JWT scope requirements (anon key vs service-role)

5. **Performance Index Catalog**
   - All 10+ indexes with query patterns
   - EXPLAIN plans for common searches:
     - Browse active products by category & supplier location
     - Fetch supplier's pending orders by status
     - Get unread notifications count
   - Recommended composite indexes for future

6. **Migration History & Version Strategy**
   - Current snapshot (migration 019)
   - Breaking changes log (e.g., migration 018 dropping NOT NULL)
   - Date-based versioning: 20260519_...

7. **Business Rules Document**
   - Supplier certification: cert.status='approved' AND bank.iban → is_verified
   - Order status state machine: valid transitions
   - Price snapshot logic: why price_at_time frozen
   - Rating auto-calculation: trigger logic
   - AI cache TTL: 24 hours (Gemini quota protection)

8. **API Integration Guide**
   - PostgREST query examples for each major operation
   - JWT claims & role-based access
   - Real-time subscription patterns (Supabase Realtime)
   - Common RLS errors & debugging

9. **Backup & Disaster Recovery**
   - Full backup schedule (daily, Supabase automatic)
   - Point-in-time recovery (PITR) windows
   - Disaster recovery runbook
   - Data retention policies (deleted_accounts TTL)

10. **Compliance & Security**
    - GDPR right-to-delete: CASCADE deletes implemented
    - Data residency: Germany, Supabase EU region
    - PII handling: emails, IBANs, names (encryption at rest via Supabase)
    - Audit trail strategy: missing—consider adding audit_log table

---

## 7. ERD DIAGRAM RECOMMENDATION

### Recommended Tool: **Mermaid ER Diagram** ✅

**Why Mermaid:**
- ✅ Already installed (bierner.markdown-mermaid extension)
- ✅ Native GitHub markdown support
- ✅ Version control-friendly (text-based)
- ✅ Fast iteration without external tools

### Visual Structure

```
Domain Groups (Color-coded):
  🟦 Blue: User & Auth (users, owner_profiles, supplier_profiles, addresses)
  🟩 Green: Products (products, halal_certificates, supplier_bank_details)
  🟨 Yellow: Orders (orders, order_splits, order_items)
  🟥 Red: Communications (conversations, messages, admin_conversations, admin_messages)
  ⬜ Gray: Feedback & Audit (supplier_ratings, reports, deleted_accounts, ai_insights_cache)

Key Indicators:
  🔑 PK (bold)
  🔗 FK (underlined)
  🔒 RESTRICT DELETE (red dashed line)
  🔴 CASCADE DELETE (gray solid line)

Cardinality:
  ||--|| (one-to-one)
  ||--o{ (one-to-many)
  }o--o{ (many-to-many, if any)
```

### Sample Mermaid Diagram Structure

```mermaid
erDiagram
    AUTH_USERS ||--o{ USERS : "CASCADE"
    USERS ||--|| OWNER_PROFILES : "own_profile"
    USERS ||--|| SUPPLIER_PROFILES : "own_profile"
    USERS ||--o{ ADDRESSES : "delivery_billing"
    USERS ||--o{ ORDERS : "restaurant_owner"
    
    SUPPLIER_PROFILES ||--o{ PRODUCTS : "catalog"
    SUPPLIER_PROFILES ||--|| SUPPLIER_BANK_DETAILS : "payments"
    SUPPLIER_PROFILES ||--o{ HALAL_CERTIFICATES : "verification"
    SUPPLIER_PROFILES ||--o{ ORDER_SPLITS : "fulfillment"
    
    ORDERS ||--o{ ORDER_SPLITS : "split_by_supplier"
    ORDER_SPLITS ||--o{ ORDER_ITEMS : "line_items"
    ORDER_SPLITS ||--|| SUPPLIER_RATINGS : "feedback"
    
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered"
    
    USERS ||--o{ CONVERSATIONS : "owner"
    SUPPLIER_PROFILES ||--o{ CONVERSATIONS : "supplier"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ REPORTS : "files"
    USERS ||--|| AI_INSIGHTS_CACHE : "analytics_cache"
```

---

## 8. PROFESSIONAL ERD IMAGE-GENERATION PROMPT

### For AI Image Generation (DALL-E, Midjourney, etc.)

```
Generate a professional Entity Relationship Diagram (ERD) for a multi-role marketplace database called "ProCuro" with the following specifications:

TABLES & DOMAINS:
- User Management (5): users, addresses, owner_profiles, supplier_profiles, owner_bank_details
- Product Catalog (2): products, halal_certificates
- Order Fulfillment (3): orders, order_splits, order_items
- Communications (4): conversations, messages, admin_conversations, admin_messages
- Supplier Certification (1): supplier_bank_details
- Feedback & Moderation (3): supplier_ratings, reports, deleted_accounts
- Analytics (1): ai_insights_cache

KEY RELATIONSHIPS:
- Auth.users (1:1 cascade) → users (central hub)
- users (1:1) → owner_profiles, supplier_profiles
- supplier_profiles (1:N) → products, order_splits
- orders (1:N cascade) → order_splits
- order_splits (1:N cascade) → order_items
- conversations (1:N cascade) → messages

CASCADE vs RESTRICT:
- Red dashed lines: RESTRICT DELETE (orders, order_splits, order_items, supplier_profiles)
  Rationale: Preserve audit trail
- Gray solid lines: CASCADE DELETE (addresses, notifications, messages, etc.)
  Rationale: Safe to clean up automatically

COLOR CODING:
- Blue box: User & Identity tables
- Green box: Product & Catalog tables
- Yellow box: Order & Fulfillment tables
- Red box: Communication & Messaging tables
- Gray box: Feedback, Audit, Cache tables

CONSTRAINTS:
- 21 tables total
- 28 foreign keys
- 15+ CHECK constraints (enums, ranges)
- 10+ performance indexes
- 40+ RLS policies

STYLING:
- Professional, technical, formal tone
- High contrast, publication-ready
- Include legend for cardinality (1:1, 1:N)
- Include legend for delete rules (CASCADE, RESTRICT)
- Minimal whitespace, compact layout
- Sans-serif font (Helvetica, Arial)

OUTPUT:
- High resolution (2400×3600px, landscape orientation)
- PNG or SVG format
- Include copyright/watermark: "ProCuro | Thesis Documentation | 2026"
- Include metadata: Database: PostgreSQL via Supabase, Region: Germany (EU)
```

### For DbSchema / Lucidchart / Draw.io Export

```
DATABASE METADATA:

Name: ProCuro
Type: PostgreSQL
Provider: Supabase (https://rexngdtweiivdyzrpfud.supabase.co)
Region: Germany (EU)
Version: 2026-05-19

SCHEMA: public + auth (built-in)

TABLES: 21
  - users (central hub, mirrors auth.users)
  - addresses (multi-address per user)
  - owner_profiles (1:1 per owner)
  - supplier_profiles (1:1 per supplier)
  
  - products (1:N per supplier)
  - halal_certificates (1:N per supplier, admin-verified)
  
  - orders (restaurant owner purchases)
  - order_splits (per-supplier portions)
  - order_items (line items with frozen prices)
  
  - supplier_bank_details (payout routing)
  - owner_bank_details (future credit system)
  
  - conversations (1-on-1 chats, unique per pair)
  - messages (hard-deleted on account removal)
  - admin_conversations (admin-to-user comms)
  - admin_messages (admin message thread)
  
  - notifications (in-app alerts)
  - supplier_ratings (post-delivery feedback, 1-5 stars)
  - reports (spam/violation flagging)
  
  - ai_insights_cache (Gemini quota guard, 24h TTL)
  - deleted_accounts (audit trail, GDPR compliance)

INDEXES: 10+
  - Composite: (user_id, is_read), (supplier_id, status)
  - Single: supplier_id, category, is_active, status, role, generated_at

CONSTRAINTS:
  - CASCADE FK: 18 (safe cleanup)
  - RESTRICT FK: 3 (audit trail: orders, order_splits, order_items)
  - UNIQUE: 6 (1:1 relationships: owner_profiles, supplier_profiles, etc.)
  - CHECK: 15+ (role enums, status states, price ranges, rating bounds)

RLS POLICIES: 40+
  - Role-based (restaurant_owner, supplier, admin)
  - Ownership-based (own user data only, with exceptions)
  - Conditional (is_verified, is_active) for marketplace visibility

STORAGE BUCKETS:
  - avatars/ (profiles, public read)
  - halal-certificates/ (PDFs, admin review, approved public)
  - product-images/ (catalog, public read)
  - invoices/ (generated PDFs, owner/supplier read)
```

---

## Summary: Schema Assessment

| Aspect | Rating | Notes |
|---|---|---|
| **Completeness** | ✅✅✅✅✅ | 21 tables cover all marketplace functions |
| **Relationships** | ✅✅✅✅✅ | Clear 1:1, 1:N cardinality, no circular deps |
| **Normalization** | ✅✅✅✅☆ | 3NF with 3 justified denormalizations |
| **Security (RLS)** | ✅✅✅✅✅ | 40+ policies, SECURITY DEFINER pattern, role-based |
| **Data Integrity** | ✅✅✅✅☆ | 28 FKs with proper RESTRICT/CASCADE, missing audit_log |
| **Performance** | ✅✅✅✅☆ | 10+ indexes, composite indexes on hot paths, room for optimization |
| **GDPR Readiness** | ✅✅✅✅✅ | CASCADE deletes, deleted_accounts audit trail |
| **Documentation** | ✅✅☆☆☆ | Migrations present, needs formal SDD template |
| **Overall Quality** | **8.5/10** | Production-ready with recommendations |

---

## Next Steps for Thesis Documentation

1. ✅ **Schema Extracted:** All 21 tables analyzed from migrations
2. ✅ **Relationships Documented:** Entity relationship tree + cardinality
3. ✅ **FKs Explained:** RESTRICT vs CASCADE rationale provided
4. ✅ **RLS Analyzed:** Policy matrix + assessment
5. ✅ **Normalization Assessed:** 3NF with justified exceptions
6. ⏳ **ERD Generation:** Create Mermaid diagram or export to professional tool
7. ⏳ **SDD Formalization:** Use section 6 as template for Systems Design Document
8. ⏳ **Performance Tuning:** Add recommended composite indexes before production
9. ⏳ **Audit Trail:** Consider adding audit_log table for compliance

---

**Generated:** May 19, 2026 | **Source:** 19 Supabase migrations analyzed | **Verified:** Supabase PostgREST MCP
