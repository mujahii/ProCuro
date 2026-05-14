import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import ProductForm from '../../components/supplier/ProductForm'
import { Euro, ShoppingBag, TrendingUp, Package, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Clock } from 'lucide-react'
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
    const activeSplits = splits.filter(s => !['delivered', 'cancelled'].includes(s.status))

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
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Suspended banner — highest priority */}
      {!loading && user?.is_banned && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Account suspended</p>
            <p className="text-sm text-red-700 mt-0.5">Your account has been suspended by the admin. Your profile and products are no longer visible in the store. If you believe this is a mistake, contact us at <span className="font-semibold">procuro@admin.com</span>.</p>
          </div>
        </div>
      )}

      {/* Certification status banner */}
      {!loading && !user?.is_banned && !supplierProfile?.is_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">Account not certified yet</p>
              <p className="text-sm text-amber-700 mt-0.5">Your products are hidden from the store until you complete the steps below.</p>
            </div>
          </div>
          <div className="space-y-2 ml-8">
            <div className="flex items-center gap-2 text-sm">
              {certStatus.hasApprovedCert
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : certStatus.certPending
                  ? <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={certStatus.hasApprovedCert ? 'text-emerald-700 font-medium' : 'text-slate-700'}>
                Halal Certificate {certStatus.hasApprovedCert ? '— Approved' : certStatus.certPending ? '— Pending review' : '— Upload required'}
              </span>
              {!certStatus.hasApprovedCert && (
                <button onClick={() => navigate('/supplier/certificates')} className="text-xs text-emerald-600 font-semibold hover:underline ml-1">
                  Go →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {certStatus.hasBank
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
              <span className={certStatus.hasBank ? 'text-emerald-700 font-medium' : 'text-slate-700'}>
                Bank Details {certStatus.hasBank ? '— Added' : '— Required'}
              </span>
              {!certStatus.hasBank && (
                <button onClick={() => navigate('/supplier/profile')} className="text-xs text-emerald-600 font-semibold hover:underline ml-1">
                  Go →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !user?.is_banned && supplierProfile?.is_verified && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">Account certified</p>
            <p className="text-sm text-emerald-700">Your products are visible in the store.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Euro className="w-5 h-5 text-emerald-400" />
                <p className="text-slate-300 text-sm font-medium">Total Revenue</p>
              </div>
              <p className="text-3xl font-black">€{stats.totalRevenue.toFixed(2)}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-xs text-emerald-400 font-medium">€{stats.monthRevenue.toFixed(2)} this month</p>
              </div>
            </div>

            {/* Active Orders */}
            <div
              onClick={() => navigate('/supplier/orders')}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                <p className="text-slate-500 text-sm font-medium">Active Orders</p>
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.activeOrders}</p>
              <p className="text-xs text-slate-400 mt-2">{stats.pendingOrders} awaiting confirmation</p>
            </div>

            {/* Analytics link */}
            <div
              onClick={() => navigate('/supplier/analytics')}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <p className="text-slate-500 text-sm font-medium">Analytics</p>
              </div>
              <p className="text-lg font-bold text-slate-900">See Full Analysis</p>
              <p className="text-xs text-slate-400 mt-2">Charts, trends & AI insights</p>
            </div>
          </div>

          {/* AI Summary */}
          {summaryContext && <AnalyticsSummary context={summaryContext} />}

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">My Products</h2>
              <button
                onClick={() => navigate('/supplier/products')}
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Manage All
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No products yet</p>
                <button
                  onClick={() => navigate('/supplier/products')}
                  className="mt-3 text-sm text-emerald-600 font-semibold hover:underline"
                >
                  Add your first product
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex gap-4 items-center"
                    >
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        {product.image_url ? (
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className={`w-full h-full object-cover ${!product.is_active ? 'grayscale opacity-60' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        {!product.is_active && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-slate-600 bg-white/80 px-1 py-0.5 rounded">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{product.name}</p>
                        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {product.is_active ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <p className="text-sm font-bold text-slate-900 mt-1">€{Number(product.price).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {product.unit_type}</span></p>
                      </div>
                      <button
                        onClick={() => setEditProduct(product)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
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
                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-sm text-slate-500">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors disabled:opacity-40"
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
              <h2 className="text-xl font-bold text-slate-900">Edit Product</h2>
              <button
                onClick={() => setEditProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
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
                toast.success('Product updated!')
              }}
              onCancel={() => setEditProduct(null)}
            />
          </div>
        </div></ModalPortal>
      )}
    </div>
  )
}
