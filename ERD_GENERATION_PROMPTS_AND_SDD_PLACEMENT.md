# ProCuro ERD - Thesis-Quality Generation Prompts & SDD Placement

## Thesis-Quality ERD Prompt for DALL-E / ChatGPT Image Generation

### Primary Prompt (Professional, Academic-Style)

```
Generate a professional Entity Relationship Diagram (ERD) for a PostgreSQL database schema 
with the following specifications:

TITLE: "ProCuro Halal Food Marketplace - Database Schema (21 Tables)"

STRUCTURE: 
- Organize tables into 8 color-coded domains
- Use standard ERD notation with crow's foot cardinality indicators
- Include all primary keys, foreign keys, and critical columns
- Show relationship lines with proper cardinality (1:1, 1:N)

DOMAINS & COLORS:

Domain 1 - Authentication & Users (BLUE boxes):
├─ auth.users (Supabase Auth provider)
├─ public.users (central user registry)
├─ owner_profiles (1:1 restaurant owner extended profile)
├─ supplier_profiles (1:1 supplier extended profile, with is_verified and rating)
├─ addresses (1:N multi-address book)
└─ owner_bank_details (1:1 optional payment method)

Domain 2 - Products & Inventory (GREEN boxes):
├─ products (supplier catalog with stock_quantity, price)
├─ halal_certificates (admin-reviewed certifications, status: pending|approved|rejected)
└─ supplier_bank_details (1:1 payout routing, IBAN)

Domain 3 - Orders & Fulfillment (YELLOW boxes):
├─ orders (multi-supplier container, restaurant_owner_id FK RESTRICT)
├─ order_splits (per-supplier fulfillment, status machine: pending→confirmed→shipped→delivered)
└─ order_items (line items with frozen price_at_time snapshot)

Domain 4 - Communications (RED boxes):
├─ conversations (1-on-1 supplier-owner chat, UNIQUE pair)
├─ messages (conversation thread, hard-deleted on account removal)
├─ admin_conversations (admin-only direct messaging, UNIQUE per user)
└─ admin_messages (admin message thread)

Domain 5 - Feedback & Moderation (GRAY boxes):
├─ supplier_ratings (post-delivery 5-star feedback from owners)
├─ reports (spam/violation flagging for products or suppliers)
└─ notifications (in-app alert queue with type: info|success|warning|error|certification)

Domain 6 - Analytics & Cache (PURPLE boxes):
└─ ai_insights_cache (Gemini quota guard, 1:1 per user, 24h TTL)

Domain 7 - Audit & Compliance (DARK PURPLE boxes):
└─ deleted_accounts (GDPR audit trail, soft-delete alternative)

RELATIONSHIPS & CARDINALITY:

Critical Relationships to Show:
- auth.users → public.users (1:N, CASCADE on delete)
- public.users → owner_profiles (1:1, UNIQUE, CASCADE)
- public.users → supplier_profiles (1:1, UNIQUE, CASCADE)
- public.users → addresses (1:N, CASCADE)
- public.users → orders (1:N, RESTRICT on delete - preserve order history)
- supplier_profiles → products (1:N, CASCADE)
- supplier_profiles → halal_certificates (1:N, CASCADE)
- supplier_profiles → supplier_bank_details (1:1, UNIQUE, CASCADE)
- supplier_profiles → order_splits (1:N, RESTRICT on delete)
- supplier_profiles → supplier_ratings (1:N, CASCADE)
- orders → order_splits (1:N, CASCADE)
- order_splits → order_items (1:N, CASCADE)
- order_splits → supplier_ratings (1:1, UNIQUE)
- products → order_items (1:N, RESTRICT on delete - audit trail)
- conversations → messages (1:N, CASCADE)
- admin_conversations → admin_messages (1:N, CASCADE)

Cardinality Notation:
- Use crow's foot notation: |--o (one-to-many), ||-- (one-to-one)
- Label "CASCADE" in RED for destructive deletes (18 total)
- Label "RESTRICT" in DARK RED for audit trail protection (3 total)

KEY COLUMN INDICATORS:

Primary Keys (PK):
- Use 🔑 symbol or bold font
- Type: UUID (most tables), TEXT for auth.users

Foreign Keys (FK):
- Use 🔗 symbol or underline
- Show referenced table.column
- Highlight RESTRICT FK with special marking (red dash line)

Critical Columns to Display (sample for each table):
- auth.users: id (PK), email (UNIQUE)
- public.users: id (PK), email, role (enum: restaurant_owner|supplier|admin), is_banned
- owner_profiles: id (PK), user_id (FK UNIQUE), restaurant_name, tax_id, cuisine (array)
- supplier_profiles: id (PK), user_id (FK UNIQUE), business_name, is_verified (bool), rating (numeric), is_active
- addresses: id (PK), user_id (FK), label, city, latitude, longitude, is_default
- products: id (PK), supplier_id (FK), name, price (numeric), stock_quantity (int), is_active
- halal_certificates: id (PK), supplier_id (FK), status (enum: pending|approved|rejected), file_url
- supplier_bank_details: id (PK), supplier_id (FK UNIQUE), iban, bic
- orders: id (PK), restaurant_owner_id (FK RESTRICT), total_amount
- order_splits: id (PK), order_id (FK), supplier_id (FK RESTRICT), status (enum), payment_method (enum: cod|bank_transfer)
- order_items: id (PK), order_split_id (FK), product_id (FK RESTRICT), quantity, price_at_time (FROZEN)
- conversations: id (PK), supplier_id (FK), owner_id (FK), UNIQUE(supplier_id, owner_id)
- messages: id (PK), conversation_id (FK), sender_id (FK), content, is_read
- supplier_ratings: id (PK), order_split_id (FK UNIQUE), supplier_id (FK), rating (1-5)
- notifications: id (PK), user_id (FK), title, type (enum), is_read
- ai_insights_cache: user_id (PK FK), summary, generated_at
- deleted_accounts: id (PK), user_id (historic), email (snapshot), deleted_at

VISUAL STYLE:

Layout:
- Vertical cascade layout (top to bottom)
- Tier 1 (top): Auth & user foundation
- Tier 2: Profiles, addresses, bank details
- Tier 3: Products, certificates
- Tier 4: Orders, splits, items (central business logic)
- Tier 5: Communication & feedback
- Tier 6: Cache & audit

Colors:
- Domain 1 (Blue): #4A90E2 background, dark blue text
- Domain 2 (Green): #50C878 background, dark green text
- Domain 3 (Yellow): #FFD700 background, dark yellow text
- Domain 4 (Red): #E74C3C background, white text
- Domain 5 (Gray): #95A5A6 background, dark text
- Domain 6 (Purple): #9B59B6 background, white text
- Domain 7 (Dark Purple): #6C3483 background, white text

Lines:
- CASCADE relationships: Gray solid line
- RESTRICT relationships: Dark red dashed line with "RESTRICT" label
- Regular FK relationships: Blue solid line
- One-to-many: Crow's foot on many-side (---<)
- One-to-one: Double line on both sides (---|)

Text Elements:
- Table names: Bold, 12pt font
- Primary keys: 🔑 symbol + bold
- Foreign keys: 🔗 symbol + underline
- Constraints: Small text below table name (e.g., "UNIQUE", "CASCADE", "RESTRICT")
- Enums: Show allowed values in parentheses (e.g., "status (pending|approved|rejected)")

Annotations:
- Add legend in bottom-left:
  * 🔑 Primary Key
  * 🔗 Foreign Key
  * ———— One-to-Many
  * ═══ One-to-One
  * Red dashed = RESTRICT delete (preserves audit trail)
  * Gray solid = CASCADE delete (automatic cleanup)

Resolution & Format:
- Size: 3200x2400 pixels (landscape, 4:3 aspect ratio)
- Format: PNG with transparent background (white preferred)
- Font: Sans-serif (Helvetica, Arial, or similar)
- DPI: 300 (suitable for printing/thesis)
- Quality: High contrast, professional appearance

Metadata to Include:
- Title: "ProCuro Halal Food Marketplace - Database Schema"
- Subtitle: "21 Tables, 3NF Normalized, 40+ RLS Policies"
- Footer: "Generated for Systems Design Documentation | May 19, 2026"
- Version number: "v1.0"

IMPORTANT NOTES:

1. Show all 21 tables (critical for thesis completeness)
2. Make RESTRICT FK relationships visually distinct (red dashed lines)
3. Include data types for key columns (UUID, TEXT, NUMERIC, etc.)
4. Show enum values inline (not in legend)
5. Denormalized columns should be marked with ⚠️ (price_at_time, rating, target_name)
6. Ensure readability at both 100% and 50% zoom levels
7. Use consistent spacing and alignment
8. Professional appearance suitable for academic thesis or technical report

EXAMPLE TABLE BOX FORMAT:

┌─────────────────────────────┐
│ 🟦 supplier_profiles        │ ← Domain color + table name
├─────────────────────────────┤
│ 🔑 id (UUID PK)             │ ← Primary key
│ 🔗 user_id (FK UNIQUE)      │ ← Foreign key with constraint
│ business_name (TEXT)        │ ← Regular column
│ rating (NUMERIC) ⚠️         │ ← Denormalized column indicator
│ is_verified (BOOLEAN)       │ ← Status column
│ category (TEXT[] array)     │ ← Array type
│ is_active (BOOLEAN)         │ ← Active flag
└─────────────────────────────┘
     ↓                ↓
  1:N            1:1 UNIQUE
```

---

## Alternative: Mermaid ER Diagram (Instant Generation)

If DALL-E generation takes too long, use this Mermaid code instantly:

**Paste into mermaid.live (https://mermaid.live/):**

[Use the complete Mermaid ERD code from ERD_COMPLETE_STRUCTURE.md - it's production-ready]

**Export as:**
- SVG (lossless, scalable)
- PNG (raster, 1920x1440px)
- PDF (thesis-ready)

---

## SDD Placement & Cross-References

### WHERE TO INSERT THE ERD IN THE SDD

**Placement Location:** Section 4.3.2 - Database Architecture

**Current SDD Structure:**
```
4.3 Database Architecture
├─ 4.3.1 Database Design Principles
├─ 4.3.2 Schema Organization (CURRENT)
├─ 4.3.3 Key Relationships
├─ 4.3.4 Critical Delete Rules
├─ 4.3.5 Storage Buckets
└─ 4.3.6 Indexing Strategy
```

**RECOMMENDED: Add Section 4.3.2.1 - Entity Relationship Diagram**

### Updated SDD Outline

```markdown
## 4.3 Database Architecture

### 4.3.1 Database Design Principles
[Existing content: 3NF, RLS, concurrency control]

### 4.3.2 Schema Organization
[Existing content: 21 tables across 5 domains]

### 4.3.2.1 Entity Relationship Diagram (NEW SECTION)

#### Visual Representation

**Figure 4.3-1:** ProCuro Database Schema (21 Tables, 3NF Normalized)

[INSERT GENERATED ERD IMAGE HERE]

**Diagram Legend:**
- 🔑 Primary Key (UUID)
- 🔗 Foreign Key
- ━━━━ One-to-Many Relationship (1:N)
- ━━━━ One-to-One Relationship (1:1 with UNIQUE constraint)
- ▬▬▬▬ RESTRICT Delete (preserves audit trail)
- ────── CASCADE Delete (automatic cleanup)

**Color Coding:**
- 🟦 Blue: Authentication & User Management (4 tables)
- 🟩 Green: Products & Inventory (2 tables)
- 🟨 Yellow: Order Fulfillment (3 tables)
- 🟥 Red: Communications (4 tables)
- ⬜ Gray: Feedback & Moderation (3 tables)
- 🟣 Purple: Analytics & Audit (2 tables)

#### Domains Explained

[Use existing content from 4.3.2]

#### Table Descriptions

[Use existing content from ERD_COMPLETE_STRUCTURE.md - "All Tables Explained"]

### 4.3.3 Key Relationships

#### Relationship Types

**One-to-Many (1:N)** - Most common
- Users → Addresses (user has multiple addresses)
- Orders → Order Splits (order split by supplier)
- Supplier → Products (supplier has product catalog)

**One-to-One (1:1)** - Enforced by UNIQUE constraint
- Users → Owner Profiles (1:1, optional)
- Users → Supplier Profiles (1:1, optional)
- Order Splits → Ratings (1:1, optional)

**Many-to-One (N:1)** - Implicit (reverse of 1:N)
- Addresses → Users
- Products → Suppliers
- Messages → Conversations

#### Complete Relationship Matrix

[Use existing table from ERD_COMPLETE_STRUCTURE.md - "Relationship Explanations"]

### 4.3.4 Critical Delete Rules

[Existing content: CASCADE vs RESTRICT explanation]

### 4.3.5 Storage Buckets

[Existing content: S3-compatible buckets]

### 4.3.6 Indexing Strategy

[Existing content: 10+ performance indexes]
```

---

## SDD Integration Instructions

### Step 1: Generate the ERD Image

**Option A: DALL-E (Recommended for thesis quality)**
1. Copy the "Primary Prompt" above
2. Open ChatGPT with DALL-E 3
3. Paste the prompt
4. Request: "Generate a professional ERD diagram..."
5. Wait ~30 seconds for generation
6. Download PNG at 1024x768 or higher resolution
7. Right-click → "Save image as..." → Save to `/Users/muja/Documents/vs code/ProCuro/assets/erd-diagram.png`

**Option B: Mermaid (Instant, but less polished)**
1. Go to https://mermaid.live/
2. Paste the Mermaid code from ERD_COMPLETE_STRUCTURE.md
3. Click "Download SVG" or "Download PNG"
4. Save to same location

### Step 2: Embed in SDD Document

**Edit: SDD_SECTION_4_SYSTEM_ARCHITECTURE.md**

Find the section:
```markdown
## 4.3 Database Architecture
### 4.3.2 Schema Organization
```

Add after section 4.3.2 (before 4.3.3):

```markdown
### 4.3.2.1 Entity Relationship Diagram

**Figure 4.3-1:** ProCuro Database Schema (21 Tables)

![ProCuro ERD](./assets/erd-diagram.png)

*Figure 4.3-1: Complete entity relationship diagram showing all 21 tables, 
relationships, and cardinalities. Color coding indicates domain (blue=auth, 
green=products, yellow=orders, red=communications, gray=feedback, purple=audit). 
RESTRICT delete rules (red dashed lines) preserve audit trail; CASCADE delete 
rules (gray solid lines) enable automatic cleanup.*

[Rest of section 4.3.2 content...]
```

### Step 3: Add Cross-References

**In Section 4.5 (API & Component Interaction):**

Add reference:
```markdown
See Figure 4.3-1 (Entity Relationship Diagram, Section 4.3.2.1) 
for complete schema structure.
```

**In Section 4.4 (Authentication & Authorization):**

Add reference:
```markdown
The RLS policy implementations are visualized in the ERD 
(Figure 4.3-1, highlighted with color-coding per domain).
```

### Step 4: Update Table of Contents

**Add to SDD TOC:**
```
4.3.2.1 Entity Relationship Diagram ....... [page number]
  - Figure 4.3-1: ProCuro Database Schema
  - Domain Legend
  - Relationship Types
```

---

## Appendix: Asset Management

### File Organization

```
/Users/muja/Documents/vs code/ProCuro/
├── SDD_SECTION_4_SYSTEM_ARCHITECTURE.md (main document)
├── ERD_COMPLETE_STRUCTURE.md (this file)
├── assets/
│   ├── erd-diagram.png (generated ERD)
│   ├── erd-diagram.svg (Mermaid export)
│   ├── system-architecture.png (for Section 4.1)
│   ├── deployment-pipeline.png (for Section 4.2)
│   ├── auth-flow.png (for Section 4.4)
│   └── order-lifecycle.png (for Section 4.5)
└── diagrams/
    └── erd-complete-structure.md (source files)
```

### Image Specifications for Thesis

**ERD Diagram Specs:**
- **Format:** PNG or SVG
- **Resolution:** 1920x1440 pixels minimum (300 DPI for printing)
- **Color Mode:** RGB (for digital), CMYK (for print)
- **File Size:** < 5MB (optimize if needed)
- **Background:** White (standard for technical docs)
- **Font:** Helvetica, Arial, or similar sans-serif

**Markdown Image Reference:**
```markdown
![Figure 4.3-1: ProCuro Database ERD](./assets/erd-diagram.png)
```

---

## Quality Checklist for Generated ERD

- [ ] All 21 tables included
- [ ] All 28 foreign keys shown with proper cardinality
- [ ] RESTRICT FKs highlighted in red (3 total)
- [ ] CASCADE FKs shown in gray (18 total)
- [ ] Primary keys marked with 🔑 symbol
- [ ] Foreign keys marked with 🔗 symbol
- [ ] One-to-many relationships shown with crow's foot (|---)
- [ ] One-to-one relationships shown with double line (---|)
- [ ] Color-coded by domain (8 colors)
- [ ] All table names readable at 100% zoom
- [ ] All column names readable at 100% zoom
- [ ] Legend included (keys, relationships, colors)
- [ ] Footer with title and version
- [ ] High resolution (1920x1440 minimum)
- [ ] Professional appearance (suitable for thesis)

---

## Alternative: Professional Tool Generation

If using **DbSchema** (https://www.dbschema.com/):

1. Log in or start free trial
2. Create → PostgreSQL
3. Add tables manually (21) or import from migration files
4. Auto-generate diagram
5. Customize colors per domain
6. Export as PNG/SVG/PDF
7. Use in SDD

**Advantage:** Can connect directly to Supabase database and auto-generate from live schema

---

## Final Recommendation

**For Thesis Submission:**
1. Use DALL-E prompt (Section titled "Primary Prompt") → generates professional image
2. Embed in SDD Section 4.3.2.1
3. Add 2-3 sentence caption explaining domains and relationships
4. Include in Table of Contents and List of Figures
5. High resolution PNG suitable for printing

**Estimated Time to Complete:**
- ERD generation: 5-10 minutes (DALL-E)
- SDD integration: 15 minutes
- Quality review: 10 minutes
- **Total: 30-35 minutes**

---

