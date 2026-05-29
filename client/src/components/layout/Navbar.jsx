import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, MapPin, Star, Plus, LogOut, Loader2, Navigation, Check, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reverseGeocode } from '../../lib/geocode'
import { useCart } from '../../context/CartContext'
import { useAddresses } from '../../context/AddressContext'
import { useLanguage } from '../../context/LanguageContext'
import NotificationBell from '../ui/NotificationBell'
import ChatIcon from '../ui/ChatIcon'
import toast from 'react-hot-toast'


export default function Navbar({ onMenuClick }) {
  const { user, role, profile, signOut } = useAuth()
  const { itemCount } = useCart()
  const { addresses, selectedAddress, selectAddress, addAddress } = useAddresses()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [scrolled, setScrolled] = useState(false)
  const [addrOpen, setAddrOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [addingAddr, setAddingAddr] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
  const [savingAddr, setSavingAddr] = useState(false)
  const addrRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (addrRef.current && !addrRef.current.contains(e.target)) {
        setAddrOpen(false)
        setAddingAddr(false)
        setAddrForm({ label: '', street: '', postal_code: '', city: '' })
      }
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSignOut() {
    signOut()
  }

  function getHomeLink() {
    if (role === 'restaurant_owner') return '/owner/store'
    if (role === 'supplier') return '/supplier/dashboard'
    return '/'
  }

  function getProfileLink() {
    if (role === 'restaurant_owner') return '/owner/profile'
    if (role === 'supplier') return '/supplier/profile'
    return '/'
  }

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error(t('toastGpsNotSupported')); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          let street = '', postal_code = '', city = ''
          try {
            const data = await reverseGeocode(lat, lng)
            if (data?.address) {
              const a = data.address
              street = [a.road, a.house_number].filter(Boolean).join(' ') || ''
              postal_code = a.postcode || ''
              city = a.city || a.town || a.village || ''
            }
          } catch {}
          setAddrForm(f => ({ ...f, street, postal_code, city, latitude: lat, longitude: lng }))
        } catch {
          toast.error(t('toastGpsCouldNotDetect'))
        } finally {
          setGpsLoading(false)
        }
      },
      () => { toast.error(t('toastGpsPermDenied')); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSaveAddress(e) {
    e.preventDefault()
    if (!addrForm.street || !addrForm.city) { toast.error(t('toastStreetCityRequired')); return }
    setSavingAddr(true)
    try {
      await addAddress(addrForm)
      toast.success(t('toastAddressSaved'))
      setAddingAddr(false)
      setAddrForm({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
    } catch {
      toast.error(t('toastFailedSaveAddress'))
    } finally {
      setSavingAddr(false)
    }
  }

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-30 w-full transition-all duration-300 bg-white/85 backdrop-blur-[16px] backdrop-saturate-150 border-b ${scrolled ? 'border-slate-200 shadow-md' : 'border-transparent'}`}
      style={{ paddingTop: 'var(--sat)' }}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Left */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger — mobile only, when a menu handler is provided */}
            {onMenuClick && user && (role === 'restaurant_owner' || role === 'supplier') && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors -ml-1"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
            )}

            {/* Logo */}
            <Link to={getHomeLink()} className="flex-shrink-0 flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-midnight" />
              <span className="font-display font-bold text-xl text-midnight hidden sm:block">ProCuro</span>
            </Link>

            {/* Address selector — owner only */}
            {role === 'restaurant_owner' && (
              <div className="relative ml-2 sm:ml-3" ref={addrRef}>
                {/* Mobile: icon + short city label */}
                <button
                  onClick={() => setAddrOpen(o => !o)}
                  className="md:hidden flex items-center gap-1 px-2 py-1.5 text-slate-500 hover:text-midnight hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-semibold max-w-[72px] truncate">
                    {selectedAddress
                      ? (selectedAddress.city || selectedAddress.label || selectedAddress.street || t('selectAddress'))
                      : t('selectAddress')}
                  </span>
                </button>
                {/* Desktop: full "Delivered to / address" display */}
                <button
                  onClick={() => setAddrOpen(o => !o)}
                  className="hidden md:flex flex-col items-start text-xs text-slate-500 hover:text-midnight"
                >
                  <span>{t('deliveredTo')}</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedAddress
                      ? `${selectedAddress.street || selectedAddress.label || selectedAddress.city}`
                      : t('selectAddress')}
                  </span>
                </button>
                {addrOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">{t('savedAddresses')}</p>
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        onClick={() => { selectAddress(addr.id); setAddrOpen(false) }}
                        className="w-full text-left p-2 hover:bg-lionsmane rounded-md text-sm flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{addr.label || addr.city}</p>
                          <p className="text-xs text-slate-500">{addr.street}</p>
                        </div>
                        {addr.is_favorite && <Star className="w-3 h-3 text-marigold-light fill-marigold-light" />}
                      </button>
                    ))}
                    {!addingAddr ? (
                      <button
                        onClick={() => { setAddingAddr(true); detectGPS() }}
                        className="w-full text-left p-2 text-midnight text-sm font-semibold hover:bg-lionsmane rounded-md mt-1 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {t('addNewAddress')}
                      </button>
                    ) : (
                      <form onSubmit={handleSaveAddress} className="mt-2 p-2 bg-lionsmane rounded-lg space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600">{t('newAddress')}</span>
                          <button
                            type="button"
                            onClick={detectGPS}
                            disabled={gpsLoading}
                            className="flex items-center gap-1 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
                          >
                            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                            {gpsLoading ? t('detecting') : t('useMyLocation')}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder={t('labelFieldPlaceholder')}
                          value={addrForm.label}
                          onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-herb"
                        />
                        <input
                          type="text"
                          placeholder={t('streetFieldPlaceholder')}
                          value={addrForm.street}
                          onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-herb"
                          required
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder={t('postalFieldPlaceholder')}
                            value={addrForm.postal_code}
                            onChange={e => setAddrForm(f => ({ ...f, postal_code: e.target.value }))}
                            className="w-[72px] min-w-0 px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-herb"
                          />
                          <input
                            type="text"
                            placeholder={t('cityFieldPlaceholder')}
                            value={addrForm.city}
                            onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-herb"
                            required
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => { setAddingAddr(false); setAddrForm({ label: '', street: '', postal_code: '', city: '' }) }}
                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={savingAddr}
                            className="flex-1 py-1.5 text-xs bg-midnight text-white rounded-md hover:bg-midnight-dark flex items-center justify-center gap-1"
                          >
                            {savingAddr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {t('save')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-4 relative">
            {user ? (
              <>
                <ChatIcon />
                <NotificationBell />

                {/* Cart — owner only */}
                {role === 'restaurant_owner' && (
                  <button
                    onClick={() => navigate('/owner/cart')}
                    className="p-2 text-slate-400 hover:text-slate-600 relative"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <span className="absolute top-1 right-0 w-4 h-4 bg-herb text-white text-[10px] flex items-center justify-center rounded-full">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </button>
                )}

                {/* User avatar — simplified dropdown: Profile + Sign Out only */}
                <div className="relative" ref={userRef}>
                  <div
                    className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-200 cursor-pointer"
                    onClick={() => setUserMenuOpen(o => !o)}
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[130px]">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[130px]">
                        {role === 'restaurant_owner'
                          ? (profile?.restaurant_name || 'Restaurant')
                          : role === 'supplier'
                          ? (profile?.business_name || 'Supplier')
                          : role?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="w-9 h-9 bg-celeste rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-midnight-dark">{initials}</span>
                      )}
                    </div>
                  </div>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1">
                      <Link
                        to={getProfileLink()}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-lionsmane text-slate-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4 text-midnight" /> {t('profile')}
                      </Link>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" /> {t('signOut')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="border-2 border-slate-200 text-slate-700 hover:bg-lionsmane px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
                  {t('logIn')}
                </Link>
                <Link to="/register" className="bg-midnight text-white hover:bg-midnight-dark px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm">
                  {t('signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
