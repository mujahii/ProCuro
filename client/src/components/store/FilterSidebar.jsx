import { useState } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']
const CITIES = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig']

export default function FilterSidebar({ filters, onChange, onNearMe, geoLoading, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        lg:static fixed bottom-0 left-0 right-0 z-50
        lg:block lg:w-56 lg:flex-shrink-0
        bg-white rounded-t-2xl lg:rounded-xl border border-gray-100 shadow-xl lg:shadow-sm
        transition-transform duration-300
        ${mobileOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        max-h-[80vh] lg:max-h-none overflow-y-auto
      `}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h3 className="font-semibold">Filters</h3>
            <button onClick={onMobileClose}><X className="w-5 h-5" /></button>
          </div>

          {/* Near Me */}
          <div className="mb-5">
            <button
              onClick={onNearMe}
              disabled={geoLoading}
              className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-semibold text-sm py-2.5 rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-60"
            >
              {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {geoLoading ? 'Getting location...' : 'Near Me'}
            </button>
          </div>

          {/* Sort */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</h4>
            <select
              value={filters.sortBy || ''}
              onChange={e => onChange({ ...filters, sortBy: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Latest</option>
              <option value="nearest">Nearest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* City */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">City</h4>
            <select
              value={filters.city || ''}
              onChange={e => onChange({ ...filters, city: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Price Range */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Max Price: €{filters.maxPrice || 100}
            </h4>
            <input
              type="range"
              min={1}
              max={500}
              value={filters.maxPrice || 100}
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
            onClick={() => onChange({ sortBy: '', city: '', maxPrice: 100 })}
            className="w-full text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Reset filters
          </button>
        </div>
      </aside>
    </>
  )
}
