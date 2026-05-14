import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Euro, ShoppingBag, Package, TrendingUp } from 'lucide-react'

const COLORS = ['#1B4332', '#D4A017', '#2D6A4F', '#40916C', '#52B788', '#74C69D']

const RANGES = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  )
}

export default function SupplierAnalyticsPage() {
  const { user } = useAuth()
  const [range, setRange] = useState('month')
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ revenue: 0, orders: 0, bestProduct: '—', activeProducts: 0 })
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

  function getRangeStart() {
    const now = new Date()
    if (range === 'week') return new Date(now.setDate(now.getDate() - 7))
    if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
    return new Date(now.getFullYear(), 0, 1)
  }

  async function loadData(supplierId) {
    setLoading(true)
    const rangeStart = getRangeStart().toISOString()

    const [splitsRes, itemsRes, productCountRes] = await Promise.all([
      supabase.from('order_splits').select('*').eq('supplier_id', supplierId).gte('created_at', rangeStart),
      supabase.from('order_items').select('*, product:products(name, category), order_split:order_splits!inner(supplier_id, created_at)').eq('order_split.supplier_id', supplierId).gte('order_split.created_at', rangeStart),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('supplier_id', supplierId).eq('is_active', true),
    ])

    const splits = splitsRes.data || []
    const items = itemsRes.data || []

    const revenue = splits.filter(s => s.status === 'delivered').reduce((sum, s) => sum + Number(s.subtotal), 0)
    const orders = splits.length

    // Monthly revenue trend
    const monthMap = {}
    splits.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('de-DE', { month: 'short', year: range === 'year' ? '2-digit' : undefined })
      monthMap[key] = (monthMap[key] || 0) + Number(s.subtotal)
    })
    setRevenueByMonth(Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })))

    // Revenue per product
    const prodRevMap = {}
    items.forEach(item => {
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

    // Top restaurant clients by order volume
    const clientMap = {}
    splits.forEach(s => {
      const key = s.restaurant_owner_id || 'Unknown'
      clientMap[key] = (clientMap[key] || 0) + 1
    })
    setTopClients(
      Object.entries(clientMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, orders]) => ({ name: `Client ${id.slice(0, 6)}`, orders }))
    )

    const bestProduct = prodRevEntries[0]?.[0] || '—'
    setStats({ revenue, orders, bestProduct, activeProducts: productCountRes.count || 0 })
    setLoading(false)
  }

  const summaryContext = !loading && supplierProfile ? {
    revenueThisPeriod: stats.revenue.toFixed(2),
    ordersThisPeriod: stats.orders,
    bestProduct: stats.bestProduct,
    activeProducts: stats.activeProducts,
    range,
  } : null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${range === r.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={`€${stats.revenue.toFixed(2)}`} icon={Euro} color="text-primary" />
            <StatCard label="Orders" value={stats.orders} icon={ShoppingBag} color="text-blue-600" />
            <StatCard label="Best Product" value={stats.bestProduct} icon={TrendingUp} color="text-yellow-600" />
            <StatCard label="Active Products" value={stats.activeProducts} icon={Package} color="text-purple-600" />
          </div>

          {/* Row 1: Line chart + Bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Revenue trend */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Revenue Trend</h3>
              {revenueByMonth.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4332" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#1B4332" strokeWidth={2} fill="url(#analyticsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue per product bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Revenue by Product</h3>
              {revenueByProduct.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueByProduct} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `€${v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={90} />
                    <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#1B4332" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: Donut chart + Top clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Donut - best selling by % */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Sales by Product (%)</h3>
              {salesByProduct.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={salesByProduct} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                        {salesByProduct.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {salesByProduct.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate flex-1">{item.name}</span>
                        <span className="text-xs font-bold text-gray-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top clients */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Top Restaurant Clients</h3>
              {topClients.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topClients} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip formatter={(v) => [v, 'Orders']} />
                    <Bar dataKey="orders" fill="#D4A017" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {summaryContext && <AnalyticsSummary context={summaryContext} />}
        </>
      )}
    </div>
  )
}
