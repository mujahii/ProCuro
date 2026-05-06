import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Upload, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function RegisterSupplierPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    businessName: '', taxId: '', description: '', category: '', city: '',
    certFile: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError('Certificate file must be under 5MB')
      return
    }
    setError('')
    update('certFile', file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (step < 3) { setStep(s => s + 1); return }
    if (!form.certFile) return setError('Please upload a Halal certificate')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    setError('')

    try {
      // 1. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { role: 'supplier', full_name: form.fullName } },
      })
      if (signUpError) throw signUpError

      const userId = authData.user.id

      // 2. Update phone
      await supabase.from('users').update({ phone: form.phone || null }).eq('id', userId)

      // 3. Create supplier profile
      const { data: supplierProfile, error: profileError } = await supabase
        .from('supplier_profiles')
        .insert({
          user_id: userId,
          business_name: form.businessName,
          tax_id: form.taxId || null,
          description: form.description || null,
          category: form.category,
          city: form.city,
        })
        .select()
        .single()
      if (profileError) throw profileError

      // 4. Upload certificate
      const ext = form.certFile.name.split('.').pop()
      const certPath = `${supplierProfile.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('halal-certificates')
        .upload(certPath, form.certFile)
      if (uploadError) throw uploadError

      // 5. Insert certificate record
      await supabase.from('halal_certificates').insert({
        supplier_id: supplierProfile.id,
        file_url: uploadData.path,
        status: 'pending',
      })

      setDone(true)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Account Under Review</h2>
          <p className="text-gray-500 mb-2">
            Your Halal certificate has been submitted. Our team will verify it within <strong>48 hours</strong>.
          </p>
          <p className="text-sm text-gray-400 mb-6">You'll receive a notification once your account is approved.</p>
          <Link to="/supplier/dashboard" className="btn-primary w-full">Go to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-black text-primary">ProCuro</span>
          </Link>
          <p className="mt-2 text-gray-500 text-sm">Become a verified Halal supplier</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s < step ? 'bg-primary text-white' : s === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mb-6">
          Step {step} of 3: {['Account Info', 'Business Info', 'Halal Certificate'][step - 1]}
        </p>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

            {step === 1 && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input required value={form.fullName} onChange={e => update('fullName', e.target.value)} className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="input" placeholder="you@business.de" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input" placeholder="+49 123 456789" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" required value={form.password} onChange={e => update('password', e.target.value)} className="input" placeholder="Min. 8 characters" />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" required value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className="input" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="label">Business Name</label>
                  <input required value={form.businessName} onChange={e => update('businessName', e.target.value)} className="input" placeholder="Al-Nour Meats GmbH" />
                </div>
                <div>
                  <label className="label">Tax ID (optional)</label>
                  <input value={form.taxId} onChange={e => update('taxId', e.target.value)} className="input" placeholder="DE123456789" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select required value={form.category} onChange={e => update('category', e.target.value)} className="input">
                    <option value="">Select main category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">City</label>
                  <input required value={form.city} onChange={e => update('city', e.target.value)} className="input" placeholder="Berlin" />
                </div>
                <div>
                  <label className="label">Business Description</label>
                  <textarea value={form.description} onChange={e => update('description', e.target.value)} className="input h-24 resize-none" placeholder="Tell restaurant owners about your products and certifications..." />
                </div>
              </>
            )}

            {step === 3 && (
              <div>
                <label className="label">Halal Certificate (required)</label>
                <p className="text-xs text-gray-500 mb-3">Upload your official Halal certificate. Accepted: PDF, JPG, PNG. Max 5MB.</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cert-upload"
                  />
                  <label htmlFor="cert-upload" className="cursor-pointer">
                    {form.certFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-10 h-10 text-primary" />
                        <p className="text-sm font-medium text-primary">{form.certFile.name}</p>
                        <p className="text-xs text-gray-400">Click to change</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-10 h-10 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">Click to upload certificate</p>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG up to 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 3 ? 'Submit Application' : 'Next'}
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
