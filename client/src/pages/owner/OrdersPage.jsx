import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateInvoice } from '../../lib/invoiceGenerator'
import StatusBadge from '../../components/ui/StatusBadge'
import { Download, Package, ChevronRight, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'shipped']
const COMPLETED = ['delivered', 'cancelled']

export default function OrdersPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('ongoing')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_splits(
          *,
          supplier:supplier_profiles(business_name),
          order_items(*, product:products(name, unit_type))
        )
      `)
      .eq('restaurant_owner_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function markDelivered(splitId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'delivered' }),
    })
    toast.success('Order marked as delivered!')
    fetchOrders()
  }

  async function cancelOrder(splitId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/orders/splits/${splitId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled', cancellation_reason: 'Cancelled by restaurant owner' }),
    })
    toast.success('Order cancelled')
    fetchOrders()
  }

  const allSplits = orders.flatMap(order =>
    (order.order_splits || []).map(split => ({ ...split, order }))
  )
  const ongoingSplits = allSplits.filter(s => ONGOING.includes(s.status))
  const completedSplits = allSplits.filter(s => COMPLETED.includes(s.status))
  const displayed = tab === 'ongoing' ? ongoingSplits : completedSplits

  if (selectedOrder) {
    return <OrderDetailView split={selectedOrder} profile={profile} onBack={() => setSelectedOrder(null)} onMarkDelivered={markDelivered} onCancel={cancelOrder} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'ongoing', label: 'Ongoing Orders', count: ongoingSplits.length },
          { id: 'completed', label: 'Completed Orders', count: completedSplits.length },
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 h-28 animate-pulse" />
          ))}
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
                    <span className="font-bold text-lg text-slate-900">#{split.order.id.slice(0, 8).toUpperCase()}</span>
                    <StatusBadge status={split.status} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{split.supplier?.business_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-slate-900">€{Number(split.subtotal).toFixed(2)}</span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedOrder(split)}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                    {split.status === 'shipped' && (
                      <button
                        onClick={() => markDelivered(split.id)}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {split.status === 'pending_confirmation' && (
                      <button
                        onClick={() => cancelOrder(split.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderDetailView({ split, profile, onBack, onMarkDelivered, onCancel }) {
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
            <p className="font-bold text-slate-900">#{split.order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Date</p>
            <p className="font-semibold text-slate-900">{format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Supplier</p>
            <p className="font-semibold text-slate-900">{split.supplier?.business_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Payment</p>
            <p className="font-semibold text-slate-900 capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">Items Ordered</p>
          <div className="bg-slate-50 p-4 rounded-xl space-y-2">
            {split.order_items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.quantity}x {item.product?.name}</span>
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

      {split.cancellation_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">Order Cancelled</p>
          <p>{split.cancellation_reason}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => generateInvoice(split.order, [split], profile)}
          className="flex items-center gap-2 px-4 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Download Invoice
        </button>
        {split.status === 'shipped' && (
          <button
            onClick={() => { onMarkDelivered(split.id); onBack() }}
            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
          >
            Mark as Delivered
          </button>
        )}
        {split.status === 'pending_confirmation' && (
          <button
            onClick={() => { onCancel(split.id); onBack() }}
            className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  )
}
