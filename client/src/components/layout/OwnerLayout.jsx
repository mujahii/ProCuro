import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, Package, BarChart3, User, MessageSquare, ChevronLeft, ChevronRight, X, AlertCircle, LogOut, Ban } from 'lucide-react'
import Navbar from './Navbar'
import CookieConsent from '../ui/CookieConsent'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

export default function OwnerLayout() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('ownerSidebarCollapsed') === 'true'
  )
  const [isActive, setIsActive] = useState(true)
  const isBanned = user?.is_banned ?? false

  useEffect(() => {
    if (!user) return
    supabase.from('owner_profiles').select('is_active').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setIsActive(data.is_active ?? true) })
  }, [user])

  const bannerCount = (!isActive ? 1 : 0) + (isBanned ? 1 : 0)
  const topOffset = bannerCount === 0
    ? 'calc(4rem + var(--sat))'
    : bannerCount === 1
      ? 'calc(6.5rem + var(--sat))'
      : 'calc(9rem + var(--sat))'

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('ownerSidebarCollapsed', String(next))
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-midnight text-white' : 'text-slate-600 hover:bg-lionsmane'
    }`

  return (
    <div className="min-h-screen bg-lionsmane">
      <Navbar onMenuClick={() => setDrawerOpen(o => !o)} />

      {/* Account deactivated banner */}
      {!isActive && (
        <div className="fixed left-0 right-0 z-20 bg-red-500 text-white px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-3 flex-wrap" style={{ top: 'calc(4rem + var(--sat))' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Your account has been deactivated by the admin. Please contact support.</span>
          <button
            onClick={() => navigate('/owner/chat')}
            className="bg-white text-red-600 font-bold px-3 py-0.5 rounded-full text-xs hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Contact Admin →
          </button>
        </div>
      )}

      {/* Account banned banner */}
      {isBanned && (
        <div
          className="fixed left-0 right-0 z-20 bg-red-800 text-white px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-3 flex-wrap"
          style={{ top: !isActive ? 'calc(6.5rem + var(--sat))' : 'calc(4rem + var(--sat))' }}
        >
          <Ban className="w-4 h-4 flex-shrink-0" />
          <span>{t('accountBannedBanner')}</span>
          <button
            onClick={() => navigate('/owner/chat')}
            className="bg-white text-red-800 font-bold px-3 py-0.5 rounded-full text-xs hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            {t('navMessages')} →
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
          {[
            { to: '/owner/store', icon: ShoppingBag, key: 'navStore' },
            { to: '/owner/cart', icon: ShoppingCart, key: 'navCart' },
            { to: '/owner/orders', icon: Package, key: 'navOrders' },
            { to: '/owner/analytics', icon: BarChart3, key: 'navAnalytics' },
            { to: '/owner/chat', icon: MessageSquare, key: 'navMessages' },
            { to: '/owner/profile', icon: User, key: 'navProfile' },
          ].map(({ to, icon: Icon, key }) => {
            const blockedByBan = isBanned && to !== '/owner/chat'
            return blockedByBan ? (
              <span key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 cursor-not-allowed select-none">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t(key)}
              </span>
            ) : (
              <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={navLinkClass}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t(key)}
              </NavLink>
            )
          })}
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

      <div
        className="flex"
        style={{ paddingTop: topOffset }}
      >
        {/* Desktop collapsible sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-100 fixed left-0 bottom-0 z-20 transition-all duration-200 ${
            collapsed ? 'w-14' : 'w-56'
          }`}
          style={{ top: topOffset }}
        >
          <nav className="flex-1 px-2 py-4 space-y-1">
            {[
              { to: '/owner/store', icon: ShoppingBag, key: 'navStore' },
              { to: '/owner/cart', icon: ShoppingCart, key: 'navCart' },
              { to: '/owner/orders', icon: Package, key: 'navOrders' },
              { to: '/owner/analytics', icon: BarChart3, key: 'navAnalytics' },
              { to: '/owner/chat', icon: MessageSquare, key: 'navMessages' },
              { to: '/owner/profile', icon: User, key: 'navProfile' },
            ].map(({ to, icon: Icon, key }) => {
              const blockedByBan = isBanned && to !== '/owner/chat'
              return blockedByBan ? (
                <span
                  key={to}
                  title={collapsed ? t(key) : undefined}
                  className={`flex items-center py-2.5 rounded-lg text-sm font-medium text-slate-300 cursor-not-allowed select-none ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{t(key)}</span>}
                </span>
              ) : (
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
              )
            })}
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

        {/* Main content — shifts right based on sidebar width */}
        <main
          className={`flex-1 min-w-0 transition-all duration-200 ${
            collapsed ? 'lg:ml-14' : 'lg:ml-56'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {isBanned && !pathname.startsWith('/owner/chat') ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <Ban className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t('accountBannedTitle')}</h2>
                <p className="text-gray-500 max-w-sm mb-6">{t('accountBannedContent')}</p>
                <button onClick={() => navigate('/owner/chat')} className="btn-primary flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> {t('navMessages')}
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <CookieConsent />
    </div>
  )
}
