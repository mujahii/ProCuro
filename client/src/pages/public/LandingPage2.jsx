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
  { name: 'Meat',       icon: Beef,     labelKey: 'catMeat' },
  { name: 'Poultry',    icon: Drumstick,labelKey: 'catPoultry' },
  { name: 'Seafood',    icon: Fish,     labelKey: 'catSeafood' },
  { name: 'Dairy',      icon: Milk,     labelKey: 'catDairy' },
  { name: 'Vegetables', icon: Leaf,     labelKey: 'catVegetables' },
  { name: 'Fruits',     icon: Apple,    labelKey: 'catFruits' },
  { name: 'Bakery',     icon: Wheat,    labelKey: 'catBakery' },
  { name: 'Beverages',  icon: Coffee,   labelKey: 'catBeverages' },
  { name: 'Spices',     icon: Flame,    labelKey: 'catSpices' },
  { name: 'Other',      icon: Package,  labelKey: 'catOther' },
]

const STAT_TARGETS = [
  { target: 28,  suffix: '+', labelKey: 'statsRestaurants',      decimal: false },
  { target: 12,  suffix: '+', labelKey: 'statsVerifiedSuppliers', decimal: false },
  { target: 850, suffix: '+', labelKey: 'statsOrdersPlaced',      decimal: false },
  { target: 4.9, suffix: '★', labelKey: 'statsAverageRating',    decimal: true  },
]

/* ─── scoped Webyan styles (wy- prefix) ─────────────────────────── */
const WY_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── tokens ── */
:root {
  --wy-navy:         #263c84;
  --wy-navy-mid:     #1e3070;
  --wy-navy-deep:    #162358;
  --wy-navy-darkest: #0f1a3e;
  --wy-cyan:         #24c2ec;
  --wy-cyan-light:   #5dd3f5;
  --wy-cyan-pale:    #e8f8fd;
  --wy-white:        #ffffff;
  --wy-surface:      #f4f8ff;
  --wy-border:       #dce6f5;
  --wy-text:         #1a2340;
  --wy-muted:        #5a6a8a;
  --wy-grad-hero:    linear-gradient(135deg, #162358 0%, #1e3070 45%, #263c84 100%);
  --wy-grad-cta:     linear-gradient(90deg, #263c84 0%, #24c2ec 100%);
  --wy-grad-text:    linear-gradient(90deg, #263c84, #24c2ec);
  --wy-shadow-sm:    0 1px 3px rgba(38,60,132,0.08);
  --wy-shadow-md:    0 4px 16px rgba(38,60,132,0.12);
  --wy-shadow-lg:    0 12px 40px rgba(38,60,132,0.18);
  --wy-shadow-xl:    0 24px 60px rgba(38,60,132,0.25);
  --wy-radius-sm:    8px;
  --wy-radius-md:    14px;
  --wy-radius-lg:    22px;
  --wy-radius-xl:    32px;
  --wy-ease:         cubic-bezier(0.22, 1, 0.36, 1);
  --wy-ff-display:   'Plus Jakarta Sans', sans-serif;
  --wy-ff-body:      'IBM Plex Sans', sans-serif;
}

/* ── reset wrapper ── */
.wy-root {
  font-family: var(--wy-ff-body);
  color: var(--wy-text);
  min-height: 100vh;
  background: var(--wy-surface);
  overflow-x: hidden;
}
.wy-root * { box-sizing: border-box; }

/* ── header ── */
.wy-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 999;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid transparent;
  transition: box-shadow 0.3s var(--wy-ease), border-color 0.3s var(--wy-ease), background 0.3s var(--wy-ease);
}
.wy-header.wy-scrolled {
  background: rgba(255,255,255,0.96);
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
  gap: 6px;
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
.wy-nav-link:hover { color: var(--wy-navy); background: var(--wy-cyan-pale); }
.wy-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.wy-btn-login {
  font-family: var(--wy-ff-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--wy-navy);
  background: none;
  border: 2px solid var(--wy-border);
  padding: 8px 20px;
  border-radius: 50px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.wy-btn-login:hover { border-color: var(--wy-navy); }
.wy-btn-header-cta {
  font-family: var(--wy-ff-body);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--wy-grad-cta);
  border: none;
  padding: 9px 22px;
  border-radius: 50px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 4px 14px rgba(36,194,236,0.35);
}
.wy-btn-header-cta:hover { opacity: 0.9; transform: translateY(-1px); }

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
  background: var(--wy-navy);
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s;
}
.wy-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15,26,62,0.5);
  z-index: 1098;
  opacity: 0;
  transition: opacity 0.3s;
}
.wy-mobile-overlay.wy-open { opacity: 1; }
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
  top: 20px;
  right: 20px;
  background: var(--wy-surface);
  border: none;
  width: 36px;
  height: 36px;
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
.wy-drawer-link:hover { background: var(--wy-cyan-pale); color: var(--wy-navy); }

/* ── hero ── */
.wy-hero {
  padding: 148px 24px 90px;
  background: var(--wy-grad-hero);
  position: relative;
  overflow: hidden;
}
.wy-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 60% at 20% 50%, rgba(36,194,236,0.15) 0%, transparent 60%),
    radial-gradient(ellipse 55% 50% at 80% 30%, rgba(38,60,132,0.4) 0%, transparent 60%);
  pointer-events: none;
}
.wy-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
.wy-hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.wy-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(36,194,236,0.15);
  border: 1px solid rgba(36,194,236,0.4);
  color: var(--wy-cyan-light);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px 6px 8px;
  border-radius: 50px;
  margin-bottom: 22px;
  font-family: var(--wy-ff-body);
}
.wy-eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wy-cyan);
  animation: wy-pulse 2s ease-in-out infinite;
}
@keyframes wy-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.75); }
}
.wy-hero-h1 {
  font-family: var(--wy-ff-display);
  font-size: clamp(36px, 5vw, 58px);
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  margin: 0 0 20px;
  letter-spacing: -1px;
}
.wy-hero-h1 em {
  font-style: normal;
  background: var(--wy-grad-cta);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.wy-hero-sub {
  font-size: 17px;
  line-height: 1.65;
  color: rgba(255,255,255,0.72);
  margin: 0 0 36px;
  max-width: 480px;
}
.wy-hero-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}
.wy-btn-primary {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  background: var(--wy-grad-cta);
  border: none;
  padding: 14px 30px;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(36,194,236,0.4);
  transition: transform 0.2s, opacity 0.2s;
}
.wy-btn-primary:hover { transform: translateY(-2px); opacity: 0.92; }
.wy-btn-ghost {
  font-family: var(--wy-ff-body);
  font-weight: 600;
  font-size: 15px;
  color: rgba(255,255,255,0.88);
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.25);
  padding: 13px 26px;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}
.wy-btn-ghost:hover {
  background: rgba(255,255,255,0.18);
  border-color: rgba(255,255,255,0.5);
}
.wy-hero-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.wy-trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  font-family: var(--wy-ff-body);
}
.wy-trust-badge svg { color: var(--wy-cyan); }

/* ── hero visual (right column) ── */
.wy-hero-visual {
  perspective: 1400px;
}
.wy-mockup-wrap {
  transform: rotateY(-6deg) rotateX(3deg);
  transform-style: preserve-3d;
  transition: transform 0.6s var(--wy-ease);
  animation: wy-float 6s ease-in-out infinite;
}
.wy-hero-visual:hover .wy-mockup-wrap {
  transform: rotateY(0deg) rotateX(0deg);
}
@keyframes wy-float {
  0%, 100% { transform: rotateY(-6deg) rotateX(3deg) translateY(0px); }
  50%       { transform: rotateY(-6deg) rotateX(3deg) translateY(-12px); }
}
.wy-mockup-card {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--wy-radius-lg);
  padding: 24px;
  backdrop-filter: blur(10px);
  box-shadow:
    0 32px 80px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.12);
  overflow: hidden;
}
.wy-mockup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.wy-mockup-title {
  font-family: var(--wy-ff-display);
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
}
.wy-mockup-badge {
  background: rgba(36,194,236,0.2);
  border: 1px solid rgba(36,194,236,0.4);
  color: var(--wy-cyan-light);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 50px;
}
.wy-mockup-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
}
.wy-mockup-stat {
  background: rgba(255,255,255,0.07);
  border-radius: var(--wy-radius-sm);
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
}
.wy-mockup-stat-value {
  font-family: var(--wy-ff-display);
  font-size: 22px;
  font-weight: 800;
  background: var(--wy-grad-cta);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 4px;
}
.wy-mockup-stat-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
}
.wy-mockup-list { display: flex; flex-direction: column; gap: 10px; }
.wy-mockup-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  border-radius: var(--wy-radius-sm);
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.07);
}
.wy-mockup-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--wy-grad-cta);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.wy-mockup-row-info { flex: 1; min-width: 0; }
.wy-mockup-row-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wy-mockup-row-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.45);
  margin-top: 2px;
}
.wy-mockup-row-price {
  font-size: 12px;
  font-weight: 700;
  color: var(--wy-cyan-light);
  white-space: nowrap;
}

/* ── stats bar ── */
.wy-stats-bar {
  background: #fff;
  border-top: 1px solid var(--wy-border);
  border-bottom: 1px solid var(--wy-border);
  padding: 28px 24px;
}
.wy-stats-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  text-align: center;
}
.wy-stat-divider {
  border-right: 1px solid var(--wy-border);
}
.wy-stat-divider:last-child { border-right: none; }
.wy-stat-value {
  font-family: var(--wy-ff-display);
  font-size: 34px;
  font-weight: 800;
  background: var(--wy-grad-cta);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
}
.wy-stat-label {
  font-size: 13px;
  color: var(--wy-muted);
  margin-top: 4px;
  font-weight: 500;
}

/* ── section layout ── */
.wy-section {
  padding: 72px 24px;
}
.wy-section--alt { background: #fff; }
.wy-section-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.wy-section-header {
  text-align: center;
  margin-bottom: 52px;
}
.wy-section-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--wy-cyan);
  margin-bottom: 12px;
}
.wy-section-title {
  font-family: var(--wy-ff-display);
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 800;
  color: var(--wy-text);
  margin: 0 0 14px;
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
  font-size: 16px;
  color: var(--wy-muted);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.65;
}

/* ── cards grid (how it works) ── */
.wy-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.wy-card {
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: var(--wy-radius-lg);
  padding: 32px 28px;
  transition: transform 0.3s var(--wy-ease), box-shadow 0.3s var(--wy-ease), border-color 0.3s;
}
.wy-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--wy-shadow-lg);
  border-color: rgba(36,194,236,0.3);
}
.wy-card-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--wy-radius-md);
  background: var(--wy-cyan-pale);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: var(--wy-navy);
  flex-shrink: 0;
  transition: background 0.3s;
}
.wy-card:hover .wy-card-icon { background: rgba(36,194,236,0.2); }
.wy-card-step {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--wy-cyan);
  margin-bottom: 8px;
}
.wy-card-title {
  font-family: var(--wy-ff-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--wy-text);
  margin: 0 0 10px;
}
.wy-card-desc {
  font-size: 14px;
  color: var(--wy-muted);
  line-height: 1.65;
  margin: 0;
}

/* ── category filter ── */
.wy-category-filter {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  padding-bottom: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
.wy-category-filter::-webkit-scrollbar { display: none; }
.wy-cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  flex-shrink: 0;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.wy-cat-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: var(--wy-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--wy-border);
  background: #fff;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  color: var(--wy-muted);
}
.wy-cat-chip:hover .wy-cat-icon-wrap {
  border-color: var(--wy-cyan);
  box-shadow: 0 0 0 3px rgba(36,194,236,0.1);
  color: var(--wy-navy);
}
.wy-cat-icon-wrap.wy-active {
  background: var(--wy-grad-cta);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(36,194,236,0.4);
}
.wy-cat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--wy-muted);
  white-space: nowrap;
  transition: color 0.2s;
}
.wy-cat-chip:hover .wy-cat-label { color: var(--wy-navy); }
.wy-cat-chip.wy-cat-active .wy-cat-label { color: var(--wy-navy); font-weight: 700; }

/* ── section row header ── */
.wy-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.wy-row-title {
  font-family: var(--wy-ff-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--wy-text);
}
.wy-row-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--wy-navy);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 50px;
  border: 1px solid var(--wy-border);
  transition: background 0.2s, border-color 0.2s;
  font-family: var(--wy-ff-body);
}
.wy-row-link:hover { background: var(--wy-cyan-pale); border-color: var(--wy-cyan); }

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
  width: 250px;
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: var(--wy-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s var(--wy-ease), box-shadow 0.3s;
}
.wy-product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--wy-shadow-lg);
}
.wy-product-img {
  height: 150px;
  background: var(--wy-surface);
  position: relative;
  overflow: hidden;
}
.wy-product-img img { width: 100%; height: 100%; object-fit: cover; }
.wy-product-cat-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(4px);
  font-size: 10px;
  font-weight: 700;
  color: var(--wy-navy);
  padding: 3px 9px;
  border-radius: 50px;
  box-shadow: var(--wy-shadow-sm);
}
.wy-product-discount {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #e53e3e;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 5px;
}
.wy-product-body { padding: 16px; }
.wy-product-name {
  font-family: var(--wy-ff-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--wy-text);
  margin: 0 0 4px;
}
.wy-product-desc {
  font-size: 12px;
  color: var(--wy-muted);
  margin: 0 0 4px;
}
.wy-product-supplier {
  font-size: 11px;
  font-weight: 700;
  color: var(--wy-navy);
  margin: 0 0 12px;
}
.wy-product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wy-product-price {
  font-family: var(--wy-ff-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--wy-text);
}
.wy-product-unit {
  font-size: 11px;
  color: var(--wy-muted);
  font-weight: 400;
  margin-left: 3px;
}
.wy-btn-cart {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--wy-grad-cta);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(36,194,236,0.4);
  transition: transform 0.2s, opacity 0.2s;
  flex-shrink: 0;
}
.wy-btn-cart:hover { transform: scale(1.1); opacity: 0.9; }
.wy-empty-state {
  padding: 40px 0;
  color: var(--wy-muted);
  font-size: 14px;
  text-align: center;
  width: 100%;
}

/* ── supplier grid ── */
.wy-supplier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 18px;
}
.wy-supplier-card {
  background: #fff;
  border: 1px solid var(--wy-border);
  border-radius: var(--wy-radius-lg);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s var(--wy-ease), box-shadow 0.3s, border-color 0.3s;
}
.wy-supplier-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--wy-shadow-lg);
  border-color: rgba(36,194,236,0.35);
}
.wy-supplier-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--wy-surface);
  border: 2px solid var(--wy-border);
  margin-bottom: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--wy-ff-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--wy-navy);
}
.wy-supplier-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wy-supplier-name {
  font-family: var(--wy-ff-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--wy-text);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.wy-supplier-city {
  font-size: 11px;
  color: var(--wy-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-bottom: 8px;
}
.wy-supplier-rating {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 8px;
}
.wy-halal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--wy-cyan-pale);
  color: var(--wy-navy);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 50px;
  border: 1px solid rgba(36,194,236,0.3);
}

/* ── CTA banner ── */
.wy-cta-section {
  background: var(--wy-grad-hero);
  padding: 80px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.wy-cta-section::before {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(36,194,236,0.18) 0%, transparent 60%);
  top: -200px;
  left: -100px;
  pointer-events: none;
}
.wy-cta-section::after {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(36,194,236,0.12) 0%, transparent 60%);
  bottom: -150px;
  right: -50px;
  pointer-events: none;
}
.wy-cta-inner { max-width: 700px; margin: 0 auto; position: relative; z-index: 1; }
.wy-cta-title {
  font-family: var(--wy-ff-display);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.wy-cta-sub {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  margin: 0 0 36px;
  line-height: 1.65;
}
.wy-cta-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
.wy-btn-white {
  font-family: var(--wy-ff-body);
  font-weight: 700;
  font-size: 15px;
  color: var(--wy-navy);
  background: #fff;
  border: none;
  padding: 14px 30px;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}
.wy-btn-white:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.2); }
.wy-btn-white-outline {
  font-family: var(--wy-ff-body);
  font-weight: 600;
  font-size: 15px;
  color: rgba(255,255,255,0.88);
  background: transparent;
  border: 2px solid rgba(255,255,255,0.35);
  padding: 13px 26px;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s, border-color 0.2s;
}
.wy-btn-white-outline:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.6);
}

/* ── app store buttons ── */
.wy-app-btns {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 40px;
}
.wy-app-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: 10px 20px;
  border-radius: var(--wy-radius-md);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  font-family: var(--wy-ff-body);
}
.wy-app-btn:hover { background: rgba(255,255,255,0.18); transform: translateY(-2px); }
.wy-app-btn-text-sm { font-size: 9px; color: rgba(255,255,255,0.7); display: block; line-height: 1; margin-bottom: 3px; }
.wy-app-btn-text { font-size: 14px; font-weight: 600; display: block; line-height: 1; color: #fff; }

/* ── footer ── */
.wy-footer {
  background: var(--wy-navy-darkest);
  padding: 60px 24px 0;
  color: rgba(255,255,255,0.65);
}
.wy-footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 48px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.wy-footer-brand {}
.wy-footer-logo {
  font-family: var(--wy-ff-display);
  font-size: 24px;
  font-weight: 800;
  background: var(--wy-grad-cta);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  display: block;
}
.wy-footer-tagline {
  font-size: 14px;
  line-height: 1.65;
  margin-bottom: 20px;
  max-width: 280px;
}
.wy-footer-col-title {
  font-family: var(--wy-ff-display);
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.wy-footer-link {
  display: block;
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  margin-bottom: 10px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font-family: var(--wy-ff-body);
  transition: color 0.2s;
  width: 100%;
}
.wy-footer-link:hover { color: var(--wy-cyan); }
.wy-footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.wy-footer-copy { font-size: 12px; color: rgba(255,255,255,0.35); }

/* ── scroll reveal ── */
.wy-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.6s var(--wy-ease), transform 0.6s var(--wy-ease);
}
.wy-reveal--visible {
  opacity: 1;
  transform: translateY(0);
}
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
  background: rgba(15,26,62,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.wy-modal {
  background: #fff;
  border-radius: var(--wy-radius-xl);
  padding: 40px 32px;
  max-width: 340px;
  width: 100%;
  text-align: center;
  box-shadow: var(--wy-shadow-xl);
}
.wy-modal-title {
  font-family: var(--wy-ff-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--wy-text);
  margin: 16px 0 8px;
}
.wy-modal-sub { font-size: 14px; color: var(--wy-muted); margin-bottom: 24px; line-height: 1.6; }
.wy-btn-modal {
  width: 100%;
  background: var(--wy-grad-cta);
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  font-family: var(--wy-ff-body);
}

/* ── responsive ── */
@media (max-width: 1024px) {
  .wy-cards-grid { grid-template-columns: 1fr 1fr; }
  .wy-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
}
@media (max-width: 900px) {
  .wy-header-nav { display: none; }
  .wy-header-actions .wy-btn-login { display: none; }
  .wy-header-actions .wy-btn-header-cta { display: none; }
  .wy-mobile-toggle { display: flex; }
  .wy-mobile-overlay { display: block; }
  .wy-hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .wy-hero { padding: 120px 24px 60px; }
  .wy-hero-visual { display: none; }
  .wy-stats-inner { grid-template-columns: 1fr 1fr; }
  .wy-stat-divider:nth-child(2n) { border-right: none; }
  .wy-stat-divider:nth-child(2) { border-bottom: 1px solid var(--wy-border); padding-bottom: 16px; }
  .wy-stat-divider:nth-child(1) { border-bottom: 1px solid var(--wy-border); padding-bottom: 16px; }
}
@media (max-width: 640px) {
  .wy-cards-grid { grid-template-columns: 1fr; }
  .wy-footer-grid { grid-template-columns: 1fr; gap: 28px; }
  .wy-footer-bottom { flex-direction: column; text-align: center; }
  .wy-supplier-grid { grid-template-columns: repeat(2, 1fr); }
  .wy-section { padding: 52px 20px; }
  .wy-hero-h1 { font-size: 30px; }
}
`

/* ─── useCountUp hook ─────────────────────────────────────────── */
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

/* ─── StatsBar ───────────────────────────────────────────────── */
/* StatCounter uses useCountUp as a proper hook (not inside .map) */
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
export default function LandingPage2() {
  const navigate = useNavigate()
  const { user, authUser, role, loading } = useAuth()
  const { t } = useLanguage()

  const [selectedCategory, setSelectedCategory]   = useState('All')
  const [showComingSoon, setShowComingSoon]         = useState(false)
  const [drawerOpen, setDrawerOpen]                = useState(false)
  const [scrolled, setScrolled]                    = useState(false)
  const [products, setProducts]                    = useState([])
  const [suppliers, setSuppliers]                  = useState([])

  const HOW_IT_WORKS = [
    { icon: Shield,  step: '01', title: t('howItWorksStep1Title'), desc: t('howItWorksStep1Desc') },
    { icon: Package, step: '02', title: t('howItWorksStep2Title'), desc: t('howItWorksStep2Desc') },
    { icon: Truck,   step: '03', title: t('howItWorksStep3Title'), desc: t('howItWorksStep3Desc') },
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

  /* data */
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

  /* scroll header */
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

  /* lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  /* ── render ── */
  return (
    <>
      <style>{WY_STYLES}</style>

      <div className="wy-root">

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
              <button className="wy-btn-login" onClick={() => navigate('/login')}>{t('login')}</button>
              <button className="wy-btn-header-cta" onClick={() => navigate('/register')}>
                {t('getStarted')}
              </button>
              <button
                className="wy-mobile-toggle"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <span /><span /><span />
              </button>
            </div>
          </div>
        </header>

        {/* ── mobile drawer ── */}
        <div
          className={`wy-mobile-overlay${drawerOpen ? ' wy-open' : ''}`}
          onClick={() => setDrawerOpen(false)}
        />
        <div className={`wy-mobile-drawer${drawerOpen ? ' wy-open' : ''}`}>
          <button className="wy-drawer-close" onClick={() => setDrawerOpen(false)}>
            <X size={18} color="var(--wy-navy)" />
          </button>
          <button className="wy-drawer-link" onClick={() => { navigate('/products'); setDrawerOpen(false) }}>{t('products')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/suppliers'); setDrawerOpen(false) }}>{t('suppliers')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/about'); setDrawerOpen(false) }}>{t('about')}</button>
          <button className="wy-drawer-link" onClick={() => { navigate('/help'); setDrawerOpen(false) }}>{t('help')}</button>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="wy-btn-login" style={{ width: '100%' }} onClick={() => { navigate('/login'); setDrawerOpen(false) }}>{t('login')}</button>
            <button className="wy-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { navigate('/register'); setDrawerOpen(false) }}>{t('getStarted')}</button>
          </div>
        </div>

        {/* ── hero ── */}
        <section className="wy-hero">
          <div className="wy-hero-inner">
            {/* left column */}
            <div>
              <div className="wy-eyebrow">
                <span className="wy-eyebrow-dot" />
                <CheckCircle size={13} />
                {t('heroTagline')}
              </div>

              <h1 className="wy-hero-h1">
                {t('heroTitle').split(' ').slice(0, 3).join(' ')}{' '}
                <em>{t('heroTitle').split(' ').slice(3).join(' ')}</em>
              </h1>

              <p className="wy-hero-sub">{t('heroSubtitle')}</p>

              <div className="wy-hero-actions">
                <button className="wy-btn-primary" onClick={() => navigate('/register')}>
                  {t('getStarted')} <ArrowRight size={16} />
                </button>
                <button className="wy-btn-ghost" onClick={() => navigate('/suppliers')}>
                  {t('browseSuppliers')}
                </button>
              </div>

              <div className="wy-hero-trust">
                <span className="wy-trust-badge"><CheckCircle size={13} /> {t('gdprCompliant')}</span>
                <span className="wy-trust-badge"><CheckCircle size={13} /> {t('halalVerifiedBadge')}</span>
                <span className="wy-trust-badge"><CheckCircle size={13} /> {t('noHiddenFees')}</span>
              </div>
            </div>

            {/* right column — animated mockup card */}
            <div className="wy-hero-visual">
              <div className="wy-mockup-wrap">
                <div className="wy-mockup-card">
                  <div className="wy-mockup-header">
                    <span className="wy-mockup-title">ProCuro Dashboard</span>
                    <span className="wy-mockup-badge">Live</span>
                  </div>

                  <div className="wy-mockup-stats">
                    <div className="wy-mockup-stat">
                      <div className="wy-mockup-stat-value">850+</div>
                      <div className="wy-mockup-stat-label">{t('statsOrdersPlaced')}</div>
                    </div>
                    <div className="wy-mockup-stat">
                      <div className="wy-mockup-stat-value">4.9★</div>
                      <div className="wy-mockup-stat-label">{t('statsAverageRating')}</div>
                    </div>
                    <div className="wy-mockup-stat">
                      <div className="wy-mockup-stat-value">12+</div>
                      <div className="wy-mockup-stat-label">{t('statsVerifiedSuppliers')}</div>
                    </div>
                    <div className="wy-mockup-stat">
                      <div className="wy-mockup-stat-value">28+</div>
                      <div className="wy-mockup-stat-label">{t('statsRestaurants')}</div>
                    </div>
                  </div>

                  <div className="wy-mockup-list">
                    {[
                      { init: 'AH', name: 'Al-Halal Meats GmbH', city: 'Berlin', price: '€12.50/kg' },
                      { init: 'BF', name: 'BioFresh Poultry', city: 'Munich', price: '€8.90/kg' },
                      { init: 'GS', name: 'GourmetSeafood Co.', city: 'Hamburg', price: '€22.00/kg' },
                    ].map(r => (
                      <div key={r.init} className="wy-mockup-row">
                        <div className="wy-mockup-avatar">{r.init}</div>
                        <div className="wy-mockup-row-info">
                          <div className="wy-mockup-row-name">{r.name}</div>
                          <div className="wy-mockup-row-sub">{r.city}</div>
                        </div>
                        <div className="wy-mockup-row-price">{r.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── stats bar ── */}
        <WyStatsBar />

        {/* ── how it works ── */}
        <section className="wy-section wy-section--alt">
          <div className="wy-section-inner">
            <div className="wy-section-header wy-reveal">
              <div className="wy-section-eyebrow">{t('howItWorks')}</div>
              <h2 className="wy-section-title">
                {t('howItWorks').split(' ').slice(0, 2).join(' ')}{' '}
                <em>{t('howItWorks').split(' ').slice(2).join(' ') || 'ProCuro'}</em>
              </h2>
              <p className="wy-section-sub">{t('heroSubtitle')}</p>
            </div>

            <div className="wy-cards-grid">
              {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }, i) => (
                <div key={title} className={`wy-card wy-reveal wy-reveal-d${i + 1}`}>
                  <div className="wy-card-icon"><Icon size={24} /></div>
                  <div className="wy-card-step">Step {step}</div>
                  <h3 className="wy-card-title">{title}</h3>
                  <p className="wy-card-desc">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── featured products ── */}
        <section className="wy-section">
          <div className="wy-section-inner">
            {/* category filter */}
            <div className="wy-reveal" style={{ marginBottom: 28 }}>
              <div className="wy-category-filter">
                {[{ name: 'All', icon: Package, labelKey: 'catAll' }, ...CATEGORIES].map(({ name, icon: Icon, labelKey }) => (
                  <div
                    key={name}
                    className={`wy-cat-chip${selectedCategory === name ? ' wy-cat-active' : ''}`}
                    onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
                  >
                    <div className={`wy-cat-icon-wrap${selectedCategory === name ? ' wy-active' : ''}`}>
                      <Icon size={24} />
                    </div>
                    <span className="wy-cat-label">{t(labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wy-row-header wy-reveal">
              <div className="wy-row-title">{getCategoryLabel(selectedCategory)}</div>
              <button className="wy-row-link" onClick={() => navigate('/products')}>
                {t('all') || 'All'} <ChevronRight size={14} />
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
                        : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={36} color="var(--wy-border)" />
                          </div>
                        )
                      }
                      <div className="wy-product-cat-badge">{product.category}</div>
                      {product.discount_percent > 0 && (
                        <div className="wy-product-discount">-{product.discount_percent}%</div>
                      )}
                    </div>
                    <div className="wy-product-body">
                      <div className="wy-product-name">{product.name}</div>
                      {product.description && (
                        <div className="wy-product-desc">{product.description.substring(0, 45)}…</div>
                      )}
                      <div className="wy-product-supplier">{product.supplier?.business_name}</div>
                      <div className="wy-product-footer">
                        <div>
                          <span className="wy-product-price">€{Number(product.price).toFixed(2)}</span>
                          <span className="wy-product-unit">/ {product.unit_type}</span>
                        </div>
                        <button
                          className="wy-btn-cart"
                          onClick={e => { e.stopPropagation(); navigate('/login') }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {products.length === 0 && (
                <div className="wy-empty-state">{t('noProductsFound')}</div>
              )}
            </div>
          </div>
        </section>

        {/* ── verified suppliers ── */}
        <section className="wy-section wy-section--alt">
          <div className="wy-section-inner">
            <div className="wy-row-header wy-reveal">
              <div className="wy-row-title">{t('featuredSuppliers')}</div>
              <button className="wy-row-link" onClick={() => navigate('/suppliers')}>
                {t('all') || 'All'} <ChevronRight size={14} />
              </button>
            </div>

            <div className="wy-supplier-grid">
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
                  <div className="wy-supplier-city">
                    <MapPin size={10} /> {supplier.city}
                  </div>
                  {supplier.rating > 0 && (
                    <div className="wy-supplier-rating">
                      <Star size={10} fill="#f59e0b" /> {Number(supplier.rating).toFixed(1)}
                    </div>
                  )}
                  <div className="wy-halal-badge">
                    <CheckCircle size={10} /> {t('halalCertified')}
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="wy-empty-state" style={{ gridColumn: '1 / -1' }}>{t('noSuppliersYet')}</div>
              )}
            </div>
          </div>
        </section>

        {/* ── CTA banner ── */}
        <section className="wy-cta-section">
          <div className="wy-cta-inner wy-reveal">
            <div className="wy-section-eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
              {t('mobileComingToMobile')}
            </div>
            <h2 className="wy-cta-title">{t('mobileTakeEverywhere')}</h2>
            <p className="wy-cta-sub">{t('mobileTagline')}</p>

            <div className="wy-cta-actions">
              <button className="wy-btn-white" onClick={() => navigate('/register')}>
                <Rocket size={16} /> {t('getStarted')}
              </button>
              <button className="wy-btn-white-outline" onClick={() => navigate('/suppliers')}>
                {t('browseSuppliers')}
              </button>
            </div>

            {/* App store buttons */}
            <div className="wy-app-btns">
              <button className="wy-app-btn" onClick={() => setShowComingSoon(true)}>
                <svg width="20" height="24" viewBox="0 0 24 28" fill="#fff">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" transform="scale(1 1.15) translate(0 -1)" />
                </svg>
                <div>
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
                <div>
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
                <div>
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
            <div className="wy-footer-brand">
              <span className="wy-footer-logo">ProCuro</span>
              <p className="wy-footer-tagline">{t('heroSubtitle')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[TrendingUp, Users, ShoppingBag].map((Icon, i) => (
                  <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color="rgba(255,255,255,0.5)" />
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
              <button className="wy-footer-link" onClick={() => navigate('/help')}>{t('helpCenter') || t('help')}</button>
            </div>
          </div>

          <div className="wy-footer-bottom">
            <div className="wy-footer-copy">© 2025 ProCuro. {t('allRightsReserved') || 'All rights reserved.'}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="wy-footer-link" style={{ margin: 0 }} onClick={() => navigate('/privacy')}>{t('privacyPolicy')}</button>
              <button className="wy-footer-link" style={{ margin: 0 }} onClick={() => navigate('/terms')}>{t('termsOfService')}</button>
            </div>
          </div>
        </footer>

        {/* ── coming soon modal ── */}
        {showComingSoon && (
          <div className="wy-modal-overlay" onClick={() => setShowComingSoon(false)}>
            <div className="wy-modal" onClick={e => e.stopPropagation()}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--wy-cyan-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Rocket size={26} color="var(--wy-navy)" />
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
