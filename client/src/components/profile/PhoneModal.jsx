import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

// Format a stored phone string for display.
// "+491701234567" → "+49 170 1234567"
// "01701234567"   → "0170 1234567"
export function formatPhone(raw) {
  if (!raw) return ''
  const stripped = raw.replace(/\s+/g, '')
  const intl = stripped.match(/^(\+\d{1,3})(\d{3})(\d+)$/)
  if (intl) return `${intl[1]} ${intl[2]} ${intl[3]}`
  const local = stripped.match(/^(0\d{3,4})(\d+)$/)
  if (local) return `${local[1]} ${local[2]}`
  return raw
}

// Live formatter called on every keystroke — same idea as handleIBANInput.
// Strips spaces / non-phone chars, then re-inserts spaces in the right places.
export function handlePhoneInput(value) {
  // Keep only digits and a leading +; remove any + that's not at the very start.
  let raw = value.replace(/[^\d+]/g, '')
  if (raw.indexOf('+') > 0) raw = raw.replace(/\+/g, '')

  if (raw.startsWith('+')) {
    const body = raw.slice(1)                   // digits after the +
    if (body.length <= 2) return `+${body}`     // still typing country code
    const cc  = `+${body.slice(0, 2)}`          // e.g. +49
    const net = body.slice(2, 5)                // network prefix (3 digits)
    const sub = body.slice(5, 15)               // subscriber number
    if (!sub) return `${cc} ${net}`
    return `${cc} ${net} ${sub}`
  }

  if (raw.startsWith('0')) {
    const area = raw.slice(0, 4)                // 0XXX
    const sub  = raw.slice(4, 14)
    if (!sub) return area
    return `${area} ${sub}`
  }

  return raw.slice(0, 15)
}

export default function PhoneModal({ userId, currentPhone, role, onClose, onSaved }) {
  const [phone, setPhone] = useState(formatPhone(currentPhone) || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const trimmed = phone.trim()
      await supabase.from('users').update({ phone: trimmed }).eq('id', userId)
      if (role === 'supplier') {
        await supabase.from('supplier_profiles').update({ phone: trimmed }).eq('user_id', userId)
      }
      onSaved(trimmed)
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
        {currentPhone && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-lionsmane border border-slate-100">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Current</span>
            <span className="text-sm font-semibold text-slate-700">{formatPhone(currentPhone)}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(handlePhoneInput(e.target.value))}
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
