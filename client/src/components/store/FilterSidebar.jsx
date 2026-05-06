import { MapPin, Loader2, X } from 'lucide-react'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']
const CITIES = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig']

function FilterContent({ filters, onChange, onNearMe, geoLoading, onClose }) {
  return (
    <div className="p-4">
      {onClose && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Near Me */}
      <div className="mb-5">
        <button
          onClick={onNearMe}
          disabled={geoLoading}
          className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-semibold text-sm py-2.5 rounded-xl hover:bg-primary hover:text-white transition-colors disabled:opacity-60"
        >
          {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {geoLoading ? 'Getting location...' : 'Near Me'}
        </button>
      </div>

      {/* Sort */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sort By</h4>
        <select
          value={filters.sortBy || ''}
          onChange={e => onChange({ ...filters, sortBy: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="">Latest</option>
          <option value="nearest">Nearest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* City */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">City</h4>
        <select
          value={filters.city || ''}
          onChange={e => onChange({ ...filters, city: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Price Range */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Max Price: <span className="text-primary font-black">€{filters.maxPrice || 500}</span>
        </h4>
        <input
          type="range"
          min={1}
          max={500}
          value={filters.maxPrice || 500}
          onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>€1</span>
          <span>€500</span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ sortBy: '', city: '', maxPrice: 500 })}
        className="w-full text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors"
      >
        Reset Filters
      </button>
    </div>
  )
}

export default function FilterSidebar({ filters, onChange, onNearMe, geoLoading, mobileOpen, onMobileClose, mobileOnly }) {
  // Desktop inline sidebar
  if (!mobileOnly) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <FilterContent filters={filters} onChange={onChange} onNearMe={onNearMe} geoLoading={geoLoading} />
      </div>
    )
  }

  // Mobile drawer (bottom sheet)
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onMobileClose} />
      )}
      <div className={`
        lg:hidden fixed bottom-0 left-0 right-0 z-50
        bg-white rounded-t-2xl shadow-2xl
        transition-transform duration-300
        ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}
        max-h-[80vh] overflow-y-auto
      `}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />
        <FilterContent
          filters={filters}
          onChange={onChange}
          onNearMe={onNearMe}
          geoLoading={geoLoading}
          onClose={onMobileClose}
        />
      </div>
    </>
  )
}
