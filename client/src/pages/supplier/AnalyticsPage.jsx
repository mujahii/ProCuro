import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import { SkeletonCard } from '../../components/ui/Skeleton'
import DateRangeFilter, { rangeFromKey } from '../../components/ui/DateRangeFilter'
import { Euro, ShoppingBag, Package, TrendingUp } from 'lucide-react'

const COLORS = ['#083A4F', '#407E8C', '#A58D66', '#5E96A4', '#BFA988', '#C0D5D6']

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg || 'bg-celeste'}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  )
}

const CAT_KEY_MAP = {
  Meat: 'catMeat', Poultry: 'catPoultry', Seafood: 'catSeafood',
  Dairy: 'catDairy', Vegetables: 'catVegetables', Fruits: 'catFruits',
  Bakery: 'catBakery', Beverages: 'catBeverages', Spices: 'catSpices', Other: 'catOther',
}

export default function SupplierAnalyticsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const tCat = (name) => (CAT_KEY_MAP[name] ? t(CAT_KEY_MAP[name]) : name || '—')
  const [range, setRange] = useState(() => rangeFromKey('month'))
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ revenue: 0, orders: 0, bestProduct: '—', activeProducts: 0 })
  const [aiContext, setAiContext] = useState(null)
  const aiContextSet = useRef(false)
  const [revenueByMonth, setRevenueByMonth] = useState([])
  const [revenueByProduct, setRevenueByProduct] = useState([])
  const [salesByProduct, setSalesByProduct] = useState([])
  const [topClients, setTopClients] = useState([])

  useEffect(() => {
    if (user) init()
  }, [user])

  useEffect(() => {
    if (supplierProfile) loadData(supplierProfile.id)
  }, [range, supplierProfile])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) {
      loadData(sp.id)
    } else {
      setLoading(false)
    }
  }

  async function loadData(supplierId) {
    setLoading(true)
    const rangeStart = range.from ? range.from.toISOString() : null
    const rangeEnd = range.to ? range.to.toISOString() : null

    let splitsQuery = supabase.from('order_splits').select('*').eq('supplier_id', supplierId)
    let itemsQuery = supabase.from('order_items').select('*, product:products(name, category), order_split:order_splits!inner(supplier_id, created_at, status)').eq('order_split.supplier_id', supplierId)
    if (rangeStart) {
      splitsQuery = splitsQuery.gte('created_at', rangeStart)
      itemsQuery = itemsQuery.gte('order_split.created_at', rangeStart)
    }
    if (rangeEnd) {
      splitsQuery = splitsQuery.lte('created_at', rangeEnd)
      itemsQuery = itemsQuery.lte('order_split.created_at', rangeEnd)
    }

    const [splitsRes, itemsRes, productCountRes] = await Promise.all([
      splitsQuery,
      itemsQuery,
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).eq('is_active', true),
    ])

    const splits = splitsRes.data || []
    const allItems = itemsRes.data || []

    const completedSplits = splits.filter(s => s.status === 'delivered' || s.status === 'completed')
    const completedItems = allItems.filter(item => ['delivered', 'completed'].includes(item.order_split?.status))

    const revenue = completedSplits.reduce((sum, s) => sum + Number(s.subtotal), 0)
    const orders = completedSplits.length

    const span = range?.from && range?.to
      ? (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
      : 365

    const sPad = n => String(n).padStart(2, '0')
    function bucketDataFor(date) {
      if (span <= 60) {
        return {
          sortKey: `${date.getFullYear()}-${sPad(date.getMonth() + 1)}-${sPad(date.getDate())}`,
          label: date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
        }
      }
      return {
        sortKey: `${date.getFullYear()}-${sPad(date.getMonth() + 1)}`,
        label: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
      }
    }
    function fillPeriods(bMap, lMap) {
      const all = { ...bMap }, labels = { ...lMap }
      if (span <= 60) {
        const cur = new Date(range.from); cur.setHours(0, 0, 0, 0)
        const end = new Date(range.to)
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${sPad(cur.getMonth() + 1)}-${sPad(cur.getDate())}`
          if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) }
          cur.setDate(cur.getDate() + 1)
        }
      } else {
        const cur = new Date(range.from.getFullYear(), range.from.getMonth(), 1)
        const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1)
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${sPad(cur.getMonth() + 1)}`
          if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) }
          cur.setMonth(cur.getMonth() + 1)
        }
      }
      return Object.keys(all).sort().map(k => ({ month: labels[k], revenue: all[k] }))
    }

    // Revenue trend — delivered/completed only, all periods filled in
    const bucketMap = {}
    const labelMap = {}
    completedSplits.forEach(s => {
      const { sortKey, label } = bucketDataFor(new Date(s.created_at))
      bucketMap[sortKey] = (bucketMap[sortKey] || 0) + Number(s.subtotal)
      labelMap[sortKey] = label
    })
    setRevenueByMonth(fillPeriods(bucketMap, labelMap))

    // Revenue per product — completed orders only
    const prodRevMap = {}
    completedItems.forEach(item => {
      const name = item.product?.name || 'Unknown'
      prodRevMap[name] = (prodRevMap[name] || 0) + item.price_at_time * item.quantity
    })
    const prodRevEntries = Object.entries(prodRevMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
    setRevenueByProduct(prodRevEntries.map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) })))

    // Best product by % of sales
    const total = prodRevEntries.reduce((sum, [, v]) => sum + v, 0)
    setSalesByProduct(prodRevEntries.map(([name, revenue]) => ({
      name,
      value: total > 0 ? Math.round((revenue / total) * 100) : 0,
    })))

    // Top restaurant clients — completed orders only, skip deleted/anonymous clients
    const clientMap = {}
    completedSplits.forEach(s => {
      if (!s.restaurant_owner_id) return
      clientMap[s.restaurant_owner_id] = (clientMap[s.restaurant_owner_id] || 0) + 1
    })
    const ownerIds = Object.keys(clientMap)
    let nameMap = {}
    if (ownerIds.length > 0) {
      const { data: ownerProfiles } = await supabase
        .from('owner_profiles')
        .select('user_id, restaurant_name')
        .in('user_id', ownerIds)
      ;(ownerProfiles || []).forEach(p => { nameMap[p.user_id] = p.restaurant_name })
    }
    setTopClients(
      Object.entries(clientMap)
        .filter(([id]) => nameMap[id]) // only clients with a known restaurant name
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, orders]) => ({ name: nameMap[id], orders }))
    )

    const bestProduct = prodRevEntries[0]?.[0] || '—'
    setStats({ revenue, orders, bestProduct, activeProducts: productCountRes.count || 0 })
    // Capture AI context once — never overwrite on subsequent range changes
    if (!aiContextSet.current) {
      aiContextSet.current = true
      setAiContext({
        revenueThisPeriod: revenue.toFixed(2),
        ordersThisPeriod: orders,
        bestProduct,
        activeProducts: productCountRes.count || 0,
      })
    }
    setLoading(false)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">{t('analytics')}</h1>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('revenueStatLabel')} value={`€${stats.revenue.toFixed(2)}`} icon={Euro} color="text-midnight-dark" bg="bg-celeste" />
            <StatCard label={t('ordersStatLabel')} value={stats.orders} icon={ShoppingBag} color="text-blue-600" bg="bg-blue-100" />
            <StatCard label={t('bestProductStatLabel')} value={stats.bestProduct} icon={TrendingUp} color="text-marigold-dark" bg="bg-marigold-light" />
            <StatCard label={t('activeProductsStatLabel')} value={stats.activeProducts} icon={Package} color="text-purple-600" bg="bg-purple-100" />
          </div>

          {/* Row 1: Line chart + Bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Revenue trend */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('revenueTrend')}</h3>
              {revenueByMonth.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#407E8C" stopOpacity={0.20} />
                        <stop offset="95%" stopColor="#407E8C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#407E8C" strokeWidth={2} fill="url(#analyticsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue per product bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('revenueByProduct')}</h3>
              {revenueByProduct.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueByProduct} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `€${v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={90} />
                    <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#083A4F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: Donut chart + Top clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Donut - best selling by % */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('salesByProductPct')}</h3>
              {salesByProduct.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
              ) : (
                <div className="flex flex-col" style={{ height: 240 }}>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={salesByProduct} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                          {salesByProduct.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center px-2 pb-1">
                    {salesByProduct.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600">{item.name}</span>
                        <span className="text-xs font-bold text-gray-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top clients */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">{t('topRestaurantClients')}</h3>
              {topClients.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('noDataForPeriod')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topClients} margin={{ top: 0, right: 10, left: -10, bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      angle={-35}
                      textAnchor="end"
                      tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Orders']} />
                    <Bar dataKey="orders" fill="#A58D66" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </>
      )}

      {/* AI Summary — outside the loading block so it never unmounts on range change */}
      {aiContext && <AnalyticsSummary context={aiContext} />}
    </div>
  )
}
