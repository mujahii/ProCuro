import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, CheckCircle, XCircle, Flag, X, AlertTriangle, Ban, PackageX, Send, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-emerald-50 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

function ActionModal({ report, onClose, onActionDone }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [warnMsg, setWarnMsg] = useState('')
  const [showWarnInput, setShowWarnInput] = useState(false)
  const [targetInfo, setTargetInfo] = useState(null)

  useEffect(() => { fetchTarget() }, [])

  async function fetchTarget() {
    if (report.type === 'supplier') {
      const { data } = await supabase
        .from('supplier_profiles')
        .select('id, business_name, user_id, is_active')
        .eq('id', report.target_id)
        .single()
      setTargetInfo(data)
    } else {
      const { data } = await supabase
        .from('products')
        .select('id, name, is_active, supplier_id, supplier:supplier_profiles(user_id, business_name)')
        .eq('id', report.target_id)
        .single()
      setTargetInfo(data)
    }
  }

  async function sendWarning() {
    if (!warnMsg.trim()) return toast.error('Please write a warning message')
    setLoading(true)
    try {
      const userId = report.type === 'supplier'
        ? targetInfo?.user_id
        : targetInfo?.supplier?.user_id
      if (!userId) throw new Error('Could not find user to notify')

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Warning from ProCuro Admin',
        message: warnMsg.trim(),
        type: 'warning',
      })
      await supabase.from('reports').update({ status: 'reviewed' }).eq('id', report.id)
      toast.success('Warning sent')
      onActionDone(report.id, 'reviewed')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to send warning')
    } finally {
      setLoading(false)
    }
  }

  async function banSupplierAccount() {
    setLoading(true)
    try {
      await supabase.from('users').update({ is_banned: true }).eq('id', targetInfo.user_id)
      await supabase.from('supplier_profiles').update({ is_active: false }).eq('id', targetInfo.id)
      await supabase.from('notifications').insert({
        user_id: targetInfo.user_id,
        title: 'Your account has been suspended',
        message: 'Your ProCuro account has been suspended following a report. Your profile and products are no longer visible in the store. If you believe this is a mistake, contact procuro@admin.com.',
        type: 'warning',
      })
      await supabase.from('reports').update({ status: 'reviewed' }).eq('id', report.id)
      toast.success('Account suspended and user notified')
      onActionDone(report.id, 'reviewed')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to suspend account')
    } finally {
      setLoading(false)
    }
  }

  async function deactivateProduct() {
    setLoading(true)
    try {
      await supabase.from('products').update({ is_active: false }).eq('id', report.target_id)
      const userId = targetInfo?.supplier?.user_id
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Product Removed from Store',
          message: `Your product "${targetInfo?.name}" has been deactivated following a report. Please contact procuro@admin.com for more information.`,
          type: 'warning',
        })
      }
      await supabase.from('reports').update({ status: 'reviewed' }).eq('id', report.id)
      toast.success('Product deactivated and supplier notified')
      onActionDone(report.id, 'reviewed')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate product')
    } finally {
      setLoading(false)
    }
  }

  async function dismiss() {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', report.id)
    onActionDone(report.id, 'dismissed')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-bold text-gray-900">Report Details</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Report info */}
        <div className="px-6 py-4 space-y-3 text-sm border-b border-gray-50">
          {[
            ['Type', report.type === 'product' ? 'Product' : 'Supplier'],
            ['Target', report.target_name],
            ['Reason', report.reason],
            ['Reporter', report.reporter?.full_name || report.reporter?.email || '—'],
            ['Date', report.created_at ? format(new Date(report.created_at), 'dd MMM yyyy') : '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%]">{val}</span>
            </div>
          ))}
          {report.details && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
              {report.details}
            </div>
          )}
          <button
            onClick={() => { onClose(); navigate(`${report.type === 'supplier' ? '/admin/suppliers' : '/admin/products'}?id=${report.target_id}`) }}
            className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors mt-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View {report.type === 'supplier' ? 'Supplier' : 'Product'} in Admin Panel
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Take Action</p>

          {/* Warning input */}
          {showWarnInput ? (
            <div className="space-y-2">
              <textarea
                value={warnMsg}
                onChange={e => setWarnMsg(e.target.value)}
                placeholder="Write your warning message to the account owner..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowWarnInput(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
                  Back
                </button>
                <button onClick={sendWarning} disabled={loading} className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Warning
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Send Warning */}
              <button
                onClick={() => setShowWarnInput(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Send Warning</p>
                  <p className="text-xs text-amber-600">Notify the account owner with a custom warning message</p>
                </div>
              </button>

              {/* Supplier-specific: Ban account */}
              {report.type === 'supplier' && (
                <button
                  onClick={banSupplierAccount}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left disabled:opacity-50"
                >
                  <Ban className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Suspend Account</p>
                    <p className="text-xs text-red-500">Ban the supplier's account and notify them</p>
                  </div>
                </button>
              )}

              {/* Product-specific: Deactivate product */}
              {report.type === 'product' && (
                <button
                  onClick={deactivateProduct}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left disabled:opacity-50"
                >
                  <PackageX className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Remove Product</p>
                    <p className="text-xs text-red-500">Deactivate the product and notify the supplier</p>
                  </div>
                </button>
              )}

              {/* Dismiss */}
              {report.status === 'pending' && (
                <button
                  onClick={dismiss}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Dismiss Report</p>
                    <p className="text-xs text-gray-400">No action needed — mark this report as dismissed</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadReports() }, [])

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:users(full_name, email)')
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  function handleActionDone(reportId, status) {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
  }

  const filtered = reports.filter(r => {
    const matchSearch = !search ||
      r.target_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter?.email?.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || r.type === typeFilter
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const pendingCount = reports.filter(r => r.status === 'pending').length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900">Reports</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount} pending</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="pl-9 input text-sm py-2 w-48" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-sm py-2 w-36">
            <option value="">All types</option>
            <option value="product">Products</option>
            <option value="supplier">Suppliers</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm py-2 w-36">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Reporter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.type === 'product' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      <Flag className="w-3 h-3" />
                      {r.type === 'product' ? 'Product' : 'Supplier'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors">{r.target_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{r.reason}</p>
                    {r.details && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate" title={r.details}>{r.details}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-500">{r.reporter?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{r.reporter?.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-emerald-600 font-medium">Review →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Flag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No reports found</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <ActionModal
          report={selected}
          onClose={() => setSelected(null)}
          onActionDone={handleActionDone}
        />
      )}
    </div>
  )
}
