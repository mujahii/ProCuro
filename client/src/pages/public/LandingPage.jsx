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
  { name: 'Meat', icon: Beef },
  { name: 'Poultry', icon: Drumstick },
  { name: 'Seafood', icon: Fish },
  { name: 'Dairy', icon: Milk },
  { name: 'Vegetables', icon: Leaf },
  { name: 'Fruits', icon: Apple },
  { name: 'Bakery', icon: Wheat },
  { name: 'Beverages', icon: Coffee },
  { name: 'Spices', icon: Flame },
  { name: 'Other', icon: Package },
]

const STATS = [
  { number: '28+', label: 'Restaurants' },
  { number: '12+', label: 'Verified Suppliers' },
  { number: '850+', label: 'Orders Placed' },
  { number: '4.9★', label: 'Average Rating' },
]

const HOW_IT_WORKS = [
  { icon: Shield, title: 'Create Your Account', desc: 'Sign up as a restaurant owner or supplier in minutes. No hidden fees.' },
  { icon: Package, title: 'Browse & Order', desc: 'Browse verified Halal suppliers and place orders with a single click.' },
  { icon: Truck, title: 'Track Delivery', desc: 'Track your delivery in real-time and manage all orders from one place.' },
]

const STAT_TARGETS = [
  { target: 28, suffix: '+', label: 'Restaurants' },
  { target: 12, suffix: '+', label: 'Verified Suppliers' },
  { target: 850, suffix: '+', label: 'Orders Placed' },
  { target: 4.9, suffix: '★', label: 'Average Rating', decimal: true },
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
      <p className="text-3xl font-black text-midnight">
        {decimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  )
}

function StatsBar() {
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
    <section ref={ref} className="bg-white border-b border-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STAT_TARGETS.map((s) => (
            <StatItem key={s.label} {...s} started={started} />
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

      {/* Hero Banner — pure frosted glass, no photo */}
      <section className="relative min-h-[560px] flex items-center justify-center overflow-hidden bg-midnight">
        {/* Deep frosted overlay — Navy base with Teal mid-tone + faint Gold warmth */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight/95 via-herb/40 to-marigold/20 backdrop-blur-3xl" />
        {/* Soft colour blobs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-marigold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-celeste/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto pt-8 sm:pt-0 pb-10 sm:pb-0">
          <span className="inline-flex items-center gap-2 bg-marigold/20 border border-marigold/40 text-marigold-light text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <CheckCircle className="w-4 h-4" /> {t('heroTagline')}
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight text-lionsmane">
            {t('heroTitle')}
          </h1>
          <p className="text-lg text-celeste mb-8 max-w-xl mx-auto">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={() => navigate('/register')}
              className="bg-marigold hover:bg-marigold-dark text-midnight font-bold px-8 py-4 rounded-xl text-lg shadow-lg transition-all"
            >
              {t('getStarted')}
            </button>
            <button
              onClick={() => navigate('/suppliers')}
              className="border-2 border-lionsmane/60 text-lionsmane hover:bg-lionsmane/10 font-bold px-8 py-4 rounded-xl text-lg transition-all"
            >
              {t('browseSuppliers')}
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-celeste flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-marigold" /> GDPR Compliant</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-marigold" /> Halal Verified Suppliers</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-marigold" /> No Hidden Fees</span>
          </div>
        </div>
      </section>

      {/* Stats Bar — animated counters */}
      <StatsBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full space-y-12">

        {/* Category Filter */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Browse by Category</h2>
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {['All', ...CATEGORIES.map(c => c.name)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-midnight text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-celeste-dark'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {selectedCategory !== 'All' ? selectedCategory : t('featuredProducts')}
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
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500">Out of Stock</div>
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
              <p className="text-slate-400 text-sm py-4">No products found. Be the first supplier to list products!</p>
            )}
          </div>
        </section>

        {/* Verified Suppliers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{t('featuredSuppliers')}</h2>
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
                  <CheckCircle className="w-3 h-3" /> Halal Certified
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="text-slate-400 text-sm py-4">No verified suppliers yet.</p>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 bg-celeste rounded-full flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-midnight" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-midnight text-white rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
