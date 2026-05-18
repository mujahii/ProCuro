# ProCuro

**Halal Supply Chain, Simplified** — a procurement marketplace connecting Halal-certified suppliers with restaurant owners across Germany.

ProCuro lets restaurants browse verified Halal suppliers, place multi-supplier orders in a single cart, and track every delivery from confirmation through to payment. Suppliers manage their catalog, certifications, and incoming orders from one dashboard, with AI-powered sales insights powered by Google Gemini.

---

## Profile

The Profile module is the identity and trust layer of the platform. Every user — restaurant owner or supplier — has a single profile page that controls how they appear to the rest of the marketplace and where they manage every personal, business, and account setting. The same data model also powers the public-facing supplier listing and the supplier-side order detail view, so a single edit propagates everywhere the user is shown.

### Profile header

- **Avatar** — uploaded to a private Supabase Storage bucket, served via signed public URL. 5 MB limit, click to enlarge in a lightbox, click the pencil to replace.
- **Display name** and **restaurant / business name** — the latter is shown beneath the avatar as the user's commercial identity.
- **Short bio** — rendered as an italicised quote on the profile and surfaced to counterparties (e.g. suppliers viewing an owner) so they get a one-line sense of the business before placing or fulfilling an order.

### Business Details card

A single card consolidates everything a counterparty needs to verify a business:

- **Tax ID / VAT** — mandatory field used on invoices and delivery receipts. A green check indicator confirms it has been provided.
- **City / Location** — supports **multiple business locations**. Each saved location renders as its own pill, so a supplier serving Berlin, Munich, and Hamburg shows all three at a glance. The picker uses the user's saved address book and shows a live "N selected" counter while editing, so the user always sees exactly how many locations they're publishing.
- **Cuisine / Type** (restaurant owners) or **Categories** (suppliers) — multi-select chips drawn from a curated list (Halal, Middle Eastern, Asian, Mediterranean, etc. for owners; Meat, Poultry, Seafood, Dairy, Spices, etc. for suppliers).
- **Bank Details** — IBAN (auto-formatted), BIC/SWIFT, account holder, and bank name. Stored in a separate access-controlled table and only ever exposed to a counterparty when a refund is being processed.

### Address management

A dedicated address book lets users save multiple physical locations:

- **GPS detection** with reverse geocoding fills street, postal code, and city automatically.
- **Manual entry** for cases where GPS isn't available.
- **Favourite / default** address is highlighted with a star and used as the order delivery default.
- The Business Details modal reads from the address book, so adding a new location once makes it instantly selectable across the rest of the profile.

### Cross-user visibility

The Profile module is the source of truth for the public face of every account:

- **Public Supplier Profile** (`/suppliers/:id`) — owners viewing a supplier see all of the supplier's cities as clickable pills, each linking directly to a Google Maps query for that location, plus phone, Halal certification badge, and rating.
- **Supplier List** (`/suppliers`) — supplier cards show a compact, de-duplicated city summary and distance-from-you when location sharing is enabled.
- **Owner Profile Modal** (supplier-side order detail) — when a supplier opens an order, they see the owner's avatar, restaurant name, bio, phone, all business locations (as chips), and the specific delivery address for that order.

### Account Settings

A separate card groups every authentication and preference action:

- **Change email & password** — uses Supabase Auth's `updateUser`; email changes also propagate to the public `users` table.
- **Update phone number**.
- **Manage my addresses** — full CRUD over the address book, including setting a favourite and deleting safely (Business Location deletions also clear the linked profile coordinates).
- **Language / Sprache toggle** — instant in-app translation between **English** and **Deutsch** via a React-based dictionary. No reload, no third-party widget, no flicker. The chosen language persists in `localStorage` and also sets `<html lang>` for screen readers and OS-level integrations.
- **Sign out** — global Supabase session signout, clears the local cart, redirects to the public landing page.
- **Delete account** — confirmation-gated, irreversibly removes the user and all owned rows via a SECURITY DEFINER RPC. Self-deletions are recorded to a `deleted_accounts` audit table and surfaced in the admin panel. Associated chats are hard-deleted from the database (previously soft-deleted).

### Brand polish

Inline clickable labels (Edit, Edit Profile, Manage Addresses, Set Favourite, etc.) use the **herb** teal accent from the brand palette so they read clearly as links against the dark navy body text, while primary CTAs keep the **midnight** navy and the warm **marigold** highlights the "Add …" empty-state prompts.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, TailwindCSS 3, Lucide icons, Recharts |
| State / data | Supabase JS SDK (Postgres + Auth + Storage + Realtime), React Context for auth / addresses / cart / language |
| Backend | Express on Node (`server/`), with serverless Netlify Functions for AI endpoints (`netlify/functions/`) |
| Database | Supabase (PostgreSQL) with Row-Level Security policies for every table |
| AI | Google Gemini (`@google/generative-ai`) — analytics summaries and in-app chat assistant |
| Hosting | Netlify (frontend + serverless functions) |
| Notifications | Toast UX via `react-hot-toast`; in-app notifications backed by a Postgres function |

---

## Project structure

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
│       │   │                   About, Careers, Press, HelpCenter, PrivacyPolicy, Terms
│       │   └── shared/         Chat
│       ├── components/         Reusable UI, layout, AI insights, store cards
│       ├── context/            AuthContext, AddressContext, CartContext, LanguageContext
│       └── lib/                Supabase client, IBAN formatter, geocoding, Gemini wrappers
├── server/                     Express API (dev) — auth, orders, ai, notifications, admin
├── netlify/functions/          Serverless equivalents of the AI routes for production
└── supabase/migrations/        Versioned SQL: schema, RLS, storage buckets, RPCs
```

---

## Running locally

Prerequisites: Node 18+, a Supabase project (URL + anon key + service-role key), and a Google Generative AI API key for the AI features.

```bash
# install all workspace dependencies
npm run install:all

# start the client (Vite) and server (nodemon) together
npm run dev
```

The client is served at `http://localhost:5173` and the API at `http://localhost:3000` by default. Environment variables are read from `client/.env` and `server/.env` — see `server/.env.example` for the required keys.

Database migrations live in [`supabase/migrations/`](supabase/migrations/) and are applied in numerical order via the Supabase CLI or dashboard.

---

## Deployment

- **Frontend**: deployed to Netlify directly from the `main` branch — `netlify.toml` declares the build command and publish directory.
- **AI endpoints**: deployed as Netlify Functions (`netlify/functions/ai-chat.js`, `ai-analytics-summary.js`) so the client doesn't depend on the dev Express server in production.
- **Database**: hosted on Supabase; schema changes ship as new migration files committed to the repo.
