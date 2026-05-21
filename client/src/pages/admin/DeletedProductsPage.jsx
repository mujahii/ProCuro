import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { PackageX, RotateCcw, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

export default function DeletedProductsPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('*, supplier:supplier_profiles(id, business_name), deleter:deleted_by(full_name, email)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function restore(product) {
    await supabase.from('products').update({ deleted_at: null, deleted_by: null, is_active: true }).eq('id', product.id)
    setProducts(prev => prev.filter(p => p.id !== product.id))
    toast.success(t('productRestored'))
  }

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier?.business_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <PackageX className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-black text-gray-900">{t('deletedProducts')}</h1>
        {products.length > 0 && (
          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{products.length}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">{t('deletedProductsDesc')}</p>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or supplier…" className="pl-9 input text-sm py-2 w-full max-w-sm" />
      </div>

      {loading ? <SkeletonTable rows={5} /> : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <PackageX className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{t('noDeletedProducts')}</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.supplier?.business_name || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('deletedAt')}: {p.deleted_at ? format(new Date(p.deleted_at), 'dd MMM yyyy HH:mm') : '—'}</p>
                  </div>
                  <button onClick={() => restore(p)} className="flex items-center gap-1.5 text-xs font-bold text-herb hover:text-herb-dark underline underline-offset-2 flex-shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" /> {t('restoreProduct')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-lionsmane border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">{t('deletedAt')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-lionsmane">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.description?.slice(0, 60) || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.supplier?.business_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">€{Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                      {p.deleted_at ? format(new Date(p.deleted_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => restore(p)} className="flex items-center gap-1.5 text-xs font-bold text-herb hover:text-herb-dark underline underline-offset-2">
                        <RotateCcw className="w-3.5 h-3.5" /> {t('restoreProduct')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
