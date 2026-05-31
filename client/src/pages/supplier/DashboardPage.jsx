import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { useLanguage } from '../../context/LanguageContext'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import ProductForm from '../../components/supplier/ProductForm'
import { Euro, ShoppingBag, TrendingUp, Package, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Clock, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'

const PAGE_SIZE = 4

function getImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function SupplierDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addresses } = useAddresses()
  const { t } = useLanguage()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(0)
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState(null)
  const [certStatus, setCertStatus] = useState({ hasBank: false, hasApprovedCert: false, certPending: false })

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) {
      loadData(sp.id)
      const [bankRes, certRes] = await Promise.all([
        supabase.from('supplier_bank_details').select('iban').eq('supplier_id', sp.id).maybeSingle(),
        supabase.from('halal_certificates').select('status').eq('supplier_id', sp.id).order('uploaded_at', { ascending: false }),
      ])
      const certs = certRes.data || []
      setCertStatus({
        hasBank: !!(bankRes.data?.iban?.trim()),
        hasApprovedCert: certs.some(c => c.status === 'approved'),
        certPending: certs.some(c => c.status === 'pending'),
      })
    } else {
      setLoading(false)
    }
  }

  async function loadData(supplierId) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [splitsRes, productsRes, itemsRes] = await Promise.all([
      supabase.from('order_splits').select('*').eq('supplier_id', supplierId),
      supabase.from('products').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }),
      supabase.from('order_items').select('*, product:products(name, category), order_split:order_splits!inner(supplier_id)').eq('order_split.supplier_id', supplierId),
    ])

    const splits = splitsRes.data || []
    const items = itemsRes.data || []

    const deliveredSplits = splits.filter(s => s.status === 'delivered')
    const monthSplits = splits.filter(s => new Date(s.created_at) >= monthStart)
    const activeSplits = splits.filter(s => ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'cancellation_requested', 'delivery_dispute'].includes(s.status))

    const productMap = {}
    items.forEach(item => {
      const name = item.product?.name || 'Unknown'
      productMap[name] = (productMap[name] || 0) + item.quantity
    })
    setTopProducts(Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })))

    setStats({
      totalRevenue: deliveredSplits.reduce((s, sp) => s + Number(sp.subtotal), 0),
      monthRevenue: monthSplits.filter(s => s.status === 'delivered').reduce((s, sp) => s + Number(sp.subtotal), 0),
      activeOrders: activeSplits.length,
      totalOrders: splits.length,
      monthOrders: monthSplits.length,
      pendingOrders: splits.filter(s => s.status === 'pending_confirmation').length,
    })

    setProducts(productsRes.data || [])
    setLoading(false)
  }

  const pageProducts = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(products.length / PAGE_SIZE)

  const summaryContext = stats ? {
    revenueThisMonth: stats.monthRevenue?.toFixed(2),
    ordersThisMonth: stats.monthOrders,
    pendingOrders: stats.pendingOrders,
    topProduct: topProducts[0]?.name,
    activeProducts: products.filter(p => p.is_active).length,
  } : null

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-midnight">{t('navDashboard')}</h1>

      {/* Suspended banner — highest priority */}
      {!loading && user?.is_banned && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">{t('accountSuspendedTitle')}</p>
            <p className="text-sm text-red-700 mt-0.5">{t('accountSuspendedDesc')} <a href="/supplier/chat" className="font-semibold underline underline-offset-2 hover:text-red-900 inline-flex items-center gap-0.5">{t('accountSuspendedChatLink')}</a></p>
          </div>
        </div>
      )}

      {/* Certification status banner */}
      {!loading && !user?.is_banned && (!supplierProfile?.is_verified || addresses.length === 0 || !supplierProfile?.city?.trim() || !certStatus.hasBank) && (
        <div className="bg-lionsmane border border-marigold-light rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-marigold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-marigold-dark">{t('accountNotCertifiedTitle')}</p>
              <p className="text-sm text-marigold-dark mt-0.5">{t('accountNotCertifiedDesc')}</p>
            </div>
          </div>
          <div className="space-y-2 ml-8">
            <div className="flex items-center gap-2 text-sm">
              {certStatus.hasApprovedCert
                ? <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />
                : certStatus.certPending
                  ? <Clock className="w-4 h-4 text-marigold flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={certStatus.hasApprovedCert ? 'text-midnight-dark font-medium' : 'text-slate-700'}>
                {t('halalCertLabel')} {certStatus.hasApprovedCert ? t('certApprovedStatus') : certStatus.certPending ? t('certPendingStatus') : t('certUploadRequired')}
              </span>
              {!certStatus.hasApprovedCert && (
                <button onClick={() => navigate('/supplier/profile')} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark ml-1">
                  Go →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {certStatus.hasBank
                ? <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={certStatus.hasBank ? 'text-midnight-dark font-medium' : 'text-slate-700'}>
                {t('bankDetails')} {certStatus.hasBank ? t('bankDetailsAddedStatus') : t('bankDetailsRequiredStatus')}
              </span>
              {!certStatus.hasBank && (
                <button onClick={() => navigate('/supplier/profile')} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark ml-1">
                  Go →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {addresses.length > 0
                ? <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={addresses.length > 0 ? 'text-midnight-dark font-medium' : 'text-slate-700'}>
                {t('businessAddressLabel')} {addresses.length > 0 ? t('bankDetailsAddedStatus') : t('bankDetailsRequiredStatus')}
              </span>
              {addresses.length === 0 && (
                <button onClick={() => navigate('/supplier/profile')} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark ml-1">
                  Go →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {supplierProfile?.city?.trim()
                ? <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />
                : <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={supplierProfile?.city?.trim() ? 'text-midnight-dark font-medium' : 'text-slate-700'}>
                {t('cityLocation')} {supplierProfile?.city?.trim() ? `— ${supplierProfile.city}` : t('selectAtLeastOneLocation')}
              </span>
              {!supplierProfile?.city?.trim() && (
                <button onClick={() => navigate('/supplier/profile')} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark ml-1">
                  Go →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !user?.is_banned && supplierProfile?.is_verified && addresses.length > 0 && supplierProfile?.city?.trim() && certStatus.hasBank && (
        <div className="bg-herb/10 border border-herb/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-herb flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-herb-dark">{t('accountCertifiedTitle')}</p>
            <p className="text-sm text-herb">{t('accountCertifiedDesc')}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 card animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Euro className="w-5 h-5 text-herb" />
                <p className="text-slate-500 text-sm font-medium">{t('totalRevenueLabel')}</p>
              </div>
              <p className="font-display text-3xl font-black text-midnight">€{stats.totalRevenue.toFixed(2)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-herb" />
                <p className="text-xs text-herb font-medium">€{stats.monthRevenue.toFixed(2)} {t('thisMonthLabel')}</p>
              </div>
            </div>

            {/* Active Orders */}
            <div
              onClick={() => navigate('/supplier/orders')}
              className="card card-lift p-6 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-celeste/30 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4 h-4 text-herb-dark" />
                </div>
                <p className="text-herb-dark text-sm font-semibold">{t('activeOrdersLabel')}</p>
              </div>
              <p className="stat-value text-3xl">{stats.activeOrders}</p>
              <p className="text-xs text-herb mt-2 font-medium">{stats.pendingOrders} {t('awaitingConfirmationLabel')}</p>
            </div>

            {/* Analytics link */}
            <div
              onClick={() => navigate('/supplier/analytics')}
              className="card card-lift p-6 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-marigold/15 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-marigold-dark" />
                </div>
                <p className="text-marigold-dark text-sm font-semibold">{t('analytics')}</p>
              </div>
              <p className="font-display text-lg font-bold text-midnight">{t('seeFullAnalysis')}</p>
              <p className="text-xs text-herb mt-2">{t('chartsTrendsAI')}</p>
            </div>
          </div>

          {/* AI Summary */}
          {summaryContext && <AnalyticsSummary context={summaryContext} />}

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-midnight">{t('myProductsTitle')}</h2>
              <button
                onClick={() => navigate('/supplier/products')}
                className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark transition-colors"
              >
                {t('manageAll')}
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 card">
                <Package className="w-10 h-10 text-celeste mx-auto mb-3" />
                <p className="text-herb text-sm">{t('noProductsYetSupplier')}</p>
                <button
                  onClick={() => navigate('/supplier/products')}
                  className="mt-3 text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
                >
                  {t('addFirstProduct')}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageProducts.map(product => (
                    <div
                      key={product.id}
                      className="card p-3 flex gap-4 items-center"
                    >
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-lionsmane">
                        {product.image_url ? (
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className={`w-full h-full object-cover ${!product.is_active ? 'grayscale opacity-60' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-marigold/50">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        {!product.is_active && (
                          <div className="absolute inset-0 flex items-center justify-center bg-midnight/40">
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-midnight/60">{t('outOfStockText')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-midnight text-sm truncate">{product.name}</p>
                        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 border ${product.is_active ? 'bg-herb/10 text-herb-dark border-herb/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {product.is_active ? t('inStock') : t('outOfStockText')}
                        </span>
                        <p className="text-sm font-bold text-midnight mt-1">€{Number(product.price).toFixed(2)} <span className="text-xs font-normal text-herb">/ {product.unit_type}</span></p>
                      </div>
                      <button
                        onClick={() => setEditProduct(product)}
                        className="p-2 text-herb hover:text-midnight hover:bg-lionsmane rounded-xl transition-colors flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="w-8 h-8 rounded-full border border-celeste/50 flex items-center justify-center hover:border-herb transition-colors disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-sm text-midnight/60">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="w-8 h-8 rounded-full border border-celeste/50 flex items-center justify-center hover:border-herb transition-colors disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
      {editProduct && (
        <ModalPortal><div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl my-6 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-midnight">{t('editProductBtn')}</h2>
              <button
                onClick={() => setEditProduct(null)}
                className="p-2 hover:bg-lionsmane rounded-xl transition-colors text-herb"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ProductForm
              product={editProduct}
              supplierId={supplierProfile?.id}
              onSave={(saved) => {
                setProducts(prev => prev.map(p => p.id === saved.id ? saved : p))
                setEditProduct(null)
                toast.success(t('toastProductUpdated'))
              }}
              onCancel={() => setEditProduct(null)}
            />
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
