import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Award, CreditCard, User, BarChart3, Home, TrendingUp } from 'lucide-react'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supplier/products', icon: Package, label: 'Products' },
  { to: '/supplier/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/supplier/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/supplier/certificates', icon: Award, label: 'Certs' },
  { to: '/supplier/bank-details', icon: CreditCard, label: 'Bank' },
  { to: '/supplier/profile', icon: User, label: 'Profile' },
]

const mobileNavItems = [
  { to: '/supplier/dashboard', icon: Home, label: 'Home' },
  { to: '/supplier/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/supplier/analytics', icon: TrendingUp, label: 'Analysis' },
  { to: '/supplier/profile', icon: User, label: 'Profile' },
]

function PendingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Account Pending Verification</h2>
        <p className="text-slate-500 text-sm">
          Your account is pending admin review. Upload a Halal certificate to speed up the process. You'll be notified once approved.
        </p>
      </div>
    </div>
  )
}

export default function SupplierLayout() {
  const { user } = useAuth()
  const [verified, setVerified] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('halal_certificates')
      .select('status')
      .eq('supplier_id', user.id)
      .eq('status', 'approved')
      .limit(1)
      .then(({ data }) => {
        setVerified(data && data.length > 0)
      })
  }, [user])

  if (verified === null) return null

  if (!verified) return <PendingScreen />

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-56 min-h-full bg-white border-r border-slate-100 fixed top-16 left-0 bottom-0 z-20">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
