import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Award, Package, ShoppingBag, LogOut, Flag, MessageSquare, Shield, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import NotificationBell from '../ui/NotificationBell'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/certificates', icon: Award, label: 'Certificates' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/reports', icon: Flag, label: 'Reports', badge: true },
  { to: '/admin/chat', icon: MessageSquare, label: 'Chat', unreadBadge: true },
]

export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [pendingReports, setPendingReports] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchPendingReports()
    fetchUnreadChats()
    const reportsChannel = supabase
      .channel('admin-reports-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, fetchPendingReports)
      .subscribe()
    const chatsChannel = supabase
      .channel('admin-chat-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages' }, fetchUnreadChats)
      .subscribe()
    return () => {
      supabase.removeChannel(reportsChannel)
      supabase.removeChannel(chatsChannel)
    }
  }, [])

  async function fetchPendingReports() {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingReports(count || 0)
  }

  async function fetchUnreadChats() {
    const { count } = await supabase
      .from('admin_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', (await supabase.auth.getUser()).data.user?.id)
    setUnreadChats(count || 0)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-lionsmane flex">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-midnight text-white flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'lg:w-16 w-64' : 'w-64 lg:w-60'}
        `}
      >
        {/* Logo row */}
        <div className={`border-b border-gray-800 flex items-center gap-2 transition-all duration-300 ${collapsed ? 'lg:justify-center lg:px-0 px-5 py-5' : 'px-5 py-5'}`}>
          <div className="w-8 h-8 bg-midnight rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className={`${collapsed ? 'lg:hidden' : ''} overflow-hidden`}>
            <span className="font-bold text-lg leading-tight whitespace-nowrap">ProCuro</span>
            <span className="block text-xs text-gray-400 whitespace-nowrap">Admin Panel</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className={`hidden lg:flex items-center gap-2 px-3 py-2 mt-2 mx-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-xs font-medium ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge, unreadBadge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                ${isActive ? 'bg-marigold text-midnight' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={`flex-1 whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>

              {/* Tooltip on collapsed desktop */}
              {collapsed && (
                <span className="hidden lg:group-hover:flex absolute left-full ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
                  {label}
                </span>
              )}

              {badge && pendingReports > 0 && (
                <span className={`bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${collapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-0 lg:w-4 lg:h-4 lg:p-0 lg:flex lg:items-center lg:justify-center' : ''}`}>
                  {pendingReports}
                </span>
              )}
              {unreadBadge && unreadChats > 0 && (
                <span className={`bg-herb text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${collapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-0 lg:w-4 lg:h-4 lg:p-0 lg:flex lg:items-center lg:justify-center' : ''}`}>
                  {unreadChats}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-3 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-gray-800 text-sm sm:text-base">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-gray-500 hidden sm:inline">Administrator</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
