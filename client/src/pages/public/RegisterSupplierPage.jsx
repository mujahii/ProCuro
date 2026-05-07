import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, CheckCircle, Upload, Clock, Check, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
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

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']

function getPasswordStrength(pass) {
  let score = 0
  if (pass.length > 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[@#$%^&+=!]/.test(pass)) score++
  return score
}

export default function RegisterSupplierPage() {
  const { signIn, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isOAuthUser, setIsOAuthUser] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', phone: '',
    businessName: '', taxId: '', description: '', category: '', city: '',
    certFile: null,
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const strength = getPasswordStrength(form.password)
  const strengthInfo = [
    { label: '', color: 'bg-slate-200' },
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Good', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ][strength] || { label: '', color: 'bg-slate-200' }

  // Handle return from OAuth flow — skip step 1, pre-fill name/email
  useEffect(() => {
    async function checkOAuthReturn() {
      if (localStorage.getItem('procuro_oauth_role') !== 'supplier') return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      localStorage.removeItem('procuro_oauth_role')
      const oauthUser = session.user
      setIsOAuthUser(true)
      setForm(f => ({
        ...f,
        fullName: oauthUser.user_metadata?.full_name || oauthUser.user_metadata?.name || '',
        email: oauthUser.email || '',
      }))
      setStep(2)
    }
    checkOAuthReturn()
  }, [])

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Certificate file must be under 5MB'); return }
    setError('')
    update('certFile', file)
  }

  async function handleOAuth(provider) {
    localStorage.setItem('procuro_oauth_role', 'supplier')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/register/supplier' },
    })
    if (error) {
      localStorage.removeItem('procuro_oauth_role')
      toast.error(error.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isOAuthUser && step === 1) {
      if (form.password !== form.confirmPassword) return setError('Passwords do not match')
      if (form.password.length < 6) return setError('Password must be at least 6 characters')
    }
    if (step < 3) { setStep(s => s + 1); return }
    if (!form.certFile) return setError('Please upload a Halal certificate')
    setLoading(true)
    try {
      let supplierId

      if (isOAuthUser) {
        // Auth user already exists — just create the DB profile rows
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_profile_from_oauth', {
          p_role: 'supplier',
          p_full_name: form.fullName,
          p_business_name: form.businessName,
          p_city: form.city,
          p_category: form.category,
        })
        if (rpcError) throw new Error(rpcError.message)
        supplierId = rpcData.supplier_profile_id
        await refreshProfile()
      } else {
        // Standard email/password path
        const { data: regData, error: regError } = await supabase.rpc('register_user', {
          p_email: form.email,
          p_password: form.password,
          p_full_name: form.fullName,
          p_role: 'supplier',
          p_business_name: form.businessName,
          p_city: form.city,
        })
        if (regError) throw new Error(regError.message)
        await signIn(form.email, form.password)
        const { data: sp } = await supabase
          .from('supplier_profiles')
          .select('id')
          .eq('user_id', regData.user_id)
          .single()
        supplierId = sp?.id
      }

      // Upload certificate (same for both paths)
      if (supplierId && form.certFile) {
        const ext = form.certFile.name.split('.').pop()
        const path = `${supplierId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('halal-certificates')
          .upload(path, form.certFile)
        if (uploadError) throw new Error('Certificate upload failed: ' + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('halal-certificates').getPublicUrl(path)
        await supabase.from('halal_certificates').insert({
          supplier_id: supplierId,
          file_url: publicUrl,
          status: 'pending',
        })
      }

      setDone(true)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Account Under Review</h2>
          <p className="text-slate-500 mb-2">
            Your Halal certificate has been submitted. Our team will verify it within <strong>48 hours</strong>.
          </p>
          <p className="text-sm text-slate-400 mb-6">You'll receive a notification once your account is approved.</p>
          <button
            onClick={() => navigate('/supplier/dashboard')}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const totalSteps = isOAuthUser ? 2 : 3
  const displayStep = isOAuthUser ? step - 1 : step

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4 py-10">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingCart className="w-7 h-7 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
            </div>
            <p className="text-slate-500 text-sm">Become a verified Halal supplier</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s < displayStep ? 'bg-emerald-600 text-white' : s === displayStep ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {s < displayStep ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < totalSteps && <div className={`w-8 h-0.5 ${s < displayStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mb-6">
            Step {displayStep} of {totalSteps}:{' '}
            {isOAuthUser
              ? ['Business Info', 'Halal Certificate'][displayStep - 1]
              : ['Account Info', 'Business Info', 'Halal Certificate'][step - 1]}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

            {/* Step 1 — only shown for email/password sign-up */}
            {step === 1 && !isOAuthUser && (
              <>
                {/* OAuth buttons */}
                <div className="space-y-3 mb-2">
                  <button type="button" onClick={() => handleOAuth('google')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                    <GoogleLogo /> Continue with Google
                  </button>
                  <button type="button" onClick={() => handleOAuth('apple')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                    <AppleLogo /> Continue with Apple
                  </button>
                </div>
                <div className="flex items-center">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="px-3 text-xs text-slate-400 font-medium">OR WITH EMAIL</span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Full Name</label>
                  <input type="text" required value={form.fullName} onChange={e => update('fullName', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Email</label>
                  <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="you@business.de" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Phone</label>
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
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Strength</span>
                        <span className={`font-bold ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-500' : 'text-emerald-500'}`}>{strengthInfo.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: `${(strength / 3) * 100}%` }} />
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
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Business Name</label>
                  <input type="text" required value={form.businessName} onChange={e => update('businessName', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="Al-Nour Meats GmbH" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Tax ID (optional)</label>
                  <input type="text" value={form.taxId} onChange={e => update('taxId', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="DE123456789" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Category</label>
                  <select required value={form.category} onChange={e => update('category', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white">
                    <option value="">Select main category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">City</label>
                  <input type="text" required value={form.city} onChange={e => update('city', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="Berlin" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Business Description</label>
                  <textarea value={form.description} onChange={e => update('description', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors h-24 resize-none"
                    placeholder="Tell restaurant owners about your products..." />
                </div>
              </>
            )}

            {step === 3 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Halal Certificate (required)</label>
                <p className="text-xs text-slate-500 mb-3">Upload your official Halal certificate. Accepted: PDF, JPG, PNG. Max 5MB.</p>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="cert-upload" />
                  <label htmlFor="cert-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {form.certFile ? (
                      <>
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700">{form.certFile.name}</p>
                        <p className="text-xs text-slate-400">Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">Click to upload certificate</p>
                        <p className="text-xs text-slate-400">PDF, JPG, PNG up to 5MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > (isOAuthUser ? 2 : 1) && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:opacity-60">
                {loading ? 'Submitting...' : step === 3 ? 'Submit Application' : 'Next'}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
