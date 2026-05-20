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

function rangeSpan(range) {
  return range?.from && range?.to
    ? (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
    : 365
}

const pad = n => String(n).padStart(2, '0')

function bucketDataFor(date, span) {
  if (span <= 60) {
    return {
      sortKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      label: date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
    }
  }
  return {
    sortKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
    label: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
  }
}

// Fills every day (span ≤ 60) or month (span > 60) in [from, to] with 0 if no data
function fillPeriods(bucketMap, labelMap, from, to, span) {
  const all = { ...bucketMap }, labels = { ...labelMap }
  if (span <= 60) {
    const cur = new Date(from); cur.setHours(0, 0, 0, 0)
    const end = new Date(to)
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
      if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) }
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    const end = new Date(to.getFullYear(), to.getMonth(), 1)
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`
      if (!(key in all)) { all[key] = 0; labels[key] = cur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) }
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return Object.keys(all).sort().map(k => ({ month: labels[k], revenue: all[k] }))
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
      { data: addressRows },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner'),
      supabase.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      splitsQuery,
      supabase.from('users').select('id, role, created_at').in('role', ['supplier', 'restaurant_owner']),
      supabase.from('addresses')
        .select('city, latitude, longitude, user:users!user_id(role)')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),
    ])

    const allSplits = splits || []
    const totalRevenue = allSplits.filter(s => s.status === 'delivered').reduce((sum, s) => sum + Number(s.subtotal), 0)
    setStats({ totalUsers, totalSuppliers, totalOwners, pendingCerts, totalOrders, totalRevenue })

    const span = rangeSpan(range)

    // GMV trend — delivered + completed only, all periods filled in
    const bucketMap = {}
    const labelMap = {}
    allSplits.filter(s => s.status === 'delivered' || s.status === 'completed').forEach(sp => {
      const { sortKey, label } = bucketDataFor(new Date(sp.created_at), span)
      bucketMap[sortKey] = (bucketMap[sortKey] || 0) + Number(sp.subtotal)
      labelMap[sortKey] = label
    })
    setRevenueSeries(fillPeriods(bucketMap, labelMap, range.from, range.to, span))

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

    // User growth — bucket registrations within range, cumulate over every filled period
    const growthMap = {}
    ;(usersRows || []).forEach(u => {
      const created = new Date(u.created_at)
      if (range.from && created < range.from) return
      if (range.to && created > range.to) return
      const { sortKey } = bucketDataFor(created, span)
      if (!growthMap[sortKey]) growthMap[sortKey] = { owners: 0, suppliers: 0 }
      if (u.role === 'supplier') growthMap[sortKey].suppliers += 1
      else if (u.role === 'restaurant_owner') growthMap[sortKey].owners += 1
    })
    let cumOwners = 0, cumSuppliers = 0
    const cumulative = []
    if (span <= 60) {
      const cur = new Date(range.from); cur.setHours(0, 0, 0, 0)
      const end = new Date(range.to)
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
        cumOwners += growthMap[key]?.owners || 0
        cumSuppliers += growthMap[key]?.suppliers || 0
        cumulative.push({ month: cur.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }), owners: cumOwners, suppliers: cumSuppliers })
        cur.setDate(cur.getDate() + 1)
      }
    } else {
      const cur = new Date(range.from.getFullYear(), range.from.getMonth(), 1)
      const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1)
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`
        cumOwners += growthMap[key]?.owners || 0
        cumSuppliers += growthMap[key]?.suppliers || 0
        cumulative.push({ month: cur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }), owners: cumOwners, suppliers: cumSuppliers })
        cur.setMonth(cur.getMonth() + 1)
      }
    }
    setUserGrowth(cumulative)

    // Build one dot per address for the Germany map — each address row is a
    // separate location dot regardless of how many addresses a user has.
    const validAddresses = (addressRows || []).filter(
      a => a.user?.role === 'supplier' || a.user?.role === 'restaurant_owner'
    )
    const mapDots = validAddresses.map((a, i) => ({
      id: i,
      city: a.city || 'Unknown',
      lat: Number(a.latitude),
      lng: Number(a.longitude),
      role: a.user.role,
    }))
    setCityCoords(mapDots)

    // Also build city-level counts for the radar chart (grouped by city)
    const cityMap = {}
    validAddresses.forEach(a => {
      const c = a.city?.trim()
      if (!c) return
      if (!cityMap[c]) cityMap[c] = { city: c, suppliers: 0, owners: 0 }
      if (a.user.role === 'supplier') cityMap[c].suppliers += 1
      else cityMap[c].owners += 1
    })
    setCityCounts(Object.values(cityMap).sort((a, b) => (b.suppliers + b.owners) - (a.suppliers + a.owners)))

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
    { label: 'Restaurants', value: stats.totalOwners, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Certificates', value: stats.pendingCerts, icon: Award, color: 'text-marigold-dark', bg: 'bg-lionsmane' },
    { label: 'Total GMV', value: `€${stats.totalRevenue?.toFixed(2)}`, icon: Euro, color: 'text-primary', bg: 'bg-primary-100' },
  ] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Overview</h1>
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
