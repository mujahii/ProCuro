import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import RevenueChart from '../../components/charts/RevenueChart'
import OrdersByStatusChart from '../../components/charts/OrdersByStatusChart'
import UserGrowthChart from '../../components/charts/UserGrowthChart'
import PaymentTypeChart from '../../components/charts/PaymentTypeChart'
import CityComparisonRadar from '../../components/charts/CityComparisonRadar'
import GermanyDotMap from '../../components/charts/GermanyDotMap'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import DateRangeFilter, { rangeFromKey } from '../../components/ui/DateRangeFilter'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Users, ShoppingBag, Award, Euro, Package } from 'lucide-react'

function bucketKeyFor(date, range) {
  const span = range?.from && range?.to
    ? (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
    : 365
  // For ranges shorter than ~60 days, bucket by day so the chart actually
  // shows movement. Otherwise group by month.
  if (span <= 60) {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  }
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState(() => rangeFromKey('year'))
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revenueSeries, setRevenueSeries] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])
  const [userGrowth, setUserGrowth] = useState([])
  const [paymentSplit, setPaymentSplit] = useState([])
  const [cityCounts, setCityCounts] = useState([])
  const [cityCoords, setCityCoords] = useState([])

  useEffect(() => { loadStats() }, [range])

  async function loadStats() {
    setLoading(true)
    const fromISO = range.from ? range.from.toISOString() : null
    const toISO = range.to ? range.to.toISOString() : null

    let splitsQuery = supabase.from('order_splits').select('subtotal, status, created_at, payment_method')
    if (fromISO) splitsQuery = splitsQuery.gte('created_at', fromISO)
    if (toISO) splitsQuery = splitsQuery.lte('created_at', toISO)

    const [
      { count: totalUsers },
      { count: totalSuppliers },
      { count: totalOwners },
      { count: pendingCerts },
      { count: totalOrders },
      { data: splits },
      { data: usersRows },
      { data: supplierRows },
      { data: ownerRows },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner'),
      supabase.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      splitsQuery,
      supabase.from('users').select('id, role, created_at').in('role', ['supplier', 'restaurant_owner']),
      supabase.from('supplier_profiles').select('city, latitude, longitude'),
      supabase.from('owner_profiles').select('city, latitude, longitude'),
    ])

    const allSplits = splits || []
    const totalRevenue = allSplits.filter(s => s.status === 'delivered').reduce((sum, s) => sum + Number(s.subtotal), 0)
    setStats({ totalUsers, totalSuppliers, totalOwners, pendingCerts, totalOrders, totalRevenue })

    // GMV trend — use the day/month bucketing helper so short ranges have data
    const bucketMap = {}
    allSplits.forEach(sp => {
      const key = bucketKeyFor(new Date(sp.created_at), range)
      bucketMap[key] = (bucketMap[key] || 0) + Number(sp.subtotal)
    })
    setRevenueSeries(Object.entries(bucketMap).map(([month, revenue]) => ({ month, revenue })))

    const statusMap = {}
    allSplits.forEach(sp => { statusMap[sp.status] = (statusMap[sp.status] || 0) + 1 })
    setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

    // Payment-type split (replaces the old Certificate Status card)
    const payMap = { bank_transfer: { count: 0, total: 0 }, cash_on_delivery: { count: 0, total: 0 } }
    allSplits.forEach(sp => {
      const m = sp.payment_method || 'cash_on_delivery'
      if (!payMap[m]) payMap[m] = { count: 0, total: 0 }
      payMap[m].count += 1
      if (sp.status === 'delivered') payMap[m].total += Number(sp.subtotal)
    })
    setPaymentSplit(Object.entries(payMap).map(([method, v]) => ({ method, ...v })))

    // User growth — filter by current range, group by month, separate roles
    const growthMap = {}
    ;(usersRows || []).forEach(u => {
      const created = new Date(u.created_at)
      if (range.from && created < range.from) return
      if (range.to && created > range.to) return
      const key = bucketKeyFor(created, range)
      if (!growthMap[key]) growthMap[key] = { month: key, owners: 0, suppliers: 0 }
      if (u.role === 'supplier') growthMap[key].suppliers += 1
      else if (u.role === 'restaurant_owner') growthMap[key].owners += 1
    })
    // Convert to cumulative so the line trends upward like growth charts do
    const growthSorted = Object.values(growthMap)
    let cumOwners = 0, cumSuppliers = 0
    const cumulative = growthSorted.map(g => {
      cumOwners += g.owners
      cumSuppliers += g.suppliers
      return { month: g.month, owners: cumOwners, suppliers: cumSuppliers }
    })
    setUserGrowth(cumulative)

    // City counts + coords for radar + map (uses all-time profile data, not
    // date-filtered — geography of the platform is stable across periods)
    const cityMap = {}
    ;(supplierRows || []).forEach(p => {
      if (!p.city) return
      ;(p.city.split(',').map(c => c.trim()).filter(Boolean)).forEach(c => {
        if (!cityMap[c]) cityMap[c] = { city: c, suppliers: 0, owners: 0, lat: null, lng: null }
        cityMap[c].suppliers += 1
        if (cityMap[c].lat == null && p.latitude != null) {
          cityMap[c].lat = Number(p.latitude); cityMap[c].lng = Number(p.longitude)
        }
      })
    })
    ;(ownerRows || []).forEach(p => {
      if (!p.city) return
      ;(p.city.split(',').map(c => c.trim()).filter(Boolean)).forEach(c => {
        if (!cityMap[c]) cityMap[c] = { city: c, suppliers: 0, owners: 0, lat: null, lng: null }
        cityMap[c].owners += 1
        if (cityMap[c].lat == null && p.latitude != null) {
          cityMap[c].lat = Number(p.latitude); cityMap[c].lng = Number(p.longitude)
        }
      })
    })
    const cityList = Object.values(cityMap).sort((a, b) => (b.suppliers + b.owners) - (a.suppliers + a.owners))
    setCityCounts(cityList)
    setCityCoords(cityList)

    setLoading(false)
  }

  const summaryContext = stats ? {
    totalUsers: stats.totalUsers,
    totalSuppliers: stats.totalSuppliers,
    totalOwners: stats.totalOwners,
    pendingCertificates: stats.pendingCerts,
    totalOrders: stats.totalOrders,
    totalGMV: stats.totalRevenue?.toFixed(2),
    orderStatusBreakdown: statusBreakdown,
    range: range.key,
  } : null

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Suppliers', value: stats.totalSuppliers, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Restaurant Owners', value: stats.totalOwners, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Certificates', value: stats.pendingCerts, icon: Award, color: 'text-marigold-dark', bg: 'bg-lionsmane' },
    { label: 'Total GMV', value: `€${stats.totalRevenue?.toFixed(2)}`, icon: Euro, color: 'text-primary', bg: 'bg-primary-100' },
  ] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Platform Overview</h1>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <RevenueChart data={revenueSeries} title="Platform GMV Over Time" />
            <OrdersByStatusChart data={statusBreakdown} title="All Orders by Status" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <UserGrowthChart data={userGrowth} />
            <PaymentTypeChart data={paymentSplit} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <CityComparisonRadar data={cityCounts} />
            <GermanyDotMap data={cityCoords} />
          </div>
          {summaryContext && <AnalyticsSummary context={summaryContext} />}
        </>
      )}
    </div>
  )
}
