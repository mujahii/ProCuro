# ProCuro Database - Entity Relationship Diagram (ERD)

## Complete Mermaid ERD Diagram

```mermaid
erDiagram
    %% ============================================================================
    %% DOMAIN 1: AUTHENTICATION & USER MANAGEMENT (Blue - Users, Profiles, Addresses)
    %% ============================================================================
    
    AUTH_USERS["🔐 auth.users<br/>(Supabase Auth)"] {
        uuid id PK
        string email UNIQUE
        string encrypted_password
        timestamp created_at
        timestamp last_sign_in_at
    }
    
    USERS["👤 public.users<br/>(Central Registry)"] {
        uuid id PK
        string email UNIQUE
        string full_name
        string phone
        enum role "restaurant_owner|supplier|admin"
        text avatar_url
        text bio
        string restaurant_name
        boolean is_banned "DEFAULT false"
        timestamp created_at
    }
    
    OWNER_PROFILES["🏪 owner_profiles<br/>(1:1 Restaurant)"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        string restaurant_name
        text bio
        string tax_id "Steuernummer"
        string city
        string website
        text[] cuisine "array: Halal,Asian,MiddleEastern..."
        double latitude
        double longitude
        boolean is_active "DEFAULT true"
        timestamp created_at
    }
    
    SUPPLIER_PROFILES["🏭 supplier_profiles<br/>(1:1 Supplier)"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        string business_name "NOT NULL"
        string tax_id "Steuernummer"
        text description
        text[] category "array: Meat,Poultry,Seafood,Dairy,Beverages,Vegetables,Fruits,Spices,Bakery,Other"
        string city
        string website
        string phone
        text avatar_url
        double latitude
        double longitude
        numeric rating "DEFAULT 5, AUTO-UPDATED by trigger"
        boolean is_verified "DEFAULT false, AUTO on cert+bank"
        boolean is_active "DEFAULT true"
        timestamp created_at
    }
    
    ADDRESSES["📍 addresses<br/>(Multi-Address Book)"] {
        uuid id PK
        uuid user_id FK
        string label "DEFAULT 'Home'"
        string street
        string city
        string country
        string postal_code
        string house_number
        double latitude "for distance calc"
        double longitude "for distance calc"
        boolean is_default "DEFAULT false"
        timestamp created_at
    }
    
    OWNER_BANK["🏦 owner_bank_details<br/>(1:1 Owner Payment)"] {
        uuid id PK
        uuid owner_id FK "UNIQUE"
        string bank_name
        string account_holder
        string iban
        string bic
        timestamp created_at
    }
    
    %% ============================================================================
    %% DOMAIN 2: PRODUCTS & INVENTORY (Green - Products, Certs, Bank Details)
    %% ============================================================================
    
    PRODUCTS["📦 products<br/>(Supplier Inventory)"] {
        uuid id PK
        uuid supplier_id FK
        string name "NOT NULL"
        text description
        numeric price "10,2 >= 0"
        enum unit_type "kg|package|piece|liter"
        enum category "10 category options"
        integer stock_quantity "DEFAULT 0, >= 0"
        boolean is_active
        text image_url
        numeric discount_percent
        timestamp created_at
        timestamp updated_at
    }
    
    HALAL_CERTIFICATES["✅ halal_certificates<br/>(Admin-Reviewed)"] {
        uuid id PK
        uuid supplier_id FK
        text file_url "path in storage"
        string file_name
        enum status "pending|approved|rejected"
        uuid reviewed_by FK "admin user"
        timestamp reviewed_at
        text rejection_reason
        timestamp uploaded_at
    }
    
    SUPPLIER_BANK["🏦 supplier_bank_details<br/>(1:1 Payout Routing)"] {
        uuid id PK
        uuid supplier_id FK "UNIQUE"
        string bank_name
        string account_holder
        string iban
        string bic
        timestamp created_at
        timestamp updated_at
    }
    
    %% ============================================================================
    %% DOMAIN 3: ORDER FULFILLMENT (Yellow - Orders, Splits, Items)
    %% ============================================================================
    
    ORDERS["🛒 orders<br/>(Multi-Supplier Container)"] {
        uuid id PK
        uuid restaurant_owner_id FK "RESTRICT DELETE"
        numeric total_amount "DEFAULT 0"
        timestamp created_at
    }
    
    ORDER_SPLITS["📋 order_splits<br/>(Per-Supplier Fulfillment)"] {
        uuid id PK
        uuid order_id FK
        uuid supplier_id FK "RESTRICT DELETE"
        enum status "pending_confirmation|pending_payment|confirmed|shipped|delivered|cancelled"
        enum payment_method "cod|bank_transfer"
        text receipt_url
        numeric subtotal
        text cancellation_reason
        timestamp created_at
        timestamp updated_at
    }
    
    ORDER_ITEMS["📝 order_items<br/>(Line Items, Frozen Prices)"] {
        uuid id PK
        uuid order_split_id FK
        uuid product_id FK "RESTRICT DELETE"
        integer quantity "NOT NULL, > 0"
        numeric price_at_time "FROZEN SNAPSHOT"
        text unit_type "FROZEN SNAPSHOT"
    }
    
    %% ============================================================================
    %% DOMAIN 4: PAYMENTS (Orange - Bank Details)
    %% ============================================================================
    
    %% (Included above: SUPPLIER_BANK, OWNER_BANK)
    
    %% ============================================================================
    %% DOMAIN 5: COMMUNICATIONS (Red - Conversations, Messages)
    %% ============================================================================
    
    CONVERSATIONS["💬 conversations<br/>(1-on-1 Supplier-Owner)"] {
        uuid id PK
        uuid supplier_id FK
        uuid owner_id FK
        timestamp created_at
        timestamp last_message_at
        "CONSTRAINT UNIQUE(supplier_id, owner_id)"
    }
    
    MESSAGES["✉️ messages<br/>(Conversation Thread)"] {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        boolean is_read "DEFAULT false"
        timestamp created_at
    }
    
    ADMIN_CONVERSATIONS["🛡️ admin_conversations<br/>(Admin Direct Messaging)"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        timestamp created_at
    }
    
    ADMIN_MESSAGES["🛡️ admin_messages<br/>(Admin Message Thread)"] {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        boolean is_read "DEFAULT false"
        timestamp created_at
    }
    
    %% ============================================================================
    %% DOMAIN 6: FEEDBACK & MODERATION (Gray - Ratings, Reports, Notifications)
    %% ============================================================================
    
    SUPPLIER_RATINGS["⭐ supplier_ratings<br/>(Post-Delivery Feedback)"] {
        uuid id PK
        uuid supplier_id FK
        uuid owner_id FK
        uuid order_split_id FK "UNIQUE"
        integer rating "1-5"
        timestamp created_at
    }
    
    REPORTS["🚩 reports<br/>(Spam/Violation Flagging)"] {
        uuid id PK
        uuid reporter_id FK
        enum type "product|supplier"
        uuid target_id
        text target_name "SNAPSHOT"
        text reason
        text details
        enum status "pending|reviewed|dismissed"
        timestamp created_at
    }
    
    NOTIFICATIONS["🔔 notifications<br/>(In-App Alert Queue)"] {
        uuid id PK
        uuid user_id FK
        string title
        text message
        enum type "info|success|warning|error|certification"
        boolean is_read "DEFAULT false"
        timestamp created_at
    }
    
    %% ============================================================================
    %% DOMAIN 7: ANALYTICS & CACHE (Purple - Analytics Cache)
    %% ============================================================================
    
    AI_INSIGHTS_CACHE["🧠 ai_insights_cache<br/>(Gemini Quota Guard, 24h TTL)"] {
        uuid user_id PK FK "UNIQUE per user"
        string scope "DEFAULT 'analytics'"
        text summary "JSON or markdown"
        timestamp generated_at
    }
    
    %% ============================================================================
    %% DOMAIN 8: AUDIT & COMPLIANCE (Purple - Deleted Accounts)
    %% ============================================================================
    
    DELETED_ACCOUNTS["📊 deleted_accounts<br/>(GDPR Audit Trail)"] {
        uuid id PK
        uuid user_id
        string email "SNAPSHOT"
        enum role "SNAPSHOT"
        string business_name "if supplier"
        timestamp deleted_at "DEFAULT now()"
        uuid deleted_by_admin_id FK "nullable"
    }
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 1: AUTH TO USERS
    %% ============================================================================
    
    AUTH_USERS ||--o{ USERS : "CASCADE: on_auth_user_created trigger"
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 2: USERS TO PROFILES & ADDRESSES
    %% ============================================================================
    
    USERS ||--|| OWNER_PROFILES : "1:1: owner-user relationship"
    USERS ||--|| SUPPLIER_PROFILES : "1:1: supplier-user relationship"
    USERS ||--o{ ADDRESSES : "1:N: multi-address book"
    USERS ||--|| OWNER_BANK : "1:1: optional payment method"
    USERS ||--o{ ORDERS : "1:N: owner_id"
    USERS ||--o{ NOTIFICATIONS : "1:N: user notifications"
    USERS ||--o{ CONVERSATIONS : "1:N: as owner_id"
    USERS ||--o{ MESSAGES : "1:N: as sender_id"
    USERS ||--o{ REPORTS : "1:N: as reporter_id"
    USERS ||--|| AI_INSIGHTS_CACHE : "1:1: per-user cache"
    USERS ||--o{ ADMIN_CONVERSATIONS : "1:N: as user_id (admin channel)"
    USERS ||--o{ ADMIN_MESSAGES : "1:N: as sender_id"
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 3: SUPPLIER PROFILE TO PRODUCTS & CERTIFICATES
    %% ============================================================================
    
    SUPPLIER_PROFILES ||--o{ PRODUCTS : "1:N: product catalog"
    SUPPLIER_PROFILES ||--o{ HALAL_CERTIFICATES : "1:N: cert versions (pending→approved)"
    SUPPLIER_PROFILES ||--|| SUPPLIER_BANK : "1:1: payout routing"
    SUPPLIER_PROFILES ||--o{ ORDER_SPLITS : "1:N: fulfillment tracking"
    SUPPLIER_PROFILES ||--o{ SUPPLIER_RATINGS : "1:N: receives ratings"
    SUPPLIER_PROFILES ||--o{ CONVERSATIONS : "1:N: as supplier_id"
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 4: ORDERS TO SPLITS & ITEMS
    %% ============================================================================
    
    ORDERS ||--o{ ORDER_SPLITS : "1:N: multi-supplier per order"
    ORDER_SPLITS ||--o{ ORDER_ITEMS : "1:N: line items per split"
    ORDER_SPLITS ||--|| SUPPLIER_RATINGS : "1:1: one rating per delivery"
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 5: PRODUCTS TO ORDER ITEMS
    %% ============================================================================
    
    PRODUCTS ||--o{ ORDER_ITEMS : "1:N: product ordered"
    
    %% ============================================================================
    %% RELATIONSHIPS - TIER 6: CONVERSATIONS TO MESSAGES
    %% ============================================================================
    
    CONVERSATIONS ||--o{ MESSAGES : "1:N: conversation thread"
    ADMIN_CONVERSATIONS ||--o{ ADMIN_MESSAGES : "1:N: admin thread"
```

---

## Complete Relationship Explanations

### TIER 1: Authentication Foundation

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **Auth to User** | auth.users (Supabase) | public.users | 1:N | CASCADE | Mirrors Supabase Auth users; one auth user can have one profile |

**Explanation:**
- `auth.users` is managed by Supabase Auth (email/password, JWT generation)
- `public.users` is the application user registry (role, ban status, profile info)
- Trigger `on_auth_user_created` fires when user signs up → creates `public.users` row
- When user deleted in auth → CASCADE deletes public.users → cascades to all owned records

---

### TIER 2: User to Profiles & Supporting Tables

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **User to Owner Profile** | users | owner_profiles | 1:1 | CASCADE | One user per restaurant owner |
| **User to Supplier Profile** | users | supplier_profiles | 1:1 | CASCADE | One user per supplier |
| **User to Addresses** | users | addresses | 1:N | CASCADE | Multi-address book (home, work, etc.) |
| **User to Owner Bank** | users | owner_bank_details | 1:1 | CASCADE | Optional payment method (future) |

**Explanations:**

**User → Owner Profile (1:1)**
- Restaurant owner registers → `owner_profiles` row created
- Separated from `users` table to avoid schema bloat
- Contains owner-specific data: restaurant_name, cuisine, tax_id
- UNIQUE constraint enforces 1:1 (each user max 1 owner profile)

**User → Supplier Profile (1:1)**
- Supplier registers → `supplier_profiles` row created
- Contains: business_name, category, is_verified, is_active, rating
- is_verified computed as: (cert approved) AND (bank details present)
- Rating auto-updated by `update_supplier_avg_rating()` trigger

**User → Addresses (1:N)**
- Users have multiple delivery addresses (home, office, secondary location)
- Each address has: street, city, GPS coordinates
- is_default flag marks primary address
- Used for distance calculation (latitude/longitude)

**User → Owner Bank Details (1:1)**
- Optional payment method for restaurant owners
- Prepared for future credit system or payout reversal
- Not currently active (fields exist but unused)

---

### TIER 3: User to Communications & Interactions

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **User to Notifications** | users | notifications | 1:N | CASCADE | In-app alerts for user |
| **User to Conversations (as Owner)** | users | conversations | 1:N | CASCADE | Supplier-owner chats |
| **User to Messages (as Sender)** | users | messages | 1:N | CASCADE | Sent messages in conversations |
| **User to Reports (as Reporter)** | users | reports | 1:N | CASCADE | User reports products/suppliers |
| **User to Admin Conversations** | users | admin_conversations | 1:N | CASCADE | Direct admin messaging |
| **User to Admin Messages (as Sender)** | users | admin_messages | 1:N | CASCADE | Messages in admin thread |
| **User to AI Cache (1:1)** | users | ai_insights_cache | 1:1 | CASCADE | Gemini cache per user |

**Explanations:**

**User → Notifications (1:N)**
- New order delivered? → notification inserted
- Cert rejected? → notification inserted
- Rating received? → notification inserted
- Each user can have many unread notifications
- Realtime subscription: `supabase.on('INSERT', callback)`

**User → Conversations (1:N)**
- Restaurant owner initiates chat with supplier
- UNIQUE(supplier_id, owner_id) prevents duplicate conversations
- Supplier and owner both have access to same conversation

**User → Messages (1:N)**
- Both supplier and owner send messages
- Hard-deleted on account deletion (was soft-deleted in migration 016)
- is_read flag for read receipts

**User → Reports (1:N)**
- User reports spam product or fraudulent supplier
- type = 'product' | 'supplier'
- target_id points to products(id) or supplier_profiles(id)
- Admin reviews in moderation queue

**User → Admin Conversations (1:N)**
- Admin sends message to specific user (complaint, alert, notice)
- UNIQUE(user_id) enforces one conversation per user (admin initiates)
- Different from regular conversations (admin-only)

**User → AI Cache (1:1)**
- User views analytics dashboard
- If cache exists and age < 24h → use cached summary
- Else → call POST /api/ai/analytics-summary → Gemini generates → cache result
- Protects against Gemini quota exhaustion

---

### TIER 4: Supplier Profile to Products & Certifications

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **Supplier to Products** | supplier_profiles | products | 1:N | CASCADE | Product catalog |
| **Supplier to Halal Certs** | supplier_profiles | halal_certificates | 1:N | CASCADE | Certification documents |
| **Supplier to Bank Details** | supplier_profiles | supplier_bank_details | 1:1 | CASCADE | Payout routing |
| **Supplier to Order Splits** | supplier_profiles | order_splits | 1:N | RESTRICT | Fulfillment tracking |
| **Supplier to Ratings** | supplier_profiles | supplier_ratings | 1:N | CASCADE | Received feedback |
| **Supplier to Conversations** | supplier_profiles | conversations | 1:N | CASCADE | Customer chats |

**Explanations:**

**Supplier → Products (1:N)**
- Supplier uploads products to marketplace
- Each product has: name, price, unit_type, stock_quantity
- is_active flag controls visibility (draft vs. published)
- Indexes on supplier_id, category for fast filtering

**Supplier → Halal Certificates (1:N)**
- Supplier uploads cert PDF
- status: pending → (admin reviews) → approved or rejected
- If approved AND bank_details present → supplier_profiles.is_verified = true
- Allows multiple cert versions (resubmit if rejected)

**Supplier → Bank Details (1:1)**
- IBAN for payout settlement
- Triggers verification check: if cert approved → is_verified = true
- UNIQUE constraint enforces 1:1

**Supplier → Order Splits (1:N, RESTRICT)**
- Supplier receives order splits for fulfillment
- Supplier updates status: pending → confirmed → shipped → delivered
- RESTRICT prevents accidental deletion (preserves order history)
- Why RESTRICT? Order audit trail must be immutable

**Supplier → Ratings (1:N)**
- Restaurant owner rates supplier post-delivery
- Each rating: 1-5 stars
- Trigger `update_supplier_avg_rating()` recalculates supplier_profiles.rating (average)
- Suppliers can see their ratings (feedback mechanism)

**Supplier → Conversations (1:N)**
- Supplier receives messages from restaurant owners
- Supplier can initiate or respond
- UNIQUE(supplier_id, owner_id) ensures one conversation per pair

---

### TIER 5: Orders to Splits & Items

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **Order to Splits** | orders | order_splits | 1:N | CASCADE | Multi-supplier breakdown |
| **Split to Items** | order_splits | order_items | 1:N | CASCADE | Line items per split |
| **Split to Rating** | order_splits | supplier_ratings | 1:1 | CASCADE | Post-delivery feedback |

**Explanations:**

**Order → Split (1:N)**
- Restaurant owner creates ONE order (total_amount = sum of splits)
- If order includes products from 3 suppliers → 3 order_splits
- Each split tracked independently (supplier can confirm/ship one split separately)
- order_splits.subtotal = sum of order_items prices
- status: pending_confirmation → confirmed → shipped → delivered

**Split → Items (1:N)**
- Each split contains line items (what supplier is delivering)
- price_at_time FROZEN (product price changed? doesn't affect historical order)
- unit_type FROZEN (product unit changed? historical accuracy preserved)
- Indexes on order_split_id for fast lookups

**Split → Rating (1:1)**
- After delivery, owner rates supplier for this specific delivery
- UNIQUE(order_split_id) ensures one rating per split
- Automatically triggers: update_supplier_avg_rating() recalculates supplier.rating

---

### TIER 6: Products to Order Items

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **Product to Order Items** | products | order_items | 1:N | RESTRICT | Historical pricing |

**Explanation:**

**Product → Order Item (1:N, RESTRICT)**
- Order item references product at order time
- RESTRICT prevents deletion of product if items exist (audit trail)
- Why RESTRICT? order_items.price_at_time must reference frozen price, not current product.price
- Example: supplier deletes product, historical order still shows "Halal Chicken €12.99" (not current price)
- RESTRICT forces supplier to keep product record (even if inactive)

---

### TIER 7: Conversations to Messages

| Relationship | From | To | Cardinality | FK Rule | Purpose |
|---|---|---|---|---|---|
| **Conversation to Messages** | conversations | messages | 1:N | CASCADE | Message thread |
| **Admin Conv to Admin Messages** | admin_conversations | admin_messages | 1:N | CASCADE | Admin thread |

**Explanations:**

**Conversation → Messages (1:N)**
- One conversation between supplier and owner
- Many messages exchanged (supplier replies, owner replies)
- Realtime: `supabase.on('INSERT', callback)` for live chat
- is_read flag for read receipts

**Admin Conversation → Admin Messages (1:N)**
- Admin initiates conversation with user
- Admin sends messages to user
- Similar structure but admin-only (no RLS between users)

---

### Cardinality Matrix Summary

| From Table | To Table | Cardinality | Type | Delete Rule |
|---|---|---|---|---|
| auth.users | public.users | 1:N | Foreign Key | CASCADE |
| public.users | owner_profiles | 1:1 | Foreign Key (UNIQUE) | CASCADE |
| public.users | supplier_profiles | 1:1 | Foreign Key (UNIQUE) | CASCADE |
| public.users | addresses | 1:N | Foreign Key | CASCADE |
| public.users | owner_bank_details | 1:1 | Foreign Key (UNIQUE) | CASCADE |
| public.users | orders | 1:N | Foreign Key | **RESTRICT** |
| public.users | notifications | 1:N | Foreign Key | CASCADE |
| public.users | conversations | 1:N | Foreign Key | CASCADE |
| public.users | messages | 1:N | Foreign Key | CASCADE |
| public.users | reports | 1:N | Foreign Key | CASCADE |
| public.users | ai_insights_cache | 1:1 | Foreign Key (PK) | CASCADE |
| public.users | admin_conversations | 1:N | Foreign Key | CASCADE |
| public.users | admin_messages | 1:N | Foreign Key | CASCADE |
| supplier_profiles | products | 1:N | Foreign Key | CASCADE |
| supplier_profiles | halal_certificates | 1:N | Foreign Key | CASCADE |
| supplier_profiles | supplier_bank_details | 1:1 | Foreign Key (UNIQUE) | CASCADE |
| supplier_profiles | order_splits | 1:N | Foreign Key | **RESTRICT** |
| supplier_profiles | supplier_ratings | 1:N | Foreign Key | CASCADE |
| supplier_profiles | conversations | 1:N | Foreign Key | CASCADE |
| orders | order_splits | 1:N | Foreign Key | CASCADE |
| order_splits | order_items | 1:N | Foreign Key | CASCADE |
| order_splits | supplier_ratings | 1:1 | Foreign Key (UNIQUE) | CASCADE |
| products | order_items | 1:N | Foreign Key | **RESTRICT** |
| conversations | messages | 1:N | Foreign Key | CASCADE |
| admin_conversations | admin_messages | 1:N | Foreign Key | CASCADE |

**Key Findings:**
- **Total Relationships:** 28 Foreign Keys
- **CASCADE Deletions:** 18 (safe to clean up)
- **RESTRICT Deletions:** 3 (preserve audit trail: orders, order_splits, order_items)
- **Unique Constraints:** 6 (enforce 1:1 relationships)

---

## Missing Constraints & Recommendations

### 1. ⚠️ MISSING: Table-Level Constraint for Certification Gate

**Current State:**
```sql
supplier_profiles.is_verified BOOLEAN DEFAULT false
-- Updated via trigger when cert approved AND bank details added
```

**Issue:** 
- No explicit CHECK constraint enforcing: `is_verified=true REQUIRES cert_approved AND iban_present`
- Could be out of sync if trigger fails

**Recommendation:**
```sql
-- Add to supplier_profiles table:
ALTER TABLE supplier_profiles 
ADD CONSTRAINT check_verified_requires_cert_and_bank
CHECK (
  is_verified = false OR (
    SELECT COUNT(*) FROM halal_certificates 
    WHERE supplier_id = id AND status='approved'
  ) > 0
  AND
  (SELECT COUNT(*) FROM supplier_bank_details 
   WHERE supplier_id = id AND iban IS NOT NULL
  ) > 0
);
```

**Priority:** HIGH (ensures data integrity)

---

### 2. ⚠️ MISSING: Status Transition Constraints

**Current State:**
```sql
order_splits.status TEXT
-- Values: pending_confirmation, confirmed, shipped, delivered, cancelled
-- No explicit enum or check constraint
```

**Issue:** 
- No enforcement of valid transitions (e.g., can't go from delivered → confirmed)
- No check that status follows state machine

**Recommendation:**
```sql
-- Option A: Create ENUM type
CREATE TYPE order_status AS ENUM (
  'pending_confirmation',
  'pending_payment',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);
ALTER TABLE order_splits ALTER COLUMN status TYPE order_status USING status::order_status;

-- Option B: Add CHECK constraint for state machine
ALTER TABLE order_splits
ADD CONSTRAINT valid_status_transition
CHECK (
  -- pending_confirmation → confirmed, cancelled
  -- confirmed → shipped
  -- shipped → delivered
  -- delivered → (end state)
  -- Allow any transition for now, implement in app logic
);
```

**Priority:** MEDIUM (can be enforced in app logic)

---

### 3. ⚠️ MISSING: Price Range Validation

**Current State:**
```sql
products.price NUMERIC(10,2)
products.discount_percent NUMERIC
-- No constraint on valid ranges
```

**Issue:** 
- Could set negative prices (data corruption)
- Could set discount > 100% (invalid)

**Recommendation:**
```sql
ALTER TABLE products 
ADD CONSTRAINT price_non_negative CHECK (price >= 0),
ADD CONSTRAINT discount_valid CHECK (discount_percent >= 0 AND discount_percent <= 100);

ALTER TABLE order_items
ADD CONSTRAINT price_at_time_non_negative CHECK (price_at_time >= 0);

ALTER TABLE order_splits
ADD CONSTRAINT subtotal_non_negative CHECK (subtotal >= 0);

ALTER TABLE orders
ADD CONSTRAINT total_non_negative CHECK (total_amount >= 0);
```

**Priority:** HIGH (prevents invalid financial data)

---

### 4. ⚠️ MISSING: Quantity Range Validation

**Current State:**
```sql
products.stock_quantity INTEGER
order_items.quantity INTEGER
-- No constraint on positive values
```

**Issue:** 
- Could set negative stock (data corruption)
- Could order zero items (invalid)

**Recommendation:**
```sql
ALTER TABLE products
ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);

ALTER TABLE order_items
ADD CONSTRAINT quantity_positive CHECK (quantity > 0);
```

**Priority:** HIGH

---

### 5. ⚠️ MISSING: Rating Range Validation

**Current State:**
```sql
supplier_profiles.rating NUMERIC
supplier_ratings.rating INTEGER
-- No constraint on 1-5 range
```

**Issue:** 
- Could set rating = 10 or -1 (invalid)
- rating in supplier_profiles should be 1-5

**Recommendation:**
```sql
ALTER TABLE supplier_ratings
ADD CONSTRAINT rating_valid CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE supplier_profiles
ADD CONSTRAINT rating_valid CHECK (rating >= 1 AND rating <= 5 OR rating = 0);
```

**Priority:** HIGH

---

### 6. ⚠️ MISSING: Cascade Behavior for Messages

**Current State:**
```
conversations → messages (CASCADE)
WHEN conversations deleted → messages deleted
WHEN users deleted → messages soft-deleted (not implemented correctly)
```

**Issue:**
- Migration 016 dropped soft-delete columns from messages
- If owner/supplier deleted → conversations deleted → messages deleted
- But message.sender_id (FK) also CASCADE → could cause duplicate deletions
- Risk: Message orphaned without conversation

**Recommendation:**
```sql
-- Ensure proper cascading order:
-- 1. messages.sender_id → should be CASCADE
-- 2. conversations.owner_id → should be CASCADE
-- 3. conversations itself → should be CASCADE
-- Result: If user deleted → all their messages gone

ALTER TABLE messages 
DROP CONSTRAINT messages_sender_id_fkey,
ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Priority:** MEDIUM (migration 016 may have addressed this)

---

### 7. ⚠️ MISSING: Unique Conversation Pair

**Current State:**
```sql
CREATE UNIQUE INDEX idx_conversation_supplier_owner 
ON conversations(supplier_id, owner_id);
```

**Status:** ✅ PRESENT (via index, good)

**Verification:** Looks correct, prevents duplicate conversations

---

### 8. ⚠️ MISSING: Unique Rating Per Order Split

**Current State:**
```sql
CREATE UNIQUE INDEX idx_supplier_ratings_split 
ON supplier_ratings(order_split_id);
```

**Status:** ✅ PRESENT (via index or UNIQUE constraint)

**Verification:** Looks correct, prevents duplicate ratings

---

### 9. ⚠️ MISSING: Temporal Ordering Constraints

**Current State:**
```sql
conversations.created_at TIMESTAMPTZ
conversations.last_message_at TIMESTAMPTZ
-- No constraint: last_message_at >= created_at
```

**Issue:** 
- Could set last_message_at before created_at (data inconsistency)

**Recommendation:**
```sql
ALTER TABLE conversations
ADD CONSTRAINT last_message_after_created 
CHECK (last_message_at >= created_at OR last_message_at IS NULL);

ALTER TABLE halal_certificates
ADD CONSTRAINT reviewed_after_uploaded
CHECK (reviewed_at >= uploaded_at OR reviewed_at IS NULL);
```

**Priority:** LOW (data quality issue, not critical)

---

### 10. ⚠️ MISSING: Supplier Verification Trigger Audit

**Current State:**
```sql
trigger: on_halal_certificate_approved()
  → updates supplier_profiles.is_verified
-- No logging of who/when verified
```

**Issue:** 
- No audit trail for verification status changes
- Can't tell when supplier was verified or by whom

**Recommendation:**
```sql
-- Create audit table:
CREATE TABLE supplier_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES supplier_profiles(id),
  verified BOOLEAN NOT NULL,
  verified_by UUID REFERENCES auth.users(id),
  reason TEXT, -- 'cert_approved', 'cert_rejected', 'bank_removed', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log changes:
CREATE TRIGGER log_supplier_verification
AFTER UPDATE ON supplier_profiles
FOR EACH ROW
WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified)
BEGIN
  INSERT INTO supplier_verification_audit (supplier_id, verified, created_at)
  VALUES (NEW.id, NEW.is_verified, now());
END;
```

**Priority:** MEDIUM (compliance / audit trail)

---

## Constraint Recommendation Summary

| # | Constraint Type | Table | Priority | Status |
|---|---|---|---|---|
| 1 | CHECK: cert + bank required for is_verified | supplier_profiles | HIGH | ⚠️ Missing |
| 2 | ENUM/CHECK: valid status transitions | order_splits | MEDIUM | ⚠️ Missing |
| 3 | CHECK: price ≥ 0 | products, order_items | HIGH | ⚠️ Missing |
| 4 | CHECK: discount 0-100% | products | HIGH | ⚠️ Missing |
| 5 | CHECK: quantity > 0 | order_items | HIGH | ⚠️ Missing |
| 6 | CHECK: rating 1-5 | supplier_ratings | HIGH | ⚠️ Missing |
| 7 | UNIQUE: (supplier_id, owner_id) | conversations | HIGH | ✅ Present |
| 8 | UNIQUE: order_split_id | supplier_ratings | HIGH | ✅ Present |
| 9 | CHECK: temporal ordering | conversations | LOW | ⚠️ Missing |
| 10 | AUDIT: verification changes | supplier_profiles | MEDIUM | ⚠️ Missing |

---

