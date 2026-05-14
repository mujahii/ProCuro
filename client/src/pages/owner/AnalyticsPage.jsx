import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import RevenueChart from '../../components/charts/RevenueChart'
import TopProductsChart from '../../components/charts/TopProductsChart'
import CategorySalesChart from '../../components/charts/CategorySalesChart'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import { TrendingUp, ShoppingBag, Euro, Package } from 'lucide-react'
import { SkeletonCard } from '../../components/ui/Skeleton'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [monthlySpend, setMonthlySpend] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    const [ordersRes, splitsRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*, order_splits(*)').eq('restaurant_owner_id', user.id),
      supabase.from('order_splits').select('*, order:orders!inner(restaurant_owner_id)').eq('order.restaurant_owner_id', user.id),
      supabase.from('order_items').select('*, product:products(name, category), order_split:order_splits(*, order:orders!inner(restaurant_owner_id))'),
    ])

    const orders = ordersRes.data || []
    const splits = splitsRes.data || []

    // Stats
    const totalSpend = splits.reduce((s, sp) => s + Number(sp.subtotal), 0)
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const monthlyOrders = orders.filter(o => new Date(o.created_at) >= thisMonth)
    setStats({
      totalSpend,
      totalOrders: orders.length,
      thisMonthOrders: monthlyOrders.length,
      thisMonthSpend: splits.filter(sp => new Date(sp.created_at) >= thisMonth).reduce((s, sp) => s + Number(sp.subtotal), 0),
    })

    // Monthly spend (last 12 months)
    const monthMap = {}
    splits.forEach(sp => {
      const month = new Date(sp.created_at).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      monthMap[month] = (monthMap[month] || 0) + Number(sp.subtotal)
    })
    setMonthlySpend(Object.entries(monthMap).slice(-12).map(([month, revenue]) => ({ month, revenue })))

    // Category breakdown
    const catMap = {}
    const allItems = itemsRes.data || []
    allItems.forEach(item => {
      const cat = item.product?.category || 'Other'
      catMap[cat] = (catMap[cat] || 0) + item.price_at_time * item.quantity
    })
    setCategoryBreakdown(Object.entries(catMap).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue))

    // Top products by quantity ordered
    const productMap = {}
    allItems.forEach(item => {
      const name = item.product?.name || 'Unknown'
      productMap[name] = (productMap[name] || 0) + item.quantity
    })
    setTopProducts(
      Object.entries(productMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6)
    )

    setLoading(false)
  }

  const summaryContext = stats ? {
    totalSpendThisMonth: stats.thisMonthSpend?.toFixed(2),
    totalOrdersThisMonth: stats.thisMonthOrders,
    totalSpendAllTime: stats.totalSpend?.toFixed(2),
    topCategory: categoryBreakdown[0]?.name,
    topProducts: topProducts.slice(0, 3).map(p => p.name),
  } : null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Analytics</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'This Month Spend', value: `€${stats?.thisMonthSpend?.toFixed(2) || '0.00'}`, icon: Euro, color: 'text-primary' },
              { label: 'This Month Orders', value: stats?.thisMonthOrders || 0, icon: ShoppingBag, color: 'text-blue-600' },
              { label: 'Total Orders', value: stats?.totalOrders || 0, icon: Package, color: 'text-purple-600' },
              { label: 'Total Spend', value: `€${stats?.totalSpend?.toFixed(2) || '0.00'}`, icon: TrendingUp, color: 'text-accent' },
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
            <RevenueChart data={monthlySpend} title="Monthly Spending" />
            <TopProductsChart data={topProducts} title="Top Products Ordered" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategorySalesChart data={categoryBreakdown} title="Spending by Category" />
            {summaryContext && <AnalyticsSummary context={summaryContext} />}
          </div>
        </>
      )}
    </div>
  )
}
