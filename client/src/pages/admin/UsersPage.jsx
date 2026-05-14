import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Ban, Trash2, CheckCircle, Eye, Send, X, History } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const { user: adminUser } = useAuth()
  const [tab, setTab] = useState('active')
  const [users, setUsers] = useState([])
  const [deletedAccounts, setDeletedAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [viewTarget, setViewTarget] = useState(null)
  const [notifyTarget, setNotifyTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { loadUsers(); loadDeletedAccounts() }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('*, supplier_profile:supplier_profiles(business_name, is_verified, city), owner_profile:owner_profiles(restaurant_name, city)')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function toggleBan(user) {
    const next = !user.is_banned
    try {
      const { error } = await supabase.from('users').update({ is_banned: next }).eq('id', user.id)
      if (error) throw error

      if (user.role === 'supplier') {
        if (next) {
          const { error: spErr } = await supabase.from('supplier_profiles').update({ is_active: false }).eq('user_id', user.id)
          if (spErr) throw spErr
        } else {
          const { data: sp } = await supabase.from('supplier_profiles').select('is_verified').eq('user_id', user.id).single()
          if (sp?.is_verified) {
            await supabase.from('supplier_profiles').update({ is_active: true }).eq('user_id', user.id)
          }
        }
      }

      if (next) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Your account has been suspended',
          message: 'Your ProCuro account has been suspended by the admin. Your profile and products are no longer visible in the store. If you believe this is a mistake, please contact us at procuro@admin.com to appeal.',
          type: 'warning',
        })
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: next } : u))
      toast.success(next ? 'User banned' : 'User unbanned')
    } catch (err) {
      toast.error(err.message || 'Failed to update user')
    }
  }

  async function loadDeletedAccounts() {
    const { data } = await supabase.from('deleted_accounts').select('*').order('deleted_at', { ascending: false })
    setDeletedAccounts(data || [])
  }

  async function confirmDelete() {
    if (deleteConfirmText !== 'delete') return
    setDeleting(true)
    try {
      await supabase.from('deleted_accounts').insert({
        user_id: deleteTarget.id,
        email: deleteTarget.email,
        role: deleteTarget.role,
        business_name: deleteTarget.supplier_profile?.business_name || deleteTarget.owner_profile?.restaurant_name || null,
        deleted_by_admin_id: adminUser?.id,
      })
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: deleteTarget.id })
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      loadDeletedAccounts()
      toast.success('User deleted')
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  async function sendNotification() {
    if (!notifyTitle.trim() || !notifyMsg.trim()) return toast.error('Title and message required')
    setSending(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: notifyTarget.id,
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

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-gray-900">Restaurant Owners</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 input text-sm py-2 w-56" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input text-sm py-2 w-40">
            <option value="">All roles</option>
            <option value="restaurant_owner">Restaurant Owners</option>
            <option value="supplier">Suppliers</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === 'active' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Active Users ({users.length})
        </button>
        <button
          onClick={() => setTab('deleted')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'deleted' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <History className="w-3.5 h-3.5" /> Deleted ({deletedAccounts.length})
        </button>
      </div>

      {tab === 'deleted' ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Business</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deleted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deletedAccounts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{d.email || '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{d.role?.replace('_', ' ') || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{d.business_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{d.deleted_at ? format(new Date(d.deleted_at), 'dd MMM yyyy, HH:mm') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {deletedAccounts.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No deleted accounts</p>}
        </div>
      ) : loading ? <SkeletonTable rows={6} /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Business</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{u.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{u.role?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                    {u.supplier_profile?.business_name || u.owner_profile?.restaurant_name || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={u.is_banned ? 'cancelled' : 'active'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewTarget(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="View user">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setNotifyTarget(u); setNotifyTitle(''); setNotifyMsg('') }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400" title="Send notification">
                        <Send className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleBan(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'text-green-500 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`} title={u.is_banned ? 'Unban' : 'Ban'}>
                        {u.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      {u.role !== 'admin' && (
                        <button onClick={() => { setDeleteTarget(u); setDeleteConfirmText('') }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No users found</p>}
        </div>
      )}

      {/* View User Modal */}
      {viewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">User Details</h2>
              <button onClick={() => setViewTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Full Name', viewTarget.full_name],
                ['Email', viewTarget.email],
                ['Role', viewTarget.role?.replace('_', ' ')],
                ['Business', viewTarget.supplier_profile?.business_name || viewTarget.owner_profile?.restaurant_name],
                ['City', viewTarget.supplier_profile?.city || viewTarget.owner_profile?.city],
                ['Status', viewTarget.is_banned ? 'Banned' : 'Active'],
                ['Joined', viewTarget.created_at ? format(new Date(viewTarget.created_at), 'dd MMM yyyy') : '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 capitalize">{val || '—'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setViewTarget(null); setNotifyTarget(viewTarget); setNotifyTitle(''); setNotifyMsg('') }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
            >
              <Send className="w-4 h-4" /> Send Notification
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Delete User</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-red-700 mb-1">This action is permanent and cannot be undone.</p>
              <p className="text-xs text-red-500">All data for <span className="font-bold">{deleteTarget.full_name || deleteTarget.email}</span> will be permanently deleted.</p>
            </div>
            <p className="text-sm text-gray-600 mb-3">Type <span className="font-bold text-gray-900">delete</span> to confirm:</p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && deleteConfirmText === 'delete' && confirmDelete()}
              placeholder="Type delete here"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'delete' || deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
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
            <p className="text-sm text-gray-500 mb-4">
              To: <span className="font-semibold text-gray-700">{notifyTarget.full_name || notifyTarget.email}</span>
            </p>
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
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
