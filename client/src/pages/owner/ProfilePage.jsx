import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { useLocation } from 'react-router-dom'
import { MapPin, Plus, Trash2, Star, Loader2, Check, X, User, Camera, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

function AddressCard({ address, onDelete, onSetDefault }) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900">{address.label || 'Address'}</p>
            {address.is_default && (
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Default</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{address.street}, {address.city}, {address.country || 'Germany'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        {!address.is_default && (
          <button
            onClick={() => onSetDefault(address.id)}
            className="p-1.5 hover:bg-yellow-50 rounded-lg text-gray-400 hover:text-yellow-500 transition-colors"
            title="Set as default"
          >
            <Star className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(address.id)}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { addresses, addAddress, deleteAddress, setDefault } = useAddresses()
  const location = useLocation()
  const addressRef = useRef(null)

  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [showAddAddr, setShowAddAddr] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: '', street: '', city: '', country: 'Germany' })
  const [addingAddr, setAddingAddr] = useState(false)

  useEffect(() => {
    if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '' })
  }, [profile])

  useEffect(() => {
    if (location.hash === '#addresses') {
      setShowAddAddr(true)
      setTimeout(() => addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [location.hash])

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

  const initials = (profile?.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Avatar + Name header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-white">{initials}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{profile?.full_name || 'Restaurant Owner'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-gray-900">Personal Information</h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="+49 123 456789"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-light transition-colors text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Address Management */}
        <div ref={addressRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-gray-900">Delivery Addresses</h2>
            </div>
            <button
              onClick={() => setShowAddAddr(s => !s)}
              className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
            >
              <Plus className="w-4 h-4" /> Add address
            </button>
          </div>

          {showAddAddr && (
            <form onSubmit={handleAddAddress} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3 border border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Label</label>
                  <input
                    placeholder="Home / Restaurant"
                    value={addrForm.label}
                    onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">City *</label>
                  <input
                    required
                    placeholder="Berlin"
                    value={addrForm.city}
                    onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Street Address *</label>
                <input
                  required
                  placeholder="Musterstraße 12"
                  value={addrForm.street}
                  onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddAddr(false)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAddr}
                  className="flex items-center gap-1.5 text-sm bg-primary text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-primary-light transition-colors disabled:opacity-60"
                >
                  {addingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {addresses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No addresses saved yet</p>
            ) : (
              addresses.map(addr => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  onDelete={handleDeleteAddress}
                  onSetDefault={setDefault}
                />
              ))
            )}
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
          <div className="space-y-3">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm font-semibold text-red-700 mb-1">Delete Account (GDPR)</p>
              <p className="text-xs text-red-500 mb-3">All your data will be permanently removed within 30 days. This cannot be undone.</p>
              <button className="text-xs font-semibold text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                Request Account Deletion
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
