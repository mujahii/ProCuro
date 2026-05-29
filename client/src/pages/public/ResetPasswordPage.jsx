import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) return toast.error(t('passwordTooShort'))
    if (password !== confirm) return toast.error(t('passwordsNoMatch'))
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
    } else {
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 2500)
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-celeste rounded-full flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-midnight" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">{t('resetSetNewPassword')}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{t('resetChooseStrong')}</p>
            </div>
          </div>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-herb mx-auto mb-3" />
              <p className="font-bold text-slate-900 mb-1">{t('resetPasswordUpdated')}</p>
              <p className="text-sm text-slate-500">{t('resetRedirectingToLogin')}</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">{t('resetVerifyingLink')}</p>
              <p className="text-xs text-slate-300 mt-1">{t('resetMayTakeMoment')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('resetNewPasswordLabel')}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                    placeholder={t('resetMinCharsHint')}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('confirmPasswordLabel')}</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                    placeholder={t('resetRepeatHint')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">{t('passwordsNoMatch')}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving || !password || !confirm}
                className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? t('resetSavingBtn') : t('resetSetNewPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
