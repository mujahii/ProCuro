import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Bell, Menu, X, ChevronDown, LogOut, User, Package, BarChart3 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import NotificationBell from '../ui/NotificationBell'
import AddressSwitcher from '../store/AddressSwitcher'

export default function Navbar({ onCartOpen }) {
  const { user, role, signOut } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={role === 'restaurant_owner' ? '/owner/store' : role === 'supplier' ? '/supplier/dashboard' : '/'} className="flex items-center gap-2 flex-shrink-0">
            <ShoppingCart className="w-7 h-7 text-emerald-600" />
            <span className="text-slate-900 font-black text-2xl tracking-tight">ProCuro</span>
          </Link>

          {/* Address switcher — center, only for owners */}
          {role === 'restaurant_owner' && (
            <div className="hidden md:block">
              <AddressSwitcher />
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {role === 'restaurant_owner' && (
                  <button
                    onClick={onCartOpen}
                    className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    aria-label="Cart"
                  >
                    <ShoppingCart className="w-5 h-5 text-gray-600" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </button>
                )}
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      {role === 'restaurant_owner' && (
                        <>
                          <Link to="/owner/store" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4" /> Store</Link>
                          <Link to="/owner/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4" /> My Orders</Link>
                          <Link to="/owner/analytics" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><BarChart3 className="w-4 h-4" /> Analytics</Link>
                          <Link to="/owner/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><User className="w-4 h-4" /> Profile</Link>
                        </>
                      )}
                      {role === 'supplier' && (
                        <>
                          <Link to="/supplier/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><BarChart3 className="w-4 h-4" /> Dashboard</Link>
                          <Link to="/supplier/products" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><Package className="w-4 h-4" /> Products</Link>
                          <Link to="/supplier/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><User className="w-4 h-4" /> Profile</Link>
                        </>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </div>
            )}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-50"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {!user && (
            <>
              <Link to="/login" className="block px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Log in</Link>
              <Link to="/register" className="block px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Register as Restaurant Owner</Link>
              <Link to="/register/supplier" className="block px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Become a Supplier</Link>
            </>
          )}
          {role === 'restaurant_owner' && (
            <div className="pt-2">
              <AddressSwitcher />
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
