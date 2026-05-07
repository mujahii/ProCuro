import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown, Package, Plus, ArrowLeft } from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { useAddresses } from '../../context/AddressContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import AddToCartModal from '../../components/store/AddToCartModal'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Spices', 'Other']

const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' },
]

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function AllProductsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [sortBy, setSortBy] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const filterRef = useRef(null)
  const { selectedAddress } = useAddresses()
  const { lat: geoLat, lng: geoLng } = useGeolocation()

  const userLat = selectedAddress?.latitude || geoLat
  const userLng = selectedAddress?.longitude || geoLng

  const { products, loading, hasMore, loadMore } = useProducts({
    category: activeCategory,
    search,
    userLat,
    userLng,
  })

  const sortedProducts = [...(products || [])].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
    return 0
  })

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">All Products</h1>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="flex-1 h-12 flex items-center bg-white rounded-xl px-4 shadow-sm border border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search products..."
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

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
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

      {/* Product grid */}
      {loading && sortedProducts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 h-72 animate-pulse" />
          ))}
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          No products found{activeCategory ? ` in ${activeCategory}` : ''}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart }) {
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
          <button
            onClick={e => { e.stopPropagation(); onAddToCart() }}
            className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
