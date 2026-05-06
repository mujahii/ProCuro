import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Check, MapPin, Building2, User, Shield, Camera, Navigation } from 'lucide-react'
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
  const { user } = useAuth()
  const [spId, setSpId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const [userForm, setUserForm] = useState({ full_name: '', phone: '' })
  const [bizForm, setBizForm] = useState({
    business_name: '',
    description: '',
    category: '',
    city: '',
    street: '',
    latitude: '',
    longitude: '',
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
        business_name: sp.business_name || '',
        description: sp.description || '',
        category: sp.category || '',
        city: sp.city || '',
        street: sp.street || '',
        latitude: sp.latitude || '',
        longitude: sp.longitude || '',
      })
      setSpId(sp.id)
    }
    setLoading(false)
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const geo = await reverseGeocode(latitude, longitude)
          const addr = geo.address || {}
          const city = addr.city || addr.town || addr.village || addr.county || ''
          const street = addr.road ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}` : ''
          setBizForm(f => ({
            ...f,
            city,
            street,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }))
          toast.success('Location detected!')
        } catch {
          toast.error('Could not get address from location')
          setBizForm(f => ({
            ...f,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }))
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location access denied. Please allow location in browser settings.')
        } else {
          toast.error('Unable to get your location. Please enter manually.')
        }
      },
      { timeout: 10000 }
    )
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

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-400">Loading...</div>

  const initials = (userForm.full_name || bizForm.business_name || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Business logo + name header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-white">{initials}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{bizForm.business_name || 'Your Business'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-gray-900">Personal Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  value={userForm.full_name}
                  onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                <input
                  value={userForm.phone}
                  onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-gray-900">Business Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Business Name *</label>
                <input
                  required
                  value={bizForm.business_name}
                  onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  value={bizForm.category}
                  onChange={e => setBizForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={bizForm.description}
                  onChange={e => setBizForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors h-24 resize-none"
                  placeholder="Tell restaurant owners about your products..."
                />
              </div>
            </div>
          </div>

          {/* Business Address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-bold text-gray-900">Business Address</h2>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60"
              >
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                {geoLoading ? 'Locating...' : 'Use My Location'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Street Address</label>
                <input
                  value={bizForm.street}
                  onChange={e => setBizForm(f => ({ ...f, street: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="Musterstraße 12"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
                <input
                  value={bizForm.city}
                  onChange={e => setBizForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="Berlin"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={bizForm.latitude}
                    onChange={e => setBizForm(f => ({ ...f, latitude: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50 text-gray-500"
                    placeholder="52.520"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={bizForm.longitude}
                    onChange={e => setBizForm(f => ({ ...f, longitude: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50 text-gray-500"
                    placeholder="13.405"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Coordinates are auto-filled when you use "Use My Location"</p>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <h2 className="font-bold text-gray-900">Account Settings</h2>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm font-semibold text-red-700 mb-1">Delete Account (GDPR)</p>
              <p className="text-xs text-red-500 mb-3">All your data will be permanently removed within 30 days.</p>
              <button type="button" className="text-xs font-semibold text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                Request Account Deletion
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Profile
          </button>
        </form>
      </div>
    </div>
  )
}
