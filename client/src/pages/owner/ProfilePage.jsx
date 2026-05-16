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
import ModalPortal from '../../components/ui/ModalPortal'

function Modal({ title, onClose, children, maxW = 'max-w-sm' }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className={`bg-white rounded-2xl shadow-xl w-full ${maxW} overflow-hidden max-h-[90vh] flex flex-col`}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
        </div>
      </div>
    </ModalPortal>
  )
}

function AvatarModal({ userId, onClose, onSaved }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!file) { toast.error('Please select an image'); return }
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)
      onSaved(publicUrl)
      onClose()
      toast.success('Profile photo updated!')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Update Profile Picture" onClose={onClose}>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-celeste-dark rounded-xl bg-lionsmane p-10 flex items-center justify-center cursor-pointer hover:bg-celeste transition-colors mb-4"
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {preview ? (
          <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <span className="text-4xl text-herb-light font-light leading-none">+</span>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
      </div>
    </Modal>
  )
}

function EditProfileModal({ userId, currentName, currentRestaurantName, currentBio, onClose, onSaved }) {
  const [name, setName] = useState(currentName || '')
  const [restaurantName, setRestaurantName] = useState(currentRestaurantName || '')
  const [bio, setBio] = useState(currentBio || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await supabase.from('users').update({ full_name: name.trim() }).eq('id', userId)
      await supabase.from('owner_profiles').upsert(
        { user_id: userId, restaurant_name: restaurantName.trim() || null, bio: bio.trim() || null },
        { onConflict: 'user_id' }
      )
      onSaved({ full_name: name.trim(), restaurant_name: restaurantName.trim() || null, bio: bio.trim() || null })
      onClose()
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Mohammed Ali"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Restaurant Name</label>
          <input
            value={restaurantName}
            onChange={e => setRestaurantName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Al-Nour Kitchen"
          />
          <p className="text-xs text-slate-400 mt-1">Shown under your name in the app</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb resize-none"
            placeholder="A short description about your restaurant..."
          />
          <p className="text-xs text-slate-400 mt-1">Optional — tell suppliers a bit about your business</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

function BusinessInfoModal({ userId, current, onClose, onSaved }) {
  const normaliseCuisine = v => Array.isArray(v) ? v : (v ? [v] : [])
  const [form, setForm] = useState({
    tax_id: current.tax_id || '',
    city: current.city || '',
    cuisine: normaliseCuisine(current.cuisine),
    website: current.website || '',
    latitude: current.latitude || null,
    longitude: current.longitude || null,
  })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const { addresses: savedAddresses, addAddress, setDefault: setDefaultAddr } = useAddresses()
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [selectedAddrId, setSelectedAddrId] = useState('')

  useEffect(() => {
    if (!selectedAddrId && savedAddresses.length > 0) {
      const def = savedAddresses.find(a => a.is_default)
      const byCity = savedAddresses.find(a => a.city === current.city)
      const initial = def || byCity || savedAddresses[0]
      if (initial) {
        setSelectedAddrId(initial.id)
        setForm(f => ({ ...f, city: initial.city || '', latitude: initial.latitude || null, longitude: initial.longitude || null }))
      }
    }
  }, [savedAddresses])

  function handleSelectAddr(id) {
    setSelectedAddrId(id)
    const addr = savedAddresses.find(a => a.id === id)
    if (addr) setForm(f => ({ ...f, city: addr.city || '', latitude: addr.latitude || null, longitude: addr.longitude || null }))
  }

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const data = await reverseGeocode(lat, lng)
          const a = data.address || {}
          const city = a.city || a.town || a.village || a.suburb || ''
          const newAddr = await addAddress({
            label: 'Business Location',
            street: [a.road, a.house_number].filter(Boolean).join(' ') || '',
            postal_code: a.postcode || '',
            city,
            country: 'Germany',
            latitude: lat,
            longitude: lng,
          })
          setSelectedAddrId(newAddr.id)
          setForm(f => ({ ...f, city, latitude: lat, longitude: lng }))
          toast.success('Location saved!')
        } catch {
          toast.error('Could not fetch location from GPS')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { toast.error('GPS permission denied'); setGpsLoading(false) },
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
    if (!form.tax_id.trim()) { toast.error('Tax ID is required'); return }
    setSaving(true)
    try {
      await supabase.from('owner_profiles').upsert(
        {
          user_id: userId,
          tax_id: form.tax_id.trim(),
          city: form.city.trim() || null,
          cuisine: form.cuisine.length > 0 ? form.cuisine : null,
          website: form.website.trim() || null,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
        },
        { onConflict: 'user_id' }
      )
      if (selectedAddrId) await setDefaultAddr(selectedAddrId)
      onSaved({ tax_id: form.tax_id.trim(), city: form.city.trim() || null, cuisine: form.cuisine, website: form.website.trim() || null, latitude: form.latitude || null, longitude: form.longitude || null })
      onClose()
      toast.success('Business details saved!')
    } catch {
      toast.error('Failed to save business details')
    } finally {
      setSaving(false)
    }
  }

  const CUISINE_TYPES = ['Halal', 'Middle Eastern', 'Asian', 'Mediterranean', 'Fast Food', 'Fine Dining', 'Café', 'Bakery', 'Seafood', 'Other']

  return (
    <Modal title="Business Details" onClose={onClose} maxW="max-w-md">
      <div className="space-y-4">
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">City / Location</label>
            <button type="button" onClick={() => setShowAddrModal(true)} className="text-xs text-midnight font-semibold hover:text-midnight-dark transition-colors">
              + Manage Addresses
            </button>
          </div>
          {savedAddresses.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-sm text-slate-400 mb-3">No locations added yet</p>
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={detectGPS} disabled={gpsLoading} className="flex items-center gap-1.5 text-sm text-midnight font-semibold hover:text-midnight-dark disabled:opacity-50 transition-colors">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Use GPS
                </button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setShowAddrModal(true)} className="text-sm text-midnight font-semibold hover:text-midnight-dark">
                  Add Address
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {savedAddresses.map(addr => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => handleSelectAddr(addr.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                    selectedAddrId === addr.id ? 'border-herb bg-lionsmane' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedAddrId === addr.id ? 'text-midnight' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedAddrId === addr.id ? 'text-midnight-dark' : 'text-slate-900'}`}>{addr.label || addr.city}</p>
                    <p className="text-xs text-slate-500 truncate">{[addr.street, [addr.postal_code, addr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
                  </div>
                  {addr.is_default && <span className="text-xs bg-celeste text-midnight-dark px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Favorite</span>}
                  {selectedAddrId === addr.id && !addr.is_default && <CheckCircle className="w-4 h-4 text-midnight flex-shrink-0" />}
                </button>
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
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (form.password && form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      const updates = {}
      if (form.email) updates.email = form.email
      if (form.password) updates.password = form.password
      if (!Object.keys(updates).length) { toast.error('Nothing to update'); setSaving(false); return }
      const { error } = await supabase.auth.updateUser(updates)
      if (error) throw error
      if (updates.email) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('users').update({ email: form.email }).eq('id', user.id)
      }
      toast.success('Account updated!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Change Email & Password" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Email (optional)</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="new@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password (optional)</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
              placeholder="Min. 6 characters"
            />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="Repeat new password"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PhoneModal({ userId, currentPhone, onClose, onSaved }) {
  const [phone, setPhone] = useState(currentPhone || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('users').update({ phone }).eq('id', userId)
      onSaved(phone)
      onClose()
      toast.success('Phone number updated!')
    } catch {
      toast.error('Failed to update phone number')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Update Phone Number" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="+49 170 1234567"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AddressModal({ onClose, userId }) {
  const { addresses, addAddress, deleteAddress, setDefault, reload } = useAddresses()
  const [form, setForm] = useState({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return }
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
          toast.success('Location detected!')
        } catch {
          toast.error('Could not detect GPS position')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { toast.error('GPS permission denied'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.city) { toast.error('City is required'); return }
    setSaving(true)
    try {
      await addAddress({ ...form, country: 'Germany' })
      setForm({ label: '', street: '', postal_code: '', city: '', latitude: null, longitude: null })
      toast.success('Address added!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      const addr = addresses.find(a => a.id === id)
      await deleteAddress(id)
      // If deleting Business Location, clear lat/lng/city from owner_profiles too
      if (addr?.label === 'Business Location' && userId) {
        await supabase.from('owner_profiles').update({ latitude: null, longitude: null, city: null }).eq('user_id', userId)
      }
      toast.success('Address removed')
    } catch {
      toast.error('Failed to remove address')
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefault(id)
      await reload()
      toast.success('Default address updated')
    } catch {
      toast.error('Failed to update default')
    }
  }

  function formatAddress(addr) {
    const cityPart = [addr.postal_code, addr.city].filter(Boolean).join(' ')
    return [addr.street, cityPart].filter(Boolean).join(', ')
  }

  return (
    <Modal title="Manage Addresses" onClose={onClose} maxW="max-w-md">
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
                  <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-midnight font-semibold hover:underline whitespace-nowrap">
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
            className="flex items-center gap-1.5 text-xs text-midnight font-semibold hover:text-midnight-dark disabled:opacity-50 transition-colors"
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
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Address
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteAccountModal({ onClose, onDeleted }) {
  const [input, setInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (input !== 'delete') return
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      onDeleted()
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <Modal title="Delete Account" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">This action is permanent</p>
          <p className="text-sm text-red-600">All your data, orders, and account information will be permanently deleted and cannot be recovered.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Type <span className="font-mono text-red-600">delete</span> to confirm
          </label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="delete"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={input !== 'delete' || deleting}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Account
          </button>
        </div>
      </div>
    </Modal>
  )
}

function BankModal({ userId, current, onClose, onSaved }) {
  const [form, setForm] = useState({
    bank_name: current?.bank_name || '',
    account_holder: current?.account_holder || '',
    iban: current?.iban || '',
    bic: current?.bic || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.iban.trim()) { toast.error('IBAN is required'); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('owner_bank_details')
        .upsert({ owner_id: userId, ...form, iban: form.iban.replace(/\s/g, '') }, { onConflict: 'owner_id' })
      if (error) throw error
      onSaved()
      onClose()
      toast.success('Bank details saved!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Bank Details" onClose={onClose}>
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
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SettingRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-4 hover:bg-lionsmane transition-colors text-left"
    >
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </button>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfileState } = useAuth()
  const { addresses } = useAddresses()
  const { lang, setLanguage } = useLanguage()
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [displayName, setDisplayName] = useState(profile?.full_name || '')
  const [restaurantName, setRestaurantName] = useState(profile?.restaurant_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [businessInfo, setBusinessInfo] = useState({
    tax_id: profile?.tax_id || '',
    city: profile?.city || '',
    cuisine: profile?.cuisine || [],
    website: profile?.website || '',
  })
  const [bankDetails, setBankDetails] = useState(null)

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
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

  function handleSignOut() {
    signOut()
  }

  function handleAvatarSaved(url) {
    setAvatarUrl(url)
    updateProfileState({ avatar_url: url })
  }

  function handleProfileSaved({ full_name, restaurant_name: newRestaurantName, bio: newBio }) {
    setDisplayName(full_name)
    setRestaurantName(newRestaurantName)
    setBio(newBio)
    updateProfileState({ full_name, restaurant_name: newRestaurantName, bio: newBio })
  }

  function handleBusinessInfoSaved(info) {
    setBusinessInfo(info)
    updateProfileState(info)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-midnight to-slate-800" />
        <div className="px-8 pb-7 text-center -mt-14">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-xl mx-auto">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-celeste flex items-center justify-center">
                  <User className="w-10 h-10 text-herb-light" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute bottom-1 right-1 bg-midnight text-white p-1.5 rounded-full hover:bg-midnight border-2 border-white transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
          <h2 className="font-bold text-slate-900 text-xl mt-3">{displayName || 'Restaurant Owner'}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{restaurantName || 'Restaurant'}</p>
          {bio && <p className="text-sm text-slate-500 italic mt-1.5">"{bio}"</p>}
          <button onClick={() => setShowEditModal(true)} className="mt-2 text-xs text-midnight font-semibold hover:underline">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/owner/orders')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <Package className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">View My Orders</span>
        </button>
        <button
          onClick={() => navigate('/owner/analytics')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <TrendingUp className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">View Analysis</span>
        </button>
      </div>

      {/* Business Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <h3 className="font-bold text-slate-900 text-base">Business Details</h3>
          <button
            onClick={() => setShowBusinessInfoModal(true)}
            className="text-xs text-midnight font-semibold hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {/* Tax ID */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Tax ID / VAT</p>
              {businessInfo.tax_id ? (
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{businessInfo.tax_id}</p>
              ) : (
                <button onClick={() => setShowBusinessInfoModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">
                  Add Tax ID →
                </button>
              )}
            </div>
            {businessInfo.tax_id && <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />}
          </div>

          {/* City — derived from saved addresses only */}
          <div className="flex items-center gap-3 px-4 py-3">
            <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">City</p>
              {(() => {
                const city = addresses.find(a => a.is_default)?.city || addresses[0]?.city
                return city
                  ? <p className="text-sm font-semibold text-slate-900 mt-0.5">{city}</p>
                  : <button onClick={() => setShowAddressModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">Add address →</button>
              })()}
            </div>
          </div>

          {/* Cuisine / Type */}
          <div className="flex items-start gap-3 px-4 py-3">
            <Tag className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-2">Cuisine / Type</p>
              {businessInfo.cuisine?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {businessInfo.cuisine.map(c => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-midnight text-white">{c}</span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">Not set</span>
              )}
            </div>
          </div>

          {/* Bank Details — inside Business Details card, same as supplier */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-300" />
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Bank Details</p>
              </div>
              <button onClick={() => setShowBankModal(true)} className="text-xs text-midnight font-semibold hover:underline">
                {bankDetails ? 'Edit' : 'Add'}
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="font-bold text-slate-900 text-base px-4 pt-5 pb-2">Account Settings</h3>
        <div className="divide-y divide-slate-100">
          <SettingRow label="Change Email & Password" onClick={() => setShowPasswordModal(true)} />
          <SettingRow label="Update Phone Number" onClick={() => setShowPhoneModal(true)} />
          <SettingRow label="Manage My Addresses" onClick={() => setShowAddressModal(true)} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Language / Sprache</span>
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
        Sign Out
      </button>

      {/* Delete Account */}
      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full py-3 text-sm text-slate-400 hover:text-red-500 font-medium transition-colors"
      >
        Delete Account
      </button>

      {/* Modals */}
      {showAvatarModal && (
        <AvatarModal userId={user.id} onClose={() => setShowAvatarModal(false)} onSaved={handleAvatarSaved} />
      )}
      {showEditModal && (
        <EditProfileModal
          userId={user.id}
          currentName={displayName}
          currentRestaurantName={restaurantName}
          currentBio={bio}
          onClose={() => setShowEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showPhoneModal && (
        <PhoneModal
          userId={user.id}
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
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => signOut()}
        />
      )}
    </div>
  )
}
