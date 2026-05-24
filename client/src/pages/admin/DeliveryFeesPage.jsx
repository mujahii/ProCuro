import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit2, Trash2, X, Truck, Percent } from 'lucide-react'
import { SkeletonTable } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const EMPTY_FORM = { min_km: '', max_km: '', fee: '', label: '' }

export default function AdminDeliveryFeesPage() {
  const { t } = useLanguage()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Tax rate state
  const [taxRate, setTaxRate] = useState(null)
  const [showTaxForm, setShowTaxForm] = useState(false)
  const [taxInput, setTaxInput] = useState('')
  const [savingTax, setSavingTax] = useState(false)

  useEffect(() => { loadRules(); loadTaxRate() }, [])

  async function loadRules() {
    const { data } = await supabase.from('delivery_fee_rules').select('*').order('min_km')
    setRules(data || [])
    setLoading(false)
  }

  async function loadTaxRate() {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'tax_rate').maybeSingle()
    if (data?.value) setTaxRate(parseFloat(data.value))
  }

  async function handleSaveTaxRate(e) {
    e.preventDefault()
    const val = parseFloat(taxInput)
    if (isNaN(val) || val < 0 || val > 100) { toast.error(t('toastValidPercentage')); return }
    setSavingTax(true)
    const { error } = await supabase.from('platform_settings')
      .upsert({ key: 'tax_rate', value: String(val / 100) }, { onConflict: 'key' })
    if (error) { toast.error(t('toastFailedSaveTaxRate')); setSavingTax(false); return }
    setTaxRate(val / 100)
    setShowTaxForm(false)
    setSavingTax(false)
    toast.success(t('toastTaxRateUpdated'))
  }

  function openAdd() {
    setEditRule(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(rule) {
    setEditRule(rule)
    setForm({
      min_km: String(rule.min_km),
      max_km: rule.max_km != null ? String(rule.max_km) : '',
      fee: String(rule.fee),
      label: rule.label || '',
    })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      min_km: Number(form.min_km),
      max_km: form.max_km !== '' ? Number(form.max_km) : null,
      fee: Number(form.fee),
      label: form.label || null,
    }
    if (editRule) {
      const { data, error } = await supabase.from('delivery_fee_rules').update(payload).eq('id', editRule.id).select().single()
      if (error) { toast.error(t('toastFailedUpdate')); setSaving(false); return }
      setRules(prev => prev.map(r => r.id === editRule.id ? data : r).sort((a, b) => a.min_km - b.min_km))
      toast.success(t('toastRuleUpdated'))
    } else {
      const { data, error } = await supabase.from('delivery_fee_rules').insert(payload).select().single()
      if (error) { toast.error(t('toastFailedAdd')); setSaving(false); return }
      setRules(prev => [...prev, data].sort((a, b) => a.min_km - b.min_km))
      toast.success(t('toastRuleAdded'))
    }
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('delivery_fee_rules').delete().eq('id', deleteTarget.id)
    if (error) { toast.error(t('toastFailedDelete')); return }
    setRules(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success(t('toastRuleDeleted'))
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black text-gray-900">Delivery Fee Rules</h1>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        These rules set the delivery fee charged to restaurant owners at checkout, based on the distance
        between the supplier's business and the restaurant. Suppliers see this table on their Products page.
        Changes take effect immediately.
      </p>

      {loading ? <SkeletonTable rows={4} /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-lionsmane border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Min km</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Max km</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fee (€)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Label</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-lionsmane transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.min_km}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{rule.max_km != null ? rule.max_km : '∞'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-midnight">€{Number(rule.fee).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rule.label || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(rule)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(rule)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No delivery fee rules configured</p>}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editRule ? 'Edit Rule' : 'Add Rule'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min km <span className="text-red-400">*</span></label>
                  <input
                    type="number" min="0" step="any" required
                    value={form.min_km}
                    onChange={e => setForm(f => ({ ...f, min_km: e.target.value }))}
                    className="input w-full text-sm py-2"
                    placeholder="e.g. 0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max km <span className="text-gray-400 font-normal">(blank = unlimited)</span></label>
                  <input
                    type="number" min="0" step="any"
                    value={form.max_km}
                    onChange={e => setForm(f => ({ ...f, max_km: e.target.value }))}
                    className="input w-full text-sm py-2"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fee (€) <span className="text-red-400">*</span></label>
                <input
                  type="number" min="0" step="0.01" required
                  value={form.fee}
                  onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                  className="input w-full text-sm py-2"
                  placeholder="e.g. 5.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label <span className="text-gray-400 font-normal">(displayed to suppliers)</span></label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="input w-full text-sm py-2"
                  placeholder="e.g. 0–50 km"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 text-sm py-2">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2">
                  {saving ? 'Saving…' : editRule ? 'Save Changes' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Rate Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Percent className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-black text-gray-900">VAT / Tax Rate</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          The tax rate applied to all orders at checkout and shown on invoices. Germany's reduced VAT rate for food (Lebensmittel) is 7%.
        </p>
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current Rate</p>
            <p className="text-2xl font-black text-midnight">
              {taxRate != null ? `${(taxRate * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Applied at checkout &amp; on PDF invoices</p>
          </div>
          <button
            onClick={() => { setTaxInput(taxRate != null ? String((taxRate * 100).toFixed(2)) : '7'); setShowTaxForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit Rate
          </button>
        </div>
      </div>

      {/* Tax Rate Edit Modal */}
      {showTaxForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Edit Tax Rate</h2>
              <button onClick={() => setShowTaxForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTaxRate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Rate (%) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={taxInput}
                    onChange={e => setTaxInput(e.target.value)}
                    className="input w-full text-sm py-2 pr-8"
                    placeholder="e.g. 7"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter as a percentage — e.g. "7" for 7%</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowTaxForm(false)} className="btn-ghost flex-1 text-sm py-2">
                  Cancel
                </button>
                <button type="submit" disabled={savingTax} className="btn-primary flex-1 text-sm py-2">
                  {savingTax ? 'Saving…' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Delete Rule</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-red-700 mb-1">This will permanently delete the rule:</p>
              <p className="text-sm text-red-600">
                {deleteTarget.label || `${deleteTarget.min_km}–${deleteTarget.max_km ?? '∞'} km`} — €{Number(deleteTarget.fee).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1 text-sm py-2">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
