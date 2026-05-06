import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, Package, BarChart3, User, Home, TrendingUp } from 'lucide-react'
import Navbar from './Navbar'
import ChatbotFAB from '../ai/ChatbotFAB'
import CookieConsent from '../ui/CookieConsent'

const navItems = [
  { to: '/owner/store', icon: ShoppingBag, label: 'Store' },
  { to: '/owner/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/owner/orders', icon: Package, label: 'Orders' },
  { to: '/owner/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/owner/profile', icon: User, label: 'Profile' },
]

const mobileNavItems = [
  { to: '/owner/store', icon: Home, label: 'Home' },
  { to: '/owner/orders', icon: Package, label: 'Orders' },
  { to: '/owner/analytics', icon: TrendingUp, label: 'Analysis' },
  { to: '/owner/profile', icon: User, label: 'Profile' },
]

export default function OwnerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
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

        {/* Main content */}
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
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

      <ChatbotFAB />
      <CookieConsent />
    </div>
  )
}
