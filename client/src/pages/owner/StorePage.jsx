import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Drumstick, Beef, Leaf, Coffee, Apple, Package, MapPin, ChevronRight, ChevronDown, Fish, Milk, Flame, Wheat, Plus, Flag, AlertCircle, Navigation, X, Loader2 } from 'lucide-react'
import HalalBadge from '../../components/ui/HalalBadge'
import { useProducts } from '../../hooks/useProducts'
import { useAddresses } from '../../context/AddressContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import AddToCartModal from '../../components/store/AddToCartModal'
import ReportModal from '../../components/ui/ReportModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

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

const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export default function StorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [reportProduct, setReportProduct] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [profileComplete, setProfileComplete] = useState(true)
  const [missingFields, setMissingFields] = useState([])
  const [locationBanner, setLocationBanner] = useState(null) // 'prompt' | 'denied' | null
  const [locationSaving, setLocationSaving] = useState(false)
  const filterRef = useRef(null)
  const { addresses, addAddress, selectedAddress, reload: reloadAddresses } = useAddresses()
  const { lat: geoLat, lng: geoLng } = useGeolocation()

  const userLat = selectedAddress?.latitude || geoLat
  const userLng = selectedAddress?.longitude || geoLng

  const { products, loading } = useProducts({
    category: selectedCategory === 'All' ? null : selectedCategory,
    search,
    userLat,
    userLng,
  })

  useEffect(() => {
    supabase
      .from('supplier_profiles')
      .select('*, halal_certificates(status)')
      .limit(8)
      .then(({ data, error }) => {
        if (!error) setSuppliers(data || [])
      })
  }, [])

  useEffect(() => {
    if (!user) return
    async function checkProfile() {
      const [{ data: u }, { data: op }] = await Promise.all([
        supabase.from('users').select('phone').eq('id', user.id).single(),
        supabase.from('owner_profiles').select('city, tax_id').eq('user_id', user.id).maybeSingle(),
      ])
      const missing = []
      if (!u?.phone) missing.push('phone number')
      if (!op?.city) missing.push('city / location')
      if (!op?.tax_id) missing.push('Tax ID')
      setMissingFields(missing)
      setProfileComplete(missing.length === 0)
    }
    checkProfile()
  }, [user])

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Show GPS prompt if owner has no saved location
  useEffect(() => {
    if (!user || addresses === undefined) return
    const hasLocation = addresses.some(a => a.latitude && a.longitude)
    if (!hasLocation && sessionStorage.getItem('gps_banner_dismissed') !== '1') {
      setLocationBanner('prompt')
    }
  }, [user, addresses])

  async function handleAllowGPS() {
    if (!navigator.geolocation) { setLocationBanner('denied'); return }
    setLocationSaving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const geoData = await res.json()
          const addr = geoData.address || {}
          const city = addr.city || addr.town || addr.village || addr.suburb || ''
          // Save to addresses and owner_profiles
          await addAddress({ label: 'Business Location', city, street: null, postal_code: addr.postcode || null, country: 'Germany', latitude: lat, longitude: lng })
          await supabase.from('owner_profiles').upsert({ user_id: user.id, city, latitude: lat, longitude: lng }, { onConflict: 'user_id' })
          await reloadAddresses()
          setLocationBanner(null)
          sessionStorage.setItem('gps_banner_dismissed', '1')
        } catch {
          setLocationBanner('denied')
        } finally {
          setLocationSaving(false)
        }
      },
      () => { setLocationBanner('denied'); setLocationSaving(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function dismissLocationBanner() {
    setLocationBanner(null)
    sessionStorage.setItem('gps_banner_dismissed', '1')
  }

  const sortedProducts = [...(products || [])].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
    return 0
  })

  return (
    <div className="space-y-8">
      {/* Incomplete profile warning */}
      {!profileComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Complete your profile to place orders</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Missing: {missingFields.join(', ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/owner/profile')}
            className="text-xs bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* GPS location prompt banner */}
      {locationBanner === 'prompt' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-900">Allow location for accurate delivery fees</p>
            <p className="text-xs text-blue-700 mt-0.5">We use your location to calculate the delivery fee from each supplier.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAllowGPS}
              disabled={locationSaving}
              className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              {locationSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
              Allow
            </button>
            <button onClick={dismissLocationBanner} className="text-blue-400 hover:text-blue-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {locationBanner === 'denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Location access denied</p>
            <p className="text-xs text-amber-700 mt-0.5">Delivery fees can't be shown without your location. Add one in your profile.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate('/owner/profile')} className="text-xs bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
              Add Location
            </button>
            <button onClick={dismissLocationBanner} className="text-amber-400 hover:text-amber-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search bar with filter */}
      <div className="flex gap-2">
        <div className="flex-1 h-12 flex items-center bg-white rounded-xl px-4 shadow-sm border border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search Halal products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none ring-0 focus:ring-0 w-full text-sm"
          />
        </div>
        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors ${sortBy ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{sortBy ? SORT_OPTIONS.find(o => o.value === sortBy)?.label : 'Filter'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setFilterOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === opt.value ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {search.trim() ? (
        /* ── Search mode: category chips + results only ── */
        <div>
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(({ name }) => (
              <button
                key={name}
                onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  selectedCategory === name
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 h-72 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No products found for "{search}"</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} onReport={() => setReportProduct(product)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Browse mode: categories + suppliers + recommended products ── */
        <>
          {/* Categories */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Categories</h2>
            <div
              className="flex overflow-x-auto pb-2 scrollbar-hide justify-between gap-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {[{ name: 'All', icon: Package }, ...CATEGORIES].map(({ name, icon: Icon }) => (
                <div
                  key={name}
                  onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
                  className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 outline-none select-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`w-20 h-20 rounded-2xl shadow-sm border flex items-center justify-center transition-all ${
                    selectedCategory === name
                      ? 'bg-emerald-50 border-emerald-500 shadow-md'
                      : 'bg-white border-slate-100 group-hover:border-emerald-300 group-hover:shadow-md'
                  }`}>
                    <Icon className={`w-9 h-9 ${selectedCategory === name ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    selectedCategory === name ? 'text-emerald-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'
                  }`}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Suppliers */}
          <div>
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-lg font-bold text-slate-900">Recommended Suppliers</h2>
              <button onClick={() => navigate('/suppliers')} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">
                See All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
              {suppliers.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No suppliers yet.</p>
              ) : suppliers.map(supplier => {
                const avatarUrl = supplier.avatar_url
                const certs = supplier.halal_certificates || []
                const isVerified = supplier.is_verified || certs.some(c => c.status === 'approved')
                const isPending = !isVerified && certs.some(c => c.status === 'pending')
                return (
                  <div
                    key={supplier.id}
                    onClick={() => navigate(`/supplier/${supplier.id}`)}
                    className="min-w-[180px] cursor-pointer bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={supplier.business_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{supplier.business_name}</h3>
                    {supplier.city && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{supplier.city}</p>}
                    {supplier.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                        <span>★</span> {Number(supplier.rating).toFixed(1)}
                      </div>
                    )}
                    {isVerified ? (
                      <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <HalalBadge status="approved" size={12} /> Halal Certified
                      </div>
                    ) : isPending ? (
                      <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                        <HalalBadge status="pending" size={12} /> Pending Review
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommended Products */}
          <div>
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedCategory !== 'All' ? selectedCategory : 'Recommended Orders'}
              </h2>
              <button onClick={() => navigate('/owner/products')} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">See All <ChevronRight className="w-4 h-4" /></button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 h-72 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} onReport={() => setReportProduct(product)} />
                ))}
              </div>
            )}
            {!loading && sortedProducts.length === 0 && (
              <div className="text-center py-12 text-slate-400">No products found</div>
            )}
          </div>
        </>
      )}

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
      {reportProduct && (
        <ReportModal type="product" targetId={reportProduct.id} targetName={reportProduct.name} onClose={() => setReportProduct(null)} />
      )}
    </div>
  )
}

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

function ProductCard({ product, onAddToCart, onReport }) {
  const imgUrl = getProductImageUrl(product.image_url)
  return (
    <div
      onClick={onAddToCart}
      className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
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
        <p className="text-xs font-bold text-emerald-700 mb-3">{product.supplier?.business_name}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900">€{Number(product.price).toFixed(2)}</span>
            <span className="text-xs text-slate-400 ml-1">/ {product.unit_type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); onReport() }}
              className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center hover:border-red-300 hover:text-red-400 transition-colors"
              title="Report product"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onAddToCart() }}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
