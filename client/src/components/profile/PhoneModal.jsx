import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

export default function PhoneModal({ userId, currentPhone, role, onClose, onSaved }) {
  const [phone, setPhone] = useState(currentPhone || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('users').update({ phone }).eq('id', userId)
      if (role === 'supplier') {
        await supabase.from('supplier_profiles').update({ phone }).eq('user_id', userId)
      }
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
