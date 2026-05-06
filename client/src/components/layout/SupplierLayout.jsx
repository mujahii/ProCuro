import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Award, CreditCard, User, Clock } from 'lucide-react'
import AnnouncementBar from './AnnouncementBar'
import Navbar from './Navbar'
import NotificationBell from '../ui/NotificationBell'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supplier/products', icon: Package, label: 'Products' },
  { to: '/supplier/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/supplier/certificates', icon: Award, label: 'Certificates' },
  { to: '/supplier/bank-details', icon: CreditCard, label: 'Bank Details' },
  { to: '/supplier/profile', icon: User, label: 'Profile' },
]

function PendingScreen() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-yellow-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Account Under Review</h2>
      <p className="text-gray-500 max-w-md">
        Our team is verifying your Halal certificates. This typically takes within 48 hours.
        You'll receive a notification once your account is approved.
      </p>
    </div>
  )
}

export default function SupplierLayout() {
  const { user } = useAuth()
  const [isVerified, setIsVerified] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('supplier_profiles')
      .select('is_verified')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setIsVerified(data?.is_verified ?? false))
  }, [user])

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
          {isVerified === false ? <PendingScreen /> : <Outlet />}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`
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
