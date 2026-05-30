import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import ProductForm from '../../components/supplier/ProductForm'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ImageOff, X, Truck, ChevronDown, ChevronUp, MoreVertical, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'

function DeliveryFeeTable() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState([])

  useEffect(() => {
    supabase.from('delivery_fee_rules').select('*').order('min_km').then(({ data }) => setRules(data || []))
  }, [])

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
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td className="px-4 py-2 text-gray-700">{rule.label || `${rule.min_km}–${rule.max_km ?? '∞'} km`}</td>
                  <td className="px-4 py-2 text-right font-semibold text-midnight-dark">€{Number(rule.fee).toFixed(2)}</td>
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)

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
    const { data } = await supabase.from('products').select('*').eq('supplier_id', supplierId).is('deleted_at', null).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('products').update({ deleted_at: new Date().toISOString(), deleted_by: user.id, is_active: false }).eq('id', deleteTarget.id)
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    toast.success(t('productDeletedToast'))
  }

  async function toggleActive(product) {
    const { data } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id).select().single()
    setProducts(prev => prev.map(p => p.id === product.id ? data : p))
    toast.success(data.is_active ? t('toastMarkedInStock') : t('toastMarkedOutOfStock'))
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
              <h2 className="text-xl font-bold text-midnight">{editProduct ? t('editProductBtn') : t('addNewProductBtn')}</h2>
              <button
                onClick={() => { setShowForm(false); setEditProduct(null) }}
                className="p-2 hover:bg-lionsmane rounded-xl transition-colors text-slate-500"
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
                toast.success(editProduct ? t('toastProductUpdated') : t('toastProductAdded'))
              }}
              onCancel={() => { setShowForm(false); setEditProduct(null) }}
            />
          </div>
        </div></ModalPortal>
      )}

      <DeliveryFeeTable />

      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-celeste mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('noProductsYetSupplier')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" /> {t('addFirstProduct')}
          </button>
        </div>
      ) : (
        <>
        {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

        {/* Mobile card list */}
        <div className="flex flex-col gap-3 md:hidden">
          {products.map(product => {
            const imgUrl = getImageUrl(product.image_url)
            return (
              <div key={product.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {imgUrl
                      ? <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.category}{product.unit_type ? ` · ${product.unit_type}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-midnight-dark">€{Number(product.price).toFixed(2)}</span>
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === product.id ? null : product.id) }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === product.id && (
                        <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-1">
                          <button
                            onClick={() => { toggleActive(product); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-lionsmane text-left"
                          >
                            {product.is_active
                              ? <><ToggleLeft className="w-4 h-4 text-gray-400" /> {t('outOfStock')}</>
                              : <><ToggleRight className="w-4 h-4 text-midnight" /> {t('inStock')}</>
                            }
                          </button>
                          <button
                            onClick={() => { setEditProduct(product); setShowForm(true); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-lionsmane text-left"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" /> {t('editProductBtn')}
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(product); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                          >
                            <Trash2 className="w-4 h-4" /> {t('delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 ml-15">
                  <Badge status={product.is_active ? 'active' : 'inactive'} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="card overflow-hidden hidden md:block">
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
                  <tr
                    key={product.id}
                    onClick={() => { setEditProduct(product); setShowForm(true) }}
                    className="hover:bg-lionsmane transition-colors cursor-pointer"
                  >
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
                    <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === product.id && (
                          <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-1">
                            <button
                              onClick={() => { toggleActive(product); setOpenMenu(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-lionsmane text-left"
                            >
                              {product.is_active
                                ? <><ToggleLeft className="w-4 h-4 text-gray-400" /> {t('outOfStock')}</>
                                : <><ToggleRight className="w-4 h-4 text-midnight" /> {t('inStock')}</>
                              }
                            </button>
                            <button
                              onClick={() => { setEditProduct(product); setShowForm(true); setOpenMenu(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-lionsmane text-left"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400" /> {t('editProductBtn')}
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(product); setOpenMenu(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                            >
                              <Trash2 className="w-4 h-4" /> {t('delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Delete Product Confirmation */}
      {deleteTarget && (
        <ModalPortal><div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t('deleteProductTitle')}</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-red-700 mb-1">{t('deleteProductWarning')}</p>
              <p className="text-sm text-red-600 font-medium">{deleteTarget.name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 text-sm py-2">{t('cancel')}</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">{t('delete')}</button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
