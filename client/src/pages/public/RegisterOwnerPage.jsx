import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import OrbBackground from '../../components/ui/OrbBackground'
import toast from 'react-hot-toast'

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const AppleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.9 3.73-.82a4.42 4.42 0 0 1 3.51 1.83 4.3 4.3 0 0 0 .15 7.1c-.65 1.76-1.6 3.05-2.47 4.12zm-3.8-17.15c.67-.84 1.15-2 1.01-3.13-.97.05-2.16.65-2.82 1.48-.59.7-1.12 1.96-.94 3.12 1.08.08 2.12-.62 2.75-1.47z" />
  </svg>
)

function getPasswordStrength(pass) {
  let score = 0
  if (pass.length > 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[@#$%^&+=!]/.test(pass)) score++
  return score
}

export default function RegisterPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(form.password)
  const strengthInfo = [
    { labelKey: '', color: 'bg-slate-200' },
    { labelKey: 'pwStrengthWeak', color: 'bg-red-500' },
    { labelKey: 'pwStrengthGood', color: 'bg-marigold' },
    { labelKey: 'pwStrengthStrong', color: 'bg-herb' },
  ][strength] || { labelKey: '', color: 'bg-slate-200' }

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleOAuth(provider) {
    if (provider === 'apple') {
      toast('Apple Sign In coming soon!')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/select-role' },
    })
    if (error) toast.error(error.message)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError(t('passwordsNoMatch'))
    if (form.password.length < 6) return setError(t('passwordTooShort'))
    setLoading(true)
    try {
      const { error: regError } = await supabase.rpc('register_basic', {
        p_email: form.email,
        p_password: form.password,
        p_full_name: form.fullName,
      })
      if (regError) throw new Error(regError.message)
      await signIn(form.email, form.password)
      // profile is null at this point → routing sends them to /select-role
      navigate('/select-role')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-10 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingCart className="w-7 h-7 text-midnight" />
              <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
            </div>
            <p className="text-slate-500 text-sm">{t('createFreeAccount')}</p>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('fullNameLabel')}</label>
              <input type="text" required value={form.fullName} onChange={e => update('fullName', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors"
                placeholder={t('yourName')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('emailAddressLabel')}</label>
              <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('passwordLabel')}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => update('password', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors pr-10"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-3.5 text-slate-400">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t('passwordStrengthLabel')}</span>
                    <span className={`font-bold ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-marigold' : 'text-herb'}`}>{strengthInfo.labelKey ? t(strengthInfo.labelKey) : ''}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: `${(strength / 3) * 100}%` }} />
                  </div>
                  <div className="space-y-1 bg-lionsmane p-3 rounded-lg border border-slate-100">
                    {[
                      [form.password.length > 8, t('pwReqLength')],
                      [/[A-Z]/.test(form.password), t('pwReqUppercase')],
                      [/[@#$%^&+=!]/.test(form.password), t('pwReqSpecial')],
                    ].map(([ok, label]) => (
                      <div key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-midnight font-medium' : 'text-slate-400'}`}>
                        <Check className="w-3 h-3" /> {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('confirmPasswordLabel')}</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors pr-10"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-3.5 text-slate-400">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors text-base shadow-md disabled:opacity-60">
              {loading ? t('creatingAccount') : t('createAccountBtn')}
            </button>
          </form>

          {/* OAuth — below the form */}
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-xs text-slate-400 font-medium">{t('orContinueWith')}</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-lionsmane transition-colors">
                <GoogleLogo /> Google
              </button>
              <button type="button" onClick={() => handleOAuth('apple')}
                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-lionsmane transition-colors">
                <AppleLogo /> Apple
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark">{t('logIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
