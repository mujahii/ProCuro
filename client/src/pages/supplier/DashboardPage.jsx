import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import RevenueChart from '../../components/charts/RevenueChart'
import OrdersByStatusChart from '../../components/charts/OrdersByStatusChart'
import TopProductsChart from '../../components/charts/TopProductsChart'
import CategorySalesChart from '../../components/charts/CategorySalesChart'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Euro, ShoppingBag, Clock, Package } from 'lucide-react'

export default function SupplierDashboardPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryRevenue, setCategoryRevenue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) loadData(sp.id)
  }

  async function loadData(supplierId) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [splitsRes, itemsRes] = await Promise.all([
      supabase.from('order_splits').select('*').eq('supplier_id', supplierId),
      supabase.from('order_items').select('*, product:products(name, category), order_split:order_splits!inner(supplier_id)').eq('order_split.supplier_id', supplierId),
    ])

    const splits = splitsRes.data || []
    const items = itemsRes.data || []

    // Stats
    const deliveredSplits = splits.filter(s => s.status === 'delivered')
    const monthSplits = splits.filter(s => new Date(s.created_at) >= monthStart)
    const pending = splits.filter(s => ['pending_confirmation', 'pending_payment'].includes(s.status))

    setStats({
      totalRevenue: deliveredSplits.reduce((s, sp) => s + Number(sp.subtotal), 0),
      monthRevenue: monthSplits.filter(s => s.status === 'delivered').reduce((s, sp) => s + Number(sp.subtotal), 0),
      totalOrders: splits.length,
      monthOrders: monthSplits.length,
      pendingOrders: pending.length,
      activeProducts: 0,
    })

    // Monthly revenue
    const monthMap = {}
    splits.forEach(sp => {
      const month = new Date(sp.created_at).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      monthMap[month] = (monthMap[month] || 0) + Number(sp.subtotal)
    })
    setMonthlyRevenue(Object.entries(monthMap).slice(-12).map(([month, revenue]) => ({ month, revenue })))

    // Status breakdown
    const statusMap = {}
    splits.forEach(sp => { statusMap[sp.status] = (statusMap[sp.status] || 0) + 1 })
    setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

    // Top products
    const productMap = {}
    items.forEach(item => {
      const name = item.product?.name || 'Unknown'
      productMap[name] = (productMap[name] || 0) + item.quantity
    })
    setTopProducts(Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })))

    // Category revenue
    const catMap = {}
    items.forEach(item => {
      const cat = item.product?.category || 'Other'
      catMap[cat] = (catMap[cat] || 0) + item.price_at_time * item.quantity
    })
    setCategoryRevenue(Object.entries(catMap).map(([name, revenue]) => ({ name, revenue })))

    // Active products count
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).eq('is_active', true)
    setStats(prev => ({ ...prev, activeProducts: count || 0 }))
    setLoading(false)
  }

  const summaryContext = stats ? {
    revenueThisMonth: stats.monthRevenue?.toFixed(2),
    ordersThisMonth: stats.monthOrders,
    pendingOrders: stats.pendingOrders,
    topProduct: topProducts[0]?.name,
    activeProducts: stats.activeProducts,
  } : null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Revenue (Month)', value: `€${stats?.monthRevenue?.toFixed(2) || '0.00'}`, icon: Euro, color: 'text-primary' },
              { label: 'Orders (Month)', value: stats?.monthOrders || 0, icon: ShoppingBag, color: 'text-blue-600' },
              { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Clock, color: 'text-yellow-600' },
              { label: 'Active Products', value: stats?.activeProducts || 0, icon: Package, color: 'text-purple-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className="text-xl font-black text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <RevenueChart data={monthlyRevenue} title="Monthly Revenue" />
            <OrdersByStatusChart data={statusBreakdown} title="Orders by Status" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <TopProductsChart data={topProducts} title="Top Products by Quantity" />
            <CategorySalesChart data={categoryRevenue} title="Revenue by Category" />
          </div>
          {summaryContext && <AnalyticsSummary context={summaryContext} />}
        </>
      )}
    </div>
  )
}
