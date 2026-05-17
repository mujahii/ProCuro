import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

export default function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (form.password && form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      const updates = {}
      if (form.email) updates.email = form.email
      if (form.password) updates.password = form.password
      if (!Object.keys(updates).length) { toast.error('Nothing to update'); setSaving(false); return }
      const { error } = await supabase.auth.updateUser(updates)
      if (error) throw error
      if (updates.email) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('users').update({ email: form.email }).eq('id', user.id)
      }
      toast.success('Account updated!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Change Email & Password" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Email (optional)</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="new@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password (optional)</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
              placeholder="Min. 6 characters"
            />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
            placeholder="Repeat new password"
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
