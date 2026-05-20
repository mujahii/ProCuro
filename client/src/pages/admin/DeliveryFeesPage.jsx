import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit2, Trash2, X, Truck } from 'lucide-react'
import { SkeletonTable } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

const EMPTY_FORM = { min_km: '', max_km: '', fee: '', label: '' }

export default function AdminDeliveryFeesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { loadRules() }, [])

  async function loadRules() {
    const { data } = await supabase.from('delivery_fee_rules').select('*').order('min_km')
    setRules(data || [])
    setLoading(false)
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
      if (error) { toast.error('Failed to update'); setSaving(false); return }
      setRules(prev => prev.map(r => r.id === editRule.id ? data : r).sort((a, b) => a.min_km - b.min_km))
      toast.success('Rule updated')
    } else {
      const { data, error } = await supabase.from('delivery_fee_rules').insert(payload).select().single()
      if (error) { toast.error('Failed to add'); setSaving(false); return }
      setRules(prev => [...prev, data].sort((a, b) => a.min_km - b.min_km))
      toast.success('Rule added')
    }
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase.from('delivery_fee_rules').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Failed to delete'); return }
    setRules(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success('Rule deleted')
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
