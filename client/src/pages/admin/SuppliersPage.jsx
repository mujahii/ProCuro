import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, ToggleLeft, ToggleRight, Eye, Send, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminSuppliersPage() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('id')
  const highlightRef = useRef(null)
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [notifyTarget, setNotifyTarget] = useState(null)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)

  useEffect(() => { loadSuppliers() }, [])

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, suppliers])

  async function loadSuppliers() {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*, user:users(id, email, full_name, is_banned, created_at), halal_certificates(status)')
      .order('created_at', { ascending: false })
    setSuppliers(data || [])
    setLoading(false)
  }

  async function toggleActive(supplier) {
    const next = !supplier.is_active
    const { error } = await supabase.from('supplier_profiles').update({ is_active: next }).eq('id', supplier.id)
    if (!error) {
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, is_active: next } : s))
      toast.success(next ? 'Supplier activated' : 'Supplier deactivated')
    }
  }

  function handleToggleClick(s) {
    if (s.is_active) {
      setToggleTarget(s)
    } else {
      toggleActive(s)
    }
  }

  async function sendNotification() {
    if (!notifyTitle.trim() || !notifyMsg.trim()) return toast.error('Title and message required')
    setSending(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: notifyTarget.user?.id || notifyTarget.user_id,
        title: notifyTitle.trim(),
        message: notifyMsg.trim(),
        type: 'admin_message',
      })
      if (error) throw error
      toast.success('Notification sent')
      setNotifyTarget(null); setNotifyTitle(''); setNotifyMsg('')
    } catch (err) {
      toast.error(err.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))].sort()

  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || s.category === categoryFilter
    return matchSearch && matchCat
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-black text-gray-900">Suppliers ({suppliers.length})</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9 input text-sm py-2 w-48" />
          </div>
          {categories.length > 0 && (
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input text-sm py-2 w-40">
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Business</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => {
                const certs = s.halal_certificates || []
                const certStatus = certs[0]?.status || 'none'
                return (
                  <tr
                    key={s.id}
                    ref={s.id === highlightId ? highlightRef : null}
                    className={`hover:bg-gray-50 transition-colors ${s.id === highlightId ? 'bg-emerald-50 outline outline-2 outline-emerald-400' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.business_name || '—'}</p>
                      <p className="text-xs text-gray-400">{s.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{s.user?.full_name || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{s.city || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.is_verified ? 'bg-emerald-50 text-emerald-700' :
                        certStatus === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {s.is_verified ? 'Verified' : certStatus === 'pending' ? 'Pending' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setViewTarget(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setNotifyTarget(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400" title="Send notification">
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleClick(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title={s.is_active ? 'Deactivate' : 'Activate'}>
                          {s.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No suppliers found</p>}
        </div>
      )}

      {/* View Supplier Modal */}
      {viewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Supplier Details</h2>
              <button onClick={() => setViewTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Business Name', viewTarget.business_name],
                ['Owner', viewTarget.user?.full_name],
                ['Email', viewTarget.user?.email],
                ['City', viewTarget.city],
                ['Phone', viewTarget.phone],
                ['Rating', viewTarget.rating > 0 ? `${Number(viewTarget.rating).toFixed(1)} ★` : 'No rating'],
                ['Verified', viewTarget.is_verified ? 'Yes' : 'No'],
                ['Active', viewTarget.is_active ? 'Yes' : 'No'],
                ['Joined', viewTarget.created_at ? format(new Date(viewTarget.created_at), 'dd MMM yyyy') : '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val || '—'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setViewTarget(null); setNotifyTarget(viewTarget) }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
            >
              <Send className="w-4 h-4" /> Send Notification
            </button>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Deactivate Supplier</h2>
              <button onClick={() => setToggleTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-orange-700 mb-1">
                This supplier will be deactivated and will receive a notification.
              </p>
              <p className="text-xs text-orange-500">
                <span className="font-bold">{toggleTarget.business_name}</span>'s profile and products will no longer be visible in the store.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setToggleTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await toggleActive(toggleTarget)
                  if (toggleTarget.user?.id) {
                    await supabase.from('notifications').insert({
                      user_id: toggleTarget.user.id,
                      title: 'Your supplier account has been deactivated',
                      message: 'Your ProCuro supplier profile has been deactivated by the admin. Your products are no longer visible in the store. Contact procuro@admin.com to appeal.',
                      type: 'warning',
                    })
                  }
                  setToggleTarget(null)
                }}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {notifyTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Send Notification</h2>
              <button onClick={() => setNotifyTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">To: <span className="font-semibold text-gray-700">{notifyTarget.business_name || notifyTarget.user?.email}</span></p>
            <div className="space-y-3">
              <input
                value={notifyTitle}
                onChange={e => setNotifyTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <textarea
                value={notifyMsg}
                onChange={e => setNotifyMsg(e.target.value)}
                placeholder="Write your message..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <button
              onClick={sendNotification}
              disabled={sending}
              className="mt-4 w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
