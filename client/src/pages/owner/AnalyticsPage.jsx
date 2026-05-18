import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import RevenueChart from '../../components/charts/RevenueChart'
import TopProductsChart from '../../components/charts/TopProductsChart'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import DateRangeFilter, { rangeFromKey } from '../../components/ui/DateRangeFilter'
import { TrendingUp, ShoppingBag, Euro, Package } from 'lucide-react'
import { SkeletonCard } from '../../components/ui/Skeleton'

const COLORS = ['#083A4F', '#D4A017', '#1B4332', '#A58D66', '#40916C', '#74C69D', '#9CA3AF']

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [range, setRange] = useState(() => rangeFromKey('month'))
  const [stats, setStats] = useState(null)
  const [monthlySpend, setMonthlySpend] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user, range])

  async function loadData() {
    setLoading(true)
    const rangeStart = range.from ? range.from.toISOString() : null
    const rangeEnd = range.to ? range.to.toISOString() : null

    let ordersQuery = supabase.from('orders').select('*, order_splits(*)').eq('restaurant_owner_id', user.id)
    let splitsQuery = supabase.from('order_splits')
      .select('*, order:orders!inner(restaurant_owner_id)')
      .eq('order.restaurant_owner_id', user.id)
    let itemsQuery = supabase.from('order_items')
      .select('*, product:products(name, category), order_split:order_splits!inner(created_at, order:orders!inner(restaurant_owner_id))')
      .eq('order_split.order.restaurant_owner_id', user.id)
    if (rangeStart) {
      ordersQuery = ordersQuery.gte('created_at', rangeStart)
      splitsQuery = splitsQuery.gte('created_at', rangeStart)
      itemsQuery = itemsQuery.gte('order_split.created_at', rangeStart)
    }
    if (rangeEnd) {
      ordersQuery = ordersQuery.lte('created_at', rangeEnd)
      splitsQuery = splitsQuery.lte('created_at', rangeEnd)
      itemsQuery = itemsQuery.lte('order_split.created_at', rangeEnd)
    }

    const [ordersRes, splitsRes, itemsRes] = await Promise.all([ordersQuery, splitsQuery, itemsQuery])
    const orders = ordersRes.data || []
    const splits = splitsRes.data || []

    // Stats
    const totalSpend = splits.reduce((s, sp) => s + Number(sp.subtotal), 0)
    setStats({
      totalSpend,
      totalOrders: orders.length,
      periodOrders: orders.length,
      periodSpend: totalSpend,
    })

    // Spend trend across the selected range
    const monthMap = {}
    splits.forEach(sp => {
      const month = new Date(sp.created_at).toLocaleDateString('de-DE', {
        month: 'short',
        year: range.key === 'year' || range.key === 'custom' ? '2-digit' : undefined,
      })
      monthMap[month] = (monthMap[month] || 0) + Number(sp.subtotal)
    })
    setMonthlySpend(Object.entries(monthMap).slice(-12).map(([month, revenue]) => ({ month, revenue })))

    // Category breakdown — fed into the pie chart
    const catMap = {}
    const allItems = itemsRes.data || []
    allItems.forEach(item => {
      const cat = item.product?.category || 'Other'
      catMap[cat] = (catMap[cat] || 0) + item.price_at_time * item.quantity
    })
    setCategoryBreakdown(
      Object.entries(catMap)
        .map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }))
        .sort((a, b) => b.revenue - a.revenue)
    )

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

  const categoryTotal = categoryBreakdown.reduce((s, c) => s + c.revenue, 0)
  const categoryPie = categoryBreakdown.slice(0, 7).map(c => ({
    ...c,
    pct: categoryTotal > 0 ? Math.round((c.revenue / categoryTotal) * 100) : 0,
  }))

  const summaryContext = stats ? {
    totalSpendThisPeriod: stats.periodSpend?.toFixed(2),
    totalOrdersThisPeriod: stats.periodOrders,
    range: range.key,
    topCategory: categoryBreakdown[0]?.name,
    topProducts: topProducts.slice(0, 3).map(p => p.name),
  } : null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Spend (period)', value: `€${stats?.periodSpend?.toFixed(2) || '0.00'}`, icon: Euro, color: 'text-primary' },
              { label: 'Orders (period)', value: stats?.periodOrders || 0, icon: ShoppingBag, color: 'text-blue-600' },
              { label: 'Top Category', value: categoryBreakdown[0]?.name || '—', icon: Package, color: 'text-purple-600' },
              { label: 'Top Product', value: topProducts[0]?.name || '—', icon: TrendingUp, color: 'text-accent' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className="text-xl font-black text-gray-900 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <RevenueChart data={monthlySpend} title="Spending Trend" />
            <TopProductsChart data={topProducts} title="Top Products Ordered" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* New pie chart — spending share by category */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Spending by Category</h3>
              {categoryPie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="revenue">
                        {categoryPie.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Spent']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {categoryPie.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate flex-1">{item.name}</span>
                        <span className="text-xs font-bold text-gray-900">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category breakdown bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Top Categories (€)</h3>
              {categoryBreakdown.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <div className="space-y-2 pt-2">
                  {categoryBreakdown.slice(0, 6).map((c, i) => {
                    const max = categoryBreakdown[0]?.revenue || 1
                    const pct = (c.revenue / max) * 100
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">{c.name}</span>
                          <span className="text-xs font-bold text-gray-900">€{c.revenue.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* AI insight pinned at the bottom — matches supplier analytics layout */}
          {summaryContext && <AnalyticsSummary context={summaryContext} />}
        </>
      )}
    </div>
  )
}
