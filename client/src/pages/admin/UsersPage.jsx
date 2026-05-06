import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Search, Ban, Trash2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('*, supplier_profile:supplier_profiles(business_name, is_verified)')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function toggleBan(user) {
    const { error } = await supabase.from('users').update({ is_banned: !user.is_banned }).eq('id', user.id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: !user.is_banned } : u))
      toast.success(user.is_banned ? 'User unbanned' : 'User banned')
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('User deleted')
    } else {
      toast.error('Failed to delete user')
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Users</h1>
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

      {loading ? <SkeletonTable rows={6} /> : (
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
                    {u.supplier_profile?.business_name || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={u.is_banned ? 'cancelled' : 'active'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleBan(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'text-green-500 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`} title={u.is_banned ? 'Unban' : 'Ban'}>
                        {u.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      {u.role !== 'admin' && (
                        <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No users found</p>
          )}
        </div>
      )}
    </div>
  )
}
