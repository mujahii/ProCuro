import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import RevenueChart from '../../components/charts/RevenueChart'
import OrdersByStatusChart from '../../components/charts/OrdersByStatusChart'
import TopProductsChart from '../../components/charts/TopProductsChart'
import UserGrowthChart from '../../components/charts/UserGrowthChart'
import SupplierVerificationChart from '../../components/charts/SupplierVerificationChart'
import AnalyticsSummary from '../../components/ai/AnalyticsSummary'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Users, ShoppingBag, Award, Euro, Package, TrendingUp } from 'lucide-react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [
      { count: totalUsers },
      { count: totalSuppliers },
      { count: totalOwners },
      { count: pendingCerts },
      { count: totalOrders },
      { data: splits },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner'),
      supabase.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('order_splits').select('subtotal, status, created_at'),
    ])

    const allSplits = splits || []
    const totalRevenue = allSplits.filter(s => s.status === 'delivered').reduce((sum, s) => sum + Number(s.subtotal), 0)

    setStats({ totalUsers, totalSuppliers, totalOwners, pendingCerts, totalOrders, totalRevenue })

    const monthMap = {}
    allSplits.forEach(sp => {
      const month = new Date(sp.created_at).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      monthMap[month] = (monthMap[month] || 0) + Number(sp.subtotal)
    })
    setMonthlyRevenue(Object.entries(monthMap).slice(-12).map(([month, revenue]) => ({ month, revenue })))

    const statusMap = {}
    allSplits.forEach(sp => { statusMap[sp.status] = (statusMap[sp.status] || 0) + 1 })
    setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Platform Overview</h1>
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
            <RevenueChart data={monthlyRevenue} title="Platform GMV Over Time" />
            <OrdersByStatusChart data={statusBreakdown} title="All Orders by Status" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <UserGrowthChart data={[]} />
            <SupplierVerificationChart data={[]} />
          </div>
          {summaryContext && <AnalyticsSummary context={summaryContext} />}
        </>
      )}
    </div>
  )
}
