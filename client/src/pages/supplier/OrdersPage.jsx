import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Eye, CheckCircle, Truck, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TABS = ['pending_payment', 'pending_confirmation', 'confirmed', 'shipped', 'delivered', 'cancelled']
const TAB_LABELS = {
  pending_payment: 'Awaiting Payment',
  pending_confirmation: 'New Orders',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function CancelModal({ split, onCancel, onClose }) {
  const [reason, setReason] = useState('')
  const [refundChecked, setRefundChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const needsRefund = split.payment_method === 'bank_transfer' && split.receipt_url

  async function handleCancel() {
    if (!reason.trim()) return toast.error('Please provide a cancellation reason')
    if (needsRefund && !refundChecked) return toast.error('Please confirm the refund')
    setLoading(true)
    await onCancel(split.id, reason)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-gray-900">Cancel Order</h3>
        </div>
        {needsRefund && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">⚠️ This order was paid via bank transfer.</p>
            <p className="text-xs text-amber-700 mt-1">You must return the payment to the restaurant owner before cancelling.</p>
          </div>
        )}
        <div className="mb-4">
          <label className="label">Cancellation Reason *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} className="input h-20 resize-none" placeholder="Out of stock, delivery not possible, etc." />
        </div>
        {needsRefund && (
          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={refundChecked} onChange={e => setRefundChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary" />
            <span className="text-sm text-gray-700">I confirm that I have refunded the payment to the restaurant owner.</span>
          </label>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Keep Order</button>
          <button onClick={handleCancel} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
            <XCircle className="w-4 h-4" /> Cancel Order
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupplierOrdersPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [splits, setSplits] = useState([])
  const [activeTab, setActiveTab] = useState('pending_confirmation')
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) loadOrders(sp.id)
  }

  async function loadOrders(supplierId) {
    const { data } = await supabase
      .from('order_splits')
      .select(`
        *,
        order:orders(created_at, restaurant_owner_id, owner:users(full_name)),
        order_items(*, product:products(name, unit_type))
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
    setSplits(data || [])
    setLoading(false)
  }

  async function updateStatus(splitId, status) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status } : s))
      toast.success(`Order ${status.replace('_', ' ')}`)
    }
  }

  async function cancelOrder(splitId, reason) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancellationReason: reason }),
    })
    if (res.ok) {
      setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status: 'cancelled', cancellation_reason: reason } : s))
      toast.success('Order cancelled')
      setCancelTarget(null)
    }
  }

  const filtered = splits.filter(s => s.status === activeTab)

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-6"><SkeletonTable rows={4} /></div>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 mb-5">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-5 bg-gray-100 p-1 rounded-xl w-fit max-w-full">
        {TABS.map(tab => {
          const count = splits.filter(s => s.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {TAB_LABELS[tab]}
              {count > 0 && <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-gray-500 text-sm">No {TAB_LABELS[activeTab].toLowerCase()} orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(split => (
            <div key={split.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">Order #{split.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-gray-900">{split.order?.owner?.full_name || 'Restaurant Owner'}</p>
                  <p className="text-xs text-gray-400">{format(new Date(split.order?.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <Badge status={split.status} />
                  <p className="text-lg font-black text-gray-900 mt-1">€{Number(split.subtotal).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{split.payment_method === 'cash_on_delivery' ? '💵 COD' : '🏦 Bank Transfer'}</p>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                {split.order_items?.map(item => (
                  <p key={item.id} className="text-xs text-gray-600">
                    {item.quantity}× {item.product?.name} ({item.unit_type}) — €{(item.price_at_time * item.quantity).toFixed(2)}
                  </p>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {split.status === 'pending_confirmation' && (
                  <>
                    <button onClick={() => updateStatus(split.id, 'confirmed')} className="flex items-center gap-1.5 text-xs btn-primary py-2 px-3">
                      <CheckCircle className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button onClick={() => setCancelTarget(split)} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {split.status === 'confirmed' && (
                  <>
                    <button onClick={() => updateStatus(split.id, 'shipped')} className="flex items-center gap-1.5 text-xs btn-primary py-2 px-3">
                      <Truck className="w-3.5 h-3.5" /> Mark Shipped
                    </button>
                    <button onClick={() => setCancelTarget(split)} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {split.cancellation_reason && (
                  <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 w-full">Reason: {split.cancellation_reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <CancelModal
          split={cancelTarget}
          onCancel={cancelOrder}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
