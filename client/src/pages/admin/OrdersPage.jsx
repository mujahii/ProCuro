import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { format } from 'date-fns'

export default function AdminOrdersPage() {
  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from('order_splits')
      .select(`
        *,
        order:orders(created_at, restaurant_owner_id, owner:users(full_name, email)),
        supplier:supplier_profiles(business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)
    setSplits(data || [])
    setLoading(false)
  }

  const filtered = statusFilter ? splits.filter(s => s.status === statusFilter) : splits

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-black text-gray-900">All Orders</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm py-2 w-48">
          <option value="">All statuses</option>
          {['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancellation_requested', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <SkeletonTable rows={6} /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-lionsmane border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(split => (
                <tr key={split.id} className="hover:bg-lionsmane">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{split.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-900">{split.order?.owner?.full_name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">{split.supplier?.business_name || '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold">€{Number(split.subtotal).toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge status={split.status} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{format(new Date(split.created_at), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No orders found</p>}
        </div>
      )}
    </div>
  )
}
