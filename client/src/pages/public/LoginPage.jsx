import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
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

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const profile = await signIn(email, password)
      const role = profile?.role
      if (!role) {
        // Auth user exists but no profile yet
        navigate('/select-role')
      } else {
        navigate(
          role === 'restaurant_owner' ? '/owner/store'
          : role === 'supplier' ? '/supplier/dashboard'
          : role === 'admin' ? '/admin/dashboard'
          : '/'
        )
      }
    } catch (err) {
      toast.error(err.message || t('toastLoginFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!resetEmail.trim()) return toast.error(t('toastEnterEmail'))
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setResetSent(true)
    }
  }

  async function handleOAuth(provider) {
    if (provider === 'apple') {
      toast('Apple Sign In coming soon!', { icon: '🍎' })
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/select-role' },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ShoppingCart className="w-8 h-8 text-midnight" />
              <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
            </div>
            <p className="text-slate-500 text-sm">{t('loginTagline')}</p>
          </div>

          {forgotMode ? (
            /* Forgot Password form */
            <div>
              {resetSent ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-14 h-14 text-herb mx-auto mb-4" />
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{t('checkYourEmail')}</h2>
                  <p className="text-sm text-slate-500 mb-1">{t('resetLinkSentTo')}</p>
                  <p className="text-sm font-semibold text-slate-800 mb-4">{resetEmail}</p>
                  <p className="text-xs text-slate-400 mb-6">{t('resetLinkExpiry')}</p>
                  <button
                    onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail('') }}
                    className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
                  >
                    {t('backToLoginBtn')}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setForgotMode(false)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-midnight mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('backToLoginBtn')}
                  </button>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{t('forgotPasswordTitle')}</h2>
                  <p className="text-sm text-slate-500 mb-5">{t('forgotPasswordDesc')}</p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('emailAddressLabel')}</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
                          placeholder="you@company.com"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors text-base shadow-md disabled:opacity-60"
                    >
                      {resetLoading ? t('sending') : t('sendResetLink')}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            /* Login form */
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('emailAddressLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">{t('passwordLabel')}</label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-herb focus:border-transparent transition-colors pr-10 text-slate-900 placeholder-slate-400"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-3.5 text-slate-400">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors text-base shadow-md disabled:opacity-60"
                >
                  {loading ? t('loggingIn') : t('logIn')}
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
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-lionsmane transition-colors"
                  >
                    <GoogleLogo /> Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuth('apple')}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-lionsmane transition-colors"
                  >
                    <AppleLogo /> Apple
                  </button>
                </div>
              </div>

              <p className="text-center mt-8 text-sm text-slate-500">
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark">{t('signUp')}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
