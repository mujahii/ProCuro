import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Drumstick, Beef, Leaf, Coffee, Apple, Package, CheckCircle, MapPin, ChevronRight } from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { useAddresses } from '../../context/AddressContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import AddToCartModal from '../../components/store/AddToCartModal'
import { supabase } from '../../lib/supabase'
import { useEffect } from 'react'

const CATEGORIES = [
  { name: 'Chicken', icon: Drumstick },
  { name: 'Meat', icon: Beef },
  { name: 'Vegetables', icon: Leaf },
  { name: 'Bakery', icon: Coffee },
  { name: 'Dairy', icon: Apple },
  { name: 'Others', icon: Package },
]

export default function StorePage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const { selectedAddress } = useAddresses()
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
    supabase.from('supplier_profiles').select('*').eq('is_visible', true).limit(8).then(({ data }) => setSuppliers(data || []))
  }, [])

  return (
    <div className="space-y-8">
      {/* Mobile search bar */}
      <div className="md:hidden">
        <div className="flex items-center bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Search Halal products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-base"
          />
          <Filter className="w-5 h-5 text-slate-400 ml-2" />
        </div>
      </div>

      {/* Desktop search bar */}
      <div className="hidden md:flex items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
        <Search className="w-5 h-5 text-slate-400 mr-3" />
        <input
          type="text"
          placeholder="Search Halal products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-sm"
        />
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Categories</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <div
              key={name}
              onClick={() => setSelectedCategory(selectedCategory === name ? 'All' : name)}
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-sm border flex items-center justify-center transition-all ${selectedCategory === name ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-100 group-hover:border-emerald-500 group-hover:shadow-md'}`}>
                <Icon className={`w-8 h-8 ${selectedCategory === name ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`} />
              </div>
              <span className={`text-xs font-medium group-hover:text-slate-900 ${selectedCategory === name ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>{name}</span>
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
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {suppliers.map(supplier => (
            <div
              key={supplier.id}
              onClick={() => navigate(`/supplier/${supplier.id}`)}
              className="min-w-[200px] cursor-pointer bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                {supplier.avatar_url ? (
                  <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{supplier.business_name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{supplier.city}</p>
              {supplier.rating > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                  <span>★</span> {Number(supplier.rating).toFixed(1)}
                </div>
              )}
              <div className="mt-2 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                <CheckCircle className="w-3 h-3" /> Halal Certified
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-lg font-bold text-slate-900">
            {selectedCategory !== 'All' ? selectedCategory : 'Recommended Products'}
          </h2>
          <button className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">See All</button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={() => setSelectedProduct(product)} />
            ))}
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-slate-400">No products found</div>
        )}
      </div>

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart }) {
  return (
    <div
      onClick={onAddToCart}
      className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="relative h-40 bg-slate-100">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package className="w-12 h-12" />
          </div>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500">Out of Stock</div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
          {product.category}
        </div>
        {product.discount_percent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
            -{product.discount_percent}%
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-slate-900 text-base leading-tight">{product.name}</h3>
        </div>
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
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>
    </div>
  )
}
