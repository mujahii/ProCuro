import { useState } from 'react'
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
    <div className="py-6">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900">Browse Products</h1>
          {selectedAddress && (
            <p className="text-sm text-gray-500 mt-0.5">Near <strong>{selectedAddress.label || selectedAddress.city}</strong></p>
          )}
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Search Halal products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors shadow-sm"
          />
          <button
            onClick={() => setFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Square category tiles */}
        <div className="mb-6">
          <CategoryChips selected={category} onSelect={setCategory} />
        </div>

        {/* Desktop: sidebar + grid */}
        <div className="flex gap-6 items-start">
          <div className="hidden lg:block w-52 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              onNearMe={handleNearMe}
              geoLoading={geoLoading}
              mobileOpen={false}
              onMobileClose={() => {}}
            />
          </div>
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
      </div>

      {/* Mobile filter drawer */}
      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        onNearMe={handleNearMe}
        geoLoading={geoLoading}
        mobileOpen={filterOpen}
        onMobileClose={() => setFilterOpen(false)}
        mobileOnly
      />

      {selectedProduct && (
        <AddToCartModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
