import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Filter, ChevronDown, Navigation, CheckCircle, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { haversineKm } from '../../lib/haversine'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLanguage } from '../../context/LanguageContext'

const SORT_OPTION_KEYS = [
  { value: '', key: 'sortRecommended' },
  { value: 'name_asc', key: 'sortNameAZ' },
  { value: 'rating_desc', key: 'sortTopRated' },
]

const CATEGORY_KEYS = [
  { value: 'Meat', key: 'catMeat' },
  { value: 'Poultry', key: 'catPoultry' },
  { value: 'Seafood', key: 'catSeafood' },
  { value: 'Dairy', key: 'catDairy' },
  { value: 'Vegetables', key: 'catVegetables' },
  { value: 'Fruits', key: 'catFruits' },
  { value: 'Bakery', key: 'catBakery' },
  { value: 'Beverages', key: 'catBeverages' },
  { value: 'Spices', key: 'catSpices' },
  { value: 'Other', key: 'catOther' },
]

export default function SupplierListPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const SORT_OPTIONS = SORT_OPTION_KEYS.map(o => ({ value: o.value, label: t(o.key) }))
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [sortBy, setSortBy] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*, halal_certificates(status), users:user_id(is_banned)')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
    setSuppliers(data || [])
    setLoading(false)
  }

  function handleSortSelect(value) {
    setSortBy(value)
    setFilterOpen(false)
  }

  function handleNearMe() {
    if (sortBy === 'nearest') { setSortBy(''); return }
    if (userLat) { setSortBy('nearest'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setSortBy('nearest'); setGpsLoading(false) },
      () => { setGpsLoading(false); alert('Location permission denied') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const filtered = suppliers
    .filter(s => {
      const matchesSearch = !search ||
        s.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !activeCategory || (
        Array.isArray(s.category) ? s.category.includes(activeCategory) : s.category === activeCategory
      )
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'nearest' && userLat && userLng) {
        const da = a.latitude ? haversineKm(userLat, userLng, a.latitude, a.longitude) : Infinity
        const db = b.latitude ? haversineKm(userLat, userLng, b.latitude, b.longitude) : Infinity
        return da - db
      }
      if (sortBy === 'name_asc') return (a.business_name || '').localeCompare(b.business_name || '')
      if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0)
      return 0
    })

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-slate-900">{t('allSuppliersTitle')}</h1>
          <span className="text-sm text-slate-400">{filtered.length} {filtered.length !== 1 ? t('allSuppliersTitle').toLowerCase() : t('supplier').toLowerCase()}</span>
        </div>

        {/* Search + Near Me + Sort */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-12 flex items-center bg-white rounded-xl px-4 shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder={t('searchSuppliersPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none focus:outline-none ring-0 focus:ring-0 w-full text-sm"
            />
          </div>
          {/* Standalone Near Me button */}
          <button
            onClick={handleNearMe}
            disabled={gpsLoading}
            className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors flex-shrink-0 ${sortBy === 'nearest' ? 'bg-midnight text-white border-midnight' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
          >
            {gpsLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{t('nearMe')}</span>
          </button>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors ${sortBy && sortBy !== 'nearest' ? 'bg-midnight text-white border-midnight' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{sortBy && sortBy !== 'nearest' ? t(SORT_OPTION_KEYS.find(o => o.value === sortBy)?.key || 'sortRecommended') : t('sortLabel')}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortSelect(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${sortBy === opt.value ? 'text-midnight-dark font-semibold bg-lionsmane' : 'text-slate-700 hover:bg-lionsmane'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_KEYS.map(({ value, key }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(activeCategory === value ? null : value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                activeCategory === value
                  ? 'bg-midnight text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">{t('noSuppliersFound')}{search ? ` for "${search}"` : ''}{activeCategory ? ` in ${t(CATEGORY_KEYS.find(c => c.value === activeCategory)?.key || activeCategory)}` : ''}</p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null) }}
                className="mt-3 text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(supplier => {
              const certs = supplier.halal_certificates || []
              const isVerified = supplier.is_verified || certs.some(c => c.status === 'approved')
              const isPending = !isVerified && certs.some(c => c.status === 'pending')
              const isBanned = supplier.users?.is_banned === true
              const categories = Array.isArray(supplier.category)
                ? supplier.category
                : supplier.category ? [supplier.category] : []
              const distKm = sortBy === 'nearest' && userLat && supplier.latitude
                ? haversineKm(userLat, userLng, supplier.latitude, supplier.longitude)
                : null
              return (
                <div
                  key={supplier.id}
                  onClick={() => navigate(`/supplier/${supplier.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {supplier.avatar_url ? (
                      <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">{supplier.business_name}</h3>
                    {supplier.city && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[...new Set(supplier.city.split(',').map(c => c.trim()).filter(Boolean))].join(', ')}
                        {distKm !== null && (
                          <span className="ml-1 text-midnight font-semibold">· {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} away</span>
                        )}
                      </p>
                    )}
                    {supplier.rating > 0 && (
                      <p className="text-xs text-marigold mt-1">★ {Number(supplier.rating).toFixed(1)}</p>
                    )}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {categories.map(c => (
                          <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {isVerified && (
                        <div className="inline-flex items-center gap-1 bg-lionsmane text-midnight-dark px-2 py-0.5 rounded-full text-[10px] font-medium border border-celeste">
                          <CheckCircle className="w-3 h-3" /> {t('halalCertifiedBadge')}
                        </div>
                      )}
                      {!isVerified && isPending && (
                        <div className="inline-flex items-center gap-1 bg-marigold/20 text-marigold-dark px-2 py-0.5 rounded-full text-[10px] font-medium border border-marigold-light">
                          {t('pendingReview')}
                        </div>
                      )}
                      {isBanned && (
                        <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                          <Ban className="w-3 h-3" /> {t('supplierBannedShort')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
