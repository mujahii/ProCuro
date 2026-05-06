import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, Package, BarChart3, User } from 'lucide-react'
import AnnouncementBar from './AnnouncementBar'
import Navbar from './Navbar'
import CartDrawer from '../store/CartDrawer'
import ChatbotFAB from '../ai/ChatbotFAB'
import CookieConsent from '../ui/CookieConsent'
import { useCart } from '../../context/CartContext'

const navItems = [
  { to: '/owner/store', icon: ShoppingBag, label: 'Store' },
  { to: '/owner/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/owner/orders', icon: Package, label: 'Orders' },
  { to: '/owner/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/owner/profile', icon: User, label: 'Profile' },
]

export default function OwnerLayout() {
  const [cartOpen, setCartOpen] = useState(false)
  const { itemCount } = useCart()

  return (
    <div className="min-h-screen bg-surface">
      <AnnouncementBar />
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="flex">
        {/* Desktop sidebar */}
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
                {label === 'Cart' && itemCount > 0 && (
                  <span className="ml-auto bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{itemCount}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${isActive ? 'text-emerald-600' : 'text-gray-400'}`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {label === 'Cart' && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] rounded-full flex items-center justify-center">{itemCount}</span>
              )}
            </div>
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>

      <ChatbotFAB />
      <CookieConsent />
    </div>
  )
}
