import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { useLanguage, LANGS } from '../../context/LanguageContext'
import { reverseGeocode } from '../../lib/geocode'
import {
  LogOut, Loader2, User, FileText, CheckCircle, Clock, XCircle,
  ExternalLink, ChevronRight, X, Eye, EyeOff, Upload,
  Package, TrendingUp, Star, Trash2, CreditCard, Pencil, Navigation,
  Building2, MapPin, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'
import { formatIBAN, handleIBANInput } from '../../lib/formatIBAN'

const CERT_STATUS = {
  pending:  { label: 'Pending Review', icon: Clock,       color: 'text-marigold bg-lionsmane border-marigold-light' },
  approved: { label: 'Approved',       icon: CheckCircle, color: 'text-midnight bg-lionsmane border-celeste' },
  rejected: { label: 'Rejected',       icon: XCircle,     color: 'text-red-600 bg-red-50 border-red-200' },
}

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
      await supabase.from('supplier_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)
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

function EditProfileModal({ userId, currentName, supplierProfile, currentBio, onClose, onSaved }) {
  const [name, setName] = useState(currentName || '')
  const [businessName, setBusinessName] = useState(supplierProfile?.business_name || '')
  const [bio, setBio] = useState(currentBio || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await supabase.from('users').update({ full_name: name.trim(), bio: bio.trim() || null }).eq('id', userId)
      if (supplierProfile?.id) {
        await supabase.from('supplier_profiles').update({
          business_name: businessName.trim() || null,
          description: bio.trim() || null,
        }).eq('id', supplierProfile.id)
      }
      onSaved({ full_name: name.trim(), business_name: businessName.trim() || null, bio: bio.trim() || null })
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
            placeholder="e.g. Ahmed Hassan"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Business Name</label>
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Al-Nour Meats GmbH"
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
            placeholder="A short description about your business..."
          />
          <p className="text-xs text-slate-400 mt-1">Optional — tells restaurant owners about your supply business</p>
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
      if (updates.email) await supabase.from('users').update({ email: form.email }).eq('id', (await supabase.auth.getUser()).data.user.id)
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
      await supabase.from('supplier_profiles').update({ phone }).eq('user_id', userId)
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

function AddressModal({ onClose, supplierProfileId }) {
  const { addresses, addAddress, deleteAddress, setDefault, reload } = useAddresses()
  const [form, setForm] = useState({ label: '', street: '', postal_code: '', city: '' })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const data = await reverseGeocode(lat, lng)
          const addr = data.address || {}
          setForm(f => ({
            ...f,
            street: [addr.road, addr.house_number].filter(Boolean).join(' ') || '',
            postal_code: addr.postcode || '',
            city: addr.city || addr.town || addr.village || addr.suburb || '',
          }))
          toast.success('Location detected!')
        } catch {
          toast.error('Could not fetch address from GPS')
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
    if (!form.street || !form.city) { toast.error('Please fill in Street and City'); return }
    setSaving(true)
    try {
      await addAddress({ ...form, country: 'Germany' })
      setForm({ label: '', street: '', postal_code: '', city: '' })
      toast.success('Address added!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(id)
      toast.success('Address removed')
    } catch {
      toast.error('Failed to remove address')
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefault(id)
      await reload()
      if (supplierProfileId) {
        const addr = addresses.find(a => a.id === id)
        if (addr) {
          await supabase.from('supplier_profiles').update({
            city: addr.city || null,
            latitude: addr.latitude || null,
            longitude: addr.longitude || null,
          }).eq('id', supplierProfileId)
        }
      }
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
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Address
          </button>
        </div>
      </form>
    </Modal>
  )
}

function BankModal({ userId, onClose }) {
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [form, setForm] = useState({ bank_name: '', account_holder: '', iban: '', bic: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ibanError, setIbanError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: sp } = await supabase.from('supplier_profiles').select('id').eq('user_id', userId).single()
      setSupplierProfile(sp)
      if (sp) {
        const { data: bank } = await supabase.from('supplier_bank_details').select('*').eq('supplier_id', sp.id).single()
        if (bank) setForm({ bank_name: bank.bank_name || '', account_holder: bank.account_holder || '', iban: bank.iban || '', bic: bank.bic || '' })
      }
      setLoading(false)
    }
    init()
  }, [userId])

  function validateIban(iban) {
    const cleaned = iban.replace(/\s/g, '')
    if (cleaned.length < 15 || cleaned.length > 34) return 'IBAN must be between 15 and 34 characters'
    if (!/^[A-Z]{2}/i.test(cleaned)) return 'IBAN must start with a 2-letter country code'
    return ''
  }

  async function handleSave(e) {
    e.preventDefault()
    const err = validateIban(form.iban)
    if (err) { setIbanError(err); return }
    setIbanError('')
    setSaving(true)
    try {
      await supabase.from('supplier_bank_details').upsert(
        { ...form, iban: form.iban.replace(/\s/g, ''), supplier_id: supplierProfile.id },
        { onConflict: 'supplier_id' }
      )
      toast.success('Bank details saved!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Bank Details" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-4 bg-lionsmane rounded-xl p-3">
            These details are only shown to restaurant owners who choose bank transfer as their payment method.
          </p>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Name</label>
              <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb" placeholder="Deutsche Bank" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Holder</label>
              <input value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb" placeholder="Al-Nour Meats GmbH" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">IBAN</label>
              <input
                value={form.iban}
                onChange={e => { setForm(f => ({ ...f, iban: handleIBANInput(e.target.value) })); setIbanError('') }}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-herb ${ibanError ? 'border-red-300' : 'border-slate-200'}`}
                placeholder="DE89 3704 0044 0532 0130 00"
              />
              {ibanError && <p className="text-xs text-red-600 mt-1">{ibanError}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">BIC / SWIFT</label>
              <input value={form.bic} onChange={e => setForm(f => ({ ...f, bic: e.target.value.toUpperCase() }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-herb" placeholder="COBADEFFXXX" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}

function BusinessInfoModal({ supplierProfileId, userId, current, onClose, onSaved }) {
  const normaliseCategories = v => Array.isArray(v) ? v : (v ? [v] : [])
  const [form, setForm] = useState({
    tax_id: current.tax_id || '',
    city: current.city || '',
    latitude: current.latitude || null,
    longitude: current.longitude || null,
    categories: normaliseCategories(current.category),
    website: current.website || '',
  })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const { addresses: savedAddresses, addAddress, setDefault: setDefaultAddr } = useAddresses()
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [selectedAddrIds, setSelectedAddrIds] = useState([])

  useEffect(() => {
    if (selectedAddrIds.length === 0 && savedAddresses.length > 0) {
      const savedCities = (current.city || '').split(',').map(c => c.trim()).filter(Boolean)
      let matched = savedAddresses.filter(a => savedCities.includes(a.city))
      if (matched.length === 0) {
        const def = savedAddresses.find(a => a.is_default)
        matched = def ? [def] : [savedAddresses[0]]
      }
      const ids = matched.map(a => a.id)
      const cities = matched.map(a => a.city).filter(Boolean).join(', ')
      const first = matched[0]
      setSelectedAddrIds(ids)
      setForm(f => ({ ...f, city: cities, latitude: first?.latitude || null, longitude: first?.longitude || null }))
    }
  }, [savedAddresses])

  function toggleAddrSelection(id) {
    const next = selectedAddrIds.includes(id)
      ? selectedAddrIds.filter(x => x !== id)
      : [...selectedAddrIds, id]
    const selected = savedAddresses.filter(a => next.includes(a.id))
    // Preserve one city entry per selected address so users see exactly the
    // number of locations they picked, even when several share the same city.
    const cities = selected.map(a => a.city).filter(Boolean).join(', ')
    const first = selected[0]
    setSelectedAddrIds(next)
    setForm(f => ({ ...f, city: cities, latitude: first?.latitude || null, longitude: first?.longitude || null }))
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
          setSelectedAddrIds([newAddr.id])
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

  function toggleCategory(cat) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }))
  }

  async function handleSave() {
    if (!form.tax_id.trim()) { toast.error('Tax ID is required'); return }
    setSaving(true)
    try {
      await supabase.from('supplier_profiles').update({
        tax_id: form.tax_id.trim(),
        city: form.city.trim() || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        category: form.categories.length > 0 ? form.categories : null,
        website: form.website.trim() || null,
      }).eq('id', supplierProfileId)

      if (selectedAddrIds.length > 0) await setDefaultAddr(selectedAddrIds[0])

      onSaved({ ...form, category: form.categories })
      onClose()
      toast.success('Business info saved!')
    } catch {
      toast.error('Failed to save business info')
    } finally {
      setSaving(false)
    }
  }

  const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Spices', 'Other']

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
          <p className="text-xs text-slate-400 mt-1">Required to receive payments and appear verified</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              City / Location {selectedAddrIds.length > 0 && (
                <span className="ml-1 text-herb-dark normal-case tracking-normal">· {selectedAddrIds.length} selected</span>
              )}
            </label>
            <button type="button" onClick={() => setShowAddrModal(true)} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark transition-colors">
              + Manage Addresses
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-2">Tap each location you want shown on your profile</p>
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
              {savedAddresses.map(addr => {
                const isSelected = selectedAddrIds.includes(addr.id)
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => toggleAddrSelection(addr.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                      isSelected ? 'border-herb bg-lionsmane' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-midnight border-midnight' : 'border-slate-300'}`}>
                      {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-midnight' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-midnight-dark' : 'text-slate-900'}`}>{addr.label || addr.city}</p>
                      <p className="text-xs text-slate-500 truncate">{[addr.street, [addr.postal_code, addr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</p>
                    </div>
                    {addr.is_default && <span className="text-xs bg-celeste text-midnight-dark px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Main</span>}
                  </button>
                )
              })}
            </div>
          )}
          {showAddrModal && <AddressModal supplierProfileId={supplierProfileId} onClose={() => setShowAddrModal(false)} />}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Business Categories <span className="text-slate-400 font-normal normal-case">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  form.categories.includes(cat)
                    ? 'bg-midnight text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {cat}
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
            placeholder="https://yourbusiness.com"
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

function CertUploadModal({ supplierProfileId, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  async function handleUpload() {
    if (!label.trim()) { toast.error('Please enter a certificate name'); return }
    if (!file) { toast.error('Please select a file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${supplierProfileId}/${Date.now()}.${ext}`
      const { data: upload, error: uploadErr } = await supabase.storage.from('halal-certificates').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: cert } = await supabase.from('halal_certificates').insert({
        supplier_id: supplierProfileId,
        file_url: upload.path,
        file_name: label.trim(),
        status: 'pending',
      }).select().single()
      onUploaded(cert)
      onClose()
      toast.success('Certificate uploaded — awaiting admin review')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title="Upload Certificate" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Certificate Name <span className="text-red-500">*</span>
          </label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Chicken Halal Certificate"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">File</label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-celeste-dark rounded-xl bg-lionsmane p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-celeste transition-colors"
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <>
                <CheckCircle className="w-7 h-7 text-herb" />
                <p className="text-sm font-semibold text-midnight-dark text-center truncate max-w-full px-2">{file.name}</p>
              </>
            ) : (
              <>
                <Upload className="w-7 h-7 text-herb-light" />
                <p className="text-sm text-slate-500">PDF, JPG, PNG · Max 5MB</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleUpload} disabled={uploading || !file || !label.trim()} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CertEditModal({ cert, supplierProfileId, onClose, onSaved }) {
  const [label, setLabel] = useState(cert.file_name || '')
  const [newFile, setNewFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  async function handleSave() {
    if (!label.trim()) { toast.error('Certificate name is required'); return }
    setSaving(true)
    try {
      let fileUrl = cert.file_url
      if (newFile) {
        if (newFile.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB')
        await supabase.storage.from('halal-certificates').remove([cert.file_url])
        const ext = newFile.name.split('.').pop()
        const path = `${supplierProfileId}/${Date.now()}.${ext}`
        const { data: upload, error: uploadErr } = await supabase.storage.from('halal-certificates').upload(path, newFile)
        if (uploadErr) throw uploadErr
        fileUrl = upload.path
      }
      const { data: updated } = await supabase.from('halal_certificates')
        .update({ file_name: label.trim(), file_url: fileUrl })
        .eq('id', cert.id)
        .select().single()
      onSaved(updated)
      onClose()
      toast.success('Certificate updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Certificate" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certificate Name</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Meat Halal Certificate"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Replace File (optional)</label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl bg-lionsmane p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-celeste-dark hover:bg-lionsmane transition-colors"
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setNewFile(e.target.files[0])} />
            {newFile ? (
              <>
                <CheckCircle className="w-6 h-6 text-herb" />
                <p className="text-sm font-semibold text-midnight-dark text-center truncate max-w-full px-2">{newFile.name}</p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-400" />
                <p className="text-xs text-slate-400">Click to choose a new file</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
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
          <p className="text-sm text-red-600">All your data, products, and order history will be permanently deleted and cannot be recovered.</p>
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

export default function SupplierProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfileState } = useAuth()
  const { addresses, addressesVersion } = useAddresses()
  const { lang, setLanguage, t } = useLanguage()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [bio, setBio] = useState(profile?.bio || '')
  const [businessName, setBusinessName] = useState('')
  const [certs, setCerts] = useState([])
  const [certsLoading, setCertsLoading] = useState(true)
  const [bankDetails, setBankDetails] = useState(null)

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarLightbox, setAvatarLightbox] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showCertUploadModal, setShowCertUploadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBusinessInfoModal, setShowBusinessInfoModal] = useState(false)
  const [editingCert, setEditingCert] = useState(null)
  const [confirmDeleteCert, setConfirmDeleteCert] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('supplier_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data: sp }) => {
        if (!sp) { setCertsLoading(false); return }
        setSupplierProfile(sp)
        setBusinessName(sp.business_name || '')
        supabase
          .from('halal_certificates')
          .select('*')
          .eq('supplier_id', sp.id)
          .order('uploaded_at', { ascending: false })
          .then(({ data }) => { setCerts(data || []); setCertsLoading(false) })
        supabase
          .from('supplier_bank_details')
          .select('*')
          .eq('supplier_id', sp.id)
          .maybeSingle()
          .then(({ data }) => setBankDetails(data || null))
      })
  // Note: this effect intentionally only runs on user change. The lighter
  // address-driven city/coords refresh lives in the effect below so that
  // adding/deleting an address doesn't re-fetch certificates and bank data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Keep the Business Details card aligned with the address book. When an
  // address is added, edited, or deleted, AddressContext bumps
  // addressesVersion after reconciling supplier_profiles.city — we re-read
  // just the city/coords fields so the chips and map link stay in sync.
  useEffect(() => {
    if (!user || !supplierProfile?.id) return
    supabase
      .from('supplier_profiles')
      .select('city, latitude, longitude')
      .eq('id', supplierProfile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setSupplierProfile(prev => prev ? { ...prev, ...data } : prev)
      })
  }, [addressesVersion, user, supplierProfile?.id])

  function handleSignOut() {
    signOut()
  }

  async function handleDeleteCert(cert) {
    try {
      await supabase.storage.from('halal-certificates').remove([cert.file_url])
      await supabase.from('halal_certificates').delete().eq('id', cert.id)
      const remaining = certs.filter(c => c.id !== cert.id)
      setCerts(remaining)
      if (remaining.filter(c => c.status === 'approved').length === 0) {
        await supabase.from('supplier_profiles').update({ is_verified: false }).eq('id', supplierProfile.id)
        setSupplierProfile(prev => ({ ...prev, is_verified: false }))
      }
      toast.success('Certificate deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function viewCert(cert) {
    const win = window.open('about:blank', '_blank')
    const { data, error } = await supabase.storage.from('halal-certificates').createSignedUrl(cert.file_url, 300)
    if (data?.signedUrl) {
      win.location.href = data.signedUrl
    } else {
      win?.close()
      toast.error(error?.message || 'Could not open certificate')
    }
  }

  function handleAvatarSaved(url) {
    setAvatarUrl(url)
    updateProfileState({ avatar_url: url })
  }

  function handleProfileSaved({ full_name, business_name, bio: newBio }) {
    setBusinessName(business_name || '')
    setBio(newBio || '')
    updateProfileState({ full_name, business_name, bio: newBio })
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
          <h2 className="font-bold text-slate-900 text-xl mt-3">{profile?.full_name || t('supplier')}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{businessName || t('supplier')}</p>
          {bio && <p className="text-sm text-slate-500 italic mt-1.5">"{bio}"</p>}
          <button onClick={() => setShowEditModal(true)} className="mt-2 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark">
            {t('editProfile')}
          </button>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/supplier/orders')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <Package className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('mySales')}</span>
        </button>
        <button
          onClick={() => navigate('/supplier/analytics')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <TrendingUp className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('viewAnalysis')}</span>
        </button>
      </div>

      {/* Business Details card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
          {/* Tax ID */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('taxIdVat')}</p>
              {supplierProfile?.tax_id ? (
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{supplierProfile.tax_id}</p>
              ) : (
                <button onClick={() => setShowBusinessInfoModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">
                  {t('addTaxId')} →
                </button>
              )}
            </div>
            {supplierProfile?.tax_id && <CheckCircle className="w-4 h-4 text-herb flex-shrink-0" />}
          </div>

          {/* City — shows all selected cities from business details */}
          <div className="flex items-start gap-3 px-4 py-3">
            <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1.5">{t('city')}</p>
              {supplierProfile?.city ? (
                <div className="flex flex-wrap gap-1.5">
                  {supplierProfile.city.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-celeste text-midnight-dark">{c}</span>
                  ))}
                </div>
              ) : (
                <button onClick={() => setShowAddressModal(true)} className="text-sm text-marigold font-semibold hover:underline mt-0.5">{t('addAddress')} →</button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-start gap-3 px-4 py-3">
            <Tag className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-2">{t('categories')}</p>
              {supplierProfile?.category?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(supplierProfile.category) ? supplierProfile.category : [supplierProfile.category]).map(c => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-midnight text-white">{c}</span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">{t('notSet')}</span>
              )}
            </div>
          </div>

          {/* Bank Details */}
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

          {/* Verification status */}
          <div className="px-4 pb-4 pt-3">
            {(() => {
              const hasAddress = addresses.length > 0
              const isVerified = supplierProfile?.is_verified && hasAddress
              return (
                <div className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                  isVerified ? 'bg-lionsmane border-celeste text-midnight-dark'
                  : !hasAddress ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-lionsmane border-marigold-light text-marigold-dark'
                }`}>
                  {isVerified
                    ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Verified — visible to restaurant owners as Halal Certified</>
                    : !hasAddress
                      ? <><XCircle className="w-4 h-4 flex-shrink-0" /> Add a business address to complete your profile</>
                      : <><Clock className="w-4 h-4 flex-shrink-0" /> Not verified — upload your Halal certificate to get certified</>
                  }
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <h3 className="font-bold text-slate-900 text-base px-4 pt-5 pb-2">{t('accountSettings')}</h3>
        <div className="divide-y divide-slate-100">
          <SettingRow label={t('changeEmailPassword')} onClick={() => setShowPasswordModal(true)} />
          <SettingRow label={t('updatePhoneNumber')} onClick={() => setShowPhoneModal(true)} />
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

      {/* Halal Certificates */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-midnight" /> Certificates
          </h3>
          <button
            onClick={() => setShowCertUploadModal(true)}
            className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1"
          >
            + Add
          </button>
        </div>
        {certsLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : certs.length === 0 ? (
          <p className="text-sm text-slate-400">No certificates uploaded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {certs.map(cert => {
              const status = CERT_STATUS[cert.status] || CERT_STATUS.pending
              const Icon = status.icon
              const displayName = cert.file_name || cert.file_url?.split('/').pop() || 'Certificate'
              return (
                <div key={cert.id} className="p-3 bg-lionsmane rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-7 h-7 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
                            <Icon className="w-2.5 h-2.5" /> {status.label}
                          </span>
                          <p className="text-xs text-slate-400">{new Date(cert.uploaded_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => viewCert(cert)} className="p-1.5 text-slate-400 hover:text-midnight transition-colors" title="View">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCert(cert)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteCert(cert)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
        <AvatarModal userId={user.id} onClose={() => setShowAvatarModal(false)} onSaved={handleAvatarSaved} />
      )}
      {showEditModal && (
        <EditProfileModal
          userId={user.id}
          currentName={profile?.full_name || ''}
          supplierProfile={supplierProfile}
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
      {showAddressModal && <AddressModal onClose={() => setShowAddressModal(false)} supplierProfileId={supplierProfile?.id} />}
      {showBankModal && <BankModal userId={user.id} onClose={() => {
        setShowBankModal(false)
        if (supplierProfile) {
          supabase.from('supplier_bank_details').select('*').eq('supplier_id', supplierProfile.id).maybeSingle()
            .then(({ data }) => setBankDetails(data || null))
        }
      }} />}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => signOut()}
        />
      )}
      {showCertUploadModal && supplierProfile && (
        <CertUploadModal
          supplierProfileId={supplierProfile.id}
          onClose={() => setShowCertUploadModal(false)}
          onUploaded={cert => {
            setCerts(prev => [cert, ...prev])
            setSupplierProfile(prev => ({ ...prev, is_verified: true }))
          }}
        />
      )}
      {showBusinessInfoModal && supplierProfile && (
        <BusinessInfoModal
          supplierProfileId={supplierProfile.id}
          userId={user.id}
          current={supplierProfile}
          onClose={() => setShowBusinessInfoModal(false)}
          onSaved={data => setSupplierProfile(prev => ({ ...prev, ...data }))}
        />
      )}
      {editingCert && supplierProfile && (
        <CertEditModal
          cert={editingCert}
          supplierProfileId={supplierProfile.id}
          onClose={() => setEditingCert(null)}
          onSaved={updated => {
            setCerts(prev => prev.map(c => c.id === updated.id ? updated : c))
            setEditingCert(null)
          }}
        />
      )}
      {confirmDeleteCert && (
        <Modal title="Delete Certificate" onClose={() => setConfirmDeleteCert(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Are you sure?</p>
              <p className="text-sm text-red-600">
                "<span className="font-semibold">{confirmDeleteCert.file_name || 'This certificate'}</span>" will be permanently deleted and cannot be recovered.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteCert(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleDeleteCert(confirmDeleteCert); setConfirmDeleteCert(null) }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
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
