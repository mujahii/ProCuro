import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, MapPin, ChevronRight, Drumstick, Beef, Leaf, Coffee, Apple,
  Package, Truck, Shield, Fish, Milk, Flame, Wheat, Plus, Rocket,
  X, TrendingUp, Users, ShoppingBag, Mail, Phone
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import MeshHeroBackground from '../../components/public/MeshHeroBackground'
import './landing.css'

/* ─── module-level cache (survives component unmount/remount) ─── */
const _cache = { products: {}, suppliers: null }

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
  const [products, setProducts]                   = useState(() => _cache.products['All'] || [])
  const [suppliers, setSuppliers]                 = useState(() => _cache.suppliers || [])

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
    const cacheKey = selectedCategory
    if (_cache.products[cacheKey]) setProducts(_cache.products[cacheKey])
    let q = supabase
      .from('products')
      .select('*, supplier:supplier_profiles(business_name, city)')
      .eq('is_active', true)
      .limit(8)
    if (selectedCategory !== 'All') q = q.eq('category', selectedCategory)
    const { data } = await q
    const result = data || []
    _cache.products[cacheKey] = result
    setProducts(result)
  }

  async function fetchSuppliers() {
    if (_cache.suppliers) setSuppliers(_cache.suppliers)
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('is_verified', true)
      .eq('is_active', true)
      .limit(8)
    const result = data || []
    _cache.suppliers = result
    setSuppliers(result)
  }

  /* scroll header class */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* scroll reveal — re-runs on language change so DOM nodes rebuilt by React
     get wy-reveal--visible restored via the immediate viewport scan */
  useEffect(() => {
    const els = document.querySelectorAll('.wy-reveal')
    if (!els.length) return
    els.forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('wy-reveal--visible')
      }
    })
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
  }, [products, suppliers, lang])

  /* body scroll lock when drawer open */
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  /* ── render ── */
  return (
    <>
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

        {/* ══ HERO — ProCuro structure: dark #052532 bg, animated mesh gradient, 4-zone centered layout ══ */}
        <section className="wy-hero">
          {/* Animated mesh-gradient background (same brand orb palette, rendered as a drifting WebGL field) */}
          <MeshHeroBackground className="wy-hero-canvas" />

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

        {/* ── mission quote ── */}
        <section className="wy-mission wy-reveal">
          <p className="wy-mission-label">{t('landingMissionLabel')}</p>
          <blockquote className="wy-mission-quote">"{t('landingMissionQuote')}"</blockquote>
          <div className="wy-mission-divider" />
        </section>

        {/* ── footer ── */}
        <footer className="wy-footer">
          <div className="wy-footer-grid">
            <div>
              <span className="wy-footer-logo">ProCuro</span>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { Icon: TrendingUp, to: '/about' },
                  { Icon: Users, to: '/suppliers' },
                  { Icon: ShoppingBag, to: '/products' },
                ].map(({ Icon, to }, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(to)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(192,213,214,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                  >
                    <Icon size={15} color="rgba(192,213,214,0.7)" />
                  </button>
                ))}
              </div>
              <p className="wy-footer-tagline">{t('heroSubtitle')}</p>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('footerCompany')}</div>
              <button className="wy-footer-link" onClick={() => navigate('/about')}>{t('footerAboutUs')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/careers')}>{t('footerCareers')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/press')}>{t('footerPress')}</button>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('footerResources')}</div>
              <button className="wy-footer-link" onClick={() => navigate('/help')}>{t('footerHelpCenter')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/privacy')}>{t('footerPrivacyPolicy')}</button>
              <button className="wy-footer-link" onClick={() => navigate('/terms')}>{t('footerTermsOfService')}</button>
            </div>
            <div>
              <div className="wy-footer-col-title">{t('footerContact')}</div>
              <div className="wy-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                <Mail size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                <a href="mailto:support@procuro.com" className="wy-footer-link" style={{ margin: 0 }}>support@procuro.com</a>
              </div>
              <div className="wy-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                <Phone size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                <a href="tel:+4915560608671" className="wy-footer-link" style={{ margin: 0 }}>+49 155 6060 8671</a>
              </div>
              <div className="wy-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                <MapPin size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                <span>Paderborn, Germany</span>
              </div>
            </div>
          </div>
          <div className="wy-footer-bottom">
            <div className="wy-footer-copy">{t('footerCopyright')}</div>
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
