import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Check, MapPin, Building2, User, Camera, Navigation, Package, TrendingUp, LogOut, CheckCircle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']

async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'de,en' } }
  )
  if (!res.ok) throw new Error('Geocoding failed')
  return res.json()
}

export default function SupplierProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [spId, setSpId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [certificates, setCertificates] = useState([])
  const [certUploading, setCertUploading] = useState(false)

  const [userForm, setUserForm] = useState({ full_name: '', phone: '' })
  const [bizForm, setBizForm] = useState({
    business_name: '', description: '', category: '', city: '', street: '', latitude: '', longitude: '',
  })

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const [{ data: profile }, { data: sp }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single(),
    ])
    if (profile) setUserForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    if (sp) {
      setBizForm({
        business_name: sp.business_name || '', description: sp.description || '',
        category: sp.category || '', city: sp.city || '', street: sp.street || '',
        latitude: sp.latitude || '', longitude: sp.longitude || '',
      })
      setSpId(sp.id)
      const { data: certs } = await supabase.from('halal_certificates').select('*').eq('supplier_id', sp.id).order('created_at', { ascending: false })
      setCertificates(certs || [])
    }
    setLoading(false)
  }

  async function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      try {
        const geo = await reverseGeocode(latitude, longitude)
        const addr = geo.address || {}
        setBizForm(f => ({
          ...f,
          city: addr.city || addr.town || addr.village || '',
          street: addr.road ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}` : '',
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }))
        toast.success('Location detected!')
      } catch {
        toast.error('Could not get address from location')
      } finally {
        setGeoLoading(false)
      }
    }, () => { setGeoLoading(false); toast.error('Location access denied') }, { timeout: 10000 })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await Promise.all([
        supabase.from('users').update({ full_name: userForm.full_name, phone: userForm.phone }).eq('id', user.id),
        supabase.from('supplier_profiles').update({
          ...bizForm,
          latitude: bizForm.latitude ? parseFloat(bizForm.latitude) : null,
          longitude: bizForm.longitude ? parseFloat(bizForm.longitude) : null,
        }).eq('id', spId),
      ])
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleCertUpload(e) {
    const file = e.target.files[0]
    if (!file || !spId) return
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setCertUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${spId}/${Date.now()}.${ext}`
    const { data: uploadData } = await supabase.storage.from('halal-certificates').upload(path, file)
    if (uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('halal-certificates').getPublicUrl(path)
      const { data: cert } = await supabase.from('halal_certificates').insert({
        supplier_id: spId, file_url: publicUrl, file_name: file.name, status: 'pending',
      }).select().single()
      if (cert) setCertificates(prev => [cert, ...prev])
      toast.success('Certificate uploaded for review')
    }
    setCertUploading(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (loading) return <div className="py-6 text-sm text-slate-400">Loading...</div>

  const initials = (userForm.full_name || bizForm.business_name || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const certStatusColor = {
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    pending: 'bg-amber-50 text-amber-700 border border-amber-100',
    rejected: 'bg-red-50 text-red-700 border border-red-100',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header card with gradient */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-center relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-slate-900 to-slate-800" />
        <div className="relative z-10 pt-12 pb-8 px-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-white rounded-full mx-auto p-1 shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-2xl font-black text-emerald-700">{initials}</span>
              </div>
            </div>
            <button className="absolute bottom-1 right-0 bg-slate-900 text-white p-1.5 rounded-full hover:bg-emerald-600 border-2 border-white transition-colors">
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{bizForm.business_name || 'Your Business'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/supplier/orders')} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 h-20 hover:shadow-md transition-shadow">
          <Package className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">View Orders</span>
        </button>
        <button onClick={() => navigate('/supplier/analytics')} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 h-20 hover:shadow-md transition-shadow">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">Analytics</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-lg">Personal Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <input value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" placeholder="+49 123 456789" />
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-slate-900 text-lg">Business Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Business Name *</label>
              <input required value={bizForm.business_name} onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select value={bizForm.category} onChange={e => setBizForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition-colors">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea value={bizForm.description} onChange={e => setBizForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none" placeholder="Tell restaurant owners about your products..." />
            </div>
          </div>
        </div>

        {/* Business Address */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-slate-900 text-lg">Business Address</h2>
            </div>
            <button type="button" onClick={useMyLocation} disabled={geoLoading} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-60">
              {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              {geoLoading ? 'Locating...' : 'Use My Location'}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Street Address</label>
              <input value={bizForm.street} onChange={e => setBizForm(f => ({ ...f, street: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Musterstraße 12" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
              <input value={bizForm.city} onChange={e => setBizForm(f => ({ ...f, city: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Berlin" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 shadow-md">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Profile
        </button>
      </form>

      {/* Halal Certificates */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-lg">Halal Certificates</h2>
          <label htmlFor="cert-upload" className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 cursor-pointer hover:text-emerald-700 transition-colors">
            {certUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload New
          </label>
          <input type="file" id="cert-upload" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleCertUpload} />
        </div>
        {certificates.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No certificates uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {certificates.map(cert => (
              <div key={cert.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{cert.file_name}</p>
                    <p className="text-xs text-slate-400">Uploaded {new Date(cert.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${certStatusColor[cert.status] || 'bg-slate-100 text-slate-500'}`}>
                  {cert.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  )
}
