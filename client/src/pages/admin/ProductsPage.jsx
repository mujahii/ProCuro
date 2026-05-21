import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Trash2, ToggleLeft, ToggleRight, X, Eye, Package, RotateCcw, History } from 'lucide-react'
import { format } from 'date-fns'

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
  const [tab, setTab] = useState('active')
  const [products, setProducts] = useState([])
  const [deletedProducts, setDeletedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [toggleTarget, setToggleTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewProduct, setViewProduct] = useState(null)

  useEffect(() => { loadProducts(); loadDeleted(); loadSuppliers() }, [])

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, products])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, supplier:supplier_profiles(id, business_name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function loadDeleted() {
    const { data } = await supabase
      .from('products')
      .select('*, supplier:supplier_profiles(id, business_name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setDeletedProducts(data || [])
  }

  async function loadSuppliers() {
    const { data } = await supabase.from('supplier_profiles').select('id, business_name').order('business_name')
    setSuppliers(data || [])
  }

  async function deleteProduct() {
    if (!deleteTarget) return
    await supabase.from('products').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', deleteTarget.id)
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    loadDeleted()
    toast.success('Product deleted')
  }

  async function restoreProduct(product) {
    await supabase.from('products').update({ deleted_at: null, deleted_by: null, is_active: true }).eq('id', product.id)
    setDeletedProducts(prev => prev.filter(p => p.id !== product.id))
    loadProducts()
    toast.success('Product restored')
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
  const filteredDeleted = deletedProducts.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.supplier?.business_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-black text-gray-900">Products</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 input text-sm py-2 w-full sm:w-48" />
          </div>
          {tab === 'active' && (
            <>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input text-sm py-2 flex-1 sm:flex-none sm:w-36">
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="input text-sm py-2 flex-1 sm:flex-none sm:w-44">
                <option value="">All suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.business_name}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === 'active' ? 'border-midnight text-midnight-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Active ({products.length})
        </button>
        <button
          onClick={() => setTab('deleted')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'deleted' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <History className="w-3.5 h-3.5" /> Deleted ({deletedProducts.length})
        </button>
      </div>

      {tab === 'deleted' ? (
        <>
          {/* Mobile card list - deleted products */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredDeleted.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <span className="text-sm font-bold text-midnight-dark flex-shrink-0">€{Number(p.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{p.supplier?.business_name || '—'}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{p.deleted_at ? format(new Date(p.deleted_at), 'dd MMM yyyy') : '—'}</p>
                  <button onClick={() => restoreProduct(p)} className="flex items-center gap-1.5 text-xs font-bold text-herb hover:text-herb-dark underline underline-offset-2">
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                </div>
              </div>
            ))}
            {filteredDeleted.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No deleted products</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-lionsmane border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Deleted At</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeleted.map(p => (
                  <tr key={p.id} className="hover:bg-lionsmane">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.description?.slice(0, 60) || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{p.supplier?.business_name || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{p.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">€{Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{p.deleted_at ? format(new Date(p.deleted_at), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button onClick={() => restoreProduct(p)} className="flex items-center gap-1.5 text-xs font-bold text-herb hover:text-herb-dark underline underline-offset-2">
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeleted.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No deleted products</p>}
          </div>
        </>
      ) : loading ? <SkeletonTable rows={6} /> : (
        <>
          {/* Mobile card list - active products */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(product => (
              <div key={product.id} ref={product.id === highlightId ? highlightRef : null} className={`bg-white rounded-xl border p-4 shadow-sm ${product.id === highlightId ? 'border-herb-light outline outline-2 outline-herb-light' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                  <span className="text-sm font-bold text-midnight-dark flex-shrink-0">€{Number(product.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{product.supplier?.business_name || '—'}</p>
                <div className="flex items-center justify-between">
                  <Badge status={product.is_active ? 'active' : 'inactive'} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewProduct(product)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleClick(product)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                      {product.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setDeleteTarget(product)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                        <button onClick={() => setDeleteTarget(product)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
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
        </>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Delete Product</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-red-700 mb-1">This will permanently delete the product:</p>
              <p className="text-sm text-red-600 font-medium">"{deleteTarget.name}" by {deleteTarget.supplier?.business_name || 'this supplier'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-lionsmane">
                Cancel
              </button>
              <button onClick={deleteProduct} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
