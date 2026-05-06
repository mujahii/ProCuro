import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Bell, User, ArrowLeft, MapPin, Search, Filter, Star, Plus, LogOut, Package, BarChart3 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAddresses } from '../../context/AddressContext'
import NotificationBell from '../ui/NotificationBell'

export default function Navbar() {
  const { user, role, profile, signOut } = useAuth()
  const { itemCount } = useCart()
  const { addresses, selectedAddress, selectAddress } = useAddresses()
  const navigate = useNavigate()
  const location = useLocation()

  const [addrOpen, setAddrOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const addrRef = useRef(null)
  const userRef = useRef(null)

  const isHome = location.pathname === '/owner/store' || location.pathname === '/supplier/dashboard' || location.pathname === '/'
  const isStoreView = location.pathname === '/owner/store'

  useEffect(() => {
    function handleClick(e) {
      if (addrRef.current && !addrRef.current.contains(e.target)) setAddrOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  function getHomeLink() {
    if (role === 'restaurant_owner') return '/owner/store'
    if (role === 'supplier') return '/supplier/dashboard'
    return '/'
  }

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Left side */}
          <div className="flex items-center gap-3">
            {/* Back arrow for non-home pages */}
            {user && !isHome && (
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full mr-1">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}

            {/* Logo */}
            <Link to={getHomeLink()} className="flex-shrink-0 flex items-center cursor-pointer gap-2">
              <ShoppingCart className="w-7 h-7 text-slate-900" />
              <span className="font-bold text-xl text-slate-900 hidden sm:block">ProCuro</span>
            </Link>

            {/* Address selector — owner only, md+ */}
            {role === 'restaurant_owner' && (
              <div className="relative ml-4 hidden md:block" ref={addrRef}>
                <button
                  onClick={() => setAddrOpen(o => !o)}
                  className="flex flex-col items-start text-xs text-slate-500 hover:text-emerald-600"
                >
                  <span>Delivered to</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedAddress ? `${selectedAddress.street || selectedAddress.label || selectedAddress.city}` : 'Select Address'}
                  </span>
                </button>
                {addrOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Saved Addresses</p>
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        onClick={() => { selectAddress(addr.id); setAddrOpen(false) }}
                        className="w-full text-left p-2 hover:bg-slate-50 rounded-md text-sm flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{addr.label || addr.city}</p>
                          <p className="text-xs text-slate-500">{addr.street} {addr.house_number}</p>
                        </div>
                        {addr.is_favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      </button>
                    ))}
                    <button
                      onClick={() => { setAddrOpen(false); navigate('/owner/profile') }}
                      className="w-full text-left p-2 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 rounded-md mt-1 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add New Address
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Search bar — owner on store view, lg+ */}
            {role === 'restaurant_owner' && isStoreView && (
              <div className="hidden lg:flex ml-8 items-center bg-slate-100 rounded-full px-4 py-2 w-64 border border-slate-200 focus-within:border-emerald-500 transition-colors">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
                <div className="h-4 w-px bg-slate-300 mx-2" />
                <div className="relative group">
                  <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-600">
                    All <Filter className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4 relative">
            {user ? (
              <>
                {/* Notification bell */}
                <NotificationBell />

                {/* Cart — owner only */}
                {role === 'restaurant_owner' && (
                  <button
                    onClick={() => navigate('/owner/cart')}
                    className="p-2 text-slate-400 hover:text-slate-600 relative"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <span className="absolute top-1 right-0 w-4 h-4 bg-emerald-500 text-white text-[10px] flex items-center justify-center rounded-full">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </button>
                )}

                {/* User avatar + name */}
                <div className="relative" ref={userRef}>
                  <div
                    className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-200 cursor-pointer"
                    onClick={() => setUserMenuOpen(o => !o)}
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-slate-900">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-slate-500 capitalize">{role?.replace('_', ' ')}</p>
                    </div>
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-emerald-700">{initials}</span>
                      )}
                    </div>
                  </div>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1">
                      {role === 'restaurant_owner' && (
                        <>
                          <Link to="/owner/store" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4 text-emerald-600" /> Store</Link>
                          <Link to="/owner/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4 text-emerald-600" /> My Orders</Link>
                          <Link to="/owner/analytics" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><BarChart3 className="w-4 h-4 text-emerald-600" /> Analytics</Link>
                          <Link to="/owner/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><User className="w-4 h-4 text-emerald-600" /> Profile</Link>
                        </>
                      )}
                      {role === 'supplier' && (
                        <>
                          <Link to="/supplier/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><BarChart3 className="w-4 h-4 text-emerald-600" /> Dashboard</Link>
                          <Link to="/supplier/products" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4 text-emerald-600" /> Products</Link>
                          <Link to="/supplier/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700" onClick={() => setUserMenuOpen(false)}><User className="w-4 h-4 text-emerald-600" /> Profile</Link>
                        </>
                      )}
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                  Log In
                </Link>
                <Link to="/register" className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
