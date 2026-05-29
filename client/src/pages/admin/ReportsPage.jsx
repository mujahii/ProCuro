import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, CheckCircle, XCircle, Flag, X, AlertTriangle, Ban, PackageX, Send, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const STATUS_STYLES = {
  pending: 'bg-lionsmane text-marigold-dark',
  reviewed: 'bg-lionsmane text-midnight-dark',
  dismissed: 'bg-gray-100 text-gray-500',
}

const TYPE_LABELS = { product: 'Product', supplier: 'Supplier', restaurant: 'Restaurant Owner', user: 'Restaurant Owner', order: 'Order' }
const TYPE_STYLES = {
  product: 'bg-blue-50 text-blue-700',
  supplier: 'bg-purple-50 text-purple-700',
  restaurant: 'bg-orange-50 text-orange-700',
  user: 'bg-orange-50 text-orange-700',
}
function typeStyle(type) { return TYPE_STYLES[type] || 'bg-gray-100 text-gray-600' }
function typeLabel(type) { return TYPE_LABELS[type] || type }
function isRestaurantType(type) { return type === 'restaurant' || type === 'user' }

function ActionModal({ report, onClose, onActionDone }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
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
        .maybeSingle()
      setTargetInfo(data)
    } else if (report.type === 'restaurant' || report.type === 'user') {
      // target_id is the owner's user_id (not the owner_profiles.id)
      const { data } = await supabase
        .from('owner_profiles')
        .select('id, restaurant_name, user_id')
        .eq('user_id', report.target_id)
        .maybeSingle()
      // Fall back to a plain users row if no owner_profile exists
      if (data) { setTargetInfo(data); return }
      const { data: u } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', report.target_id)
        .maybeSingle()
      setTargetInfo(u ? { user_id: u.id, restaurant_name: u.full_name || u.email } : null)
    } else {
      const { data } = await supabase
        .from('products')
        .select('id, name, is_active, supplier_id, supplier:supplier_profiles(user_id, business_name)')
        .eq('id', report.target_id)
        .maybeSingle()
      setTargetInfo(data)
    }
  }

  async function sendWarning() {
    if (!warnMsg.trim()) return toast.error(t('toastWriteWarningMessage'))
    setLoading(true)
    try {
      let userId
      if (report.type === 'supplier') userId = targetInfo?.user_id
      else if (report.type === 'restaurant' || report.type === 'user') userId = targetInfo?.user_id || report.target_id
      else userId = targetInfo?.supplier?.user_id
      if (!userId) throw new Error('Could not find user to notify')

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Warning from ProCuro Admin',
        message: warnMsg.trim(),
        type: 'warning',
        link: report.type === 'supplier' ? '/supplier/chat' : '/owner/chat',
      })

      await supabase.from('reports').update({
        status: 'reviewed',
        admin_action: `Warning sent: "${warnMsg.trim()}"`,
        admin_action_at: new Date().toISOString(),
      }).eq('id', report.id)
      toast.success(t('toastWarningSent'))
      onActionDone(report.id, 'reviewed', `Warning sent: "${warnMsg.trim()}"`)

      onClose()
    } catch (err) {
      toast.error(err.message || t('toastFailedNotification'))
    } finally {
      setLoading(false)
    }
  }

  async function banSupplierAccount() {
    const uid = targetInfo?.user_id
    if (!uid) { toast.error(t('toastCouldNotFindSupplierUser')); return }
    setLoading(true)
    try {
      await supabase.from('users').update({ is_banned: true }).eq('id', uid)
      if (targetInfo?.id) await supabase.from('supplier_profiles').update({ is_active: false }).eq('id', targetInfo.id)
      await supabase.from('notifications').insert({
        user_id: uid,
        title: 'Your account has been suspended',
        message: 'Your ProCuro account has been suspended following a report. To appeal, please chat with the admin through the ProCuro Chat Centre.',
        type: 'warning',
        link: '/supplier/chat',
      })
      await supabase.from('reports').update({
        status: 'reviewed',
        admin_action: 'Account suspended',
        admin_action_at: new Date().toISOString(),
      }).eq('id', report.id)
      toast.success(t('toastAccountSuspendedUserNotified'))
      onActionDone(report.id, 'reviewed', 'Account suspended')
      onClose()
    } catch (err) {
      toast.error(err.message || t('toastFailedUpdateUserRecord'))
    } finally {
      setLoading(false)
    }
  }

  async function banRestaurantAccount() {
    const uid = targetInfo?.user_id || report.target_id
    if (!uid) { toast.error(t('toastCouldNotFindRestaurantUser')); return }
    setLoading(true)
    try {
      await supabase.from('users').update({ is_banned: true }).eq('id', uid)
      await supabase.from('notifications').insert({
        user_id: uid,
        title: 'Your account has been suspended',
        message: 'Your ProCuro account has been suspended following a report. To appeal, please chat with the admin through the ProCuro Chat Centre.',
        type: 'warning',
        link: '/owner/chat',
      })
      await supabase.from('reports').update({
        status: 'reviewed',
        admin_action: 'Account suspended',
        admin_action_at: new Date().toISOString(),
      }).eq('id', report.id)
      toast.success(t('toastAccountSuspendedOwnerNotified'))
      onActionDone(report.id, 'reviewed', 'Account suspended')
      onClose()
    } catch (err) {
      toast.error(err.message || t('toastFailedUpdateUserRecord'))
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
      await supabase.from('reports').update({
        status: 'reviewed',
        admin_action: `Product removed: "${targetInfo?.name}"`,
        admin_action_at: new Date().toISOString(),
      }).eq('id', report.id)
      toast.success(t('toastProductDeactivatedNotified'))
      onActionDone(report.id, 'reviewed', `Product removed: "${targetInfo?.name}"`)

      onClose()
    } catch (err) {
      toast.error(err.message || t('toastFailedUpdateUserRecord'))
    } finally {
      setLoading(false)
    }
  }

  async function dismiss() {
    await supabase.from('reports').update({
      status: 'dismissed',
      admin_action: 'Dismissed — no action needed',
      admin_action_at: new Date().toISOString(),
    }).eq('id', report.id)
    onActionDone(report.id, 'dismissed', 'Dismissed — no action needed')
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
            ['Type', typeLabel(report.type)],
            ['Target', report.target_name || '—'],
            ['Reported by', report.reporter?.full_name || report.reporter?.email || '—'],
            ['Reason', report.reason],
            ['Date', report.created_at ? format(new Date(report.created_at), 'dd MMM yyyy') : '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%]">{val}</span>
            </div>
          ))}
          {report.details && (
            <div className="bg-lionsmane rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
              {report.details}
            </div>
          )}
          {(report.type === 'supplier' || report.type === 'product' || isRestaurantType(report.type)) && (
            <button
              onClick={() => {
                onClose()
                if (report.type === 'supplier') navigate(`/admin/suppliers?id=${report.target_id}`)
                else if (report.type === 'product') navigate(`/admin/products?id=${report.target_id}`)
                else navigate(`/admin/users`)
              }}
              className="flex items-center gap-1.5 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark transition-colors mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View {typeLabel(report.type)} in Admin Panel
            </button>
          )}
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marigold-light resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowWarnInput(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-lionsmane">
                  Back
                </button>
                <button onClick={sendWarning} disabled={loading} className="flex-1 py-2 bg-marigold text-white rounded-xl text-sm font-semibold hover:bg-marigold disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Warning
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Send Warning */}
              <button
                onClick={() => setShowWarnInput(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-marigold-light bg-lionsmane hover:bg-marigold-light transition-colors text-left"
              >
                <AlertTriangle className="w-4 h-4 text-marigold flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-marigold-dark">Send Warning</p>
                  <p className="text-xs text-marigold">Notify the account owner with a custom warning message</p>
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

              {/* Restaurant-specific: Ban account */}
              {isRestaurantType(report.type) && (
                <button
                  onClick={banRestaurantAccount}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left disabled:opacity-50"
                >
                  <Ban className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Suspend Restaurant Account</p>
                    <p className="text-xs text-red-500">Ban the restaurant owner's account and notify them</p>
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-lionsmane transition-colors text-left"
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

  function handleActionDone(reportId, status, adminAction) {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status, admin_action: adminAction || r.admin_action } : r))
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-display text-2xl font-black text-gray-900">Reports</h1>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount} pending</span>
        )}
      </div>

      {/* Filters — stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports..." className="pl-9 input text-sm py-2 w-full" />
        </div>
        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-sm py-2 flex-1 sm:w-36">
            <option value="">All types</option>
            <option value="product">Products</option>
            <option value="supplier">Suppliers</option>
            <option value="user">Restaurant Owners</option>
            <option value="restaurant">Restaurants (legacy)</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm py-2 flex-1 sm:w-36">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} /> : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Flag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No reports found</p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-midnight/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle(r.type)}`}>
                    <Flag className="w-3 h-3" />
                    {typeLabel(r.type)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 mb-0.5">{r.target_name || '—'}</p>
                <p className="text-xs text-gray-500 mb-1">{r.reason}</p>
                {r.details && (
                  <p className="text-xs text-gray-400 truncate mb-1">{r.details}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    {r.reporter?.full_name || r.reporter?.email || '—'}
                    {r.created_at && ` · ${format(new Date(r.created_at), 'dd MMM yyyy')}`}
                  </p>
                  <span className="text-xs text-midnight font-semibold">{r.status === 'pending' ? 'Review →' : 'View →'}</span>
                </div>
                {r.admin_action && (
                  <p className="text-[11px] text-gray-400 mt-1 truncate">{r.admin_action}</p>
                )}
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-lionsmane border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Reporter</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-lionsmane cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle(r.type)}`}>
                        <Flag className="w-3 h-3" />
                        {typeLabel(r.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{r.target_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{r.reason}</p>
                      {r.details && (
                        <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate" title={r.details}>{r.details}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-gray-500">{r.reporter?.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{r.reporter?.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-400">
                      {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                      {r.admin_action && (
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[120px] truncate" title={r.admin_action}>{r.admin_action}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-midnight font-medium">{r.status === 'pending' ? 'Review →' : 'View →'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
