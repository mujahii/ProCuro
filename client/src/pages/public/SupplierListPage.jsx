import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Filter, ChevronDown, Navigation } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { haversineKm } from '../../lib/haversine'
import HalalBadge from '../../components/ui/HalalBadge'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'nearest', label: 'Near Me' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'rating_desc', label: 'Top Rated' },
]

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Spices', 'Other']

export default function SupplierListPage() {
  const navigate = useNavigate()
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
      .select('*, halal_certificates(status)')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
    setSuppliers(data || [])
    setLoading(false)
  }

  function handleSortSelect(value) {
    setSortBy(value)
    setFilterOpen(false)
    if (value === 'nearest' && !userLat) {
      setGpsLoading(true)
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGpsLoading(false) },
        () => { setSortBy(''); setGpsLoading(false); alert('GPS permission denied') },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
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
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">All Suppliers</h1>
          <span className="text-sm text-slate-400">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-12 flex items-center bg-white rounded-xl px-4 shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search suppliers by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none focus:outline-none ring-0 focus:ring-0 w-full text-sm"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors ${sortBy ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{sortBy ? SORT_OPTIONS.find(o => o.value === sortBy)?.label : 'Sort'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortSelect(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${sortBy === opt.value ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {opt.value === 'nearest' && <Navigation className="w-3.5 h-3.5 flex-shrink-0" />}
                    {opt.label}
                    {opt.value === 'nearest' && gpsLoading && <span className="text-xs text-slate-400 ml-auto">detecting...</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No suppliers found{search ? ` for "${search}"` : ''}{activeCategory ? ` in ${activeCategory}` : ''}</p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null) }}
                className="mt-3 text-sm text-emerald-600 font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(supplier => {
              const certs = supplier.halal_certificates || []
              const isVerified = supplier.is_verified || certs.some(c => c.status === 'approved')
              const isPending = !isVerified && certs.some(c => c.status === 'pending')
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
                        <MapPin className="w-3 h-3" />{supplier.city}
                        {distKm !== null && (
                          <span className="ml-1 text-emerald-600 font-semibold">· {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} away</span>
                        )}
                      </p>
                    )}
                    {supplier.rating > 0 && (
                      <p className="text-xs text-amber-500 mt-1">★ {Number(supplier.rating).toFixed(1)}</p>
                    )}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {categories.map(c => (
                          <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c}</span>
                        ))}
                      </div>
                    )}
                    {isVerified ? (
                      <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                        <HalalBadge status="approved" size={12} /> Halal Certified
                      </div>
                    ) : isPending ? (
                      <div className="mt-2 inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-100">
                        Pending Review
                      </div>
                    ) : null}
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
