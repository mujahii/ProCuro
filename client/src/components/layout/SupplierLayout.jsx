import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Award, CreditCard, User, BarChart3 } from 'lucide-react'
import AnnouncementBar from './AnnouncementBar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supplier/products', icon: Package, label: 'Products' },
  { to: '/supplier/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/supplier/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/supplier/certificates', icon: Award, label: 'Certs' },
  { to: '/supplier/bank-details', icon: CreditCard, label: 'Bank' },
  { to: '/supplier/profile', icon: User, label: 'Profile' },
]

export default function SupplierLayout() {
  const { user } = useAuth()

  // In demo mode (id starts with 'demo-'), always show dashboard.
  // In production with real Supabase auth, you'd check is_verified from DB.
  const isDemoMode = user?.id?.startsWith('demo-')

  return (
    <div className="min-h-screen bg-surface">
      <AnnouncementBar />
      <Navbar />

      <div className="flex">
        <aside className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-112px)] bg-white border-r border-gray-100 fixed top-[112px] left-0 z-30">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex">
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[6]].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${isActive ? 'text-emerald-600' : 'text-gray-400'}`
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
