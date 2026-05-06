import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import { Package, CheckCircle, Truck, XCircle, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'shipped']
const COMPLETED = ['delivered', 'cancelled']

function CancelModal({ split, onCancel, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!reason.trim()) return toast.error('Please provide a cancellation reason')
    setLoading(true)
    await onCancel(split.id, reason)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-slate-900 text-lg">Cancel Order</h3>
        </div>
        {split.payment_method === 'bank_transfer' && split.receipt_url && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">This order was paid via bank transfer.</p>
            <p className="text-xs text-amber-700 mt-1">You must return the payment to the restaurant owner.</p>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cancellation Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
            placeholder="Out of stock, delivery not possible, etc."
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> Cancel Order
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderDetailView({ split, onBack, onUpdateStatus, onCancel }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Order Details</h2>
        <StatusBadge status={split.status} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Order ID</p>
            <p className="font-bold text-slate-900">#{split.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Date</p>
            <p className="font-semibold text-slate-900">{format(new Date(split.order?.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Restaurant</p>
            <p className="font-semibold text-slate-900">{split.order?.owner?.full_name || 'Restaurant Owner'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Payment</p>
            <p className="font-semibold text-slate-900 capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">Items</p>
          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            {split.order_items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.quantity}× {item.product?.name}</span>
                <span className="font-semibold text-slate-900">€{(item.price_at_time * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <span className="text-xl font-bold text-slate-900">Total</span>
          <span className="text-2xl font-bold text-emerald-600">€{Number(split.subtotal).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex gap-3">
        {split.status === 'pending_confirmation' && (
          <>
            <button onClick={() => { onUpdateStatus(split.id, 'confirmed'); onBack() }} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Confirm Order
            </button>
            <button onClick={() => onCancel(split)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              Cancel
            </button>
          </>
        )}
        {split.status === 'confirmed' && (
          <>
            <button onClick={() => { onUpdateStatus(split.id, 'shipped'); onBack() }} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" /> Mark as Shipped
            </button>
            <button onClick={() => onCancel(split)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SupplierOrdersPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [splits, setSplits] = useState([])
  const [tab, setTab] = useState('ongoing')
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [selectedSplit, setSelectedSplit] = useState(null)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) loadOrders(sp.id)
  }

  async function loadOrders(supplierId) {
    setLoading(true)
    const { data } = await supabase
      .from('order_splits')
      .select(`*, order:orders(created_at, restaurant_owner_id, owner:users(full_name)), order_items(*, product:products(name, unit_type))`)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
    setSplits(data || [])
    setLoading(false)
  }

  async function updateStatus(splitId, status) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status } : s))
      toast.success(status === 'confirmed' ? 'Order confirmed!' : 'Order marked as shipped!')
    }
  }

  async function cancelOrder(splitId, reason) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancellationReason: reason }),
    })
    if (res.ok) {
      setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status: 'cancelled', cancellation_reason: reason } : s))
      toast.success('Order cancelled')
      setCancelTarget(null)
      if (selectedSplit?.id === splitId) setSelectedSplit(null)
    }
  }

  const ongoing = splits.filter(s => ONGOING.includes(s.status))
  const completed = splits.filter(s => COMPLETED.includes(s.status))
  const displayed = tab === 'ongoing' ? ongoing : completed

  if (selectedSplit) {
    return (
      <>
        <OrderDetailView
          split={selectedSplit}
          onBack={() => setSelectedSplit(null)}
          onUpdateStatus={updateStatus}
          onCancel={s => setCancelTarget(s)}
        />
        {cancelTarget && (
          <CancelModal split={cancelTarget} onCancel={cancelOrder} onClose={() => setCancelTarget(null)} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'ongoing', label: 'Ongoing Orders', count: ongoing.length },
          { id: 'completed', label: 'Completed Orders', count: completed.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2 px-1 text-sm font-bold transition-colors flex items-center gap-1.5 ${tab === t.id ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-100 h-28 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No {tab} orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(split => (
            <div key={split.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-slate-900">#{split.id.slice(0, 8).toUpperCase()}</span>
                    <StatusBadge status={split.status} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{split.order?.owner?.full_name || 'Restaurant Owner'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.order?.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  {split.cancellation_reason && (
                    <p className="text-xs text-red-500 mt-1 bg-red-50 px-2 py-1 rounded-lg">Reason: {split.cancellation_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-slate-900">€{Number(split.subtotal).toFixed(2)}</span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedSplit(split)}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                    {split.status === 'pending_confirmation' && (
                      <button
                        onClick={() => updateStatus(split.id, 'confirmed')}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 justify-center"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm
                      </button>
                    )}
                    {split.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(split.id, 'shipped')}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 justify-center"
                      >
                        <Truck className="w-3.5 h-3.5" /> Mark Shipped
                      </button>
                    )}
                    {(split.status === 'pending_confirmation' || split.status === 'confirmed') && (
                      <button
                        onClick={() => setCancelTarget(split)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <CancelModal split={cancelTarget} onCancel={cancelOrder} onClose={() => setCancelTarget(null)} />
      )}
    </div>
  )
}
