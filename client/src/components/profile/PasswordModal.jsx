import { useState } from 'react'
import { Eye, EyeOff, Loader2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

export default function PasswordModal({ onClose, currentEmail }) {
  // Email change sub-flow
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Password change
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  async function handleSaveEmail() {
    if (!newEmail.trim()) { toast.error('Please enter a new email address'); return }
    if (newEmail.trim() === currentEmail) { toast.error('This is already your current email'); return }
    setSavingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('users').update({ email: newEmail.trim() }).eq('id', user.id)
      toast.success('Email updated! Check your new inbox to confirm.')
      setShowEmailInput(false)
      setNewEmail('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleSavePassword() {
    if (!password) { toast.error('Please enter a new password'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSavingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <Modal title="Change Email & Password" onClose={onClose}>
      <div className="space-y-5">

        {/* ── Email section ── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</p>
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-lionsmane border border-slate-100">
            <span className="text-sm text-slate-700 truncate">{currentEmail || '—'}</span>
            <button
              onClick={() => { setShowEmailInput(v => !v); setNewEmail('') }}
              className="flex items-center gap-1.5 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex-shrink-0 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Change
            </button>
          </div>

          {showEmailInput && (
            <div className="mt-2 p-4 rounded-xl border border-celeste bg-white space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                  placeholder="new@email.com"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowEmailInput(false); setNewEmail('') }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-lionsmane transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail || !newEmail.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-midnight text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Change Password</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                placeholder="Repeat new password"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
                Cancel
              </button>
              <button onClick={handleSavePassword} disabled={savingPw} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
