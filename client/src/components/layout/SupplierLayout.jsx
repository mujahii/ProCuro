import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, User, BarChart3, MessageSquare, ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { supabase } from '../../lib/supabase'

const supplierNavItems = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, key: 'navDashboard' },
  { to: '/supplier/products', icon: Package, key: 'navProducts' },
  { to: '/supplier/orders', icon: ShoppingBag, key: 'navOrders' },
  { to: '/supplier/analytics', icon: BarChart3, key: 'navAnalytics' },
  { to: '/supplier/chat', icon: MessageSquare, key: 'navMessages' },
  { to: '/supplier/profile', icon: User, key: 'navProfile' },
]

export default function SupplierLayout() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [certStatus, setCertStatus] = useState(null)
  const [profileIncomplete, setProfileIncomplete] = useState(false)
  const [bannerLoading, setBannerLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('supplierSidebarCollapsed') === 'true'
  )

  useEffect(() => {
    if (!user) return
    setBannerLoading(true)
    supabase
      .from('supplier_profiles')
      .select('id, business_name, tax_id, is_verified')
      .eq('user_id', user.id)
      .single()
      .then(({ data: sp }) => {
        if (!sp) { setBannerLoading(false); return }
        setProfileIncomplete(!sp.business_name || !sp.tax_id)
        if (sp.is_verified) {
          setCertStatus('approved')
          setBannerLoading(false)
        } else {
          supabase
            .from('halal_certificates')
            .select('status')
            .eq('supplier_id', sp.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data }) => {
              setCertStatus(data?.[0]?.status || 'none')
              setBannerLoading(false)
            })
        }
      })
  }, [user, location.pathname])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('supplierSidebarCollapsed', String(next))
  }

  const showBanner = !bannerLoading && (profileIncomplete || certStatus !== 'approved')

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-midnight text-white' : 'text-slate-600 hover:bg-lionsmane'
    }`

  return (
    <div className="min-h-screen bg-lionsmane">
      <Navbar onMenuClick={() => setDrawerOpen(o => !o)} />

      {/* Setup / verification banner — disappears when profile complete + certificate uploaded */}
      {!bannerLoading && (profileIncomplete || certStatus !== 'approved') && (
        <div className="fixed top-16 left-0 right-0 z-20 bg-marigold text-white px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-3 flex-wrap">
          <span>
            {profileIncomplete
              ? '⚠️ Complete your business details (business name + tax ID) to start selling.'
              : certStatus === 'none'
                ? '⚠️ Upload a Halal certificate to appear as verified to restaurant owners.'
                : '🕐 Upload a Halal certificate to get verified instantly.'}
          </span>
          <button
            onClick={() => navigate('/supplier/profile')}
            className="bg-white text-marigold-dark font-bold px-3 py-0.5 rounded-full text-xs hover:bg-lionsmane transition-colors whitespace-nowrap"
          >
            Complete Profile →
          </button>
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
          {supplierNavItems.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={navLinkClass}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-6 border-t border-slate-100 pt-3">
          <button
            onClick={() => { setDrawerOpen(false); signOut() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {t('signOut')}
          </button>
        </div>
      </aside>

      <div className={`flex ${showBanner ? 'pt-[132px] sm:pt-[104px]' : 'pt-16'}`}>
        {/* Desktop collapsible sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-100 fixed left-0 bottom-0 z-20 transition-all duration-200 ${
            collapsed ? 'w-14' : 'w-56'
          } ${showBanner ? 'top-[104px]' : 'top-16'}`}
        >
          <nav className="flex-1 px-2 py-4 space-y-1">
            {supplierNavItems.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? t(key) : undefined}
                className={({ isActive }) =>
                  `flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${isActive ? 'bg-midnight text-white' : 'text-slate-600 hover:bg-lionsmane'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{t(key)}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="px-2 py-3 border-t border-slate-100">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-midnight text-white hover:bg-slate-700 transition-colors"
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
