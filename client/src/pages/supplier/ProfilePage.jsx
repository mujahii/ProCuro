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
import { formatIBAN, handleIBANInput } from '../../lib/formatIBAN'
import Modal from '../../components/profile/Modal'
import SettingRow from '../../components/profile/SettingRow'
import AvatarModal from '../../components/profile/AvatarModal'
import PasswordModal from '../../components/profile/PasswordModal'
import PhoneModal, { formatPhone } from '../../components/profile/PhoneModal'
import DeleteAccountModal from '../../components/profile/DeleteAccountModal'

const CERT_STATUS = {
  pending:  { label: 'Pending Review', icon: Clock,       color: 'text-marigold bg-lionsmane border-marigold-light' },
  approved: { label: 'Approved',       icon: CheckCircle, color: 'text-midnight bg-lionsmane border-celeste' },
  rejected: { label: 'Rejected',       icon: XCircle,     color: 'text-red-600 bg-red-50 border-red-200' },
}


function AddressModal({ onClose, supplierProfileId }) {
  const { t } = useLanguage()
  const { addresses, addAddress, deleteAddress, setDefault, reload } = useAddresses()
  const [form, setForm] = useState({ label: '', street: '', postal_code: '', city: '' })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error(t('toastGpsNotSupported')); return }
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
          toast.success(t('toastGpsDetected'))
        } catch {
          toast.error(t('toastGpsCouldNotFetch'))
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
    if (!form.street || !form.city) { toast.error(t('toastPleaseFillStreetCity')); return }
    setSaving(true)
    try {
      await addAddress({ ...form, country: 'Germany' })
      setForm({ label: '', street: '', postal_code: '', city: '' })
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
                  <p className="text-sm font-bold text-midnight truncate">{addr.label || addr.city || 'Address'}</p>
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
          <p className="text-sm font-bold text-midnight">Add New Address (Germany)</p>
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

function BankModal({ userId, onClose }) {
  const { t } = useLanguage()
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
      toast.success(t('toastBankDetailsSaved'))
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('bankDetailsTitle')} onClose={onClose}>
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
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2">
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
  const { t } = useLanguage()
  const normaliseCategories = v => Array.isArray(v) ? v : (v ? [v] : [])
  const [form, setForm] = useState({
    business_name: current.business_name || '',
    description: current.description || '',
    tax_id: current.tax_id || '',
    city: current.city || '',
    latitude: current.latitude || null,
    longitude: current.longitude || null,
    categories: normaliseCategories(current.category),
    website: current.website || '',
  })
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const { addresses: savedAddresses, addAddress } = useAddresses()
  const [showAddrModal, setShowAddrModal] = useState(false)

  // Cities are auto-derived from every saved address (one entry per address,
  // so multiple Berlin shops still show as two locations). The primary coords
  // come from the default address, falling back to the first one. Users edit
  // the list via the "+ Manage Addresses" button — no checkboxes to maintain.
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

  function toggleCategory(cat) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }))
  }

  async function handleSave() {
    if (!form.tax_id.trim()) { toast.error(t('toastTaxIdRequired')); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('supplier_profiles').update({
        business_name: form.business_name.trim() || null,
        description: form.description.trim() || null,
        tax_id: form.tax_id.trim(),
        city: form.city.trim() || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        category: form.categories.length > 0 ? form.categories : null,
        website: form.website.trim() || null,
      }).eq('id', supplierProfileId)
      if (error) throw error

      onSaved({ ...form, category: form.categories })
      onClose()
      toast.success(t('toastBusinessInfoSaved'))
    } catch {
      toast.error(t('toastFailedSaveBusinessInfo'))
    } finally {
      setSaving(false)
    }
  }

  const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Spices', 'Other']

  return (
    <Modal title={t('businessDetailsTitle')} onClose={onClose} maxW="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('businessName')}</label>
          <input
            value={form.business_name}
            onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="e.g. Al-Nour Halal Foods"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('description')}</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb resize-none"
            placeholder="A short description about your business..."
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
          <p className="text-xs text-slate-400 mt-1">Required to receive payments and appear verified</p>
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
          <p className="text-xs text-slate-400 mb-2">Every saved address adds its city to your profile automatically.</p>
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
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CertUploadModal({ supplierProfileId, onClose, onUploaded }) {
  const { t } = useLanguage()
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  async function handleUpload() {
    if (!label.trim()) { toast.error(t('toastEnterCertName')); return }
    if (!file) { toast.error(t('toastSelectFile')); return }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('toastFileTooLarge')); return }
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
      toast.success(t('toastCertUploadedAwaitingReview'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title={t('uploadCertTitle')} onClose={onClose}>
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
          <button onClick={handleUpload} disabled={uploading || !file || !label.trim()} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CertEditModal({ cert, supplierProfileId, onClose, onSaved }) {
  const { t } = useLanguage()
  const [label, setLabel] = useState(cert.file_name || '')
  const [newFile, setNewFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  async function handleSave() {
    if (!label.trim()) { toast.error(t('toastCertNameRequired')); return }
    setSaving(true)
    try {
      let fileUrl = cert.file_url
      if (newFile) {
        if (newFile.size > 5 * 1024 * 1024) throw new Error(t('toastFileTooLarge'))
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
      toast.success(t('toastCertUpdated'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('editCertTitle')} onClose={onClose}>
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
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function SupplierAccountPage() {
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
      toast.success(t('toastCertDeleted'))
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
      toast.error(error?.message || t('toastCouldNotOpenCert'))
    }
  }

  function handleAvatarSaved(url, name) {
    setAvatarUrl(url)
    updateProfileState({ avatar_url: url, ...(name ? { full_name: name } : {}) })
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
          <h2 className="font-bold text-midnight text-xl mt-3">{profile?.full_name || t('supplier')}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{businessName || t('supplier')}</p>
          {supplierProfile?.city && (
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400 mt-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {supplierProfile.city.split(',').map(c => c.trim()).filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Halal certification status — shown under name */}
          {!certsLoading && (() => {
            const approved = certs.find(c => c.status === 'approved')
            const pending = certs.find(c => c.status === 'pending')
            if (approved) return (
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-celeste text-midnight-dark border border-celeste">
                <CheckCircle className="w-3.5 h-3.5" /> {t('halalCertified')}
              </span>
            )
            if (pending) return (
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> {t('certUnderReview')}
              </span>
            )
            return (
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                <XCircle className="w-3.5 h-3.5" /> {t('notCertified')}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/supplier/orders')}
          className="card p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <Package className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('mySales')}</span>
        </button>
        <button
          onClick={() => navigate('/supplier/analytics')}
          className="card p-5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <TrendingUp className="w-6 h-6 text-midnight" />
          <span className="text-sm font-semibold text-slate-700">{t('viewAnalysis')}</span>
        </button>
      </div>

      {/* Halal Certificates — dark card */}
      <div className="bg-midnight rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-marigold" /> Certificates
          </h3>
          <button
            onClick={() => setShowCertUploadModal(true)}
            className="text-xs text-marigold font-bold hover:opacity-75 flex items-center gap-1 transition-opacity"
          >
            + Add
          </button>
        </div>
        <div className="p-5">
          {certsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : certs.length === 0 ? (
            <p className="text-sm text-slate-400">No certificates uploaded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {certs.map(cert => {
                const DARK_STATUS = {
                  approved: { label: 'Approved',       icon: CheckCircle, color: 'text-teal-300 bg-teal-900/50 border-teal-600/40' },
                  pending:  { label: 'Pending Review', icon: Clock,       color: 'text-amber-300 bg-amber-900/50 border-amber-600/40' },
                  rejected: { label: 'Rejected',       icon: XCircle,     color: 'text-red-400 bg-red-900/50 border-red-600/40' },
                }
                const status = DARK_STATUS[cert.status] || DARK_STATUS.pending
                const Icon = status.icon
                const displayName = cert.file_name || cert.file_url?.split('/').pop() || 'Certificate'
                return (
                  <div key={cert.id} className="p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-7 h-7 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
                              <Icon className="w-2.5 h-2.5" /> {status.label}
                            </span>
                            <p className="text-xs text-slate-400">{new Date(cert.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => viewCert(cert)} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="View">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingCert(cert)} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteCert(cert)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
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
      </div>

      {/* Business Details card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <h3 className="font-bold text-midnight text-base">{t('businessDetails')}</h3>
          <button
            onClick={() => setShowBusinessInfoModal(true)}
            className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
          >
            {t('edit')}
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {/* Business Name */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{t('businessName')}</p>
              {supplierProfile?.business_name ? (
                <p className="text-sm font-semibold text-midnight mt-0.5">{supplierProfile.business_name}</p>
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
              {supplierProfile?.description ? (
                <p className="text-sm text-slate-600 mt-0.5 italic">"{supplierProfile.description}"</p>
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
              {supplierProfile?.tax_id ? (
                <p className="text-sm font-semibold text-midnight mt-0.5">{supplierProfile.tax_id}</p>
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
                    <span className="text-sm font-semibold text-midnight uppercase">{bankDetails.bank_name}</span>
                  </div>
                )}
                {bankDetails.account_holder && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Account Holder</span>
                    <span className="text-sm font-semibold text-midnight uppercase">{bankDetails.account_holder}</span>
                  </div>
                )}
                {bankDetails.iban && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 flex-shrink-0">IBAN</span>
                    <span className="text-sm font-semibold text-midnight font-mono">{formatIBAN(bankDetails.iban)}</span>
                  </div>
                )}
                {bankDetails.bic && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">BIC / SWIFT</span>
                    <span className="text-sm font-semibold text-midnight uppercase font-mono">{bankDetails.bic}</span>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowBankModal(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-marigold font-semibold hover:border-marigold-light transition-colors">
                + Add bank details
              </button>
            )}
          </div>

          {/* Account status badge — based on profile completeness, NOT certification */}
          <div className="px-4 pb-4 pt-3">
            {(() => {
              const hasTaxId = !!supplierProfile?.tax_id?.trim()
              const hasCity = !!supplierProfile?.city?.trim()
              const hasBankDetails = !!bankDetails
              const isActive = hasTaxId && hasCity && hasBankDetails
              const missing = [
                !hasTaxId && t('taxIdVat'),
                !hasCity && t('city'),
                !hasBankDetails && t('bankDetails'),
              ].filter(Boolean)
              return (
                <div className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                  isActive ? 'bg-lionsmane border-celeste text-midnight-dark' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {isActive
                    ? <><CheckCircle className="w-4 h-4 flex-shrink-0 text-herb" /> {t('accountActiveTitle')}</>
                    : <><XCircle className="w-4 h-4 flex-shrink-0" /> {t('accountIncompleteTitle')}: {missing.join(', ')}</>
                  }
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="card overflow-hidden">
        <h3 className="font-bold text-midnight text-base px-4 pt-5 pb-2">{t('accountSettings')}</h3>
        <div className="divide-y divide-slate-100">
          <SettingRow label={t('changeEmailPassword')} onClick={() => setShowPasswordModal(true)} />
          <SettingRow label={t('updatePhoneNumber')} value={profile?.phone ? formatPhone(profile.phone) : undefined} onClick={() => setShowPhoneModal(true)} />
          <SettingRow label={t('manageMyAddresses')} onClick={() => setShowAddressModal(true)} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{t('languageSprache')}</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {LANGS.map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors ${lang === l ? 'bg-white text-midnight shadow-sm' : 'text-slate-400 hover:text-midnight'}`}>
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
        <AvatarModal userId={user.id} currentName={profile?.full_name} onClose={() => setShowAvatarModal(false)} onSaved={handleAvatarSaved} />
      )}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} currentEmail={user?.email} />}
      {showPhoneModal && (
        <PhoneModal
          userId={user.id}
          role="supplier"
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
          message="All your data, products, and order history will be permanently deleted and cannot be recovered."
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => { await supabase.auth.signOut(); navigate('/account-deleted') }}
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
