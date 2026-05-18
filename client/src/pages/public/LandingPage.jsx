import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, ChevronRight, Drumstick, Beef, Leaf, Coffee, Apple, Package, Truck, Shield, Fish, Milk, Flame, Wheat, Plus } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

const CATEGORIES = [
  { name: 'Meat', icon: Beef, labelKey: 'catMeat' },
  { name: 'Poultry', icon: Drumstick, labelKey: 'catPoultry' },
  { name: 'Seafood', icon: Fish, labelKey: 'catSeafood' },
  { name: 'Dairy', icon: Milk, labelKey: 'catDairy' },
  { name: 'Vegetables', icon: Leaf, labelKey: 'catVegetables' },
  { name: 'Fruits', icon: Apple, labelKey: 'catFruits' },
  { name: 'Bakery', icon: Wheat, labelKey: 'catBakery' },
  { name: 'Beverages', icon: Coffee, labelKey: 'catBeverages' },
  { name: 'Spices', icon: Flame, labelKey: 'catSpices' },
  { name: 'Other', icon: Package, labelKey: 'catOther' },
]

const STAT_TARGETS = [
  { target: 28, suffix: '+', labelKey: 'statsRestaurants' },
  { target: 12, suffix: '+', labelKey: 'statsVerifiedSuppliers' },
  { target: 850, suffix: '+', labelKey: 'statsOrdersPlaced' },
  { target: 4.9, suffix: '★', labelKey: 'statsAverageRating', decimal: true },
]

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

function StatItem({ target, suffix, label, decimal, started }) {
  const count = useCountUp(target, 1800, started, decimal)
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-black text-midnight">
        {decimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
      </p>
      <p className="text-xs sm:text-sm text-slate-500 mt-1">{label}</p>
    </div>
  )
}

function StatsBar() {
  const { t } = useLanguage()
  const ref = useRef(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <section ref={ref} className="bg-white border-b border-slate-100 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          {STAT_TARGETS.map((s) => (
            <StatItem key={s.labelKey} {...s} label={t(s.labelKey)} started={started} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, authUser, role, loading } = useAuth()
  const { t } = useLanguage()
  const [selectedCategory, setSelectedCategory] = useState('All')

  const HOW_IT_WORKS = [
    { icon: Shield, title: t('howItWorksStep1Title'), desc: t('howItWorksStep1Desc') },
    { icon: Package, title: t('howItWorksStep2Title'), desc: t('howItWorksStep2Desc') },
    { icon: Truck, title: t('howItWorksStep3Title'), desc: t('howItWorksStep3Desc') },
  ]

  function getCategoryLabel(name) {
    if (name === 'All') return t('featuredProducts')
    const cat = CATEGORIES.find(c => c.name === name)
    return cat ? t(cat.labelKey) : name
  }
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    if (loading) return
    if (authUser && !user) {
      // Signed in but no role chosen yet
      navigate('/select-role', { replace: true })
    } else if (user) {
      if (role === 'restaurant_owner') navigate('/owner/store', { replace: true })
      else if (role === 'supplier') navigate('/supplier/dashboard', { replace: true })
      else if (role === 'admin') navigate('/admin/dashboard', { replace: true })
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

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative min-h-[600px] sm:min-h-[640px] flex flex-col overflow-hidden bg-midnight">
        <style>{`
          @keyframes riseBlob {
            0%   { transform: translateY(700px); opacity: 0; }
            8%   { opacity: 0.22; }
            92%  { opacity: 0.14; }
            100% { transform: translateY(-700px); opacity: 0; }
          }
        `}</style>

        {/* Static base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight via-[#0d2535] to-midnight" />

        {/* 4 blobs staggered 4 s apart — always one visible, rising bottom → top */}
        <div className="absolute left-[10%] top-0 w-80 h-80 bg-marigold/25 rounded-full blur-3xl pointer-events-none"
          style={{ animation: 'riseBlob 16s linear infinite', animationDelay: '0s' }} />
        <div className="absolute left-[52%] top-0 w-72 h-72 bg-celeste/20 rounded-full blur-3xl pointer-events-none"
          style={{ animation: 'riseBlob 16s linear infinite', animationDelay: '-4s' }} />
        <div className="absolute left-[30%] top-0 w-64 h-64 bg-herb/20 rounded-full blur-3xl pointer-events-none"
          style={{ animation: 'riseBlob 16s linear infinite', animationDelay: '-8s' }} />
        <div className="absolute left-[68%] top-0 w-80 h-80 bg-marigold/15 rounded-full blur-3xl pointer-events-none"
          style={{ animation: 'riseBlob 16s linear infinite', animationDelay: '-12s' }} />

        {/* 4 zones spread top-to-bottom with justify-between */}
        <div className="relative z-10 flex-1 flex flex-col justify-between text-center text-white px-6 max-w-3xl mx-auto w-full py-8 sm:py-10">

          {/* Zone 1 — Badge, pinned near top */}
          <div>
            <span className="inline-flex items-center gap-1.5 sm:gap-2 bg-marigold/20 border border-marigold/40 text-marigold-light text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('heroTagline')}
            </span>
          </div>

          {/* Zone 2 — Main title, focal point */}
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight text-lionsmane">
              {t('heroTitle')}
            </h1>
          </div>

          {/* Zone 3 — Subtitle + buttons, grouped together */}
          <div>
            <p className="text-sm sm:text-base text-celeste mb-6 sm:mb-7 max-w-2xl mx-auto leading-relaxed">
              {t('heroSubtitle')}
            </p>
            <div className="flex flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-marigold hover:bg-marigold-dark text-midnight font-bold px-5 sm:px-8 py-3 sm:py-4 rounded-xl text-sm sm:text-lg shadow-lg transition-all"
              >
                {t('getStarted')}
              </button>
              <button
                onClick={() => navigate('/suppliers')}
                className="border-2 border-lionsmane/60 text-lionsmane hover:bg-lionsmane/10 font-bold px-5 sm:px-8 py-3 sm:py-4 rounded-xl text-sm sm:text-lg transition-all"
              >
                {t('browseSuppliers')}
              </button>
            </div>
          </div>

          {/* Zone 4 — Trust badges, pinned to bottom */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8 text-xs sm:text-sm text-celeste/80">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-marigold" /> {t('gdprCompliant')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-marigold" /> {t('halalVerifiedBadge')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-marigold" /> {t('noHiddenFees')}</span>
          </div>

        </div>
      </section>

      {/* Stats Bar — animated counters */}
      <StatsBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow w-full space-y-8 sm:space-y-12">

        {/* Category Filter */}
        <section>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">{t('browseByCategory')}</h2>
          <div
            className="flex overflow-x-auto pb-2 scrollbar-hide justify-between gap-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {[{ name: 'All', icon: Package, labelKey: 'catAll' }, ...CATEGORIES].map(({ name, icon: Icon, labelKey }) => (
              <div
                key={name}
                onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer group flex-shrink-0 outline-none select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-sm border flex items-center justify-center transition-all ${
                  selectedCategory === name
                    ? 'bg-lionsmane border-herb shadow-md'
                    : 'bg-white border-slate-100 group-hover:border-celeste-dark group-hover:shadow-md'
                }`}>
                  <Icon className={`w-7 h-7 sm:w-9 sm:h-9 ${selectedCategory === name ? 'text-midnight' : 'text-slate-400 group-hover:text-herb'}`} />
                </div>
                <span className={`text-[11px] sm:text-xs font-medium whitespace-nowrap ${
                  selectedCategory === name ? 'text-midnight-dark font-bold' : 'text-slate-600 group-hover:text-slate-900'
                }`}>{t(labelKey)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {getCategoryLabel(selectedCategory)}
            </h2>
            <button onClick={() => navigate('/products')} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1">
              All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {products.slice(0, 8).map(product => {
              const imgUrl = getProductImageUrl(product.image_url)
              return (
                <div
                  key={product.id}
                  onClick={() => navigate('/login')}
                  className="flex-shrink-0 w-[260px] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <div className="relative h-40 bg-slate-100">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    {!product.is_active && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500">{t('outOfStock')}</div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm text-slate-700">
                      {product.category}
                    </div>
                    {product.discount_percent > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                        -{product.discount_percent}%
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 text-base mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-slate-500 mb-1">{product.description.substring(0, 40)}...</p>
                    )}
                    <p className="text-xs font-bold text-midnight-dark mb-3">{product.supplier?.business_name}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-slate-900">€{Number(product.price).toFixed(2)}</span>
                        <span className="text-xs text-slate-400 ml-1">/ {product.unit_type}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/login') }}
                        className="w-8 h-8 rounded-full bg-midnight text-white flex items-center justify-center hover:bg-midnight transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {products.length === 0 && (
              <p className="text-slate-400 text-sm py-4">{t('noProductsFound')}</p>
            )}
          </div>
        </section>

        {/* Verified Suppliers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">{t('featuredSuppliers')}</h2>
            <button onClick={() => navigate('/suppliers')} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1">
              All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {suppliers.slice(0, 8).map(supplier => (
              <div
                key={supplier.id}
                onClick={() => navigate(`/supplier/${supplier.id}`)}
                className="flex-shrink-0 min-w-[180px] max-w-[180px] cursor-pointer bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                  {supplier.avatar_url ? (
                    <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate w-full">{supplier.business_name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate w-full justify-center"><MapPin className="w-3 h-3 flex-shrink-0" />{supplier.city}</p>
                {supplier.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-marigold">
                    <span>★</span> {Number(supplier.rating).toFixed(1)}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 bg-lionsmane text-midnight-dark px-2 py-0.5 rounded-full text-[10px] font-medium border border-celeste">
                  <CheckCircle className="w-3 h-3" /> {t('halalCertified')}
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="text-slate-400 text-sm py-4">{t('noSuppliersYet')}</p>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-4 sm:py-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 text-center mb-6 sm:mb-10">{t('howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="relative inline-block mb-3 sm:mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-celeste rounded-full flex items-center justify-center mx-auto">
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-midnight" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-midnight text-white rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1.5 sm:mb-2">{title}</h3>
                <p className="text-slate-500 text-xs sm:text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
