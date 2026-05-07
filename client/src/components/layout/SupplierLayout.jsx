import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, User, BarChart3, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supplier/products', icon: Package, label: 'Products' },
  { to: '/supplier/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/supplier/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/supplier/profile', icon: User, label: 'Profile' },
]

export default function SupplierLayout() {
  const { user } = useAuth()
  const [certStatus, setCertStatus] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('supplierSidebarCollapsed') === 'true'
  )

  useEffect(() => {
    if (!user) return
    supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data: sp }) => {
        if (!sp) return
        supabase
          .from('halal_certificates')
          .select('status')
          .eq('supplier_id', sp.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => setCertStatus(data?.[0]?.status || 'none'))
      })
  }, [user])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('supplierSidebarCollapsed', String(next))
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onMenuClick={() => setDrawerOpen(o => !o)} />

      {/* Cert verification banner — below fixed navbar */}
      {certStatus && certStatus !== 'approved' && (
        <div
          className={`fixed top-16 left-0 right-0 z-20 px-4 py-2.5 text-sm font-medium text-center ${
            certStatus === 'none'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {certStatus === 'none'
            ? '⚠️ Upload a Halal certificate to get verified and appear to restaurant owners.'
            : '🕐 Your Halal certificate is under review. You\'ll be notified once approved.'}
        </div>
      )}

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

      <div className={`flex ${certStatus && certStatus !== 'approved' ? 'pt-[104px]' : 'pt-16'}`}>
        {/* Desktop collapsible sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-100 fixed left-0 bottom-0 z-20 transition-all duration-200 ${
            collapsed ? 'w-14' : 'w-56'
          } ${certStatus && certStatus !== 'approved' ? 'top-[104px]' : 'top-16'}`}
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

        {/* Main content */}
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
    </div>
  )
}
