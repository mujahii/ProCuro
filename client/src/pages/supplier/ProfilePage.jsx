import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, Check, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']

export default function SupplierProfilePage() {
  const { user } = useAuth()
  const [userForm, setUserForm] = useState({ full_name: '', phone: '' })
  const [bizForm, setBizForm] = useState({ business_name: '', description: '', category: '', city: '', latitude: '', longitude: '' })
  const [spId, setSpId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        latitude: sp.latitude || '',
        longitude: sp.longitude || '',
      })
      setSpId(sp.id)
    }
    setLoading(false)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setBizForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }))
    })
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Profile</h1>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Personal Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Business Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Business Name</label>
              <input required value={bizForm.business_name} onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={bizForm.category} onChange={e => setBizForm(f => ({ ...f, category: e.target.value }))} className="input">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input value={bizForm.city} onChange={e => setBizForm(f => ({ ...f, city: e.target.value }))} className="input" placeholder="Berlin" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={bizForm.description} onChange={e => setBizForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input type="number" step="any" value={bizForm.latitude} onChange={e => setBizForm(f => ({ ...f, latitude: e.target.value }))} className="input" placeholder="52.520" />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" step="any" value={bizForm.longitude} onChange={e => setBizForm(f => ({ ...f, longitude: e.target.value }))} className="input" placeholder="13.405" />
              </div>
            </div>
            <button type="button" onClick={useMyLocation} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <MapPin className="w-4 h-4" /> Use my current location
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Profile
        </button>
      </form>
    </div>
  )
}
