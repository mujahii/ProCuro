import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'
import { useLanguage } from '../../context/LanguageContext'

const PREFIX = '+49'

// Format a stored phone string for display in SettingRow.
// "+4915560608671" → "+49 155 60608671"
export function formatPhone(raw) {
  if (!raw) return ''
  const stripped = raw.replace(/\s+/g, '')
  if (stripped.startsWith('+49')) {
    const rest = stripped.slice(3)
    if (!rest) return '+49'
    const net = rest.slice(0, 3)
    const sub = rest.slice(3)
    return sub ? `+49 ${net} ${sub}` : `+49 ${net}`
  }
  const local = stripped.match(/^(0\d{3,4})(\d+)$/)
  if (local) return `${local[1]} ${local[2]}`
  return raw
}

// Extract digits after the +49 prefix from any stored format.
function initSuffix(rawPhone) {
  if (!rawPhone) return ''
  const stripped = rawPhone.replace(/\s+/g, '')
  let digits = ''
  if (stripped.startsWith('+49')) digits = stripped.slice(3)
  else if (stripped.startsWith('0049')) digits = stripped.slice(4)
  else if (stripped.startsWith('0')) digits = stripped.slice(1) // local 0XXX → drop leading 0
  else digits = stripped.replace(/\D/g, '')
  return formatSuffix(digits)
}

// Format the suffix portion as "NNN XXXXXXXXX" (network prefix 3 digits + subscriber).
function formatSuffix(digits) {
  const d = digits.replace(/\D/g, '').slice(0, 12)
  const net = d.slice(0, 3)
  const sub = d.slice(3)
  if (!net) return ''
  if (!sub) return net
  return `${net} ${sub}`
}

export default function PhoneModal({ userId, currentPhone, role, onClose, onSaved }) {
  const { t } = useLanguage()
  const [suffix, setSuffix] = useState(initSuffix(currentPhone))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const trimmed = suffix.trim() ? `${PREFIX} ${suffix.trim()}` : ''
      await supabase.from('users').update({ phone: trimmed }).eq('id', userId)
      if (role === 'supplier') {
        await supabase.from('supplier_profiles').update({ phone: trimmed }).eq('user_id', userId)
      }
      onSaved(trimmed)
      onClose()
      toast.success(t('toastPhoneUpdated'))
    } catch {
      toast.error(t('toastFailedUpdatePhone'))
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
          <div className="relative border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-herb bg-white">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none select-none">
              {PREFIX}
            </span>
            <input
              type="tel"
              value={suffix}
              onChange={e => setSuffix(formatSuffix(e.target.value))}
              className="w-full pl-14 pr-4 py-3 text-sm focus:outline-none bg-transparent"
              placeholder="155 1234567"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Format: +49 155 1234567</p>
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
