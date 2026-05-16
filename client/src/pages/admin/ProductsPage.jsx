import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Trash2, ToggleLeft, ToggleRight, X, Eye, Package } from 'lucide-react'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('id')
  const highlightRef = useRef(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [toggleTarget, setToggleTarget] = useState(null)
  const [viewProduct, setViewProduct] = useState(null)

  useEffect(() => { loadProducts(); loadSuppliers() }, [])

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, products])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, supplier:supplier_profiles(id, business_name)')
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function loadSuppliers() {
    const { data } = await supabase.from('supplier_profiles').select('id, business_name').order('business_name')
    setSuppliers(data || [])
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  async function toggleActive(product) {
    const { data } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id).select().single()
    setProducts(prev => prev.map(p => p.id === product.id ? data : p))
  }

  function handleToggleClick(product) {
    if (product.is_active) {
      setToggleTarget(product)
    } else {
      toggleActive(product)
    }
  }

  const categories = [...new Set(products.map(p => p.category))].filter(Boolean)
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.supplier?.business_name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || p.category === categoryFilter
    const matchSupplier = !supplierFilter || p.supplier?.id === supplierFilter
    return matchSearch && matchCat && matchSupplier
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-black text-gray-900">Products ({products.length})</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 input text-sm py-2 w-48" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input text-sm py-2 w-36">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="input text-sm py-2 w-44">
            <option value="">All suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.business_name}</option>)}
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-lionsmane border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(product => (
                <tr
                  key={product.id}
                  ref={product.id === highlightId ? highlightRef : null}
                  className={`hover:bg-lionsmane transition-colors ${product.id === highlightId ? 'bg-lionsmane outline outline-2 outline-herb-light' : ''}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{product.supplier?.business_name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{product.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">€{Number(product.price).toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge status={product.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewProduct(product)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleClick(product)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                        {product.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteProduct(product.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
        </div>
      )}

      {/* Product Detail Modal */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Product Details</h2>
              <button onClick={() => setViewProduct(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            {(() => {
              const imgUrl = getProductImageUrl(viewProduct.image_url)
              return (
                <>
                  <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={viewProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    {[
                      ['Name', viewProduct.name],
                      ['Supplier', viewProduct.supplier?.business_name],
                      ['Category', viewProduct.category],
                      ['Price', `€${Number(viewProduct.price).toFixed(2)} / ${viewProduct.unit_type}`],
                      ['Stock', viewProduct.stock_quantity != null ? `${viewProduct.stock_quantity} units` : '—'],
                      ['Status', viewProduct.is_active ? 'Active' : 'Inactive'],
                      ['Description', viewProduct.description || '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between border-b border-gray-50 pb-2 gap-2">
                        <span className="text-gray-500 flex-shrink-0">{label}</span>
                        <span className="font-medium text-gray-900 text-right">{val || '—'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Deactivate Product</h2>
              <button onClick={() => setToggleTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-orange-700 mb-1">
                This product will be hidden from the marketplace.
              </p>
              <p className="text-xs text-orange-500">
                "<span className="font-bold">{toggleTarget.name}</span>" by {toggleTarget.supplier?.business_name || 'this supplier'} will no longer be visible to restaurant owners.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setToggleTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-lionsmane">
                Cancel
              </button>
              <button
                onClick={() => { toggleActive(toggleTarget); setToggleTarget(null) }}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
