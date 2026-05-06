import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

function getPasswordStrength(pass) {
  let score = 0
  if (pass.length > 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[@#$%^&+=!]/.test(pass)) score++
  return score
}

export default function RegisterOwnerPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(form.password)
  const strengthInfo = [
    { label: '', color: 'bg-slate-200' },
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Good', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ][strength] || { label: '', color: 'bg-slate-200' }

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('register_user', {
        p_email: form.email,
        p_password: form.password,
        p_full_name: form.fullName,
        p_role: 'restaurant_owner',
      })
      if (error) throw new Error(error.message)
      await signIn(form.email, form.password)
      toast.success('Account created!')
      navigate('/owner/store')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-10">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingCart className="w-7 h-7 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
            </div>
            <p className="text-slate-500 text-sm">Create your restaurant owner account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Business / Full Name</label>
              <input type="text" required value={form.fullName} onChange={e => update('fullName', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="Star Doner Kebab" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Email Address</label>
              <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="you@restaurant.de" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="+49 123 456789" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => update('password', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors pr-10"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-3.5 text-slate-400">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {form.password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Strength</span>
                    <span className={`font-bold ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-500' : 'text-emerald-500'}`}>{strengthInfo.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: `${(strength / 3) * 100}%` }} />
                  </div>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className={`flex items-center gap-2 text-xs ${form.password.length > 8 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" /> Over 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(form.password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" /> One uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${/[@#$%^&+=!]/.test(form.password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" /> Special character (@#$%...)
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Confirm Password</label>
              <input type="password" required value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors text-base shadow-md mt-2 disabled:opacity-60">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Log In</Link>
          </p>
          <p className="text-center mt-2 text-sm text-slate-500">
            Want to sell?{' '}
            <Link to="/register/supplier" className="text-emerald-600 font-semibold hover:underline">Register as Supplier</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
