import { useState, useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import AnnouncementBar from '../../components/layout/AnnouncementBar'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import HeroSection from '../../components/store/HeroSection'
import CategoryChips from '../../components/store/CategoryChips'
import ProductGrid from '../../components/store/ProductGrid'
import FilterSidebar from '../../components/store/FilterSidebar'
import TrustSection from '../../components/store/TrustSection'
import CartDrawer from '../../components/store/CartDrawer'
import { useProducts } from '../../hooks/useProducts'
import { useGeolocation } from '../../hooks/useGeolocation'

export default function LandingPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ sortBy: '', city: '', maxPrice: 500 })
  const [filterOpen, setFilterOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const productsRef = useRef(null)

  const { lat, lng, loading: geoLoading, requestLocation } = useGeolocation()

  const { products, loading, hasMore, loadMore } = useProducts({
    category: category === 'All' ? null : category,
    search,
    sortBy: filters.sortBy,
    userLat: lat,
    userLng: lng,
    city: filters.city || null,
  })

  const filteredProducts = products.filter(p => Number(p.price) <= (filters.maxPrice || 500))

  function handleNearMe() {
    requestLocation()
    setFilters(f => ({ ...f, sortBy: 'nearest' }))
  }

  return (
    <div className="min-h-screen bg-surface">
      <AnnouncementBar />
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <HeroSection onBrowse={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })} />

      {/* Store section */}
      <section ref={productsRef} className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search + filter button */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors shadow-sm"
            />
            <button
              onClick={() => setFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm flex-shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden xs:inline">Filters</span>
            </button>
          </div>

          {/* Square category tiles */}
          <div className="mb-6">
            <CategoryChips selected={category} onSelect={setCategory} />
          </div>

          {/* Products + sidebar */}
          <div className="flex gap-6 items-start">
            {/* Sidebar — desktop only, non-overflowing */}
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

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              <ProductGrid
                products={filteredProducts}
                loading={loading}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            </div>
          </div>
        </div>
      </section>

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

      <TrustSection />
      <Footer />
    </div>
  )
}
