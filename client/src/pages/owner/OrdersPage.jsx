import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateInvoice } from '../../lib/invoiceGenerator'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Download, CheckCircle, Package, Truck, Clock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const statusSteps = ['pending_confirmation', 'confirmed', 'shipped', 'delivered']

function StatusTimeline({ status }) {
  const steps = [
    { key: 'pending_confirmation', label: 'Confirmed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Package },
  ]
  const currentIdx = statusSteps.indexOf(status)

  if (status === 'cancelled') {
    return <Badge status="cancelled" />
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((step, idx) => {
        const Icon = step.icon
        const isActive = idx <= currentIdx
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex flex-col items-center ${idx > 0 ? 'ml-1' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                <Icon className="w-3 h-3" />
              </div>
              <span className={`text-xs mt-0.5 hidden sm:block ${isActive ? 'text-primary font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-6 mx-1 ${idx < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OrdersPage() {
  const { user, profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  async function fetchOrders() {
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
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'delivered' }),
    })
    toast.success('Order marked as delivered!')
    fetchOrders()
  }

  if (loading) return <div className="px-4 sm:px-6 lg:px-8 py-6"><SkeletonTable rows={4} /></div>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 font-medium">No orders yet</p>
          <button onClick={() => window.location.href = '/owner/store'} className="btn-primary mt-4">Start Shopping</button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-gray-600">{format(new Date(order.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">€{Number(order.total_amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{order.order_splits?.length} supplier{order.order_splits?.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="space-y-4">
                {order.order_splits?.map(split => (
                  <div key={split.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm text-gray-900">{split.supplier?.business_name}</p>
                      <Badge status={split.status} />
                    </div>

                    <StatusTimeline status={split.status} />

                    <div className="mt-3 space-y-1">
                      {split.order_items?.map(item => (
                        <p key={item.id} className="text-xs text-gray-600">
                          {item.quantity}x {item.product?.name} — €{(item.price_at_time * item.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {split.payment_method === 'cash_on_delivery' ? '💵 Cash on Delivery' : '🏦 Bank Transfer'} · €{Number(split.subtotal).toFixed(2)}
                      </p>
                      <div className="flex gap-2">
                        {split.status === 'shipped' && (
                          <button
                            onClick={() => markDelivered(split.id)}
                            className="text-xs btn-primary py-1.5 px-3"
                          >
                            Mark Delivered
                          </button>
                        )}
                        <button
                          onClick={() => generateInvoice(order, [split], profile)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="w-3 h-3" /> Invoice
                        </button>
                      </div>
                    </div>

                    {split.cancellation_reason && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        Cancelled: {split.cancellation_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
