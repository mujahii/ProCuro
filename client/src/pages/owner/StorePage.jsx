import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Drumstick, Beef, Leaf, Coffee, Apple, Package, MapPin, ChevronRight, ChevronDown, Fish, Milk, Flame, Wheat, Plus, AlertCircle, Navigation, X, Loader2, Share2, CheckCircle } from 'lucide-react'
import HalalBadge from '../../components/ui/HalalBadge'
import { reverseGeocode } from '../../lib/geocode'
import { useProducts } from '../../hooks/useProducts'
import { useAddresses } from '../../context/AddressContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import AddToCartModal from '../../components/store/AddToCartModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import toast from 'react-hot-toast'

const CATEGORY_KEYS = [
  { value: 'Meat', key: 'catMeat', icon: Beef },
  { value: 'Poultry', key: 'catPoultry', icon: Drumstick },
  { value: 'Seafood', key: 'catSeafood', icon: Fish },
  { value: 'Dairy', key: 'catDairy', icon: Milk },
  { value: 'Vegetables', key: 'catVegetables', icon: Leaf },
  { value: 'Fruits', key: 'catFruits', icon: Apple },
  { value: 'Bakery', key: 'catBakery', icon: Wheat },
  { value: 'Beverages', key: 'catBeverages', icon: Coffee },
  { value: 'Spices', key: 'catSpices', icon: Flame },
  { value: 'Other', key: 'catOther', icon: Package },
]

const SORT_OPTION_KEYS = [
  { value: '', key: 'sortRecommended' },
  { value: 'price_asc', key: 'sortPriceAsc' },
  { value: 'price_desc', key: 'sortPriceDesc' },
  { value: 'name_asc', key: 'sortNameAZ' },
]

export default function StorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
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
      try {
        const [{ data: u }, { data: op }] = await Promise.all([
          supabase.from('users').select('phone').eq('id', user.id).single(),
          supabase.from('owner_profiles').select('city, tax_id').eq('user_id', user.id).maybeSingle(),
        ])
        let hasBank = false
        try {
          const { data: bank } = await supabase
            .from('owner_bank_details')
            .select('iban')
            .eq('owner_id', user.id)
            .maybeSingle()
          hasBank = !!(bank?.iban?.trim())
        } catch {}
        const missing = []
        if (!u?.phone) missing.push('phone number')
        if (!op?.city) missing.push('city / location')
        if (!op?.tax_id) missing.push('Tax ID')
        if (!hasBank) missing.push('bank details')
        setMissingFields(missing)
        setProfileComplete(missing.length === 0)
      } catch {}
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

  // Show GPS banner based on permission state and saved addresses
  useEffect(() => {
    if (!user || addresses === undefined) return
    // Hide banner if user has any saved address (they already know their location)
    if (addresses.length > 0 || sessionStorage.getItem('gps_banner_dismissed') === '1') return

    async function checkPermission() {
      if (!navigator.geolocation) { setLocationBanner('denied'); return }
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' })
        if (perm.state === 'denied') {
          setLocationBanner('denied')
        } else if (perm.state === 'granted') {
          // Already granted — silently save location without showing any banner
          saveGPSLocation()
        } else {
          // 'prompt' — show the Allow button
          setLocationBanner('prompt')
        }
      } catch {
        // Permissions API not available (iOS < 16) — fall back to showing prompt
        setLocationBanner('prompt')
      }
    }
    checkPermission()
  }, [user, addresses])

  async function saveGPSLocation() {
    setLocationSaving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          let city = '', postcode = ''
          try {
            const geoData = await reverseGeocode(lat, lng)
            if (geoData?.address) {
              const a = geoData.address
              city = a.city || a.town || a.village || a.suburb || ''
              postcode = a.postcode || ''
            }
          } catch {}
          await addAddress({ label: 'My Location', city, street: null, postal_code: postcode, latitude: lat, longitude: lng })
          await supabase.from('owner_profiles').upsert({ user_id: user.id, city, latitude: lat, longitude: lng }, { onConflict: 'user_id' })
          await reloadAddresses()
          setLocationBanner(null)
          sessionStorage.setItem('gps_banner_dismissed', '1')
        } catch {
          // Silent fail on auto-save; don't show denied banner
        } finally {
          setLocationSaving(false)
        }
      },
      () => { setLocationBanner('denied'); setLocationSaving(false) },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  async function handleAllowGPS() {
    if (!navigator.geolocation) { setLocationBanner('denied'); return }
    setLocationSaving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          let city = '', postcode = ''
          try {
            const geoData = await reverseGeocode(lat, lng)
            if (geoData?.address) {
              const a = geoData.address
              city = a.city || a.town || a.village || a.suburb || ''
              postcode = a.postcode || ''
            }
          } catch {}
          // Always save to owner_profiles (upsert is safe even if row exists)
          await supabase.from('owner_profiles').upsert({ user_id: user.id, city, latitude: lat, longitude: lng }, { onConflict: 'user_id' })
          // Try to add a new address, but don't fail if one already exists
          try {
            await addAddress({ label: 'My Location', city, street: null, postal_code: postcode, latitude: lat, longitude: lng })
          } catch {}
          await reloadAddresses()
          setLocationBanner(null)
          sessionStorage.setItem('gps_banner_dismissed', '1')
        } catch {
          // GPS succeeded but something else failed — still dismiss, don't show blocked message
          setLocationBanner(null)
          sessionStorage.setItem('gps_banner_dismissed', '1')
        } finally {
          setLocationSaving(false)
        }
      },
      (err) => {
        if (err.code === 1) {
          // Permission denied
          setLocationBanner('denied')
        } else {
          // Timeout or unavailable — don't punish the user
          toast.error(t('toastCouldNotDetectLocation'))
          setLocationBanner(null)
          sessionStorage.setItem('gps_banner_dismissed', '1')
        }
        setLocationSaving(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
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
        <div className="bg-lionsmane border border-marigold-light rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-marigold flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-marigold-dark">{t('completeProfileWarning')}</p>
            <p className="text-xs text-marigold-dark mt-0.5">
              {t('missingLabel')}: {missingFields.join(', ')}
            </p>
          </div>
          <button
            onClick={() => navigate('/owner/profile')}
            className="text-xs bg-marigold text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-marigold-dark transition-colors flex-shrink-0"
          >
            {t('completeProfileBtn')}
          </button>
        </div>
      )}

      {/* GPS location prompt banner */}
      {locationBanner === 'prompt' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-900">{t('allowLocationTitle')}</p>
            <p className="text-xs text-blue-700 mt-0.5">{t('locationDesc')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAllowGPS}
              disabled={locationSaving}
              className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              {locationSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
              {t('allowLocation')}
            </button>
            <button onClick={dismissLocationBanner} className="text-blue-400 hover:text-blue-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {locationBanner === 'denied' && (
        <div className="bg-lionsmane border border-marigold-light rounded-xl p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-marigold flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-marigold-dark">{t('locationBlocked')}</p>
            <p className="text-xs text-marigold-dark mt-0.5">{t('locationBlockedDesc')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => navigate('/owner/profile')} className="text-xs bg-marigold text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-marigold-dark transition-colors whitespace-nowrap">
              {t('addManually')}
            </button>
            <button onClick={dismissLocationBanner} className="text-marigold-light hover:text-marigold transition-colors">
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
            placeholder={t('searchProductsPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none focus:outline-none ring-0 focus:ring-0 w-full text-sm"
          />
        </div>
        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={`h-12 flex items-center gap-2 px-4 rounded-xl border shadow-sm text-sm font-semibold transition-colors ${sortBy ? 'bg-midnight text-white border-midnight' : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{t(sortBy ? (SORT_OPTION_KEYS.find(o => o.value === sortBy)?.key || 'sortLabel') : 'sortLabel')}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
              {SORT_OPTION_KEYS.map(opt => (
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

      {search.trim() ? (
        /* ── Search mode: category chips + results only ── */
        <div>
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORY_KEYS.map(({ value, key }) => (
              <button
                key={value}
                onClick={() => setSelectedCategory(selectedCategory === value ? 'All' : value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  selectedCategory === value
                    ? 'bg-midnight text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-72 animate-pulse" />
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No products found for "{search}"</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} />

              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Browse mode: categories + suppliers + recommended products ── */
        <>
          {/* Categories */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">{t('categoriesLabel')}</h2>
            <div
              className="flex overflow-x-auto pb-2 scrollbar-hide justify-between gap-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {[{ value: 'All', key: 'catAll', icon: Package }, ...CATEGORY_KEYS].map(({ value, key, icon: Icon }) => (
                <div
                  key={value}
                  onClick={() => setSelectedCategory(selectedCategory === value ? 'All' : value)}
                  className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 outline-none select-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`w-20 h-20 rounded-2xl shadow-sm border flex items-center justify-center transition-all ${
                    selectedCategory === value
                      ? 'bg-lionsmane border-herb shadow-md'
                      : 'bg-white border-slate-100 group-hover:border-celeste-dark group-hover:shadow-md'
                  }`}>
                    <Icon className={`w-9 h-9 ${selectedCategory === value ? 'text-midnight' : 'text-slate-400 group-hover:text-herb'}`} />
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    selectedCategory === value ? 'text-midnight-dark font-bold' : 'text-slate-600 group-hover:text-slate-900'
                  }`}>{t(key)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Suppliers */}
          <div>
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-lg font-bold text-slate-900">{t('recommendedSuppliers')}</h2>
              <button onClick={() => navigate('/suppliers')} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1">
                {t('seeAll')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {suppliers.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">{t('noSuppliersYetStore')}</p>
              ) : suppliers.map(supplier => {
                const avatarUrl = supplier.avatar_url
                const certs = supplier.halal_certificates || []
                const isVerified = supplier.is_verified || certs.some(c => c.status === 'approved')
                const isPending = !isVerified && certs.some(c => c.status === 'pending')
                return (
                  <div
                    key={supplier.id}
                    onClick={() => navigate(`/supplier/${supplier.id}`)}
                    className="flex-shrink-0 min-w-[180px] max-w-[180px] cursor-pointer card card-lift p-4 flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={supplier.business_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm truncate w-full">{supplier.business_name}</h3>
                    {supplier.city && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate w-full justify-center">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{supplier.city}
                      </p>
                    )}
                    {supplier.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-marigold">
                        <span>★</span> {Number(supplier.rating).toFixed(1)}
                      </div>
                    )}
                    {isVerified ? (
                      <div className="mt-2 flex items-center gap-1 bg-lionsmane text-midnight-dark px-2 py-0.5 rounded-full text-[10px] font-medium border border-celeste">
                        <CheckCircle className="w-3 h-3" /> {t('halalCertified')}
                      </div>
                    ) : isPending ? (
                      <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-marigold/20 text-marigold-dark border border-marigold-light">
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
                {selectedCategory !== 'All'
                  ? t(CATEGORY_KEYS.find(c => c.value === selectedCategory)?.key || 'catOther')
                  : t('recommendedOrders')}
              </h2>
              <button onClick={() => navigate('/owner/products')} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1">{t('seeAll')} <ChevronRight className="w-4 h-4" /></button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card h-72 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} />

                ))}
              </div>
            )}
            {!loading && sortedProducts.length === 0 && (
              <div className="text-center py-12 text-slate-400">No products found</div>
            )}
            {!loading && sortedProducts.length > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => navigate('/owner/products')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight-dark transition-colors shadow-sm"
                >
                  {t('seeAll')} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
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

function ProductCard({ product, onAddToCart }) {
  const imgUrl = getProductImageUrl(product.image_url)
  const { t } = useLanguage()

  async function handleShare(e) {
    e.stopPropagation()
    const url = `${window.location.origin}/supplier/${product.supplier_id}`
    if (navigator.share) {
      await navigator.share({ title: product.name, text: `${product.name} at ${product.supplier?.business_name} on ProCuro`, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success(t('toastLinkCopied'))
    }
  }

  return (
    <div
      onClick={onAddToCart}
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
            onClick={e => { e.stopPropagation(); onAddToCart() }}
            className="w-8 h-8 rounded-full bg-midnight text-white flex items-center justify-center hover:bg-midnight-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
