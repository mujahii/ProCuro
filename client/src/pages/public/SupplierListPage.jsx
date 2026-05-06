import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, CheckCircle, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

export default function SupplierListPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('is_visible', true)
      .order('rating', { ascending: false })
    setSuppliers(data || [])
    setLoading(false)
  }

  const filtered = suppliers.filter(s =>
    !search || s.business_name?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">All Verified Suppliers</h1>
          <span className="text-sm text-slate-400">{filtered.length} suppliers</span>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search suppliers by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none w-full text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-slate-100 text-sm text-slate-600 font-medium hover:border-slate-300 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No suppliers found{search ? ` for "${search}"` : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(supplier => (
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
                    </p>
                  )}
                  {supplier.rating > 0 && (
                    <p className="text-xs text-amber-500 mt-1">★ {Number(supplier.rating).toFixed(1)}</p>
                  )}
                  {supplier.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{supplier.description}</p>
                  )}
                  <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                    <CheckCircle className="w-3 h-3" /> Halal Certified
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
