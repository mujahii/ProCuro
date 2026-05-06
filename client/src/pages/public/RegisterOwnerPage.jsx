import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function RegisterOwnerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    setLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { role: 'restaurant_owner', full_name: form.fullName },
        },
      })
      if (signUpError) throw signUpError
      // Update phone
      if (form.phone) {
        await supabase.from('users').update({ phone: form.phone }).eq('email', form.email)
      }
      toast.success('Account created! Welcome to ProCuro.')
      navigate('/owner/store')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-black text-primary">ProCuro</span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Create your restaurant owner account</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

            <div>
              <label className="label">Full Name</label>
              <input type="text" required value={form.fullName} onChange={e => update('fullName', e.target.value)} className="input" placeholder="Ahmad Hassan" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="input" placeholder="you@restaurant.de" />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input" placeholder="+49 123 456789" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => update('password', e.target.value)} className="input pr-10" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" required value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className="input" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Want to sell? <Link to="/register/supplier" className="text-primary font-semibold hover:underline">Register as Supplier</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
