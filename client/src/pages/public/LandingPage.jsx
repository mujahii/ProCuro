import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, MapPin, ChevronRight, Drumstick, Beef, Leaf, Coffee, Apple,
  Package, Truck, Shield, Fish, Milk, Flame, Wheat, Plus, Rocket,
  Menu, X, ArrowRight, Star, TrendingUp, Users, ShoppingBag
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

/* ─── helpers ──────────────────────────────────────────────────── */
function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

/* ─── constants ─────────────────────────────────────────────────── */
const CATEGORIES = [
  { name: 'Meat',       icon: Beef,      labelKey: 'catMeat' },
  { name: 'Poultry',    icon: Drumstick, labelKey: 'catPoultry' },
  { name: 'Seafood',    icon: Fish,      labelKey: 'catSeafood' },
  { name: 'Dairy',      icon: Milk,      labelKey: 'catDairy' },
  { name: 'Vegetables', icon: Leaf,      labelKey: 'catVegetables' },
  { name: 'Fruits',     icon: Apple,     labelKey: 'catFruits' },
  { name: 'Bakery',     icon: Wheat,     labelKey: 'catBakery' },
  { name: 'Beverages',  icon: Coffee,    labelKey: 'catBeverages' },
  { name: 'Spices',     icon: Flame,     labelKey: 'catSpices' },
  { name: 'Other',      icon: Package,   labelKey: 'catOther' },
]

const STAT_TARGETS = [
  { target: 28,  suffix: '+', labelKey: 'statsRestaurants',      decimal: false },
  { target: 12,  suffix: '+', labelKey: 'statsVerifiedSuppliers', decimal: false },
  { target: 850, suffix: '+', labelKey: 'statsOrdersPlaced',      decimal: false },
  { target: 4.9, suffix: '★', labelKey: 'statsAverageRating',    decimal: true  },
]

/* ─── scoped styles (wy- prefix, ProCuro palette) ───────────────── */
const WY_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── ProCuro design tokens ── */
:root {
  --wy-primary:       #083A4F;
  --wy-primary-mid:   #1B5468;
  --wy-primary-dark:  #052532;
  --wy-accent:        #A58D66;
  --wy-accent-light:  #BFA988;
  --wy-accent-dark:   #8A7553;
  --wy-teal:          #407E8C;
  --wy-teal-light:    #5E96A4;
  --wy-teal-dark:     #2F606C;
  --wy-sand:          #E5E1DD;
  --wy-sand-dark:     #CFC8BE;
  --wy-celeste:       #C0D5D6;
  --wy-celeste-dark:  #A2BCBE;
  --wy-white:         #ffffff;
  --wy-surface:       #F5F3F1;
  --wy-border:        #DDD8D2;
  --wy-text:          #052532;
  --wy-muted:         #5A6E78;
  --wy-grad-cta:      linear-gradient(135deg, #083A4F 0%, #407E8C 100%);
  --wy-grad-warm:     linear-gradient(135deg, #083A4F 0%, #A58D66 100%);
  --wy-grad-text:     linear-gradient(90deg, #083A4F, #407E8C);
  --wy-grad-hero:     linear-gradient(160deg, #052532 0%, #083A4F 50%, #1B5468 100%);
  --wy-shadow-sm:     0 1px 3px rgba(8,58,79,0.08);
  --wy-shadow-md:     0 4px 16px rgba(8,58,79,0.12);
  --wy-shadow-lg:     0 12px 40px rgba(8,58,79,0.18);
  --wy-shadow-xl:     0 24px 60px rgba(8,58,79,0.25);
  --wy-radius-sm:     8px;
  --wy-radius-md:     14px;
  --wy-radius-lg:     22px;
  --wy-radius-xl:     32px;
  --wy-ease:          cubic-bezier(0.22, 1, 0.36, 1);
  --wy-ff-display:    'Plus Jakarta Sans', sans-serif;
  --wy-ff-body:       'IBM Plex Sans', sans-serif;
}

/* ── base wrapper ── */
.wy-root {
  font-family: var(--wy-ff-body);
  color: var(--wy-text);
  min-height: 100vh;
  background: var(--wy-surface);
  overflow-x: hidden;
}
.wy-root * { box-sizing: border-box; }

/* ── sticky header ── */
.wy-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 999;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(255,255,255,0.84);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid transparent;
  transition: box-shadow 0.3s var(--wy-ease), border-color 0.3s var(--wy-ease), background 0.3s var(--wy-ease);
}
.wy-header.wy-scrolled {
  background: rgba(255,255,255,0.97);
  border-bottom-color: var(--wy-border);
  box-shadow: var(--wy-shadow-md);
}
.wy-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.wy-logo {
  font-family: var(--wy-ff-display);
  font-size: 22px;
  font-weight: 800;
  background: var(--wy-grad-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  letter-spacing: -0.5px;
  flex-shrink: 0;
}
.wy-header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.wy-nav-link {
  font-family: var(--wy-ff-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--wy-muted);
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: none;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.wy-nav-link:hover { color: var(--wy-primary); background: var(--wy-sand); }
.wy-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.wy-btn-login {
  font-family: var(--wy-ff-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--wy-primary);
  background: none;
  border: 2px solid var(--wy-border);
  padding: 8px 20px;
  border-radius: 50px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.wy-btn-login:hover { border-color: var(--wy-primary); }
.wy-btn-header-cta {
  font-family: var(--wy-ff-body);
  font-size: 14px;
  font-weight: 700;
  color: var(--wy-primary-dark);
  background: var(--wy-accent);
  border: none;
  padding: 9px 22px;
  border-radius: 50px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 4px 14px rgba(165,141,102,0.4);
}
.wy-btn-header-cta:hover { opacity: 0.88; transform: translateY(-1px); }
.wy-btn-lang {
  font-family: var(--wy-ff-body);
  font-size: 13px;
  font-weight: 700;
  color: var(--wy-muted);
  background: none;
  border: 1.5px solid var(--wy-border);
  padding: 6px 13px;
  border-radius: 50px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.wy-btn-lang:hover { color: var(--wy-primary); border-color: var(--wy-primary); background: var(--wy-sand); }

/* ── mobile toggle ── */
.wy-mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}
.wy-mobile-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--wy-primary);
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s;
}
.wy-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(5,37,50,0.55);
  z-index: 1098;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
.wy-mobile-overlay.wy-open { opacity: 1; pointer-events: auto; }
.wy-mobile-drawer {
  position: fixed;
  top: 0;
  right: -340px;
  width: 300px;
  height: 100%;
  background: #fff;
  z-index: 1099;
  padding: 80px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--wy-shadow-xl);
  transition: right 0.35s var(--wy-ease);
}
.wy-mobile-drawer.wy-open { right: 0; }
.wy-drawer-close {
  position: absolute;
  top: 20px; right: 20px;
  background: var(--wy-surface);
  border: none;
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.wy-drawer-link {
  font-family: var(--wy-ff-body);
  font-size: 16px;
  font-weight: 600;
  color: var(--wy-text);
  padding: 12px 16px;
  border-radius: var(--wy-radius-sm);
  cursor: pointer;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  transition: background 0.2s, color 0.2s;
}
.wy-drawer-link:hover { background: var(--wy-sand); color: var(--wy-primary); }

/* ── hero (ProCuro structure: full-bleed dark, rising orbs, 4 zones) ── */
.wy-hero {
  position: relative;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #052532;
}
@keyframes wy-rise-mobile {
  0%   { transform: translateY(110vh); opacity: 0; }
  14%  { opacity: 1; }
  86%  { opacity: 0.85; }
  100% { transform: translateY(-55vh); opacity: 0; }
}
@keyframes wy-rise {
  0%   { transform: translateY(680px); opacity: 0; }
  14%  { opacity: 1; }
  86%  { opacity: 0.85; }
  100% { transform: translateY(-680px); opacity: 0; }
}
.wy-orb {
  position: absolute;
  top: 0;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform;
  animation: wy-rise-mobile 28s linear infinite;
}
@media (min-width: 640px) {
  .wy-orb { animation: wy-rise 15s linear infinite; }
}
.wy-hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5,37,50,0.60);
  pointer-events: none;
  z-index: 1;
}
.wy-hero-inner {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
  color: #fff;
  padding: 32px 24px 36px;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}
.wy-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(165,141,102,0.20);
  border: 1px solid rgba(165,141,102,0.40);
  color: #BFA988;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px 6px 9px;
  border-radius: 50px;
  font-family: var(--wy-ff-body);
}
.wy-hero-h1 {
  font-family: var(--wy-ff-display);
  font-size: clamp(30px, 5.5vw, 58px);
  font-weight: 800;
  line-height: 1.1;
  color: #E5E1DD;
  margin: 0;
  letter-spacing: -1px;
}
.wy-hero-sub {
  font-size: clamp(14px, 2vw, 17px);
  line-height: 1.65;
  color: #C0D5D6;
  margin: 0 auto 24px;
  max-width: 560px;
}
.wy-hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.wy-btn-primary {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: var(--wy-primary-dark);
  background: var(--wy-accent);
  border: none;
  padding: 13px 28px;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(165,141,102,0.4);
  transition: transform 0.2s, opacity 0.2s;
}
.wy-btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
.wy-btn-ghost {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: rgba(229,225,221,0.9);
  background: transparent;
  border: 2px solid rgba(229,225,221,0.50);
  padding: 12px 24px;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}
.wy-btn-ghost:hover { background: rgba(255,255,255,0.10); border-color: rgba(229,225,221,0.80); }
.wy-hero-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
}
.wy-trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(192,213,214,0.80);
  font-family: var(--wy-ff-body);
}
.wy-trust-icon { color: #A58D66; }

/* ── stats bar ── */
.wy-stats-bar {
  background: #fff;
  border-top: 1px solid var(--wy-border);
  border-bottom: 1px solid var(--wy-border);
  padding: 26px 24px;
}
.wy-stats-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  text-align: center;
}
.wy-stat-divider { border-right: 1px solid var(--wy-border); }
.wy-stat-divider:last-child { border-right: none; }
.wy-stat-value {
  font-family: var(--wy-ff-display);
  font-size: 32px;
  font-weight: 800;
  background: var(--wy-grad-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.15;
}
.wy-stat-label {
  font-size: 13px;
  color: var(--wy-muted);
  margin-top: 4px;
  font-weight: 500;
}

/* ── generic section ── */
.wy-section {
  padding: 64px 24px;
}
.wy-section--alt { background: #fff; }
.wy-section-inner { max-width: 1200px; margin: 0 auto; }
.wy-section-header { text-align: center; margin-bottom: 48px; }
.wy-section-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--wy-teal);
  margin-bottom: 10px;
}
.wy-section-title {
  font-family: var(--wy-ff-display);
  font-size: clamp(24px, 3.5vw, 38px);
  font-weight: 800;
  color: var(--wy-text);
  margin: 0 0 12px;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.wy-section-title em {
  font-style: normal;
  background: var(--wy-grad-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.wy-section-sub {
  font-size: 15px;
  color: var(--wy-muted);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ── how it works cards ── */
.wy-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.wy-card {
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: var(--wy-radius-lg);
  padding: 32px 26px;
  position: relative;
  transition: transform 0.3s var(--wy-ease), box-shadow 0.3s, border-color 0.3s;
}
.wy-section--alt .wy-card { background: var(--wy-surface); }
.wy-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--wy-shadow-lg);
  border-color: var(--wy-celeste-dark);
}
.wy-card-icon {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--wy-celeste);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: var(--wy-primary);
  position: relative;
}
.wy-card-num {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: var(--wy-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wy-card-title {
  font-family: var(--wy-ff-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--wy-text);
  margin: 0 0 8px;
  text-align: center;
}
.wy-card-desc {
  font-size: 13px;
  color: var(--wy-muted);
  line-height: 1.65;
  margin: 0;
  text-align: center;
}

/* ── category filter ── */
.wy-category-filter {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding-bottom: 6px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  justify-content: space-between;
}
.wy-category-filter::-webkit-scrollbar { display: none; }
.wy-cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.wy-cat-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--wy-border);
  background: #fff;
  color: #94a3b8;
  box-shadow: var(--wy-shadow-sm);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, color 0.2s;
}
.wy-cat-chip:hover .wy-cat-icon-wrap {
  border-color: var(--wy-celeste-dark);
  box-shadow: var(--wy-shadow-md);
  color: var(--wy-teal);
}
.wy-cat-icon-wrap.wy-active {
  background: var(--wy-sand);
  border-color: var(--wy-teal);
  color: var(--wy-primary);
  box-shadow: var(--wy-shadow-md);
}
.wy-cat-label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
  transition: color 0.2s;
}
.wy-cat-chip:hover .wy-cat-label { color: var(--wy-primary); }
.wy-cat-active .wy-cat-label { color: var(--wy-primary-dark); font-weight: 700; }

/* ── row header ── */
.wy-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.wy-row-title {
  font-family: var(--wy-ff-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--wy-text);
}
.wy-row-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--wy-teal);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
  font-family: var(--wy-ff-body);
}
.wy-row-link:hover { color: var(--wy-teal-dark); }

/* ── product cards ── */
.wy-product-scroll {
  display: flex;
  overflow-x: auto;
  gap: 20px;
  padding: 8px 0 16px;
  margin: 0 -24px;
  padding-left: 24px;
  padding-right: 24px;
  scrollbar-width: none;
}
.wy-product-scroll::-webkit-scrollbar { display: none; }
.wy-product-card {
  flex-shrink: 0;
  width: 260px;
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--wy-shadow-sm);
  transition: box-shadow 0.3s;
}
.wy-product-card:hover { box-shadow: var(--wy-shadow-md); }
.wy-product-img {
  height: 160px;
  background: var(--wy-surface);
  position: relative;
  overflow: hidden;
}
.wy-product-img img { width: 100%; height: 100%; object-fit: cover; }
.wy-product-cat-badge {
  position: absolute;
  top: 8px; right: 8px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(4px);
  font-size: 10px;
  font-weight: 700;
  color: var(--wy-primary);
  padding: 3px 8px;
  border-radius: 6px;
  box-shadow: var(--wy-shadow-sm);
}
.wy-product-discount {
  position: absolute;
  top: 8px; left: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
}
.wy-product-body { padding: 14px 16px; }
.wy-product-name {
  font-family: var(--wy-ff-display);
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 3px;
}
.wy-product-desc { font-size: 12px; color: #64748b; margin: 0 0 3px; }
.wy-product-supplier {
  font-size: 11px;
  font-weight: 700;
  color: var(--wy-primary-dark);
  margin: 0 0 12px;
}
.wy-product-footer { display: flex; align-items: center; justify-content: space-between; }
.wy-product-price { font-size: 17px; font-weight: 700; color: #0f172a; }
.wy-product-unit { font-size: 11px; color: #94a3b8; margin-left: 2px; font-weight: 400; }
.wy-btn-cart {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--wy-primary);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}
.wy-btn-cart:hover { background: var(--wy-primary-mid); }
.wy-empty-state {
  padding: 40px 0;
  color: var(--wy-muted);
  font-size: 14px;
  text-align: center;
  width: 100%;
}

/* ── supplier scroll (matches original) ── */
.wy-supplier-scroll {
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding: 4px 0 16px;
  margin: 0 -24px;
  padding-left: 24px;
  padding-right: 24px;
  scrollbar-width: none;
}
.wy-supplier-scroll::-webkit-scrollbar { display: none; }
.wy-supplier-card {
  flex-shrink: 0;
  min-width: 180px;
  max-width: 180px;
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: 14px;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  box-shadow: var(--wy-shadow-sm);
  transition: box-shadow 0.3s;
}
.wy-supplier-card:hover { box-shadow: var(--wy-shadow-md); }
.wy-supplier-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--wy-surface);
  margin-bottom: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: #94a3b8;
}
.wy-supplier-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wy-supplier-name {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
  margin: 0 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.wy-supplier-city {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-bottom: 5px;
}
.wy-supplier-rating {
  font-size: 11px;
  font-weight: 700;
  color: var(--wy-accent);
  margin-bottom: 7px;
}
.wy-halal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--wy-sand);
  color: var(--wy-primary-dark);
  font-size: 10px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 50px;
  border: 1px solid var(--wy-celeste-dark);
}

/* ── CTA banner ── */
.wy-cta-section {
  background: #052532;
  padding: 72px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.wy-cta-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5,37,50,0.58);
  pointer-events: none;
  z-index: 1;
}
.wy-cta-inner { max-width: 680px; margin: 0 auto; position: relative; z-index: 2; }
.wy-cta-title {
  font-family: var(--wy-ff-display);
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 800;
  color: var(--wy-sand);
  margin: 0 0 14px;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.wy-cta-sub {
  font-size: 15px;
  color: var(--wy-celeste);
  margin: 0 0 32px;
  line-height: 1.65;
}
.wy-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.wy-btn-white {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: var(--wy-primary-dark);
  background: var(--wy-accent);
  border: none;
  padding: 13px 28px;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(165,141,102,0.4);
  transition: transform 0.2s, opacity 0.2s;
}
.wy-btn-white:hover { transform: translateY(-2px); opacity: 0.9; }
.wy-btn-white-outline {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: rgba(229,225,221,0.88);
  background: transparent;
  border: 2px solid rgba(229,225,221,0.35);
  padding: 12px 24px;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}
.wy-btn-white-outline:hover { background: rgba(255,255,255,0.10); border-color: rgba(229,225,221,0.6); }

/* ── app store buttons ── */
.wy-app-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  align-items: stretch;
  max-width: 640px;
  margin: 32px auto 0;
  width: 100%;
  padding: 0 16px;
}
@media (min-width: 500px) {
  .wy-app-btns { flex-direction: row; }
}
.wy-app-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.22);
  color: #fff;
  padding: 12px 20px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, border-color 0.2s;
  font-family: var(--wy-ff-body);
  flex: 1;
  backdrop-filter: blur(8px);
}
.wy-app-btn:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.40); transform: translateY(-2px); }
.wy-app-btn-text-sm { font-size: 9px; color: rgba(255,255,255,0.65); display: block; line-height: 1; margin-bottom: 3px; }
.wy-app-btn-text { font-size: 13px; font-weight: 600; display: block; line-height: 1; color: #fff; }

/* ── footer ── */
.wy-footer {
  background: var(--wy-primary-dark);
  padding: 56px 24px 0;
  color: rgba(229,225,221,0.65);
  font-family: var(--wy-ff-body);
}
.wy-footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 44px;
  padding-bottom: 44px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.wy-footer-logo {
  font-family: var(--wy-ff-display);
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(90deg, #E5E1DD, #A58D66);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  display: block;
}
.wy-footer-tagline {
  font-size: 13px;
  line-height: 1.65;
  margin-bottom: 18px;
  max-width: 260px;
  color: rgba(192,213,214,0.70);
}
.wy-footer-col-title {
  font-family: var(--wy-ff-display);
  font-size: 13px;
  font-weight: 700;
  color: rgba(229,225,221,0.90);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.wy-footer-link {
  display: block;
  font-size: 13px;
  color: rgba(229,225,221,0.50);
  text-decoration: none;
  margin-bottom: 9px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font-family: var(--wy-ff-body);
  transition: color 0.2s;
  width: 100%;
}
.wy-footer-link:hover { color: var(--wy-celeste); }
.wy-footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.wy-footer-copy { font-size: 12px; color: rgba(229,225,221,0.30); }

/* ── scroll reveal ── */
.wy-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.55s var(--wy-ease), transform 0.55s var(--wy-ease);
}
.wy-reveal--visible { opacity: 1; transform: translateY(0); }
.wy-reveal-d1 { transition-delay: 0.08s; }
.wy-reveal-d2 { transition-delay: 0.16s; }
.wy-reveal-d3 { transition-delay: 0.24s; }
.wy-reveal-d4 { transition-delay: 0.32s; }
.wy-reveal-d5 { transition-delay: 0.40s; }

/* ── modal ── */
.wy-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(5,37,50,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.wy-modal {
  background: #fff;
  border-radius: var(--wy-radius-xl);
  padding: 36px 28px;
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: var(--wy-shadow-xl);
}
.wy-modal-title {
  font-family: var(--wy-ff-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--wy-text);
  margin: 14px 0 7px;
}
.wy-modal-sub { font-size: 13px; color: var(--wy-muted); margin-bottom: 22px; line-height: 1.6; }
.wy-btn-modal {
  width: 100%;
  background: var(--wy-primary);
  color: #fff;
  border: none;
  padding: 13px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  font-family: var(--wy-ff-body);
  transition: background 0.2s;
}
.wy-btn-modal:hover { background: var(--wy-primary-mid); }

/* ── responsive ── */
@media (max-width: 1024px) {
  .wy-cards-grid { grid-template-columns: 1fr 1fr; }
  .wy-footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
}
@media (max-width: 900px) {
  .wy-header-nav { display: none; }
  .wy-header-actions .wy-btn-login,
  .wy-header-actions .wy-btn-header-cta { display: none; }
  .wy-mobile-toggle { display: flex; }
  .wy-mobile-overlay { display: block; pointer-events: none; }
  .wy-stats-inner { grid-template-columns: 1fr 1fr; }
  .wy-stat-divider:nth-child(2) { border-right: none; }
  .wy-stat-divider:nth-child(1),
  .wy-stat-divider:nth-child(2) { padding-bottom: 12px; border-bottom: 1px solid var(--wy-border); }
}
@media (max-width: 640px) {
  .wy-cards-grid { grid-template-columns: 1fr; }
  .wy-footer-grid { grid-template-columns: 1fr; gap: 22px; }
  .wy-footer-bottom { flex-direction: column; text-align: center; }
  .wy-section { padding: 48px 20px; }
}
`

/* ─── useCountUp ─────────────────────────────────────────────── */
function useCountUp(target, duration = 1800, start = false, decimal = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(decimal ? parseFloat((eased * target).toFixed(1)) : Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration, decimal])
  return count
}

/* ─── StatCounter (hook called at top level — no inside .map) ── */
function StatCounter({ target, suffix, decimal, started }) {
  const count = useCountUp(target, 1800, started, decimal)
  return (
    <div className="wy-stat-value">
      {decimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
    </div>
  )
}

function WyStatsBar() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="wy-stats-bar wy-reveal" ref={ref}>
      <div className="wy-stats-inner">
        {STAT_TARGETS.map(s => (
          <div key={s.labelKey} className="wy-stat-divider">
            <StatCounter target={s.target} suffix={s.suffix} decimal={s.decimal} started={started} />
            <div className="wy-stat-label">{t(s.labelKey)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  const { user, authUser, role, loading } = useAuth()
  const { t, lang, setLanguage } = useLanguage()

  const [selectedCategory, setSelectedCategory]  = useState('All')
  const [showComingSoon, setShowComingSoon]        = useState(false)
  const [drawerOpen, setDrawerOpen]               = useState(false)
  const [scrolled, setScrolled]                   = useState(false)
  const [products, setProducts]                   = useState([])
  const [suppliers, setSuppliers]                 = useState([])

  const HOW_IT_WORKS = [
    { icon: Shield,  title: t('howItWorksStep1Title'), desc: t('howItWorksStep1Desc') },
    { icon: Package, title: t('howItWorksStep2Title'), desc: t('howItWorksStep2Desc') },
    { icon: Truck,   title: t('howItWorksStep3Title'), desc: t('howItWorksStep3Desc') },
  ]

  function getCategoryLabel(name) {
    if (name === 'All') return t('featuredProducts')
    const cat = CATEGORIES.find(c => c.name === name)
    return cat ? t(cat.labelKey) : name
  }

  /* auth redirect */
  useEffect(() => {
    if (loading) return
    if (authUser && !user) { navigate('/select-role', { replace: true }); return }
    if (user) {
      if (role === 'restaurant_owner') navigate('/owner/store', { replace: true })
      else if (role === 'supplier')    navigate('/supplier/dashboard', { replace: true })
      else if (role === 'admin')       navigate('/admin/dashboard', { replace: true })
    }
  }, [user, authUser, role, loading])

  useEffect(() => { fetchProducts() }, [selectedCategory])
  useEffect(() => { fetchSuppliers() }, [])

  async function fetchProducts() {
    let q = supabase
      .from('products')
      .select('*, supplier:supplier_profiles(business_name, city)')
      .eq('is_active', true)
      .limit(8)
    if (selectedCategory !== 'All') q = q.eq('category', selectedCategory)
    const { data } = await q
    setProducts(data || [])
  }

  async function fetchSuppliers() {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('is_verified', true)
      .eq('is_active', true)
      .limit(8)
    setSuppliers(data || [])
  }

  /* scroll header class */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll('.wy-reveal')
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('wy-reveal--visible')
          observer.unobserve(entry.target)
        }
      }),
      { threshold: 0.12 }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [products, suppliers])

  /* body scroll lock when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  /* ── render ── */
  return (
    <>
      <style>{WY_STYLES}</style>

      <div className="wy-root" style={{ paddingTop: 'calc(68px + var(--sat, 0px))' }}>

        {/* ── sticky header ── */}
        <header className={`wy-header${scrolled ? ' wy-scrolled' : ''}`}>
          <div className="wy-header-inner">
            <span className="wy-logo">ProCuro</span>

            <nav className="wy-header-nav">
              <button className="wy-nav-link" onClick={() => navigate('/products')}>{t('products')}</button>
              <button className="wy-nav-link" onClick={() => navigate('/suppliers')}>{t('suppliers')}</button>
              <button className="wy-nav-link" onClick={() => navigate('/about')}>{t('about')}</button>
              <button className="wy-nav-link" onClick={() => navigate('/help')}>{t('help')}</button>
            </nav>

            <div className="wy-header-actions">
              <button className="wy-btn-lang" onClick={() => setLanguage(lang === 'en' ? 'de' : 'en')}>
                {lang === 'en' ? 'DE' : 'EN'}
              </button>
              <button className="wy-btn-login"      onClick={() => navigate('/login')}>{t('login')}</button>
              <button className="wy-btn-header-cta" onClick={() => navigate('/register')}>{t('getStarted')}</button>
              <button className="wy-mobile-toggle"  onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                <span /><span /><span />
              </button>
            </div>
          </div>
        </header>

        {/* ── mobile drawer ── */}
        <div className={`wy-mobile-overlay${drawerOpen ? ' wy-open' : ''}`} onClick={() => setDrawerOpen(false)} />
        <div className={`wy-mobile-drawer${drawerOpen ? ' wy-open' : ''}`}>
          <button className="wy-drawer-close" onClick={() => setDrawerOpen(false)}>
            <X size={18} color="#083A4F" />
          </button>
          <button className="wy-drawer-link" onClick={() => { navigate('/products');  setDrawerOpen(false) }}>{t('products')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/suppliers'); setDrawerOpen(false) }}>{t('suppliers')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/about');     setDrawerOpen(false) }}>{t('about')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/help');      setDrawerOpen(false) }}>{t('help')}</button>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="wy-btn-lang" style={{ alignSelf: 'flex-start' }} onClick={() => setLanguage(lang === 'en' ? 'de' : 'en')}>
              {lang === 'en' ? 'DE' : 'EN'}
            </button>
            <button className="wy-btn-login"      style={{ width: '100%' }}                            onClick={() => { navigate('/login');    setDrawerOpen(false) }}>{t('login')}</button>
            <button className="wy-btn-primary"    style={{ width: '100%', justifyContent: 'center' }} onClick={() => { navigate('/register'); setDrawerOpen(false) }}>{t('getStarted')}</button>
          </div>
        </div>

        {/* ══ HERO — ProCuro structure: dark #052532 bg, rising blobs, 4-zone centered layout ══ */}
        <section className="wy-hero">
          {/* Rising brand-colour orbs */}
          <div className="wy-orb"
            style={{ left: '4%',  width: 176, height: 176, background: '#A58D66', animationDelay: '0s',    filter: 'blur(44px)' }} />
          <div className="wy-orb"
            style={{ left: '54%', width: 160, height: 160, background: '#C0D5D6', animationDelay: '-7s',   filter: 'blur(40px)' }} />
          <div className="wy-orb"
            style={{ left: '28%', width: 144, height: 144, background: '#5E96A4', animationDelay: '-14s',  filter: 'blur(36px)' }} />
          <div className="wy-orb"
            style={{ left: '70%', width: 160, height: 160, background: '#BFA988', animationDelay: '-21s',  filter: 'blur(40px)' }} />
          <div className="wy-orb"
            style={{ left: '40%', width: 128, height: 128, background: '#B07B8B', animationDelay: '-4s',   filter: 'blur(32px)' }} />
          <div className="wy-orb"
            style={{ left: '82%', width: 144, height: 144, background: '#B19CD9', animationDelay: '-11s',  filter: 'blur(36px)' }} />

          {/* Desktop orbs (larger, more blur) — injected via media style */}
          <style>{`
            @media (min-width: 640px) {
              .wy-hero .wy-orb:nth-child(1) { width: 416px !important; height: 416px !important; filter: blur(80px) !important; }
              .wy-hero .wy-orb:nth-child(2) { width: 352px !important; height: 352px !important; filter: blur(72px) !important; }
              .wy-hero .wy-orb:nth-child(3) { width: 320px !important; height: 320px !important; filter: blur(64px) !important; }
              .wy-hero .wy-orb:nth-child(4) { width: 384px !important; height: 384px !important; filter: blur(80px) !important; }
              .wy-hero .wy-orb:nth-child(5) { width: 288px !important; height: 288px !important; filter: blur(60px) !important; }
              .wy-hero .wy-orb:nth-child(6) { width: 352px !important; height: 352px !important; filter: blur(70px) !important; }
              .wy-cta-section .wy-orb:nth-child(1) { width: 380px !important; height: 380px !important; filter: blur(76px) !important; }
              .wy-cta-section .wy-orb:nth-child(2) { width: 320px !important; height: 320px !important; filter: blur(68px) !important; }
              .wy-cta-section .wy-orb:nth-child(3) { width: 300px !important; height: 300px !important; filter: blur(60px) !important; }
              .wy-cta-section .wy-orb:nth-child(4) { width: 360px !important; height: 360px !important; filter: blur(76px) !important; }
              .wy-cta-section .wy-orb:nth-child(5) { width: 260px !important; height: 260px !important; filter: blur(56px) !important; }
              .wy-cta-section .wy-orb:nth-child(6) { width: 320px !important; height: 320px !important; filter: blur(65px) !important; }
            }
          `}</style>

          {/* Dark overlay */}
          <div className="wy-hero-overlay" />

          {/* 4-zone centered layout — same as original LandingPage */}
          <div className="wy-hero-inner">

            {/* Zone 1 — badge pinned near top */}
            <div>
              <span className="wy-eyebrow">
                <CheckCircle size={14} /> {t('heroTagline')}
              </span>
            </div>

            {/* Zone 2 — main H1 */}
            <div>
              <h1 className="wy-hero-h1">{t('heroTitle')}</h1>
            </div>

            {/* Zone 3 — subtitle + CTAs */}
            <div>
              <p className="wy-hero-sub">{t('heroSubtitle')}</p>
              <div className="wy-hero-actions">
                <button className="wy-btn-primary" onClick={() => navigate('/register')}>
                  {t('getStarted')}
                </button>
                <button className="wy-btn-ghost" onClick={() => navigate('/suppliers')}>
                  {t('browseSuppliers')}
                </button>
              </div>
            </div>

            {/* Zone 4 — trust badges pinned to bottom */}
            <div className="wy-hero-trust">
              <span className="wy-trust-badge"><CheckCircle size={13} className="wy-trust-icon" /> {t('gdprCompliant')}</span>
              <span className="wy-trust-badge"><CheckCircle size={13} className="wy-trust-icon" /> {t('halalVerifiedBadge')}</span>
              <span className="wy-trust-badge"><CheckCircle size={13} className="wy-trust-icon" /> {t('noHiddenFees')}</span>
            </div>

          </div>
        </section>

        {/* ── stats bar ── */}
        <WyStatsBar />

        {/* ── main content ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Category filter */}
          <section className="wy-reveal">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, fontFamily: 'var(--wy-ff-display)' }}>{t('browseByCategory')}</h2>
            <div className="wy-category-filter">
              {[{ name: 'All', icon: Package, labelKey: 'catAll' }, ...CATEGORIES].map(({ name, icon: Icon, labelKey }) => (
                <div
                  key={name}
                  className={`wy-cat-chip${selectedCategory === name ? ' wy-cat-active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
                >
                  <div className={`wy-cat-icon-wrap${selectedCategory === name ? ' wy-active' : ''}`}>
                    <Icon size={26} />
                  </div>
                  <span className="wy-cat-label">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Featured products */}
          <section>
            <div className="wy-row-header wy-reveal">
              <div className="wy-row-title">{getCategoryLabel(selectedCategory)}</div>
              <button className="wy-row-link" onClick={() => navigate('/products')}>
                All <ChevronRight size={14} />
              </button>
            </div>

            <div className="wy-product-scroll">
              {products.slice(0, 8).map((product, i) => {
                const imgUrl = getProductImageUrl(product.image_url)
                return (
                  <div
                    key={product.id}
                    className={`wy-product-card wy-reveal wy-reveal-d${Math.min(i + 1, 5)}`}
                    onClick={() => navigate('/login')}
                  >
                    <div className="wy-product-img">
                      {imgUrl
                        ? <img src={imgUrl} alt={product.name} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={40} color="#cbd5e1" /></div>
                      }
                      <div className="wy-product-cat-badge">{product.category}</div>
                      {product.discount_percent > 0 && (
                        <div className="wy-product-discount">-{product.discount_percent}%</div>
                      )}
                    </div>
                    <div className="wy-product-body">
                      <div className="wy-product-name">{product.name}</div>
                      {product.description && (
                        <div className="wy-product-desc">{product.description.substring(0, 40)}…</div>
                      )}
                      <div className="wy-product-supplier">{product.supplier?.business_name}</div>
                      <div className="wy-product-footer">
                        <div>
                          <span className="wy-product-price">€{Number(product.price).toFixed(2)}</span>
                          <span className="wy-product-unit">/ {product.unit_type}</span>
                        </div>
                        <button className="wy-btn-cart" onClick={e => { e.stopPropagation(); navigate('/login') }}>
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {products.length === 0 && <div className="wy-empty-state">{t('noProductsFound')}</div>}
            </div>
          </section>

          {/* Verified suppliers */}
          <section>
            <div className="wy-row-header wy-reveal">
              <div className="wy-row-title">{t('featuredSuppliers')}</div>
              <button className="wy-row-link" onClick={() => navigate('/suppliers')}>
                All <ChevronRight size={14} />
              </button>
            </div>

            <div className="wy-supplier-scroll">
              {suppliers.slice(0, 8).map((supplier, i) => (
                <div
                  key={supplier.id}
                  className={`wy-supplier-card wy-reveal wy-reveal-d${Math.min(i + 1, 5)}`}
                  onClick={() => navigate(`/supplier/${supplier.id}`)}
                >
                  <div className="wy-supplier-avatar">
                    {supplier.avatar_url
                      ? <img src={supplier.avatar_url} alt={supplier.business_name} />
                      : supplier.business_name?.[0]
                    }
                  </div>
                  <div className="wy-supplier-name">{supplier.business_name}</div>
                  <div className="wy-supplier-city"><MapPin size={10} /> {supplier.city}</div>
                  {supplier.rating > 0 && (
                    <div className="wy-supplier-rating">★ {Number(supplier.rating).toFixed(1)}</div>
                  )}
                  <div className="wy-halal-badge">
                    <CheckCircle size={10} /> {t('halalCertified')}
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && <div className="wy-empty-state">{t('noSuppliersYet')}</div>}
            </div>
          </section>

          {/* How it works */}
          <section style={{ paddingBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--wy-ff-display)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 32 }} className="wy-reveal">
              {t('howItWorks')}
            </h2>
            <div className="wy-cards-grid">
              {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className={`wy-card wy-reveal wy-reveal-d${i + 1}`}>
                  <div className="wy-card-icon">
                    <Icon size={24} />
                    <span className="wy-card-num">{i + 1}</span>
                  </div>
                  <h3 className="wy-card-title">{title}</h3>
                  <p className="wy-card-desc">{desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ── CTA / mobile app section ── */}
        <section className="wy-cta-section">
          {/* Same rising-orb animation as hero — offset positions/delays for visual variety */}
          <div className="wy-orb" style={{ left: '8%',  width: 160, height: 160, background: '#A58D66', animationDelay: '-3s',   filter: 'blur(40px)' }} />
          <div className="wy-orb" style={{ left: '58%', width: 144, height: 144, background: '#5E96A4', animationDelay: '-10s',  filter: 'blur(36px)' }} />
          <div className="wy-orb" style={{ left: '32%', width: 136, height: 136, background: '#C0D5D6', animationDelay: '-17s',  filter: 'blur(34px)' }} />
          <div className="wy-orb" style={{ left: '74%', width: 150, height: 150, background: '#BFA988', animationDelay: '-24s',  filter: 'blur(38px)' }} />
          <div className="wy-orb" style={{ left: '44%', width: 120, height: 120, background: '#B07B8B', animationDelay: '-6s',   filter: 'blur(30px)' }} />
          <div className="wy-orb" style={{ left: '84%', width: 136, height: 136, background: '#B19CD9', animationDelay: '-13s',  filter: 'blur(34px)' }} />

          <div className="wy-cta-overlay" />

          <div className="wy-cta-inner wy-reveal">
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(192,213,214,0.6)', marginBottom: 14 }}>
              {t('mobileComingToMobile')}
            </p>
            <h2 className="wy-cta-title">{t('mobileTakeEverywhere')}</h2>
            <p className="wy-cta-sub">{t('mobileTagline')}</p>

            <div className="wy-app-btns">
              <button className="wy-app-btn" onClick={() => setShowComingSoon(true)}>
                <svg width="20" height="24" viewBox="0 0 24 28" fill="#fff">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" transform="scale(1 1.15) translate(0 -1)" />
                </svg>
                <div className="text-left">
                  <span className="wy-app-btn-text-sm">{t('mobileDownloadOn')}</span>
                  <span className="wy-app-btn-text">App Store</span>
                </div>
              </button>

              <button className="wy-app-btn" onClick={() => setShowComingSoon(true)}>
                <svg width="20" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186A1.55 1.55 0 013 21V3c0-.47.216-.892.609-1.186z" fill="#EA4335"/>
                  <path d="M20.453 10.62l-2.815-1.618L14.207 12l3.431 3 2.815-1.619A1.55 1.55 0 0021 12a1.55 1.55 0 00-.547-1.38z" fill="#FBBC04"/>
                  <path d="M3.609 1.814A1.55 1.55 0 014.86 1.71l12.778 7.292L14.207 12z" fill="#4285F4"/>
                  <path d="M4.86 22.29a1.55 1.55 0 01-1.25-.104L14.207 12l3.431 3z" fill="#34A853"/>
                </svg>
                <div className="text-left">
                  <span className="wy-app-btn-text-sm">{t('mobileGetItOn')}</span>
                  <span className="wy-app-btn-text">Google Play</span>
                </div>
              </button>

              <button className="wy-app-btn" onClick={() => setShowComingSoon(true)}>
                <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                  <ellipse cx="50" cy="26" rx="12" ry="24" fill="#CF0A2C"/>
                  <ellipse cx="74" cy="50" rx="24" ry="12" fill="#FF6D00"/>
                  <ellipse cx="50" cy="74" rx="12" ry="24" fill="#CF0A2C"/>
                  <ellipse cx="26" cy="50" rx="24" ry="12" fill="#FF3A00"/>
                </svg>
                <div className="text-left">
                  <span className="wy-app-btn-text-sm">{t('mobileExploreOn')}</span>
                  <span className="wy-app-btn-text">AppGallery</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ── footer ── */}
        <footer className="wy-footer">
          <div className="wy-footer-grid">
            <div>
              <span className="wy-footer-logo">ProCuro</span>
              <p className="wy-footer-tagline">{t('heroSubtitle')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[TrendingUp, Users, ShoppingBag].map((Icon, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color="rgba(192,213,214,0.5)" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('products')}</div>
              <button className="wy-footer-link" onClick={() => navigate('/products')}>{t('featuredProducts')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/suppliers')}>{t('featuredSuppliers')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/register')}>{t('getStarted')}</button>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('about')}</div>
              <button className="wy-footer-link" onClick={() => navigate('/about')}>{t('about')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/help')}>{t('help')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/privacy')}>{t('privacyPolicy')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/terms')}>{t('termsOfService')}</button>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('suppliers')}</div>
              <button className="wy-footer-link" onClick={() => navigate('/register/supplier')}>{t('registerAsSupplier')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/login')}>{t('login')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/help')}>{t('help')}</button>
            </div>
          </div>
          <div className="wy-footer-bottom">
            <div className="wy-footer-copy">© 2025 ProCuro. {t('allRightsReserved') || 'All rights reserved.'}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button className="wy-footer-link" style={{ margin: 0 }} onClick={() => navigate('/privacy')}>{t('privacyPolicy')}</button>
              <button className="wy-footer-link" style={{ margin: 0 }} onClick={() => navigate('/terms')}>{t('termsOfService')}</button>
            </div>
          </div>
        </footer>

        {/* ── coming soon modal ── */}
        {showComingSoon && (
          <div className="wy-modal-overlay" onClick={() => setShowComingSoon(false)}>
            <div className="wy-modal" onClick={e => e.stopPropagation()}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E5E1DD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Rocket size={24} color="#083A4F" />
              </div>
              <div className="wy-modal-title">{t('comingSoonTitle')}</div>
              <div className="wy-modal-sub">{t('comingSoonDesc')}</div>
              <button className="wy-btn-modal" onClick={() => setShowComingSoon(false)}>OK</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
