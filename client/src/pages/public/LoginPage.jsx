import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ProCuroLogo from '../../components/ui/ProCuroLogo'
import toast from 'react-hot-toast'

const DEMO_OWNER_EMAIL = import.meta.env.VITE_DEMO_OWNER_EMAIL || 'owner@demo.procuro'
const DEMO_OWNER_PASS = import.meta.env.VITE_DEMO_OWNER_PASS || 'Demo1234!'
const DEMO_SUPPLIER_EMAIL = import.meta.env.VITE_DEMO_SUPPLIER_EMAIL || 'supplier@demo.procuro'
const DEMO_SUPPLIER_PASS = import.meta.env.VITE_DEMO_SUPPLIER_PASS || 'Demo1234!'

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
  const [tab, setTab] = useState('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const bgClass = tab === 'owner' ? 'bg-slate-900' : 'bg-emerald-900'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const profile = await signIn(email, password)
      const role = profile?.role
      navigate(role === 'restaurant_owner' ? '/owner/store' : role === 'supplier' ? '/supplier/dashboard' : role === 'admin' ? '/admin/dashboard' : '/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function quickLogin(role) {
    const e = role === 'owner' ? DEMO_OWNER_EMAIL : DEMO_SUPPLIER_EMAIL
    const p = role === 'owner' ? DEMO_OWNER_PASS : DEMO_SUPPLIER_PASS
    setEmail(e)
    setPassword(p)
    setLoading(true)
    try {
      const profile = await signIn(e, p)
      const r = profile?.role
      navigate(r === 'restaurant_owner' ? '/owner/store' : r === 'supplier' ? '/supplier/dashboard' : '/')
    } catch (err) {
      toast.error(err.message || 'Demo login failed — make sure demo accounts are created in Supabase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${bgClass}`}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ProCuroLogo size={36} />
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
            </div>
            <p className="text-slate-500 text-sm">The Halal Procurement Platform</p>
          </div>

          {/* Role tabs */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex mb-8">
            <button
              onClick={() => setTab('owner')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${tab === 'owner' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🍽️ Restaurant Owner
            </button>
            <button
              onClick={() => setTab('supplier')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${tab === 'supplier' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              🏪 Supplier
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors text-slate-900 placeholder-slate-400"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors pr-10 text-slate-900 placeholder-slate-400"
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
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors text-base shadow-md mt-2 disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          {/* Quick Access */}
          <div className="my-6">
            <div className="flex items-center mb-3">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-xs text-slate-400 font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> QUICK ACCESS</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => quickLogin('owner')}
                disabled={loading}
                className="flex flex-col items-center gap-1 px-3 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <span className="text-xl">🍽️</span>
                <span>Restaurant Owner</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('supplier')}
                disabled={loading}
                className="flex flex-col items-center gap-1 px-3 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <span className="text-xl">🏪</span>
                <span>Supplier</span>
              </button>
            </div>
          </div>

          {/* Switch */}
          <p className="text-center mt-8 text-sm text-slate-500">
            {tab === 'owner' ? (
              <>Don't have an account?{' '}
                <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Sign Up as Owner</Link>
              </>
            ) : (
              <>Not a supplier yet?{' '}
                <Link to="/register/supplier" className="text-emerald-600 font-semibold hover:underline">Apply to Sell</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
