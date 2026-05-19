# ProCuro Architecture Diagrams - Generation Prompts

## Diagram 1: High-Level System Architecture (Three-Tier)

### For Professional Tools (Lucidchart, Draw.io, Miro)

```
ARCHITECTURE DIAGRAM: ProCuro Three-Tier System

TITLE: ProCuro Marketplace - System Architecture Overview

STRUCTURE:

TIER 1: PRESENTATION (UI Layer)
┌─────────────────────────────────────────┐
│     React SPA (Vite) - Client-Side      │
├─────────────────────────────────────────┤
│ • 70+ React components                  │
│ • 40+ React Router routes               │
│ • 4 role-based layouts (Owner,          │
│   Supplier, Admin, Public)              │
│ • Context providers (Auth, Cart,        │
│   Address, Language)                    │
│ • Lazy-loaded pages via React.lazy()    │
│ • Offline-capable PWA (Service Worker)  │
│ • Recharts for analytics visualization  │
└─────────────────────────────────────────┘
              ↓ HTTPS/REST (port 5173 dev, prod domain)
              
TIER 2: APPLICATION (Business Logic)
┌────────────────────────────────────────────────────┐
│ Express.js Server          │  Netlify Functions    │
│ (port 3001 - Express dev)  │  (Serverless Edge)    │
├────────────────┬───────────┼──────────────────────┤
│ Routes:        │ Auth:     │ Functions:           │
│ • /api/ai/chat │ JWT      │ • ai-chat           │
│ • /api/health  │ verify   │ • ai-analytics-     │
│                │ Supabase │   summary           │
│ Middleware:    │ Service  │ • Rate limiting     │
│ • CORS         │ role key │ • Google Gemini     │
│ • Rate limit   │          │   integration       │
│ • JSON parser  │          │ • Cache management  │
│                │          │ • Model fallback    │
└────────────────┴───────────┴──────────────────────┘
        ↓ PostgREST/JWT (PostgreSQL protocol)
        
TIER 3: DATA (Persistence)
┌──────────────────────────────────────────┐
│ Supabase PostgreSQL (Germany, EU)        │
├──────────────────────────────────────────┤
│ Database:                                │
│ • 21 tables (users, products, orders,    │
│   conversations, notifications, etc.)    │
│ • Row-Level Security (40+ policies)      │
│ • 10+ performance indexes                │
│ • 19 migrations (schema versioning)      │
│                                          │
│ Storage Buckets (S3-compatible):         │
│ • avatars/ - profile photos              │
│ • halal-certificates/ - certs (PDFs)     │
│ • product-images/ - product catalog      │
│ • invoices/ - generated receipts         │
│                                          │
│ Auth:                                    │
│ • Supabase Auth (JWT provider)           │
│ • Email/password authentication          │
│ • Session & refresh token management     │
│                                          │
│ Realtime:                                │
│ • WebSocket subscriptions                │
│ • Live notifications & messages          │
└──────────────────────────────────────────┘

EXTERNAL SERVICES:
┌────────────────────┐
│ Google Cloud       │
├────────────────────┤
│ • Gemini API       │
│ • 4-model fallback │
│ • Rate limited:    │
│   20 req/60s       │
│ • 24h cache TTL    │
└────────────────────┘

DEPLOYMENT:
┌────────────────────────────────────────────┐
│ Netlify (Frontend + Functions + Hosting)   │
├────────────────────────────────────────────┤
│ • Static assets (CDN edge cache)           │
│ • SPA routing (/index.html fallback)       │
│ • Serverless functions (Node.js 20)        │
│ • HTTPS enforcement                        │
│ • Security headers                         │
│ • Build pipeline (npm run build)           │
└────────────────────────────────────────────┘

STYLING NOTES:
- Color frontend: Blue (#4A90E2)
- Color backend: Green (#50C878)
- Color database: Orange (#FF9500)
- Color external: Purple (#9B59B6)
- Use arrows for data flow
- Include latency annotations (50-300ms)
- Bold key technologies (React, Express, PostgreSQL)
```

### For AI Image Generation (DALL-E, Midjourney)

```
Generate a professional system architecture diagram for a marketplace application with these specifications:

TITLE: "ProCuro - Halal Food Marketplace System Architecture"

LAYOUT: Vertical three-tier architecture diagram

TIER 1 - PRESENTATION LAYER (Top, Blue):
- Show a modern React/Vite frontend interface
- Include UI elements: Dashboard, Navigation, Charts
- Label: "React SPA (Vite) - 70+ Components, 40+ Routes"
- Show role-based layouts: Owner, Supplier, Admin
- Include PWA indicators (offline capability)

TIER 2 - APPLICATION LAYER (Middle, Green):
- Left side: Express.js server with API routes
  - /api/ai/chat endpoint
  - JWT middleware
  - Rate limiting visualization
- Right side: Netlify Functions (serverless)
  - ai-chat function
  - analytics-summary function
  - Google Gemini integration
- Show data flow: CORS, JWT tokens, rate limits

TIER 3 - DATA LAYER (Bottom, Orange):
- PostgreSQL database visualization
  - 21 tables organized in domains (Users, Products, Orders, Communications)
  - 40+ RLS policies
  - 10+ performance indexes
- Storage buckets (S3-style visualization):
  - avatars, halal-certificates, product-images, invoices
- Supabase Auth module

EXTERNAL SERVICES (Right side, Purple):
- Google Cloud Gemini API
- Fallback model chain visualization

DEPLOYMENT (Bottom right):
- Netlify CDN/hosting platform
- Auto-scaling indicators

DATA FLOW ARROWS:
- Solid blue arrows: HTTPS requests
- Dashed green arrows: JWT authentication
- Orange arrows: Database queries
- Purple arrows: AI service calls

ANNOTATIONS:
- Latency times (50-300ms per hop)
- Data security indicators (HTTPS, encryption)
- Scalability labels (auto-scale, CDN distribution)

STYLE:
- Professional, technical, enterprise-grade
- High contrast (suitable for printing)
- Sans-serif fonts (Helvetica, Arial)
- Minimal whitespace, compact layout
- Include legend for arrow types
- Resolution: 2400x3600px (landscape)
- Format: PNG or SVG

INCLUDE:
- Company logo placeholder (top-left)
- "Built with: React, Express, Supabase, Netlify" (bottom)
- Date: May 19, 2026
- Version: 1.0
```

---

## Diagram 2: Database Entity Relationship Diagram (ERD)

### For Mermaid (Native Markdown)

```mermaid
erDiagram
    %% Domain 1: Authentication & Users (Blue)
    AUTH_USERS["🔐 auth.users<br/>(Supabase Auth)"] {
        uuid id PK
        string email
        timestamp created_at
    }
    
    USERS["👤 users"] {
        uuid id PK
        string email
        string full_name
        enum role "owner|supplier|admin"
        text avatar_url
        boolean is_banned
        timestamp created_at
    }
    
    OWNER_PROFILES["🏪 owner_profiles<br/>(1:1)"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        string restaurant_name
        text[] cuisine
        string tax_id
        timestamp created_at
    }
    
    SUPPLIER_PROFILES["🏭 supplier_profiles<br/>(1:1)"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        string business_name
        text[] category
        numeric rating "avg"
        boolean is_verified
        boolean is_active
        timestamp created_at
    }
    
    ADDRESSES["📍 addresses"] {
        uuid id PK
        uuid user_id FK
        string street
        string city
        double latitude
        boolean is_default
        timestamp created_at
    }
    
    %% Domain 2: Products & Certification (Green)
    PRODUCTS["📦 products"] {
        uuid id PK
        uuid supplier_id FK
        string name
        numeric price
        enum unit_type "kg|package|piece|liter"
        integer stock_quantity
        boolean is_active
        text image_url
        timestamp created_at
    }
    
    HALAL_CERTIFICATES["✅ halal_certificates"] {
        uuid id PK
        uuid supplier_id FK
        text file_url
        enum status "pending|approved|rejected"
        uuid reviewed_by FK
        text rejection_reason
        timestamp uploaded_at
    }
    
    SUPPLIER_BANK_DETAILS["🏦 supplier_bank_details<br/>(1:1)"] {
        uuid id PK
        uuid supplier_id FK "UNIQUE"
        string bank_name
        string iban
        string bic
        timestamp created_at
    }
    
    %% Domain 3: Orders & Fulfillment (Yellow)
    ORDERS["🛒 orders"] {
        uuid id PK
        uuid restaurant_owner_id FK "RESTRICT"
        numeric total_amount
        timestamp created_at
    }
    
    ORDER_SPLITS["📋 order_splits"] {
        uuid id PK
        uuid order_id FK
        uuid supplier_id FK "RESTRICT"
        enum status "pending→delivered"
        enum payment_method "cod|bank_transfer"
        numeric subtotal
        timestamp created_at
    }
    
    ORDER_ITEMS["📝 order_items"] {
        uuid id PK
        uuid order_split_id FK
        uuid product_id FK "RESTRICT"
        integer quantity
        numeric price_at_time "frozen"
        timestamp created_at
    }
    
    %% Domain 4: Communications (Red)
    CONVERSATIONS["💬 conversations"] {
        uuid id PK
        uuid supplier_id FK
        uuid owner_id FK
        timestamp created_at
    }
    
    MESSAGES["✉️ messages"] {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        boolean is_read
        timestamp created_at
    }
    
    ADMIN_CONVERSATIONS["🛡️ admin_conversations"] {
        uuid id PK
        uuid user_id FK "UNIQUE"
        timestamp created_at
    }
    
    ADMIN_MESSAGES["🛡️ admin_messages"] {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        timestamp created_at
    }
    
    %% Domain 5: Feedback & Moderation (Gray)
    SUPPLIER_RATINGS["⭐ supplier_ratings"] {
        uuid id PK
        uuid supplier_id FK
        uuid owner_id FK
        uuid order_split_id FK "UNIQUE"
        integer rating "1-5"
        timestamp created_at
    }
    
    REPORTS["🚩 reports"] {
        uuid id PK
        uuid reporter_id FK
        enum type "product|supplier"
        uuid target_id
        text reason
        enum status "pending|reviewed|dismissed"
        timestamp created_at
    }
    
    NOTIFICATIONS["🔔 notifications"] {
        uuid id PK
        uuid user_id FK
        string title
        text message
        enum type "info|success|warning|error|certification"
        boolean is_read
        timestamp created_at
    }
    
    %% Domain 6: Analytics & Audit (Purple)
    AI_INSIGHTS_CACHE["🧠 ai_insights_cache<br/>(1:1)"] {
        uuid user_id PK FK
        text summary
        timestamp generated_at
    }
    
    DELETED_ACCOUNTS["📊 deleted_accounts<br/>(Audit)"] {
        uuid id PK
        uuid user_id "historic"
        string email "snapshot"
        enum role "snapshot"
        timestamp deleted_at
        uuid deleted_by_admin_id FK
    }
    
    OWNER_BANK_DETAILS["🏦 owner_bank_details<br/>(1:1)"] {
        uuid id PK
        uuid owner_id FK "UNIQUE"
        string bank_name
        string iban
        timestamp created_at
    }
    
    %% RELATIONSHIPS
    AUTH_USERS ||--o{ USERS : "CASCADE"
    USERS ||--|| OWNER_PROFILES : "1:1"
    USERS ||--|| SUPPLIER_PROFILES : "1:1"
    USERS ||--o{ ADDRESSES : "1:N"
    USERS ||--o{ ORDERS : "owner"
    USERS ||--o{ NOTIFICATIONS : "1:N"
    USERS ||--o{ CONVERSATIONS : "owner"
    USERS ||--o{ MESSAGES : "sender"
    USERS ||--o{ REPORTS : "reporter"
    USERS ||--|| AI_INSIGHTS_CACHE : "1:1"
    USERS ||--|| OWNER_BANK_DETAILS : "1:1"
    USERS ||--o{ ADMIN_CONVERSATIONS : "admin"
    
    SUPPLIER_PROFILES ||--o{ PRODUCTS : "1:N"
    SUPPLIER_PROFILES ||--o{ HALAL_CERTIFICATES : "1:N"
    SUPPLIER_PROFILES ||--|| SUPPLIER_BANK_DETAILS : "1:1"
    SUPPLIER_PROFILES ||--o{ ORDER_SPLITS : "1:N"
    SUPPLIER_PROFILES ||--o{ SUPPLIER_RATINGS : "1:N"
    SUPPLIER_PROFILES ||--o{ CONVERSATIONS : "supplier"
    
    ORDERS ||--o{ ORDER_SPLITS : "1:N"
    ORDER_SPLITS ||--o{ ORDER_ITEMS : "1:N"
    ORDER_SPLITS ||--|| SUPPLIER_RATINGS : "1:1"
    
    PRODUCTS ||--o{ ORDER_ITEMS : "1:N"
    
    CONVERSATIONS ||--o{ MESSAGES : "1:N"
    ADMIN_CONVERSATIONS ||--o{ ADMIN_MESSAGES : "1:N"
```

### For Professional Tools (DbSchema, Lucidchart, Draw.io)

```
ENTITY RELATIONSHIP DIAGRAM: ProCuro Database Schema

DATABASE METADATA:
- Name: ProCuro
- Type: PostgreSQL (Supabase)
- Region: Germany (EU compliance)
- Normalization: 3NF
- Tables: 21
- Foreign Keys: 28 (18 CASCADE, 3 RESTRICT)
- RLS Policies: 40+
- Indexes: 10+

DOMAIN ORGANIZATION:

DOMAIN 1: Authentication & Users (Blue boxes)
├─ auth.users (Supabase Auth provider)
├─ users (central registry, 1:1 mirror of auth.users)
├─ owner_profiles (1:1 restaurant owner extended data)
├─ supplier_profiles (1:1 supplier verification + rating)
└─ addresses (1:N multi-delivery locations per user)

DOMAIN 2: Products & Certification (Green boxes)
├─ products (supplier inventory with stock)
├─ halal_certificates (admin-reviewed certs, 1:N per supplier)
└─ supplier_bank_details (1:1 IBAN routing)

DOMAIN 3: Order Fulfillment (Yellow boxes)
├─ orders (1:N per restaurant owner, RESTRICT FK)
├─ order_splits (multi-supplier fulfillment, RESTRICT FK)
└─ order_items (line items with frozen prices, RESTRICT FK)

DOMAIN 4: Communications (Red boxes)
├─ conversations (1-on-1 supplier-owner chats, UNIQUE pair)
├─ messages (conversation threads, hard-deleted)
├─ admin_conversations (admin direct messaging)
└─ admin_messages (admin message thread)

DOMAIN 5: Feedback & Moderation (Gray boxes)
├─ supplier_ratings (post-delivery 1-5 stars)
├─ reports (spam/violation flagging)
└─ notifications (in-app alert queue)

DOMAIN 6: Analytics & Audit (Purple boxes)
├─ ai_insights_cache (Gemini quota guard, 1:1 per user)
└─ deleted_accounts (GDPR audit trail)

DOMAIN 7: Payments (Orange boxes)
├─ supplier_bank_details (payout routing)
└─ owner_bank_details (future credit system)

KEY RELATIONSHIPS:
- CASCADE: 18 FKs (safe to clean up)
- RESTRICT: 3 FKs (preserve audit trail: orders, order_splits, order_items)
- UNIQUE: 6 FKs (enforce 1:1 relationships)

COLORING:
- 🟦 Blue: User & Authentication
- 🟩 Green: Products & Inventory
- 🟨 Yellow: Orders & Fulfillment
- 🟥 Red: Communications
- ⬜ Gray: Feedback & Audit
- 🟠 Orange: Payments

ICONS:
- 🔐 auth.users
- 👤 users, profiles
- 📍 addresses
- 📦 products
- ✅ halal_certificates
- 🛒 orders
- 📋 order_splits
- 📝 order_items
- 💬 conversations
- ✉️ messages
- ⭐ supplier_ratings
- 🚩 reports
- 🔔 notifications
- 🧠 ai_insights_cache
- 📊 deleted_accounts
- 🏦 bank_details
```

---

## Diagram 3: Authentication & Authorization Flow

### For Lucidchart / Draw.io

```
SEQUENCE DIAGRAM: User Authentication & Authorization Flow

ACTORS:
- User (Client Browser)
- Frontend (React SPA)
- Supabase Auth
- Express Backend
- Database (RLS)

SCENARIO 1: USER LOGIN
├─ 1. User enters email + password
├─ 2. Frontend: supabase.auth.signInWithPassword()
├─ 3. Supabase Auth validates credentials
├─ 4. Returns JWT (60 min expiry)
├─ 5. Frontend stores JWT in localStorage
├─ 6. Frontend fetches profile from public.users
├─ 7. Database: RLS checks owner OR admin policy
├─ 8. Returns profile + role
├─ 9. AuthContext updates state
└─ 10. Navigation: /owner | /supplier | /admin based on role

SCENARIO 2: API REQUEST WITH JWT
├─ 1. User clicks "Create Order"
├─ 2. Frontend reads JWT from localStorage
├─ 3. Frontend: POST /api/ai/chat
│   ├─ Headers: Authorization: Bearer {jwt_token}
│   └─ Body: { prompt, context }
├─ 4. Express middleware: verifySupabaseJWT()
│   ├─ Extracts token from Authorization header
│   ├─ Calls supabaseAdmin.auth.getUser(token)
│   ├─ Fetches user role from public.users
│   ├─ Checks is_banned flag
│   └─ Adds req.user = { id, email, role }
├─ 5. Rate limiter checks: 20 req/60s per user
├─ 6. Route handler processes request
├─ 7. Response with result or error
└─ 8. Frontend handles response (success toast or error)

SCENARIO 3: ROW-LEVEL SECURITY (RLS) CHECK
├─ 1. Frontend: supabase.from('products')
│   .select()
│   .eq('supplier_id', {id})
├─ 2. Supabase PostgREST receives request with JWT
├─ 3. Extracts auth.uid() from JWT
├─ 4. Applies RLS policy: "products_select_active"
├─ 5. Policy: WHERE is_active=true 
│         OR auth.uid() = supplier_profile.user_id 
│         OR get_my_role() = 'admin'
├─ 6. get_my_role() function (SECURITY DEFINER)
│   └─ Queries: SELECT role FROM public.users WHERE id = auth.uid()
├─ 7. Policy evaluates to TRUE (product is active)
├─ 8. Query executes: SELECT * FROM products WHERE ...
└─ 9. Returns filtered results to frontend

SCENARIO 4: AUTHORIZATION DENIED
├─ 1. Admin user tries: GET /owner/cart
├─ 2. Frontend: ProtectedRoute checks role
├─ 3. Condition: allowedRoles=['restaurant_owner']
├─ 4. Current user role: 'admin'
├─ 5. Mismatch! Permission denied
├─ 6. Navigate to: /admin (home for admin)
└─ 7. Toast: "Access denied"

TOKEN LIFECYCLE:
├─ Issue: Supabase signs JWT at login
├─ Expiry: 60 minutes
├─ Refresh: Automatic via Supabase client (before expiry)
├─ Storage: localStorage (vulnerable to XSS, but necessary)
├─ Revocation: supabase.auth.signOut()
├─ Transport: Authorization: Bearer {token} header
└─ Validation: JWT signature verified server-side

SECURITY MEASURES:
✓ JWT signature validation
✓ Token expiration (60 min)
✓ Role-based access control (RBAC)
✓ Ownership verification (ownership-based)
✓ Ban enforcement (is_banned flag)
✓ Rate limiting (20 req/60s)
✓ CORS whitelisting (localhost:5173, localhost:4173)
✓ HTTPS enforcement (production)
✓ Service-role key (server-side only, never exposed)
```

---

## Diagram 4: Order Lifecycle Sequence Diagram

### For AI Image Generation

```
Generate a detailed sequence diagram for an e-commerce order lifecycle with the following specifications:

TITLE: "ProCuro Order Lifecycle - Complete Flow"

ACTORS/SYSTEMS:
- Restaurant Owner (left)
- React Frontend App
- Supabase Database
- Supplier (right)

TIMELINE STAGES:

STAGE 1: DISCOVERY (Blue background)
- Owner views /owner/store
- Frontend queries: supplier_profiles (is_verified=true, is_active=true)
- Database returns: 20 verified suppliers
- Frontend renders: Supplier cards with logos, ratings, category

STAGE 2: SELECTION (Light blue)
- Owner clicks supplier card
- Navigation to /supplier/{supplier_id}
- Frontend fetches: Full supplier profile + products
- Display: Product grid with images, prices, stock status

STAGE 3: SHOPPING (Light green)
- Owner clicks "Add to cart" on products
- CartContext updates (localStorage persistence)
- Cart shows items grouped by supplier
- Display: Product name, quantity, unit price, subtotal per supplier

STAGE 4: CHECKOUT (Green)
- Owner navigates to /owner/cart
- Reviews order summary (grouped by supplier)
- Selects delivery address
- Chooses payment method (COD or bank transfer)
- Click "Place Order"

STAGE 5: ORDER CREATION (Dark green)
- Frontend: INSERT into orders table
  - restaurant_owner_id: auth.uid()
  - total_amount: sum of all splits
- Database: RLS policy checks (owner OR admin)
- Trigger: order_created fires
- Response: Order UUID created
- Frontend clears cart, shows confirmation

STAGE 6: SPLIT CREATION (Cyan)
- For each supplier:
  - INSERT into order_splits
  - supplier_id, order_id, status='pending_confirmation'
  - payment_method
- Triggers: split_created fires
- Supplier receives notification

STAGE 7: ITEM CREATION (Blue)
- For each product in split:
  - INSERT into order_items
  - product_id, quantity, price_at_time (frozen)
- Triggers: Update product.stock_quantity via RPC
- Database: Decrement inventory

STAGE 8: SUPPLIER NOTIFICATION (Orange background)
- Supplier receives: in-app notification
- WebSocket real-time (Realtime subscription)
- Notification: "New order from {owner_name}"
- Supplier views: /supplier/orders
- Status filter: 'pending_confirmation'

STAGE 9: SUPPLIER CONFIRMATION (Orange)
- Supplier reviews: Order items, quantities, prices
- Clicks: "Confirm Order"
- Frontend: UPDATE order_splits SET status='confirmed'
- Database: RLS policy allows supplier to update own split
- Owner notified: "Order confirmed by supplier"

STAGE 10: FULFILLMENT (Yellow)
- Supplier prepares order for delivery
- Clicks: "Mark as Shipped"
- UPDATE order_splits SET status='shipped'
- Owner notified: "Your order is on the way"

STAGE 11: DELIVERY (Light orange)
- Supplier delivers order
- Clicks: "Complete Delivery"
- UPDATE order_splits SET status='delivered'
- Database: Updates updated_at timestamp
- Owner notified: "Order delivered"

STAGE 12: RATING & FEEDBACK (Purple background)
- Owner receives notification: "Rate this supplier"
- Clicks notification or navigates to /owner/orders
- Click "Rate Supplier" button
- Modal: 5-star rating selector
- Submits: INSERT into supplier_ratings
  - supplier_id, owner_id, order_split_id
  - rating: 1-5
- Triggers: rating_created fires
  - Recalculates: supplier_profiles.rating (average)
  - Supplier notified: "You received a 5-star rating"

STAGE 13: ANALYTICS (Purple)
- Owner views: /owner/analytics
- Charts show:
  - Total spending this month
  - Orders by status distribution
  - Top suppliers, top products, top categories
- AI Summary: POST /api/ai/analytics-summary
  - Returns: Markdown summary of trends
  - Cached: 24 hours to protect Gemini quota

STAGE 14: COMPLETION (Dark purple)
- Order lifecycle complete
- Historical record: Stored in orders table
- Data preserved: RESTRICT FK prevents accidental deletion
- Audit trail: Timestamps track lifecycle
- Cache: Order data available for analytics

DATA TRANSFORMATIONS:
- Cart (localStorage) → Order (database)
- Product prices → Frozen price_at_time
- Product stock → Decremented via RPC
- Supplier availability → Order split status
- Delivery → Rating + Notification
- Ratings → Supplier average rating

NOTIFICATIONS SENT:
1. Supplier: "New order {#number}"
2. Owner: "Order confirmed"
3. Owner: "Order shipped"
4. Owner: "Order delivered - Rate now"
5. Supplier: "You received {rating} stars"
6. Owner: AI-generated spending summary

COLORS:
- Blue: Customer browsing phase
- Green: Order creation phase
- Orange: Supplier fulfillment phase
- Purple: Rating & analytics phase
- Gray: Archive/completed phase
```

---

## Diagram 5: Frontend Component Architecture Tree

### For Lucidchart / Draw.io

```
COMPONENT TREE DIAGRAM: React Component Hierarchy

App.jsx (Root)
├─ Route: /
│  └─ LandingPage
│
├─ Routes: /login, /register, /register/supplier
│  └─ Public pages (PublicOnlyRoute wrapper)
│
├─ Routes: /admin/*
│  └─ AdminLayout
│     ├─ Sidebar (navigation)
│     ├─ AdminDashboardPage
│     │  ├─ ChartsSection
│     │  │  ├─ RevenueChart (Recharts)
│     │  │  ├─ UserGrowthChart (Recharts)
│     │  │  └─ OrdersByStatusChart (Recharts)
│     │  └─ MetricsCards
│     ├─ AdminUsersPage
│     │  ├─ UserTable
│     │  │  └─ UserRow (Ban button, edit modal)
│     │  └─ UserFilterBar
│     ├─ AdminCertificatesPage
│     │  ├─ CertificationQueue
│     │  │  └─ CertCard (Approve/Reject buttons)
│     │  ├─ PdfViewer (for cert docs)
│     │  └─ ReviewModal
│     ├─ AdminOrdersPage
│     │  ├─ OrderTable
│     │  └─ FilterBar (supplier, status)
│     ├─ AdminReportsPage
│     │  ├─ ReportsList
│     │  │  └─ ReportCard (action buttons)
│     │  └─ ModerationPanel
│     └─ AdminChatPage
│        ├─ ConversationList
│        └─ ChatThread
│
├─ Routes: /owner/*
│  └─ OwnerLayout
│     ├─ Sidebar (navigation)
│     ├─ OwnerStorePage
│     │  ├─ SupplierGrid
│     │  │  └─ SupplierCard (logo, rating, category)
│     │  ├─ SearchBar
│     │  ├─ FilterPanel (category, rating)
│     │  └─ SupplierDetail (modal)
│     ├─ AllProductsPage
│     │  ├─ ProductGrid
│     │  │  └─ ProductCard
│     │  │     ├─ Image
│     │  │     ├─ PriceTag
│     │  │     └─ AddToCartButton
│     │  ├─ SearchBar
│     │  └─ PaginationControls
│     ├─ OwnerCartPage
│     │  ├─ CartSummary (split by supplier)
│     │  │  ├─ SupplierSection
│     │  │  │  ├─ CartItemRow
│     │  │  │  └─ SupplierSubtotal
│     │  │  └─ OrderTotal
│     │  ├─ AddressSelector
│     │  ├─ PaymentMethodSelector
│     │  └─ CheckoutButton
│     ├─ OwnerOrdersPage
│     │  ├─ OrderTable
│     │  │  └─ OrderRow
│     │  │     ├─ OrderDetails (modal)
│     │  │     ├─ RatingButton
│     │  │     └─ TrackingInfo
│     │  └─ FilterBar (status, date)
│     ├─ OwnerAnalyticsPage
│     │  ├─ ChartsSection
│     │  │  ├─ SpendingChart (monthly)
│     │  │  ├─ CategoryBreakdown (pie)
│     │  │  ├─ TopSuppliers (bar)
│     │  │  └─ TopProducts (list)
│     │  ├─ AISummary
│     │  │  ├─ LoadingSpinner (Gemini call)
│     │  │  ├─ MarkdownContent (formatted summary)
│     │  │  └─ RefreshButton
│     │  └─ DateRangePicker
│     ├─ OwnerProfilePage
│     │  ├─ ProfileForm (restaurant_name, tax_id, etc.)
│     │  ├─ AvatarUpload (to avatars/ bucket)
│     │  ├─ AddressBook
│     │  │  └─ AddressForm (CRUD)
│     │  ├─ BankDetailsForm
│     │  └─ AccountDeletion
│     └─ ChatPage
│        ├─ ConversationList (with suppliers)
│        │  └─ ConversationItem
│        │     └─ UnreadBadge
│        └─ ChatThread
│           ├─ MessageList
│           │  └─ MessageBubble (owner vs supplier)
│           ├─ TypingIndicator
│           └─ MessageInput
│
├─ Routes: /supplier/*
│  └─ SupplierLayout
│     ├─ Sidebar (navigation)
│     ├─ CertificationBanner
│     │  ├─ ChecklistItem (Cert, Bank, Address, City)
│     │  └─ CompletionPercentage
│     ├─ SupplierDashboardPage
│     │  ├─ StatsCards
│     │  │  ├─ RevenueCard
│     │  │  ├─ ActiveOrdersCard (clickable)
│     │  │  └─ AnalyticsCard (clickable)
│     │  ├─ AnalyticsSummary (AI-generated)
│     │  └─ ProductsList (recent, 4 per page)
│     ├─ SupplierProductsPage
│     │  ├─ DeliveryFeeTable (collapsible)
│     │  │  └─ FeeRow (distance tier, €price)
│     │  ├─ ProductForm (modal for CRUD)
│     │  └─ ProductTable
│     │     ├─ ProductRow
│     │     │  ├─ StockToggle
│     │     │  ├─ PriceDisplay
│     │     │  └─ EditDeleteButtons
│     │     └─ PaginationControls
│     ├─ SupplierOrdersPage
│     │  ├─ OrderQueue (by status)
│     │  │  └─ OrderCard
│     │  │     ├─ ConfirmButton (pending)
│     │  │     ├─ ShipButton (confirmed)
│     │  │     ├─ DeliverButton (shipped)
│     │  │     └─ ItemsList
│     │  └─ FilterBar (status, date)
│     ├─ SupplierAnalyticsPage
│     │  ├─ ChartsSection
│     │  │  ├─ RevenueChart (monthly)
│     │  │  ├─ OrdersByStatusChart
│     │  │  ├─ TopProductsChart
│     │  │  └─ SupplierVerificationChart
│     │  └─ AISummary
│     ├─ SupplierCertificatesPage
│     │  ├─ CertificateForm (upload)
│     │  │  └─ FileInput (halal-certificates/)
│     │  └─ CertificateHistory
│     │     └─ CertCard (status badge, rejection reason)
│     ├─ SupplierBankDetailsPage
│     │  └─ BankForm (IBAN, BIC, account_holder)
│     ├─ SupplierAccountPage
│     │  ├─ ProfileForm
│     │  ├─ AvatarUpload
│     │  └─ AccountDeletion
│     └─ ChatPage
│        └─ [Same as Owner ChatPage]
│
├─ CONTEXT PROVIDERS (Wrapping all)
│  ├─ LanguageProvider
│  │  └─ Provides: language, setLanguage
│  ├─ AuthProvider
│  │  └─ Provides: user, profile, loading, signIn, signOut
│  ├─ CartProvider
│  │  └─ Provides: items, addItem, removeItem, clearCart
│  ├─ AddressProvider
│  │  └─ Provides: addresses, selectedAddress, updateAddress
│  └─ Toaster (react-hot-toast)
│
├─ SHARED COMPONENTS
│  ├─ ChatbotFAB
│  │  ├─ FloatingButton
│  │  └─ ChatbotDrawer
│  │     ├─ MessageList
│  │     └─ InputField
│  ├─ ProtectedRoute (role gating)
│  ├─ PublicOnlyRoute (logged-in users redirected)
│  ├─ Navbar (shared header)
│  ├─ Footer
│  ├─ Modal (reusable dialog)
│  ├─ LoadingSpinner
│  ├─ ErrorBoundary
│  └─ PWAInstallPrompt
│
└─ EXTERNAL LIBRARIES
   ├─ Recharts (charts)
   ├─ Lucide-react (icons)
   ├─ React Hot Toast (notifications)
   ├─ React Router v6 (routing)
   └─ Tailwind CSS (styling)

LAZY-LOADED PAGES:
├─ SelectRolePage
├─ PublicSupplierProfilePage
├─ SupplierListPage
├─ ProductsListPage
├─ ResetPasswordPage
├─ About, Help, Privacy, Terms
├─ Careers, Press
└─ AccountDeletedPage
```

---

## Diagram 6: Deployment Pipeline

### For Lucidchart / Draw.io

```
DEPLOYMENT PIPELINE DIAGRAM: Git to Production

DEVELOPERS
├─ Edit code locally
├─ Commit: git add .
├─ Push: git push origin feature-branch
└─ Create Pull Request (GitHub)

GITHUB
├─ Pull Request created
├─ Code review (optional)
├─ Merge to main branch
└─ Webhook trigger to Netlify

NETLIFY CI/CD PIPELINE
├─ Step 1: Install Dependencies
│  ├─ npm run install:all
│  │  ├─ Install root dependencies
│  │  ├─ npm ci (client/)
│  │  └─ npm ci (server/)
│  └─ Caching: node_modules cached (next build faster)
│
├─ Step 2: Build Client (Vite)
│  ├─ npm run build (from root)
│  │  └─ cd client && vite build
│  ├─ Outputs: client/dist/
│  │  ├─ index.html (entry point)
│  │  ├─ assets/*.js (minified bundles)
│  │  ├─ assets/*.css (compiled Tailwind)
│  │  ├─ service-worker.js (PWA offline)
│  │  └─ manifest.json (PWA installability)
│  ├─ Tree-shaking: Remove unused code
│  ├─ Code splitting: Lazy-loaded pages separate chunks
│  └─ Source maps: Generated for debugging
│
├─ Step 3: Build Functions (Serverless)
│  ├─ Transpile: netlify/functions/*.js
│  │  ├─ ai-chat.js → compiled
│  │  └─ ai-analytics-summary.js → compiled
│  ├─ Bundle: Include node_modules for functions
│  ├─ Environment: Read from Netlify secrets
│  │  ├─ GEMINI_API_KEY
│  │  ├─ SUPABASE_URL
│  │  └─ SUPABASE_SERVICE_ROLE_KEY
│  └─ Output: .netlify/functions/ (ready for deployment)
│
├─ Step 4: Generate Redirects
│  ├─ Parse: netlify.toml
│  ├─ Configure:
│  │  ├─ /api/ai/chat → /.netlify/functions/ai-chat (200)
│  │  ├─ /api/ai/analytics-summary → /.netlify/functions/ai-analytics-summary (200)
│  │  ├─ /* → /index.html (SPA catch-all, 200)
│  │  └─ Security headers (X-Frame-Options, CSP, etc.)
│  └─ Applied: On request routing
│
├─ Step 5: Deploy to Netlify Edge
│  ├─ Upload static files (client/dist/) to CDN
│  │  ├─ Global edge locations
│  │  ├─ Automatic compression (gzip, brotli)
│  │  └─ Cache headers applied:
│  │     ├─ /assets/* → max-age=31536000 (1 year)
│  │     ├─ /index.html → no-cache (SPA routing)
│  │     └─ /* → default (10 minutes)
│  └─ Instant propagation: ~1-2 minutes global
│
├─ Step 6: Deploy Functions
│  ├─ Publish serverless functions
│  ├─ Start: Warm containers
│  ├─ Scale: Auto-scale on demand
│  └─ Monitor: Invocation logs in Netlify dashboard
│
├─ Step 7: DNS & Domain
│  ├─ Update DNS records (if domain changed)
│  ├─ HTTPS: Automatic via Let's Encrypt
│  ├─ SSL certificate: Renewed automatically
│  └─ Domain: procuro.netlify.app (or custom)
│
└─ Step 8: Verification & Testing
   ├─ Health check: GET /api/health → { status: "ok" }
   ├─ Smoke tests: Load home page, check assets
   ├─ Sentry integration: Monitor errors (if configured)
   └─ Deploy logs: Viewable in Netlify dashboard

ROLLBACK (if needed)
├─ Navigate to: Netlify dashboard → Deploys
├─ Click: Previous successful deploy
├─ Action: "Publish deploy"
├─ Result: Revert to previous version (< 1 minute)
└─ Zero downtime rollback

PRODUCTION ENVIRONMENT
├─ Frontend: https://procuro.netlify.app/
│  ├─ Static assets served from CDN
│  ├─ Service Worker installed (PWA)
│  └─ Offline support: Cached pages
│
├─ API: https://procuro.netlify.app/api/
│  ├─ /.netlify/functions/ai-chat
│  └─ /.netlify/functions/ai-analytics-summary
│
├─ Database: Supabase (rexngdtweiivdyzrpfud.supabase.co)
│  ├─ PostgreSQL in Germany
│  ├─ Automatic daily backups (PITR available)
│  └─ 99.9% uptime SLA
│
└─ Monitoring
   ├─ Netlify analytics
   ├─ Function invocations
   ├─ Error tracking (if Sentry enabled)
   └─ Database monitoring (Supabase dashboard)

TIMELINE:
├─ Code push: 0s
├─ CI/CD start: ~10s
├─ Dependency install: ~30s
├─ Build client: ~60s
├─ Build functions: ~10s
├─ Deploy CDN: ~30s
├─ Deploy functions: ~20s
├─ DNS propagation: ~30-60s
└─ Total: ~3-5 minutes end-to-end
```

---

