import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Ban, Trash2, CheckCircle, Eye, Send, X, History, ToggleLeft, ToggleRight, MessageSquare, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ROLE_FILTERS = [
  { value: '', label: 'All Users' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'restaurant_owner', label: 'Restaurant Owners' },
  { value: 'admin', label: 'Admins' },
]

export default function AdminUsersPage() {
  const { user: adminUser } = useAuth()
  const navigate = useNavigate()
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
  const [banTarget, setBanTarget] = useState(null)
  const [ownerToggleTarget, setOwnerToggleTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [sendingReset, setSendingReset] = useState(false)

  useEffect(() => { loadUsers(); loadDeletedAccounts() }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('*, supplier_profile:supplier_profiles(id, business_name, is_verified, is_active, city, phone, description, rating, category, website, avatar_url), owner_profile:owner_profiles(restaurant_name, city, tax_id, cuisine, website, is_active)')
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
          await supabase.from('supplier_profiles').update({ is_active: false }).eq('user_id', user.id)
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
          message: 'Your ProCuro account has been suspended by the admin. To appeal, please chat with the admin through the ProCuro Chat Centre.',
          type: 'warning',
          link: user.role === 'supplier' ? '/supplier/chat' : '/owner/chat',
        })
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: next } : u))
      toast.success(next ? 'User banned' : 'User unbanned')
    } catch (err) {
      toast.error(err.message || 'Failed to update user')
    }
  }

  async function toggleOwnerActive(user) {
    const op = user.owner_profile
    if (!op) return
    const next = !op.is_active
    const { error } = await supabase.from('owner_profiles').update({ is_active: next }).eq('user_id', user.id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id
        ? { ...u, owner_profile: { ...u.owner_profile, is_active: next } }
        : u))
      if (!next) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Your account has been deactivated',
          message: 'Your ProCuro restaurant account has been deactivated by the admin. To appeal, please chat through the ProCuro Chat Centre.',
          type: 'warning',
          link: '/owner/chat',
        })
      }
      toast.success(next ? 'Owner account activated' : 'Owner account deactivated')
    }
  }

  async function sendPasswordReset(user) {
    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin.replace('/admin', '')}/reset-password`,
      })
      if (error) throw error
      toast.success(`Password reset email sent to ${user.email}`)
      setResetTarget(null)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setSendingReset(false)
    }
  }

  async function toggleSupplierActive(user) {
    const sp = user.supplier_profile
    if (!sp) return
    const next = !sp.is_active
    const { error } = await supabase.from('supplier_profiles').update({ is_active: next }).eq('id', sp.id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id
        ? { ...u, supplier_profile: { ...u.supplier_profile, is_active: next } }
        : u))
      if (!next) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Your supplier account has been deactivated',
          message: 'Your ProCuro supplier profile has been deactivated. To appeal, please chat with the admin through the ProCuro Chat Centre.',
          type: 'warning',
          link: '/supplier/chat',
        })
      }
      toast.success(next ? 'Supplier activated' : 'Supplier deactivated')
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

  const roleBadge = (role) => {
    const map = {
      supplier: 'bg-purple-50 text-purple-700',
      restaurant_owner: 'bg-blue-50 text-blue-700',
      admin: 'bg-red-50 text-red-700',
    }
    const labels = { supplier: 'Supplier', restaurant_owner: 'Owner', admin: 'Admin' }
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[role] || 'bg-gray-100 text-gray-600'}`}>{labels[role] || role}</span>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-black text-gray-900">Users ({users.length})</h1>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 input text-sm py-2 w-56" />
        </div>
      </div>

      {/* Role filter buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ROLE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              roleFilter === f.value
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.value && <span className="ml-1.5 opacity-60">({users.filter(u => u.role === f.value).length})</span>}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === 'active' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Active ({users.length})
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
                  <td className="px-4 py-3 hidden sm:table-cell">{roleBadge(d.role)}</td>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
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
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                    {u.supplier_profile?.business_name || u.owner_profile?.restaurant_name || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${u.is_banned ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.is_banned ? 'Banned' : 'Active'}
                      </span>
                      {u.role === 'supplier' && u.supplier_profile && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${u.supplier_profile.is_active ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                          {u.supplier_profile.is_active ? 'Listed' : 'Unlisted'}
                        </span>
                      )}
                      {u.role === 'restaurant_owner' && u.owner_profile && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${u.owner_profile.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                          {u.owner_profile.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewTarget(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="View profile">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (u.role === 'supplier' && u.supplier_profile?.id) {
                            navigate(`/supplier/${u.supplier_profile.id}`)
                          }
                        }}
                        className={`p-1.5 rounded-lg text-emerald-400 ${u.role === 'supplier' && u.supplier_profile?.id ? 'hover:bg-emerald-50 cursor-pointer' : 'opacity-30 cursor-default'}`}
                        title="Open public profile"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setNotifyTarget(u); setNotifyTitle(''); setNotifyMsg('') }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400" title="Send notification">
                        <Send className="w-4 h-4" />
                      </button>
                      {u.role === 'supplier' && u.supplier_profile && (
                        <button
                          onClick={() => toggleSupplierActive(u)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                          title={u.supplier_profile.is_active ? 'Deactivate listing' : 'Activate listing'}
                        >
                          {u.supplier_profile.is_active
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      )}
                      {u.role === 'restaurant_owner' && u.owner_profile && (
                        <button
                          onClick={() => u.owner_profile.is_active !== false ? setOwnerToggleTarget(u) : toggleOwnerActive(u)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                          title={u.owner_profile.is_active !== false ? 'Deactivate owner' : 'Activate owner'}
                        >
                          {u.owner_profile.is_active !== false
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => setResetTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-400"
                          title="Send password reset email"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => u.is_banned ? toggleBan(u) : setBanTarget(u)}
                        className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'text-green-500 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`}
                        title={u.is_banned ? 'Unban' : 'Ban'}
                      >
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

      {/* View Profile Modal */}
      {viewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {viewTarget.role === 'supplier' ? 'Supplier' : viewTarget.role === 'restaurant_owner' ? 'Restaurant Owner' : 'Admin'} Profile
              </h2>
              <button onClick={() => setViewTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Avatar + name */}
            <div className="p-5 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {viewTarget.avatar_url || viewTarget.supplier_profile?.avatar_url ? (
                    <img src={viewTarget.avatar_url || viewTarget.supplier_profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-slate-500">{(viewTarget.full_name || viewTarget.email || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{viewTarget.full_name || '—'}</p>
                  <p className="text-sm text-gray-500">{viewTarget.email}</p>
                  <div className="flex gap-2 mt-1">{roleBadge(viewTarget.role)}</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-2 text-sm">
              {/* Common fields */}
              {[
                ['Phone', viewTarget.phone],
                ['Status', viewTarget.is_banned ? 'Banned' : 'Active'],
                ['Joined', viewTarget.created_at ? format(new Date(viewTarget.created_at), 'dd MMM yyyy') : '—'],
              ].map(([label, val]) => val && (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val}</span>
                </div>
              ))}

              {/* Supplier-specific */}
              {viewTarget.role === 'supplier' && viewTarget.supplier_profile && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Supplier Info</p>
                  {[
                    ['Business', viewTarget.supplier_profile.business_name],
                    ['City', viewTarget.supplier_profile.city],
                    ['Phone', viewTarget.supplier_profile.phone || viewTarget.phone],
                    ['Category', Array.isArray(viewTarget.supplier_profile.category) ? viewTarget.supplier_profile.category.join(', ') : viewTarget.supplier_profile.category],
                    ['Rating', viewTarget.supplier_profile.rating != null ? `${Number(viewTarget.supplier_profile.rating).toFixed(1)} ★` : '—'],
                    ['Verified', viewTarget.supplier_profile.is_verified ? 'Yes' : 'No'],
                    ['Listed', viewTarget.supplier_profile.is_active ? 'Yes' : 'No'],
                    ['Website', viewTarget.supplier_profile.website],
                  ].map(([label, val]) => val && (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%]">{val}</span>
                    </div>
                  ))}
                  {viewTarget.supplier_profile.description && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">{viewTarget.supplier_profile.description}</div>
                  )}
                </>
              )}

              {/* Owner-specific */}
              {viewTarget.role === 'restaurant_owner' && viewTarget.owner_profile && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Restaurant Info</p>
                  {[
                    ['Restaurant', viewTarget.owner_profile.restaurant_name],
                    ['City', viewTarget.owner_profile.city],
                    ['Tax ID', viewTarget.owner_profile.tax_id],
                    ['Cuisine', Array.isArray(viewTarget.owner_profile.cuisine) ? viewTarget.owner_profile.cuisine.join(', ') : viewTarget.owner_profile.cuisine],
                    ['Website', viewTarget.owner_profile.website],
                  ].map(([label, val]) => val && (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%]">{val}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="p-5 space-y-2 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => { setViewTarget(null); setNotifyTarget(viewTarget); setNotifyTitle(''); setNotifyMsg('') }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
                {viewTarget.role === 'supplier' && viewTarget.supplier_profile?.id && (
                  <button
                    onClick={() => { setViewTarget(null); navigate(`/supplier/${viewTarget.supplier_profile.id}`) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    View Profile
                  </button>
                )}
              </div>
              {viewTarget.role !== 'admin' && (
                <button
                  onClick={() => { setViewTarget(null); setResetTarget(viewTarget) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50"
                >
                  <KeyRound className="w-4 h-4" /> Send Password Reset Email
                </button>
              )}
              {viewTarget.role === 'restaurant_owner' && viewTarget.owner_profile && (
                <button
                  onClick={() => {
                    setViewTarget(null)
                    viewTarget.owner_profile.is_active !== false ? setOwnerToggleTarget(viewTarget) : toggleOwnerActive(viewTarget)
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${
                    viewTarget.owner_profile.is_active !== false
                      ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {viewTarget.owner_profile.is_active !== false
                    ? <><ToggleLeft className="w-4 h-4" /> Deactivate Account</>
                    : <><ToggleRight className="w-4 h-4" /> Activate Account</>
                  }
                </button>
              )}
            </div>
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
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
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

      {/* Ban Confirmation Modal */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ban User</h2>
              <button onClick={() => setBanTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-orange-700 mb-1">This user will be banned and will receive a notification.</p>
              <p className="text-xs text-orange-500"><span className="font-bold">{banTarget.full_name || banTarget.email}</span> will no longer be able to use the platform.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setBanTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { toggleBan(banTarget); setBanTarget(null) }} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600">
                Yes, Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Deactivate Confirmation Modal */}
      {ownerToggleTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Deactivate Owner Account</h2>
              <button onClick={() => setOwnerToggleTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-orange-700 mb-1">This restaurant owner will be deactivated and notified.</p>
              <p className="text-xs text-orange-500"><span className="font-bold">{ownerToggleTarget.owner_profile?.restaurant_name || ownerToggleTarget.full_name || ownerToggleTarget.email}</span> will see a banner saying their account is deactivated.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOwnerToggleTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => { toggleOwnerActive(ownerToggleTarget); setOwnerToggleTarget(null) }}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Send Password Reset</h2>
              <button onClick={() => setResetTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-amber-800">An email will be sent to:</p>
              <p className="text-sm font-bold text-amber-900 mt-1">{resetTarget.email}</p>
              <p className="text-xs text-amber-700 mt-2">The user will receive a secure link to set a new password. The link expires in 1 hour.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => sendPasswordReset(resetTarget)}
                disabled={sendingReset}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {sendingReset ? 'Sending...' : 'Send Reset Email'}
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
              <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Notification title" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder="Write your message..." rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <button onClick={sendNotification} disabled={sending} className="mt-4 w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
