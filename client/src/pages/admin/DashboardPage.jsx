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

// Last-resort coordinates for German cities that may be saved without their own
// lat/lng. DB coordinates always win; this only fills gaps so the map can plot.
const CITY_FALLBACK = {
  berlin: { lat: 52.52, lng: 13.405 },
  hamburg: { lat: 53.5753, lng: 10.0153 },
  munich: { lat: 48.1351, lng: 11.582 },
  münchen: { lat: 48.1351, lng: 11.582 },
  cologne: { lat: 50.9333, lng: 6.95 },
  köln: { lat: 50.9333, lng: 6.95 },
  frankfurt: { lat: 50.1109, lng: 8.6821 },
  stuttgart: { lat: 48.7758, lng: 9.1829 },
  düsseldorf: { lat: 51.2217, lng: 6.7762 },
  dusseldorf: { lat: 51.2217, lng: 6.7762 },
  donaustauf: { lat: 49.0356, lng: 12.2003 },
}

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

function buildMapData(addressRows, supplierProfileRows, ownerProfileRows, setCityCoords, setCityCounts) {
  const norm = s => (s || '').trim().toLowerCase()
  const coordByCity = {}
  const learnCoords = (city, lat, lng) => {
    if (!city || city.includes(',') || lat == null || lng == null) return
    const k = norm(city)
    if (!coordByCity[k]) coordByCity[k] = { lat: Number(lat), lng: Number(lng) }
  }
  ;(supplierProfileRows || []).forEach(p => learnCoords(p.city, p.latitude, p.longitude))
  ;(ownerProfileRows || []).forEach(p => learnCoords(p.city, p.latitude, p.longitude))
  ;(addressRows || []).forEach(a => learnCoords(a.city, a.latitude, a.longitude))
  for (const [k, v] of Object.entries(CITY_FALLBACK)) if (!coordByCity[k]) coordByCity[k] = v

  const locations = new Map()
  const addLocation = (userId, role, cityField) => {
    if (!userId || (role !== 'supplier' && role !== 'restaurant_owner')) return
    ;(cityField || '').split(',').map(c => c.trim()).filter(Boolean).forEach(city => {
      const key = `${userId}|${norm(city)}`
      if (locations.has(key)) return
      const coord = coordByCity[norm(city)]
      locations.set(key, { city, role, lat: coord?.lat ?? null, lng: coord?.lng ?? null })
    })
  }
  ;(supplierProfileRows || []).forEach(p => addLocation(p.user_id, 'supplier', p.city))
  ;(ownerProfileRows || []).forEach(p => addLocation(p.user_id, 'restaurant_owner', p.city))
  ;(addressRows || []).forEach(a => addLocation(a.user_id, a.user?.role, a.city))
  const allLocations = [...locations.values()]

  setCityCoords(
    allLocations
      .filter(l => l.lat != null && l.lng != null)
      .map((l, i) => ({ id: i, city: l.city, lat: l.lat, lng: l.lng, role: l.role }))
  )
  const cityMap = {}
  allLocations.forEach(l => {
    if (!cityMap[l.city]) cityMap[l.city] = { city: l.city, suppliers: 0, owners: 0 }
    if (l.role === 'supplier') cityMap[l.city].suppliers += 1
    else cityMap[l.city].owners += 1
  })
  setCityCounts(Object.values(cityMap).sort((a, b) => (b.suppliers + b.owners) - (a.suppliers + a.owners)))
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

  useEffect(() => {
    async function refreshMap() {
      const [
        { data: addressRows },
        { data: supplierProfileRows },
        { data: ownerProfileRows },
      ] = await Promise.all([
        supabase.from('addresses').select('city, latitude, longitude, user_id, user:users!user_id(role)').not('city', 'is', null),
        supabase.from('supplier_profiles').select('user_id, city, latitude, longitude'),
        supabase.from('owner_profiles').select('user_id, city, latitude, longitude'),
      ])
      buildMapData(addressRows, supplierProfileRows, ownerProfileRows, setCityCoords, setCityCounts)
    }
    const addrCh = supabase.channel('map-addresses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'addresses' }, refreshMap)
      .subscribe()
    const supCh = supabase.channel('map-supplier-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'supplier_profiles' }, refreshMap)
      .subscribe()
    const ownCh = supabase.channel('map-owner-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'owner_profiles' }, refreshMap)
      .subscribe()
    return () => {
      supabase.removeChannel(addrCh)
      supabase.removeChannel(supCh)
      supabase.removeChannel(ownCh)
    }
  }, [])

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
      { data: supplierProfileRows },
      { data: ownerProfileRows },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner'),
      supabase.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      splitsQuery,
      supabase.from('users').select('id, role, created_at').in('role', ['supplier', 'restaurant_owner']),
      // every saved address (captures relocations — one location per address row)
      supabase.from('addresses')
        .select('city, latitude, longitude, user_id, user:users!user_id(role)')
        .not('city', 'is', null),
      // each user's home city — most suppliers/owners only have a profile, no address rows
      supabase.from('supplier_profiles').select('user_id, city, latitude, longitude'),
      supabase.from('owner_profiles').select('user_id, city, latitude, longitude'),
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

    buildMapData(addressRows, supplierProfileRows, ownerProfileRows, setCityCoords, setCityCounts)

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
            <PaymentTypeChart data={paymentSplit} />
            <UserGrowthChart data={userGrowth} />
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
