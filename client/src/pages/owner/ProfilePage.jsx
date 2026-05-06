import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { MapPin, Plus, Trash2, Star, Loader2, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

function AddressCard({ address, isSelected, onSelect, onDelete, onSetDefault }) {
  return (
    <div className={`card p-4 flex items-start justify-between ${isSelected ? 'border-primary border-2' : ''}`}>
      <div className="flex items-start gap-3">
        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900">{address.label || 'Address'}</p>
            {address.is_default && <span className="badge-approved text-xs">Default</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{address.street}, {address.city}, {address.country || 'Germany'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {!address.is_default && (
          <button onClick={() => onSetDefault(address.id)} className="p-1.5 hover:bg-yellow-50 rounded text-gray-400 hover:text-yellow-500 transition-colors" title="Set as default">
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDelete(address.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { addresses, selectedAddress, addAddress, deleteAddress, setDefault } = useAddresses()
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [showAddAddr, setShowAddAddr] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: '', street: '', city: '', country: 'Germany' })
  const [addingAddr, setAddingAddr] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({ fullName: profile.full_name || '', phone: profile.phone || '' })
    }
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Profile & Addresses</h1>

      {/* Personal info */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="+49 123 456789" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Addresses */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Delivery Addresses</h2>
          <button onClick={() => setShowAddAddr(s => !s)} className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
            <Plus className="w-4 h-4" /> Add address
          </button>
        </div>

        {showAddAddr && (
          <form onSubmit={handleAddAddress} className="card p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Label</label>
                <input placeholder="Home / Restaurant" value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} className="input text-sm py-2" />
              </div>
              <div>
                <label className="label">City *</label>
                <input required placeholder="Berlin" value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} className="input text-sm py-2" />
              </div>
            </div>
            <div>
              <label className="label">Street Address *</label>
              <input required placeholder="Musterstraße 12" value={addrForm.street} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} className="input text-sm py-2" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAddAddr(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button type="submit" disabled={addingAddr} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1">
                {addingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {addresses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No addresses saved yet</p>
          ) : (
            addresses.map(addr => (
              <AddressCard
                key={addr.id}
                address={addr}
                isSelected={selectedAddress?.id === addr.id}
                onDelete={handleDeleteAddress}
                onSetDefault={setDefault}
              />
            ))
          )}
        </div>

        {/* GDPR */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">Data & Privacy (GDPR)</p>
          <button className="text-xs text-red-600 hover:underline">Request account deletion</button>
          <p className="text-xs text-gray-400 mt-1">All your data will be permanently removed within 30 days.</p>
        </div>
      </div>
    </div>
  )
}
