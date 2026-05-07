import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, Package, BarChart3, User, ChevronLeft, ChevronRight, X } from 'lucide-react'
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

export default function OwnerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('ownerSidebarCollapsed') === 'true'
  )

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('ownerSidebarCollapsed', String(next))
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onMenuClick={() => setDrawerOpen(o => !o)} />

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white flex flex-col shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
          <span className="font-bold text-lg text-slate-900">ProCuro</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
              className={navLinkClass}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex pt-16">
        {/* Desktop collapsible sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-100 fixed top-16 left-0 bottom-0 z-20 transition-all duration-200 ${
            collapsed ? 'w-14' : 'w-56'
          }`}
        >
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="px-2 py-3 border-t border-slate-100">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            >
              {collapsed
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft className="w-4 h-4" />
              }
            </button>
          </div>
        </aside>

        {/* Main content — shifts right based on sidebar width */}
        <main
          className={`flex-1 min-w-0 transition-all duration-200 ${
            collapsed ? 'lg:ml-14' : 'lg:ml-56'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <ChatbotFAB />
      <CookieConsent />
    </div>
  )
}
