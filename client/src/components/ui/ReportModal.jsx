import { useState } from 'react'
import { X, Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const PRODUCT_REASONS = [
  'Incorrectly labeled as Halal',
  'Misleading product information',
  'Product not available despite listed as in stock',
  'Inappropriate content or images',
  'Suspected fraudulent listing',
  'Other',
]

const SUPPLIER_REASONS = [
  'Fake Halal certification',
  'Fraudulent business',
  'Poor hygiene or safety standards',
  'Abusive or unprofessional behavior',
  'Selling prohibited products',
  'Other',
]

export default function ReportModal({ type, targetId, targetName, onClose }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reasons = type === 'product' ? PRODUCT_REASONS : SUPPLIER_REASONS

  async function handleSubmit() {
    if (!reason) return toast.error('Please select a reason')
    if (!user) return toast.error('You must be logged in to report')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        type,
        target_id: targetId,
        target_name: targetName,
        reason,
        details: details.trim() || null,
        status: 'pending',
      })
      if (error) throw error

      // Notify the admin
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()
      if (adminUser) {
        await supabase.from('notifications').insert({
          user_id: adminUser.id,
          title: `New ${type === 'product' ? 'Product' : 'Supplier'} Report`,
          message: `"${targetName}" was reported for: ${reason}.`,
          type: 'warning',
        })
      }

      toast.success('Report submitted. Thank you.')
      onClose()
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Report {type === 'product' ? 'Product' : 'Supplier'}
              </h2>
              {targetName && <p className="text-xs text-slate-500 truncate max-w-[220px]">{targetName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Reason for report
            </label>
            <div className="space-y-2">
              {reasons.map(r => (
                <label key={r} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-red-500"
                  />
                  <span className={`text-sm ${reason === r ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Additional details <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe the issue in more detail..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
