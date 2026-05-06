import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Loader2, CreditCard, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SupplierBankDetailsPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [form, setForm] = useState({ bank_name: '', account_holder: '', iban: '', bic: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ibanError, setIbanError] = useState('')

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) {
      const { data: bank } = await supabase.from('supplier_bank_details').select('*').eq('supplier_id', sp.id).single()
      if (bank) setForm({ bank_name: bank.bank_name || '', account_holder: bank.account_holder || '', iban: bank.iban || '', bic: bank.bic || '' })
    }
    setLoading(false)
  }

  function validateIban(iban) {
    const cleaned = iban.replace(/\s/g, '')
    if (cleaned.length < 15 || cleaned.length > 34) return 'IBAN must be between 15 and 34 characters'
    if (!/^[A-Z]{2}/i.test(cleaned)) return 'IBAN must start with a 2-letter country code'
    return ''
  }

  async function handleSave(e) {
    e.preventDefault()
    const err = validateIban(form.iban)
    if (err) { setIbanError(err); return }
    setIbanError('')
    setSaving(true)
    try {
      const bankData = { ...form, iban: form.iban.replace(/\s/g, ''), supplier_id: supplierProfile.id }
      await supabase.from('supplier_bank_details').upsert(bankData, { onConflict: 'supplier_id' })
      toast.success('Bank details saved!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Bank Details</h1>
          <p className="text-sm text-gray-500">Shown to restaurant owners who choose Bank Transfer</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Bank Name</label>
            <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="input" placeholder="Deutsche Bank" />
          </div>
          <div>
            <label className="label">Account Holder Name</label>
            <input value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))} className="input" placeholder="Al-Nour Meats GmbH" />
          </div>
          <div>
            <label className="label">IBAN</label>
            <input
              value={form.iban}
              onChange={e => { setForm(f => ({ ...f, iban: e.target.value })); setIbanError('') }}
              className={`input font-mono ${ibanError ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="DE89 3704 0044 0532 0130 00"
            />
            {ibanError && <p className="text-xs text-red-600 mt-1">{ibanError}</p>}
          </div>
          <div>
            <label className="label">BIC / SWIFT</label>
            <input value={form.bic} onChange={e => setForm(f => ({ ...f, bic: e.target.value }))} className="input font-mono" placeholder="COBADEFFXXX" />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Bank Details
          </button>
        </form>
      </div>
    </div>
  )
}
