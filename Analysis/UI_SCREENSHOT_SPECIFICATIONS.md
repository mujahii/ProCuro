# ProCuro UI Screenshot Specifications — Visual Documentation Guide

**Date**: 2026-05-19  
**Version**: 1.0  
**Purpose**: Define screenshots needed for SDD documentation and user guides  
**Format**: PNG, SVG, and annotated images

---

## 🔐 TEST CREDENTIALS

**Use these accounts for testing ProCuro:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `procuro@admin.com` | `Md@121212` |
| Owner | `1999mud@gmail.com` | `Md@121212` |
| Supplier | `mariam.diallo@dialloherbs.de` | `Halal@2024` |

---

## 1. Screenshot Specification Overview

### Purpose & Audience
- **SDD Documentation**: System Design Document screenshots (thesis/technical docs)
- **User Guides**: Help documentation for restaurant owners and suppliers
- **Marketing**: Landing page marketing materials
- **Training**: Onboarding training materials

### Delivery Format
- **Primary Format**: PNG (lossless, supports transparency)
- **Secondary Format**: SVG (vector diagrams, annotations)
- **Resolution**: 1920x1080 (desktop), 375x812 (mobile iPhone 12)
- **Annotation**: Callouts, arrows, numbered steps (if applicable)

---

## 2. Landing Page Screenshots

### 2.1 Full Landing Page (Scrollable View)

**Specification**:
- **Name**: `landing-page-full-scroll.png`
- **Resolution**: 1920x2400 (full-height scroll capture)
- **Content**: 
  - Hero section (above fold)
  - Trust indicators
  - Statistics section
  - Category browser
  - Featured products (visible products only)
  - Featured suppliers
  - How it works section
  - Footer
- **Color Mode**: Light mode (default)
- **Language**: English
- **Annotation**: None (clean screenshot)
- **Use Case**: Overview of landing page in documentation

### 2.2 Hero Section

**Specification**:
- **Name**: `hero-section.png`
- **Resolution**: 1920x540 (above-fold area)
- **Content**:
  - Navbar with logo, login, signup
  - Hero headline: "The Smarter Way to Stock Your Halal Kitchen"
  - Subheading: "Halal Certified Suppliers Only" badge
  - Description paragraph
  - Two CTA buttons: "Get Started Free" (primary), "Browse Suppliers" (secondary)
  - Trust badges: GDPR, Halal Verified, No Hidden Fees
- **Annotations Recommended**:
  - Number the key elements
  - Highlight primary CTA (Get Started Free)
  - Label navbar components
- **Use Case**: 
  - SDD visual reference
  - Marketing materials
  - User onboarding guide

### 2.3 Navigation Bar (Desktop)

**Specification**:
- **Name**: `navbar-desktop.png`
- **Resolution**: 1920x80
- **Content**:
  - ProCuro logo (left)
  - Log In button (gray text)
  - Sign Up button (blue filled)
  - Language toggle visible (en/de) - optional
- **Annotations**:
  - Label "Primary Navigation"
  - Point out "Call-to-Action Zone" (right side)
  - Highlight button states (default vs. hover)
- **Use Case**: Component documentation, navigation flow diagram

### 2.4 Category Browser Section

**Specification**:
- **Name**: `categories-section.png`
- **Resolution**: 1920x200
- **Content**:
  - Section heading: "Browse by Category"
  - All 11 category buttons visible: All, Meat, Poultry, Seafood, Dairy, Vegetables, Fruits, Bakery, Beverages, Spices, Other
  - Button styling: Icon + label, light gray background
- **Annotations**:
  - Highlight scroll indicator (if applicable)
  - Point out category icons
  - Label "Tap to filter products" text
- **Use Case**: Category navigation documentation

### 2.5 Featured Products Grid

**Specification**:
- **Name**: `featured-products-grid.png`
- **Resolution**: 1920x600
- **Content**:
  - Section heading: "Featured Products" + "All" button
  - Show 4 product cards (first row):
    1. Halal Beef Ribs (€18.50/kg)
    2. Fresh Alphonso Mangoes (€4.80/kg, Nasser Farm Fresh)
    3. Halal Lamb Shoulder (€22.00/kg)
    4. Whole Halal Chicken (€8.90/kg, Benali Fresh Poultry)
  - Card structure: Image → Category badge → Name → Description → Supplier → Price → Add to cart button
- **Annotations**:
  - Number the card sections (1. Image, 2. Category, 3. Name, etc.)
  - Highlight price display format
  - Point out add-to-cart button
- **Use Case**: Product card component documentation

### 2.6 Featured Suppliers Grid

**Specification**:
- **Name**: `featured-suppliers-grid.png`
- **Resolution**: 1920x500
- **Content**:
  - Section heading: "Featured Suppliers" + "All" button
  - Show 4 supplier cards (first row):
    1. Nasser Farm Fresh (Frankfurt, 4.5★, Halal Certified)
    2. Benali Fresh Poultry (Hamburg, 5.0★, Halal Certified)
    3. Khalil Organic Vegetables (Munich, 5.0★, Halal Certified)
    4. Al-Amin World of Spices (Berlin, 5.0★, Halal Certified)
  - Card structure: Logo → Name → Location → Rating → Certification badge
- **Annotations**:
  - Label card sections
  - Highlight certification badge (trust indicator)
  - Point out rating stars
- **Use Case**: Supplier card component documentation

### 2.7 How It Works Section

**Specification**:
- **Name**: `how-it-works-section.png`
- **Resolution**: 1920x400
- **Content**:
  - Section heading: "How It Works"
  - 3-step process:
    1. Icon + "1" badge → "Create Your Account" → Description
    2. Icon + "2" badge → "Browse & Order" → Description
    3. Icon + "3" badge → "Track Delivery" → Description
  - Process flow visual (arrows or step indicators)
- **Annotations**:
  - Number the steps
  - Label each step title
  - Point out process flow direction (left to right)
- **Use Case**: User journey documentation, onboarding guide

### 2.8 Footer

**Specification**:
- **Name**: `footer-section.png`
- **Resolution**: 1920x300
- **Content**:
  - ProCuro logo and tagline (left column)
  - Company links: About Us, Careers, Press
  - Resources links: Help Center, Privacy Policy, Terms of Service
  - Contact section: Email, Phone, Location
  - Language toggle: "en" | "de" buttons
  - Copyright: © 2026 ProCuro GmbH
- **Annotations**:
  - Label column sections
  - Highlight contact info
  - Point out language toggle
- **Use Case**: Footer component documentation

---

## 3. Authentication Pages

### 3.1 Login Page

**Specification**:
- **Name**: `login-page.png`
- **Resolution**: 1920x1080
- **Content**:
  - ProCuro logo and tagline at top
  - Form container (centered):
    - Email field with label "Email Address"
    - Password field with label "Password" and "Forgot password?" link
    - Show/hide password toggle
    - "Log In" button (primary)
    - "OR CONTINUE WITH" text divider
    - Google and Apple OAuth buttons
    - "Don't have an account? Sign Up →" link
- **Annotations**:
  - Number form fields (1. Email, 2. Password, 3. Submit)
  - Label form validation states (required, optional)
  - Point out OAuth options
  - Highlight password recovery link
- **Color Mode**: Light
- **Language**: English
- **Use Case**: 
  - SDD authentication flow
  - User guide for login
  - Help documentation

### 3.2 Sign-Up Page

**Specification**:
- **Name**: `signup-page.png`
- **Resolution**: 1920x1080
- **Content**:
  - ProCuro logo and "Create your free account" tagline
  - Form container:
    - Full Name field
    - Email field
    - Password field with show/hide toggle
    - Confirm Password field with show/hide toggle
    - (RECOMMENDED) Account Type selection (if implemented)
    - "Create Account" button
    - "OR CONTINUE WITH" OAuth options
    - "Already have an account? Log In →" link
- **Annotations**:
  - Number form fields
  - Highlight password requirements (if visible)
  - Point out password strength meter (if added)
  - Label OAuth options
- **Use Case**: Onboarding documentation, sign-up flow guide

---

## 4. Mobile Screenshots

### 4.1 Mobile Landing Page (Full Height)

**Specification**:
- **Name**: `mobile-landing-page.png`
- **Resolution**: 375x2000 (iPhone 12, full scroll)
- **Content**: Same as desktop landing page but in mobile layout
  - Collapsed navigation (hamburger menu)
  - Stacked hero section
  - Mobile-optimized grid layouts
  - Touch-optimized buttons
- **Device**: iPhone 12 (375px width)
- **Use Case**: Mobile UX documentation

### 4.2 Mobile Navigation (Hamburger Menu)

**Specification**:
- **Name**: `mobile-hamburger-menu.png`
- **Resolution**: 375x812 (full viewport, menu open)
- **Content**:
  - Hamburger menu icon (left navbar)
  - Menu drawer (left-aligned):
    - Browse Products
    - Browse Suppliers
    - How It Works
    - ─────────────── (divider)
    - Log In
    - Sign Up (highlighted)
  - Close button (X) or swipe-to-close indicator
- **Annotations**:
  - Label menu sections
  - Point out primary CTA (Sign Up)
- **Use Case**: Mobile navigation documentation

### 4.3 Mobile Product Grid

**Specification**:
- **Name**: `mobile-products-grid.png`
- **Resolution**: 375x900
- **Content**:
  - "Featured Products" heading
  - 2-3 product cards in mobile stack (1 column or 2 columns depending on layout)
  - Full card visible:
    - Product image (responsive size)
    - Category badge
    - Name
    - Description
    - Price
    - Add to cart button (full width or icon)
- **Annotations**:
  - Highlight touch-friendly button size
  - Point out responsive image scaling
- **Use Case**: Mobile product card documentation

### 4.4 Mobile Form (Login on Mobile)

**Specification**:
- **Name**: `mobile-login-form.png`
- **Resolution**: 375x812
- **Content**:
  - Logo at top (smaller for mobile)
  - Form fields stacked vertically:
    - Email input (full width)
    - Password input with show/hide toggle
    - Log In button (full width)
    - "Forgot password?" link
    - Divider text: "OR CONTINUE WITH"
    - OAuth buttons (side-by-side or stacked)
    - Sign up link
- **Annotations**:
  - Highlight touch target sizes
  - Point out button width (full-width is mobile best practice)
- **Use Case**: Mobile form documentation

---

## 5. Annotated Diagrams

### 5.1 Landing Page Layout Diagram

**Specification**:
- **Name**: `landing-page-wireframe-annotated.svg`
- **Type**: SVG with dimensions and annotations
- **Content**:
  - Wireframe showing major sections:
    - [80px] Navbar
    - [540px] Hero
    - [120px] Trust badges
    - [100px] Statistics
    - [200px] Categories
    - [600px] Featured products
    - [500px] Featured suppliers
    - [400px] How it works
    - [300px] Footer
- **Annotations**:
  - Height labels for each section
  - Color-coded by section type
  - Dimension lines
  - Section names
- **Use Case**: Page structure documentation, responsive breakpoint planning

### 5.2 Product Card Component Breakdown

**Specification**:
- **Name**: `product-card-breakdown.svg`
- **Type**: SVG diagram with labels
- **Content**:
  ```
  ┌──────────────────────┐
  │  [Product Image]     │  ← image_url
  │                      │     (aspect-ratio: 1:1)
  ├──────────────────────┤
  │ [Category Badge]     │  ← category tag
  │ Product Name (H3)    │  ← name, bold
  │ Descrip... (trunc)   │  ← description
  │ Supplier Name (gray) │  ← supplier reference
  ├──────────────────────┤
  │ €18.50 / kg [+cart]  │  ← price, unit, CTA
  └──────────────────────┘
  ```
- **Annotations**:
  - Dimension: 280px × 380px (estimate)
  - Font sizes for each element
  - Color values
  - Padding/spacing between elements
- **Use Case**: Component design documentation

### 5.3 Navigation Flow Diagram

**Specification**:
- **Name**: `navigation-flow-diagram.svg`
- **Type**: Mermaid or SVG flowchart
- **Content**:
  ```
  Landing Page (/)
  ├─ Browse (public)
  │  ├─ Products
  │  ├─ Suppliers
  │  └─ Category filter
  │
  ├─ Log In (/login)
  │  └─ Success → Role-based dashboard
  │     ├─ /owner/* (restaurant owner)
  │     ├─ /supplier/* (supplier)
  │     └─ /admin/* (admin)
  │
  ├─ Sign Up (/register)
  │  ├─ Email verification
  │  ├─ Profile setup
  │  └─ Role selection
  │
  └─ Footer Links
     ├─ /about
     ├─ /careers
     ├─ /press
     ├─ /help
     ├─ /privacy
     └─ /terms
  ```
- **Use Case**: Information architecture documentation

---

## 6. Bilingual Screenshots

### 6.1 Landing Page (German)

**Specification**:
- **Name**: `landing-page-german.png`
- **Resolution**: 1920x2400
- **Content**: Same as English landing page, but in German
  - "Der clevere Weg, Ihre Halal-Küche zu versorgen"
  - "Nach Kategorie stöbern"
  - "Empfohlene Produkte"
  - "Empfohlene Lieferanten"
  - "So funktioniert es"
  - All buttons and links in German
- **Language**: Deutsch (German)
- **Use Case**: Documentation of multilingual support, German market materials

### 6.2 Login Page (German)

**Specification**:
- **Name**: `login-page-german.png`
- **Resolution**: 1920x1080
- **Content**: Login page translated to German
  - "Anmelden" (Log In)
  - "E-Mail-Adresse"
  - "Passwort"
  - "Passwort vergessen?"
  - "Oder anmelden mit"
  - "Noch kein Konto? Registrieren →"
- **Use Case**: Bilingual documentation

---

## 7. Comparison Screenshots

### 7.1 Before/After (if modifications made)

**Specification**:
- **Name**: `before-after-comparison.png`
- **Resolution**: 1920x1080 (split view)
- **Content**:
  - Left side: Original design
  - Right side: Improved design (if implemented)
  - Arrows pointing to changes
  - Annotations describing improvements
- **Use Case**: Documentation of design improvements/iterations

### 7.2 Desktop vs. Mobile

**Specification**:
- **Name**: `responsive-design-comparison.png`
- **Resolution**: 1920x1080 (or split view)
- **Content**:
  - Left: Desktop view (1920px)
  - Right: Mobile view (375px)
  - Same page section shown in both
  - Annotations showing layout changes
- **Example**: Landing page hero in desktop vs. mobile
- **Use Case**: Responsive design documentation

---

## 8. State Variations

### 8.1 Form States (Recommended)

**Specifications**:
- **Idle State**: `form-idle.png` — Default form appearance
- **Focus State**: `form-focus.png` — One field focused, showing focus ring
- **Valid State**: `form-valid.png` — Field with green checkmark, showing successful validation
- **Invalid State**: `form-invalid.png` — Field with red border, error message, red X icon
- **Loading State**: `form-loading.png` — Submit button showing spinner, disabled state
- **Success State**: `form-success.png` — Success message displayed (toast or inline)

**Resolution**: 1920x400 (single form visible for each state)

**Annotations**:
- Label the state (e.g., "Valid State")
- Point out visual differences (color, icon, text)
- Describe user action that led to state

**Use Case**: Form interaction documentation, design system reference

### 8.2 Button States

**Specifications**:
- **Idle**: `button-idle.png` — Default button appearance
- **Hover**: `button-hover.png` — Button on hover (darker shade)
- **Active/Pressed**: `button-active.png` — Button while being pressed
- **Focused**: `button-focused.png` — Keyboard focus ring visible
- **Disabled**: `button-disabled.png` — Grayed out, cursor: not-allowed

**Use Case**: Component design documentation

---

## 9. Screenshot Capture Instructions

### Tools Needed
- **Primary**: Browser DevTools screenshot tool
- **Secondary**: Playwright screenshots (automated)
- **Annotation**: Figma, Sketch, or Markup tools

### Capture Process

**Desktop Screenshots**:
1. Set browser window to 1920x1080
2. Remove browser UI (full-page screenshot mode)
3. Capture full page scroll (use Playwright or Fullpage Screenshot extension)
4. Save as PNG with clear naming convention
5. Annotate in Figma or similar tool

**Mobile Screenshots**:
1. Use Chrome DevTools device emulation (iPhone 12: 390px × 844px logical)
2. Or use Playwright with mobile device config
3. Capture full page height
4. Save as PNG

**Video Recordings** (Optional):
1. Record page interactions (form filling, scrolling)
2. Format: MP4 or WebM
3. Narrate key interactions
4. Duration: 30-60 seconds per interaction

### Quality Standards
- **Resolution**: Minimum 1920px width for desktop
- **Clarity**: 100% zoom, no blurriness
- **Color**: True color representation
- **File Size**: Optimized PNG (<2MB per file)
- **Naming**: Descriptive, lowercase, hyphens (e.g., `hero-section-english.png`)

---

## 10. Screenshot Inventory & Status

| Category | Screenshot | Status | Priority | Resolution |
|----------|-----------|--------|----------|------------|
| **Landing Page** | full-scroll | Needed | P0 | 1920x2400 |
| | hero-section | Needed | P0 | 1920x540 |
| | navbar-desktop | Needed | P1 | 1920x80 |
| | categories-section | Needed | P1 | 1920x200 |
| | products-grid | Needed | P1 | 1920x600 |
| | suppliers-grid | Needed | P1 | 1920x500 |
| | how-it-works | Needed | P2 | 1920x400 |
| | footer-section | Needed | P2 | 1920x300 |
| **Auth Pages** | login-page | Needed | P0 | 1920x1080 |
| | signup-page | Needed | P0 | 1920x1080 |
| **Mobile** | landing-mobile | Needed | P1 | 375x2000 |
| | login-mobile | Needed | P1 | 375x812 |
| | products-mobile | Needed | P1 | 375x900 |
| **Bilingual** | landing-german | Needed | P2 | 1920x2400 |
| | login-german | Needed | P2 | 1920x1080 |
| **Diagrams** | layout-wireframe | Needed | P1 | SVG |
| | product-card | Needed | P1 | SVG |
| | navigation-flow | Needed | P2 | SVG |
| **States** | form-states (5x) | Needed | P1 | 1920x400 |
| | button-states (5x) | Needed | P2 | 800x200 |

**Total Screenshots Needed**: 30-40 images

---

## 11. SDD Integration Map

### Screenshot Placement in SDD

| SDD Section | Screenshot(s) |
|-------------|--------------|
| 4.1 System Overview | landing-page-full-scroll |
| 4.2 User Flows | navigation-flow-diagram |
| 4.3 Landing Page Design | hero-section, categories-section |
| 4.4 Product Listing | products-grid, product-card |
| 4.5 Supplier Listing | suppliers-grid |
| 4.6 Authentication | login-page, signup-page |
| 4.7 Mobile Experience | landing-mobile, login-mobile |
| 4.8 Responsive Design | responsive-comparison |
| 4.9 Component Library | form-states, button-states |
| 4.10 Multilingual Support | landing-german |

---

## 12. Delivery Checklist

- [ ] All desktop screenshots captured (1920px width)
- [ ] All mobile screenshots captured (375px width)
- [ ] All diagrams created (SVG format)
- [ ] All state variations documented
- [ ] Bilingual versions created (English & German)
- [ ] Screenshots annotated with callouts
- [ ] File naming convention applied consistently
- [ ] All files optimized (PNG compression)
- [ ] Figma library created with screenshots
- [ ] Screenshots organized in SDD markdown
- [ ] Quality review completed (no blurry images)
- [ ] Accessibility review (alt text for all images)

---

**Generated**: 2026-05-19 02:14:00 GMT  
**Document Version**: 1.0  
**Status**: Specification complete, captures pending
