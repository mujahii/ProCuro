import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown, Package, Plus, Share2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'Meat',      key: 'catMeat' },
  { value: 'Poultry',   key: 'catPoultry' },
  { value: 'Seafood',   key: 'catSeafood' },
  { value: 'Dairy',     key: 'catDairy' },
  { value: 'Vegetables',key: 'catVegetables' },
  { value: 'Fruits',    key: 'catFruits' },
  { value: 'Bakery',    key: 'catBakery' },
  { value: 'Beverages', key: 'catBeverages' },
  { value: 'Spices',    key: 'catSpices' },
  { value: 'Other',     key: 'catOther' },
]

const SORT_KEYS = [
  { value: '', key: 'sortRecommended' },
  { value: 'price_asc', key: 'sortPriceAsc' },
  { value: 'price_desc', key: 'sortPriceDesc' },
  { value: 'name_asc', key: 'sortNameAZ' },
]

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function ProductsListPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [sortBy, setSortBy] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, supplier:supplier_profiles(business_name, city)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const filtered = products
    .filter(p => {
      const matchesSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier?.business_name?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !activeCategory || p.category === activeCategory.value
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      return 0
    })

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col" style={{ paddingTop: 'calc(4rem + var(--sat))' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-slate-900">{t('allProductsTitle')}</h1>
          <span className="text-sm text-slate-400">{filtered.length} {filtered.length !== 1 ? t('productCountPlural') : t('productCountSingular')}</span>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="flex-1 h-12 flex items-center bg-white rounded-xl px-4 shadow-sm border border-celeste/40">
            <Search className="w-5 h-5 text-herb/60 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder={t('searchProductsPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none focus:outline-none ring-0 focus:ring-0 w-full text-sm"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors ${sortBy ? 'bg-midnight text-white border-midnight' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{sortBy ? t(SORT_KEYS.find(o => o.value === sortBy)?.key) : t('sortLabel')}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
                {SORT_KEYS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setFilterOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === opt.value ? 'text-midnight-dark font-semibold bg-lionsmane' : 'text-slate-700 hover:bg-lionsmane'}`}
                  >
                    {t(opt.key)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(activeCategory?.value === cat.value ? null : cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                activeCategory?.value === cat.value
                  ? 'bg-midnight text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {t(cat.key)}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {activeCategory ? `${t('noProductsInCategory')} ${t(activeCategory.key)}` : t('noProductsFoundSearch')}
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null) }}
                className="block mt-3 mx-auto text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} onLogin={() => navigate('/login')} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function ProductCard({ product, onLogin }) {
  const { t } = useLanguage()
  const imgUrl = getProductImageUrl(product.image_url)

  async function handleShare(e) {
    e.stopPropagation()
    const url = `${window.location.origin}/supplier/${product.supplier_id}`
    if (navigator.share) {
      await navigator.share({ title: product.name, text: `${product.name} at ${product.supplier?.business_name} on ProCuro`, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success(t('shareProfile') + ' — Link copied!')
    }
  }

  return (
    <div
      onClick={onLogin}
      className="card overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
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
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500">{t('outOfStockText')}</div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm text-slate-700">
          {product.category}
        </div>
        {product.discount_percent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
            -{product.discount_percent}%
          </div>
        )}
        <button
          onClick={handleShare}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-midnight transition-colors"
          title="Share product"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-base mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-slate-500 mb-1">{product.description.substring(0, 40)}...</p>
        )}
        <p className="text-xs text-slate-400 mb-3">{product.supplier?.business_name}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900">€{Number(product.price).toFixed(2)}</span>
            <span className="text-xs text-slate-400 ml-1">/ {product.unit_type}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onLogin() }}
            className="w-8 h-8 rounded-full bg-midnight text-white flex items-center justify-center hover:bg-midnight transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
