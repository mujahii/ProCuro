import { useState, useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import CategoryChips from '../../components/store/CategoryChips'
import ProductGrid from '../../components/store/ProductGrid'
import FilterSidebar from '../../components/store/FilterSidebar'
import AddToCartModal from '../../components/store/AddToCartModal'
import { useProducts } from '../../hooks/useProducts'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useAddresses } from '../../context/AddressContext'

export default function StorePage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ sortBy: '', city: '', maxPrice: 500 })
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { selectedAddress } = useAddresses()
  const { lat: geoLat, lng: geoLng, loading: geoLoading, requestLocation } = useGeolocation()

  const userLat = selectedAddress?.latitude || geoLat
  const userLng = selectedAddress?.longitude || geoLng

  const { products, loading, hasMore, loadMore } = useProducts({
    category: category === 'All' ? null : category,
    search,
    sortBy: filters.sortBy,
    userLat,
    userLng,
    city: filters.city || null,
  })

  const filteredProducts = products.filter(p => Number(p.price) <= (filters.maxPrice || 500))

  function handleNearMe() {
    requestLocation()
    setFilters(f => ({ ...f, sortBy: 'nearest' }))
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 mb-1">Browse Products</h1>
        {selectedAddress && (
          <p className="text-sm text-gray-500">Showing products near <strong>{selectedAddress.label || selectedAddress.city}</strong></p>
        )}
      </div>

      {/* Search + filter button */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search Halal products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 input text-sm py-2.5"
        />
        <button
          onClick={() => setFilterOpen(true)}
          className="lg:hidden flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="mb-5">
        <CategoryChips selected={category} onSelect={setCategory} />
      </div>

      <div className="flex gap-6">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onNearMe={handleNearMe}
          geoLoading={geoLoading}
          mobileOpen={filterOpen}
          onMobileClose={() => setFilterOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <ProductGrid
            products={filteredProducts}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onAddToCart={product => setSelectedProduct(product)}
          />
        </div>
      </div>

      {selectedProduct && (
        <AddToCartModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
