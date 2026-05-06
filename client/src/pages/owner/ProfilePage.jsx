import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { MapPin, Plus, Trash2, Star, Loader2, Check, X, Package, TrendingUp, LogOut, ChevronRight, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { addresses, addAddress, deleteAddress, setDefault } = useAddresses()

  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [showAddAddr, setShowAddAddr] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: '', street: '', city: '', country: 'Germany' })
  const [addingAddr, setAddingAddr] = useState(false)

  const initials = (profile?.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '' })
  }, [profile])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('users').update({ full_name: form.fullName, phone: form.phone }).eq('id', user.id)
    if (error) toast.error('Failed to save')
    else toast.success('Profile updated!')
    setSaving(false)
  }

  async function handleAddAddress(e) {
    e.preventDefault()
    setAddingAddr(true)
    try {
      await addAddress(addrForm)
      toast.success('Address added!')
      setShowAddAddr(false)
      setAddrForm({ label: '', street: '', city: '', country: 'Germany' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingAddr(false)
    }
  }

  async function handleDeleteAddress(id) {
    if (!confirm('Delete this address?')) return
    await deleteAddress(id)
    toast.success('Address deleted')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header card with gradient */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-center relative">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-slate-900 to-slate-800" />
        <div className="relative z-10 pt-12 pb-8 px-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-white rounded-full mx-auto p-1 shadow-lg flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-2xl font-black text-emerald-700">{initials}</span>
                </div>
              )}
            </div>
            <button className="absolute bottom-1 right-0 bg-slate-900 text-white p-1.5 rounded-full hover:bg-emerald-600 border-2 border-white transition-colors">
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name || 'Restaurant Owner'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/owner/orders')}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 h-20 hover:shadow-md transition-shadow"
        >
          <Package className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">View My Orders</span>
        </button>
        <button
          onClick={() => navigate('/owner/analytics')}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-2 h-20 hover:shadow-md transition-shadow"
        >
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">View Analytics</span>
        </button>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-bold text-slate-900 text-lg mb-4">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="+49 123 456789"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-sm disabled:opacity-60 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Address Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-lg">Delivery Addresses</h2>
          <button
            onClick={() => setShowAddAddr(s => !s)}
            className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>

        {showAddAddr && (
          <form onSubmit={handleAddAddress} className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3 border border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Label</label>
                <input
                  placeholder="Home / Restaurant"
                  value={addrForm.label}
                  onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">City *</label>
                <input
                  required
                  placeholder="Berlin"
                  value={addrForm.city}
                  onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Street Address *</label>
              <input
                required
                placeholder="Musterstraße 12"
                value={addrForm.street}
                onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowAddAddr(false)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button type="submit" disabled={addingAddr} className="flex items-center gap-1.5 text-sm bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60">
                {addingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No addresses saved yet</p>
          ) : (
            addresses.map(addr => (
              <div key={addr.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900">{addr.label || 'Address'}</p>
                      {addr.is_default && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{addr.street}, {addr.city}, {addr.country || 'Germany'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {!addr.is_default && (
                    <button onClick={() => setDefault(addr.id)} className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-500 transition-colors" title="Set as default">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  )
}
