import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { useLanguage, LANGS } from '../../context/LanguageContext'
import { reverseGeocode } from '../../lib/geocode'
import {
  LogOut, Loader2, User, ChevronRight, X, Eye, EyeOff,
  Package, TrendingUp, Star, Trash2, Pencil, Navigation,
  Building2, MapPin, Tag, CheckCircle, CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatIBAN, handleIBANInput } from '../../lib/formatIBAN'
import Modal from '../../components/profile/Modal'
import SettingRow from '../../components/profile/SettingRow'
import AvatarModal from '../../components/profile/AvatarModal'
import PasswordModal from '../../components/profile/PasswordModal'
import PhoneModal, { formatPhone } from '../../components/profile/PhoneModal'
import DeleteAccountModal from '../../components/profile/DeleteAccountModal'


function BusinessInfoModal({ userId, current, onClose, onSaved }) {
  const { t } = useLanguage()
  const normaliseCuisine = v => Array.isArray(v) ? v : (v ? [v] : [])
  const [form, setForm] = useState({
    restaurant_name: current.restaurant_name || '',
    bio: current.bio || '',
    tax_id: current.tax_id || '',
    city: current.city || '',
    cuisine: normaliseCuisine(current.cuisine),
    website: current.website || '',
    latitude: current.latitude || null,
    longitude: current.longitude || null,
  })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const { addresses: savedAddresses, addAddress } = useAddresses()
  const [showAddrModal, setShowAddrModal] = useState(false)

  // Cities are auto-derived from every saved address. Primary coords use the
  // default address (fallback to the first one). Users add/remove cities via
  // the "+ Manage Addresses" button — no checkbox UX to keep in sync.
  useEffect(() => {
    if (savedAddresses.length === 0) return
    const cities = savedAddresses.map(a => a.city).filter(Boolean).join(', ')
    const primary = savedAddresses.find(a => a.is_default) || savedAddresses[0]
    setForm(f => ({
      ...f,
      city: cities,
      latitude: primary?.latitude ?? f.latitude,
      longitude: primary?.longitude ?? f.longitude,
    }))
  }, [savedAddresses])

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error(t('toastGpsNotSupported')); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const data = await reverseGeocode(lat, lng)
          const a = data.address || {}
          const city = a.city || a.town || a.village || a.suburb || ''
          await addAddress({
            label: 'Business Location',
            street: [a.road, a.house_number].filter(Boolean).join(' ') || '',
            postal_code: a.postcode || '',
            city,
            country: 'Germany',
            latitude: lat,
            longitude: lng,
          })
          setForm(f => ({ ...f, city, latitude: lat, longitude: lng }))
          toast.success(t('toastLocationSaved'))
        } catch {
          toast.error(t('toastCouldNotFetchLocationGps'))
        } finally {
          setGpsLoading(false)
        }
      },
      () => { toast.error(t('toastGpsPermDenied')); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function toggleCuisine(type) {
    setForm(f => ({
      ...f,
      cuisine: f.cuisine.includes(type)
        ? f.cuisine.filter(c => c !== type)
        : [...f.cuisine, type],
    }))
  }

  async function handleSave() {
    if (!form.tax_id.trim()) { toast.error(t('toastTaxIdRequired')); return }
    setSaving(true)
    try {
      await supabase.from('owner_profiles').upsert(
        {
          user_id: userId,
          restaurant_name: form.restaurant_name.trim() || null,
          bio: form.bio.trim() || null,
          tax_id: form.tax_id.trim(),
          city: form.city.trim() || null,
          cuisine: form.cuisine.length > 0 ? form.cuisine : null,
          website: form.website.trim() || null,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
        },
        { onConflict: 'user_id' }
      )
      onSaved({ restaurant_name: form.restaurant_name.trim() || null, bio: form.bio.trim() || null, tax_id: form.tax_id.trim(), city: form.city.trim() || null, cuisine: form.cuisine, website: form.website.trim() || null, latitude: form.latitude || null, longitude: form.longitude || null })
      onClose()
      toast.success(t('toastBusinessDetailsSaved'))
    } catch {
      toast.error(t('toastFailedSaveBusinessDetails'))
    } finally {
      setSaving(false)
    }
  }

  const CUISINE_TYPES = ['Halal', 'Middle Eastern', 'Asian', 'Mediterranean', 'Fast Food', 'Fine Dining', 'Café', 'Bakery', 'Seafood', 'Other']

  return (
    <Modal title={t('businessDetailsTitle')} onClose={onClose} maxW="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('restaurantName')}</label>
          <input
            value={form.restaurant_name}
            onChange={e => setForm(f => ({ ...f, restaurant_name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Al-Nour Kitchen"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('description')}</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb resize-none"
            placeholder="A short description about your restaurant..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Tax ID / VAT Number <span className="text-red-500">*</span>
          </label>
          <input
            value={form.tax_id}
            onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. DE123456789"
          />
          <p className="text-xs text-slate-400 mt-1">Used on invoices and delivery receipts</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cities {savedAddresses.length > 0 && (
                <span className="ml-1 text-herb-dark normal-case tracking-normal">· {savedAddresses.length} from your addresses</span>
              )}
            </label>
            <button type="button" onClick={() => setShowAddrModal(true)} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark transition-colors">
              + Manage Addresses
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-2">Every saved address adds its city to your business details automatically.</p>
          {savedAddresses.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-sm text-slate-400 mb-3">No locations added yet</p>
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={detectGPS} disabled={gpsLoading} className="flex items-center gap-1.5 text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark disabled:opacity-50 transition-colors">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Use GPS
                </button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setShowAddrModal(true)} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark">
                  Add Address
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {savedAddresses.map(addr => (
                <div
                  key={addr.id}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-lionsmane text-left"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 text-midnight" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-midnight-dark">{addr.label || addr.city}</p>
                    <p className="text-xs text-slate-500 truncate">{[addr.street, [addr.postal_code, addr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
                  </div>
                  {addr.is_default && <span className="text-xs bg-celeste text-midnight-dark px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Main</span>}
                </div>
              ))}
            </div>
          )}
          {showAddrModal && <AddressModal onClose={() => setShowAddrModal(false)} userId={userId} />}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Cuisine / Restaurant Type <span className="text-slate-400 font-normal normal-case">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleCuisine(type)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  form.cuisine.includes(type)
                    ? 'bg-midnight text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Website (optional)</label>
          <input
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="https://myrestaurant.com"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}


function AddressModal({ onClose, userId }) {
  const { t } = useLanguage()
  const { addresses, addAddress, deleteAddress, setDefault, reload } = useAddresses()
  const [form, setForm] = useState({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

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
              city = a.city || a.town || a.village || a.suburb || ''
            }
          } catch {}
          setForm(f => ({ ...f, street, postal_code, city, latitude: lat, longitude: lng }))
          toast.success(t('toastGpsDetected'))
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

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.city) { toast.error(t('toastCityRequired')); return }
    setSaving(true)
    try {
      await addAddress({ ...form, country: 'Germany' })
      setForm({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
      toast.success(t('toastAddressAdded'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(id)
      toast.success(t('toastAddressRemoved'))
    } catch {
      toast.error(t('toastFailedRemoveAddress'))
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefault(id)
      await reload()
      toast.success(t('toastDefaultAddressUpdated'))
    } catch {
      toast.error(t('toastFailedUpdateDefault'))
    }
  }

  function formatAddress(addr) {
    const cityPart = [addr.postal_code, addr.city].filter(Boolean).join(' ')
    return [addr.street, cityPart].filter(Boolean).join(', ')
  }

  return (
    <Modal title={t('manageAddressesTitle')} onClose={onClose} maxW="max-w-md">
      <div className="space-y-3 mb-5">
        {addresses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">No addresses yet.</p>
        ) : (
          addresses.map(addr => (
            <div key={addr.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${addr.is_default ? 'border-celeste-dark bg-lionsmane' : 'border-slate-200 bg-white'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 truncate">{addr.label || addr.city || 'Address'}</p>
                  {addr.is_default && <Star className="w-3.5 h-3.5 text-herb fill-herb flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 truncate">{formatAddress(addr)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark whitespace-nowrap">
                    Set Favorite
                  </button>
                )}
                <button onClick={() => handleDelete(addr.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-900">Add New Address (Germany)</p>
          <button
            type="button"
            onClick={detectGPS}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark disabled:opacity-50 transition-colors"
          >
            {gpsLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Navigation className="w-3.5 h-3.5" />}
            {gpsLoading ? 'Detecting...' : 'Use My Location'}
          </button>
        </div>
        <div className="space-y-2.5">
          <input
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="Location Name (e.g. Warehouse A)"
          />
          <input
            value={form.street}
            onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="Street"
          />
          <div className="flex gap-2">
            <input
              value={form.postal_code}
              onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
              className="w-28 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
              placeholder="PLZ (Zip)"
            />
            <input
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
              placeholder="City"
            />
          </div>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Address
          </button>
        </div>
      </form>
    </Modal>
  )
}


function BankModal({ userId, current, onClose, onSaved }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    bank_name: current?.bank_name || '',
    account_holder: current?.account_holder || '',
    iban: current?.iban || '',
    bic: current?.bic || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.iban.trim()) { toast.error(t('toastIbanRequired')); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('owner_bank_details')
        .upsert({ owner_id: userId, ...form, iban: form.iban.replace(/\s/g, '') }, { onConflict: 'owner_id' })
      if (error) throw error
      onSaved()
      onClose()
      toast.success(t('toastBankDetailsSaved'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('bankDetailsTitle')} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bank Name</label>
          <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Deutsche Bank" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Holder</label>
          <input value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="Full name on account" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">IBAN *</label>
          <input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: handleIBANInput(e.target.value) }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="DE89 3704 0044 0532 0130 00" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">BIC / SWIFT</label>
          <input value={form.bic} onChange={e => setForm(f => ({ ...f, bic: e.target.value.toUpperCase() }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. DEUTDEDB" />
        </div>
        <p className="text-xs text-slate-400">These details are shared with suppliers only when they need to process a refund to you.</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfileState } = useAuth()
  const { addresses } = useAddresses()
  const { lang, setLanguage, t } = useLanguage()
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [displayName, setDisplayName] = useState(profile?.full_name || '')
  const [restaurantName, setRestaurantName] = useState(profile?.restaurant_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [businessInfo, setBusinessInfo] = useState({
    restaurant_name: profile?.restaurant_name || '',
    bio: profile?.bio || '',
    tax_id: profile?.tax_id || '',
    city: profile?.city || '',
    cuisine: profile?.cuisine || [],
    website: profile?.website || '',
  })
  const [bankDetails, setBankDetails] = useState(null)

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarLightbox, setAvatarLightbox] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showBusinessInfoModal, setShowBusinessInfoModal] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('owner_bank_details').select('*').eq('owner_id', user.id).maybeSingle()
        .then(({ data }) => setBankDetails(data))
    }
  }, [user])

  // Sync businessInfo whenever profile loads/updates (initial mount may be before profile is fetched)
  useEffect(() => {
    if (profile) {
      setBusinessInfo({
        restaurant_name: profile.restaurant_name || '',
        bio: profile.bio || '',
        tax_id: profile.tax_id || '',
        city: profile.city || '',
        cuisine: profile.cuisine || [],
        website: profile.website || '',
      })
    }
  }, [profile])

  function handleSignOut() {
    signOut()
  }

  function handleAvatarSaved(url, name) {
    setAvatarUrl(url)
    if (name) setDisplayName(name)
    updateProfileState({ avatar_url: url, ...(name ? { full_name: name } : {}) })
  }

  function handleBusinessInfoSaved(info) {
    setBusinessInfo(info)
    if (info.restaurant_name !== undefined) setRestaurantName(info.restaurant_name || '')
    if (info.bio !== undefined) setBio(info.bio || '')
    updateProfileState(info)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">

      {/* Profile Header */}
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-midnight to-slate-800" />
        <div className="px-8 pb-7 text-center -mt-14">
          <div className="relative inline-block">
            <button
              onClick={() => avatarUrl && setAvatarLightbox(true)}
              className={`w-28 h-28 rounded-full bg-white p-1.5 shadow-xl mx-auto block ${avatarUrl ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-celeste flex items-center justify-center">
                  <User className="w-10 h-10 text-herb-light" />
                </div>
              )}
            </button>
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute bottom-1 right-1 bg-midnight text-white p-1.5 rounded-full hover:bg-midnight border-2 border-white transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          <h2 className="font-bold text-slate-900 text-xl mt-3">{displayName || t('restaurantOwner')}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{restaurantName || t('restaurant')}</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/owner/orders')}
          className="card p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <Package className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('viewMyOrders')}</span>
        </button>
        <button
          onClick={() => navigate('/owner/analytics')}
          className="card p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <TrendingUp className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('viewAnalysis')}</span>
        </button>
      </div>

      {/* Business Details */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <h3 className="font-bold text-slate-900 text-base">{t('businessDetails')}</h3>
          <button
            onClick={() => setShowBusinessInfoModal(true)}
            className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
          >
            {t('edit')}
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {/* Restaurant Name */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('restaurantName')}</p>
              {businessInfo.restaurant_name ? (
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{businessInfo.restaurant_name}</p>
              ) : (
                <button onClick={() => setShowBusinessInfoModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">
                  {t('add')} →
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start gap-3 px-4 py-3">
            <Tag className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('description')}</p>
              {businessInfo.bio ? (
                <p className="text-sm text-slate-600 mt-0.5 italic">"{businessInfo.bio}"</p>
              ) : (
                <span className="text-sm text-slate-400">{t('notSet')}</span>
              )}
            </div>
          </div>

          {/* Tax ID */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('taxIdVat')}</p>
              {businessInfo.tax_id ? (
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{businessInfo.tax_id}</p>
              ) : (
                <button onClick={() => setShowBusinessInfoModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">
                  {t('addTaxId')} →
                </button>
              )}
            </div>
            {businessInfo.tax_id && <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />}
          </div>

          {/* City — derived live from addresses so it updates without edit/save */}
          <div className="flex items-start gap-3 px-4 py-3">
            <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1.5">{t('city')}</p>
              {(() => {
                const liveCities = [...new Set(addresses.map(a => a.city).filter(Boolean))]
                const fallbackCities = businessInfo.city.split(',').map(c => c.trim()).filter(Boolean)
                const pills = liveCities.length > 0 ? liveCities : fallbackCities
                return pills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pills.map(c => (
                      <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-celeste text-midnight-dark">{c}</span>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setShowAddressModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">{t('addAddress')} →</button>
                )
              })()}
            </div>
          </div>

          {/* Cuisine / Type */}
          <div className="flex items-start gap-3 px-4 py-3">
            <Tag className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-2">{t('cuisineType')}</p>
              {businessInfo.cuisine?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {businessInfo.cuisine.map(c => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-midnight text-white">{c}</span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">{t('notSet')}</span>
              )}
            </div>
          </div>

          {/* Bank Details — inside Business Details card, same as supplier */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-300" />
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('bankDetails')}</p>
              </div>
              <button onClick={() => setShowBankModal(true)} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark">
                {bankDetails ? t('edit') : t('add')}
              </button>
            </div>
            {bankDetails ? (
              <div className="bg-lionsmane rounded-xl p-3 space-y-2">
                {bankDetails.bank_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Bank</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase">{bankDetails.bank_name}</span>
                  </div>
                )}
                {bankDetails.account_holder && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Account Holder</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase">{bankDetails.account_holder}</span>
                  </div>
                )}
                {bankDetails.iban && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 flex-shrink-0">IBAN</span>
                    <span className="text-sm font-semibold text-slate-900 font-mono">{formatIBAN(bankDetails.iban)}</span>
                  </div>
                )}
                {bankDetails.bic && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">BIC / SWIFT</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase font-mono">{bankDetails.bic}</span>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowBankModal(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-marigold font-semibold hover:border-marigold-light transition-colors">
                + Add bank details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="card overflow-hidden">
        <h3 className="font-bold text-slate-900 text-base px-4 pt-5 pb-2">{t('accountSettings')}</h3>
        <div className="divide-y divide-slate-100">
          <SettingRow label={t('changeEmailPassword')} onClick={() => setShowPasswordModal(true)} />
          <SettingRow label={t('updatePhoneNumber')} value={profile?.phone ? formatPhone(profile.phone) : undefined} onClick={() => setShowPhoneModal(true)} />
          <SettingRow label={t('manageMyAddresses')} onClick={() => setShowAddressModal(true)} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{t('languageSprache')}</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {LANGS.map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors ${lang === l ? 'bg-white text-midnight shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100"
      >
        <LogOut className="w-5 h-5" />
        {t('signOut')}
      </button>

      {/* Delete Account */}
      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full py-3 text-sm text-slate-400 hover:text-red-500 font-medium transition-colors"
      >
        {t('deleteAccount')}
      </button>

      {/* Modals */}
      {showAvatarModal && (
        <AvatarModal userId={user.id} currentName={displayName} onClose={() => setShowAvatarModal(false)} onSaved={handleAvatarSaved} />
      )}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} currentEmail={user?.email} />}
      {showPhoneModal && (
        <PhoneModal
          userId={user.id}
          role="owner"
          currentPhone={profile?.phone}
          onClose={() => setShowPhoneModal(false)}
          onSaved={phone => updateProfileState({ phone })}
        />
      )}
      {showAddressModal && <AddressModal onClose={() => setShowAddressModal(false)} userId={user?.id} />}
      {showBusinessInfoModal && (
        <BusinessInfoModal
          userId={user.id}
          current={businessInfo}
          onClose={() => setShowBusinessInfoModal(false)}
          onSaved={handleBusinessInfoSaved}
        />
      )}
      {showBankModal && (
        <BankModal
          userId={user.id}
          current={bankDetails}
          onClose={() => setShowBankModal(false)}
          onSaved={() => {
            supabase.from('owner_bank_details').select('*').eq('owner_id', user.id).maybeSingle()
              .then(({ data }) => setBankDetails(data))
          }}
        />
      )}
      {showDeleteModal && (
        <DeleteAccountModal
          message="All your data, orders, and account information will be permanently deleted and cannot be recovered."
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => { await supabase.auth.signOut(); navigate('/account-deleted') }}
        />
      )}
      {avatarLightbox && avatarUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
          onClick={() => setAvatarLightbox(false)}
        >
          <img
            src={avatarUrl}
            alt="Profile"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
