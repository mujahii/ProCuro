import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import RevenueChart from '../../components/charts/RevenueChart'
import TopProductsChart from '../../components/charts/TopProductsChart'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import DateRangeFilter, { rangeFromKey } from '../../components/ui/DateRangeFilter'
import { TrendingUp, ShoppingBag, Euro, Package } from 'lucide-react'
import { SkeletonCard } from '../../components/ui/Skeleton'

const COLORS = ['#083A4F', '#D4A017', '#1B4332', '#A58D66', '#40916C', '#74C69D', '#9CA3AF']

const CAT_KEY_MAP = {
  Meat: 'catMeat', Poultry: 'catPoultry', Seafood: 'catSeafood',
  Dairy: 'catDairy', Vegetables: 'catVegetables', Fruits: 'catFruits',
  Bakery: 'catBakery', Beverages: 'catBeverages', Spices: 'catSpices', Other: 'catOther',
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const tCat = (name) => (CAT_KEY_MAP[name] ? t(CAT_KEY_MAP[name]) : name || '—')
  const [range, setRange] = useState(() => rangeFromKey('month'))
  const [stats, setStats] = useState(null)
  const [monthlySpend, setMonthlySpend] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiContext, setAiContext] = useState(null)
  const aiContextSet = useRef(false)

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
      .select('*, product:products(name, category), order_split:order_splits!inner(created_at, status, order:orders!inner(restaurant_owner_id))')
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
    const splits = splitsRes.data || []
    const completedSplits = splits.filter(sp => sp.status === 'delivered' || sp.status === 'completed')
    const allItems = (itemsRes.data || []).filter(item => ['delivered', 'completed'].includes(item.order_split?.status))

    // Stats — delivered/completed orders only
    const totalSpend = completedSplits.reduce((s, sp) => s + Number(sp.subtotal), 0)
    setStats({
      totalSpend,
      totalOrders: completedSplits.length,
      periodOrders: completedSplits.length,
      periodSpend: totalSpend,
    })

    // Spend trend — day buckets for short ranges, month buckets for long ones
    const span = range?.from && range?.to
      ? (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
      : 365
    const oPad = n => String(n).padStart(2, '0')
    function bucketDataFor(date) {
      if (span <= 60) {
        return {
          sortKey: `${date.getFullYear()}-${oPad(date.getMonth() + 1)}-${oPad(date.getDate())}`,
          label: date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
        }
      }
      return {
        sortKey: `${date.getFullYear()}-${oPad(date.getMonth() + 1)}`,
        label: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
      }
    }
    function fillPeriods(bMap, lMap) {
      const all = { ...bMap }, labels = { ...lMap }
      if (span <= 60) {
        const cur = new Date(range.from); cur.setHours(0, 0, 0, 0)
        const end = new Date(range.to)
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${oPad(cur.getMonth() + 1)}-${oPad(cur.getDate())}`
          if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) }
          cur.setDate(cur.getDate() + 1)
        }
      } else {
        const cur = new Date(range.from.getFullYear(), range.from.getMonth(), 1)
        const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1)
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${oPad(cur.getMonth() + 1)}`
          if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) }
          cur.setMonth(cur.getMonth() + 1)
        }
      }
      return Object.keys(all).sort().map(k => ({ month: labels[k], revenue: all[k] }))
    }
    const bucketMap = {}
    const labelMap = {}
    completedSplits.forEach(sp => {
      const { sortKey, label } = bucketDataFor(new Date(sp.created_at))
      bucketMap[sortKey] = (bucketMap[sortKey] || 0) + Number(sp.subtotal)
      labelMap[sortKey] = label
    })
    setMonthlySpend(fillPeriods(bucketMap, labelMap))

    // Category breakdown — delivered/completed only
    const catMap = {}
    allItems.forEach(item => {
      const cat = item.product?.category || 'Other'
      catMap[cat] = (catMap[cat] || 0) + item.price_at_time * item.quantity
    })
    setCategoryBreakdown(
      Object.entries(catMap)
        .map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }))
        .sort((a, b) => b.revenue - a.revenue)
    )

    // Top products by quantity ordered — delivered/completed only
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

    if (!aiContextSet.current) {
      aiContextSet.current = true
      setAiContext({
        totalSpendThisPeriod: totalSpend.toFixed(2),
        totalOrdersThisPeriod: completedSplits.length,
        range: range.key,
        topCategory: Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0],
        topProducts: Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
      })
    }

    setLoading(false)
  }

  const categoryTotal = categoryBreakdown.reduce((s, c) => s + c.revenue, 0)
  const categoryPie = categoryBreakdown.slice(0, 7).map(c => ({
    ...c,
    pct: categoryTotal > 0 ? Math.round((c.revenue / categoryTotal) * 100) : 0,
  }))

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">{t('analytics')}</h1>
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
              { labelKey: 'spendPeriod', value: `€${stats?.periodSpend?.toFixed(2) || '0.00'}`, icon: Euro, color: 'text-primary' },
              { labelKey: 'ordersPeriodLabel', value: stats?.periodOrders || 0, icon: ShoppingBag, color: 'text-blue-600' },
              { labelKey: 'topCategoryLabel', value: tCat(categoryBreakdown[0]?.name), icon: Package, color: 'text-purple-600' },
              { labelKey: 'topProductLabel', value: topProducts[0]?.name || '—', icon: TrendingUp, color: 'text-accent' },
            ].map(({ labelKey, value, icon: Icon, color }) => (
              <div key={labelKey} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-gray-500">{t(labelKey)}</p>
                </div>
                <p className="text-xl font-black text-gray-900 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <RevenueChart data={monthlySpend} title={t('spendingTrend')} />
            <TopProductsChart data={topProducts} title={t('topProductsOrdered')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* New pie chart — spending share by category */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('spendingByCategory')}</h3>
              {categoryPie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
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
                        <span className="text-xs text-gray-600 truncate flex-1">{tCat(item.name)}</span>
                        <span className="text-xs font-bold text-gray-900">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category breakdown bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('topCategoriesEur')}</h3>
              {categoryBreakdown.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
              ) : (
                <div className="space-y-2 pt-2">
                  {categoryBreakdown.slice(0, 6).map((c, i) => {
                    const max = categoryBreakdown[0]?.revenue || 1
                    const pct = (c.revenue / max) * 100
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">{tCat(c.name)}</span>
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

        </>
      )}

      {aiContext && <AnalyticsSummary context={aiContext} />}
    </div>
  )
}
