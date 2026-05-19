import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import ProductForm from '../../components/supplier/ProductForm'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ImageOff, X, Truck, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'

const DELIVERY_TIERS = [
  { range: '0 – 5 km',    fee: '€2.00' },
  { range: '5 – 15 km',   fee: '€4.50' },
  { range: '15 – 30 km',  fee: '€7.50' },
  { range: '30 – 75 km',  fee: '€13.00' },
  { range: '75 – 150 km', fee: '€20.00' },
  { range: '150+ km',     fee: '€28.00' },
]

function DeliveryFeeTable() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-6 border border-celeste rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-lionsmane hover:bg-celeste transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-midnight">
          <Truck className="w-4 h-4" /> {t('deliveryFeeStructure')}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-midnight" /> : <ChevronDown className="w-4 h-4 text-midnight" />}
      </button>
      {open && (
        <div className="bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-lionsmane border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('distanceLabel')}</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('deliveryFee')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {DELIVERY_TIERS.map(t => (
                <tr key={t.range}>
                  <td className="px-4 py-2 text-gray-700">{t.range}</td>
                  <td className="px-4 py-2 text-right font-semibold text-midnight-dark">{t.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-50">
            Fees are automatically applied at checkout based on the distance between your business and the restaurant.
          </p>
        </div>
      )}
    </div>
  )
}

export default function SupplierProductsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [products, setProducts] = useState([])
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) {
      loadProducts(sp.id)
    } else {
      setLoading(false)
    }
  }

  async function loadProducts(supplierId) {
    const { data } = await supabase.from('products').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  async function toggleActive(product) {
    const { data } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id).select().single()
    setProducts(prev => prev.map(p => p.id === product.id ? data : p))
    toast.success(data.is_active ? 'Marked as In Stock' : 'Marked as Out of Stock')
  }

  function getImageUrl(path) {
    if (!path) return null
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data?.publicUrl
  }

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-6"><SkeletonTable rows={5} /></div>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">{t('products')}</h1>
        <button onClick={() => { setEditProduct(null); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> {t('addProductBtn')}
        </button>
      </div>

      {showForm && (
        <ModalPortal><div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-6 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{editProduct ? t('editProductBtn') : t('addNewProductBtn')}</h2>
              <button
                onClick={() => { setShowForm(false); setEditProduct(null) }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ProductForm
              product={editProduct}
              supplierId={supplierProfile?.id}
              onSave={(saved) => {
                if (editProduct) {
                  setProducts(prev => prev.map(p => p.id === saved.id ? saved : p))
                } else {
                  setProducts(prev => [saved, ...prev])
                }
                setShowForm(false)
                setEditProduct(null)
                toast.success(editProduct ? 'Product updated!' : 'Product added!')
              }}
              onCancel={() => { setShowForm(false); setEditProduct(null) }}
            />
          </div>
        </div></ModalPortal>
      )}

      <DeliveryFeeTable />

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 font-medium">{t('noProductsYetSupplier')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> {t('addFirstProduct')}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-lionsmane border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('productLabel')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t('categoryLabel')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('priceLabel')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('statusLabel')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(product => {
                const imgUrl = getImageUrl(product.image_url)
                return (
                  <tr key={product.id} className="hover:bg-lionsmane transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {imgUrl ? (
                            <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.unit_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">€{Number(product.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge status={product.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleActive(product)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          {product.is_active ? <ToggleRight className="w-7 h-7 text-midnight" /> : <ToggleLeft className="w-7 h-7 text-gray-300" />}
                        </button>
                        <button onClick={() => { setEditProduct(product); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
