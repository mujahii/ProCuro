import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateInvoice } from '../../lib/invoiceGenerator'
import StatusBadge from '../../components/ui/StatusBadge'
import { Download, Package, ChevronRight, ArrowLeft, CheckCircle, ExternalLink, XCircle, AlertTriangle, Loader2, Store, MapPin, Globe, X, ShoppingBag, Tag, ArrowUpRight } from 'lucide-react'
import ModalPortal from '../../components/ui/ModalPortal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

function ProductCardModal({ item, onClose }) {
  const img = getProductImageUrl(item.product?.image_url)
  const unitPrice = item.price_at_time
  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {img ? (
          <img src={img} alt={item.product?.name} className="w-full h-52 object-cover" />
        ) : (
          <div className="w-full h-52 bg-slate-100 flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <div className="p-5 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">{item.product?.name}</h3>
          {item.product?.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{item.product.description}</p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Unit Price</p>
              <p className="text-base font-bold text-slate-900">€{Number(unitPrice).toFixed(2)} / {item.product?.unit_type || 'unit'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Qty Ordered</p>
              <p className="text-base font-bold text-emerald-600">{item.quantity}×</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-500">Subtotal</p>
            <p className="text-lg font-bold text-slate-900">€{(unitPrice * item.quantity).toFixed(2)}</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'refund_uploaded', 'cancellation_requested', 'delivery_dispute']
const COMPLETED = ['delivered', 'completed', 'cancelled']
const CANCELLABLE = ['pending_payment', 'pending_confirmation', 'confirmed']

function CancelModal({ split, onCancel, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const isBankTransfer = split.payment_method === 'bank_transfer'

  async function handleSubmit() {
    if (!reason.trim()) return toast.error('Please provide a reason for cancellation')
    setLoading(true)
    await onCancel(split.id, reason.trim(), split.payment_method)
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-slate-900 text-lg">Cancel Order</h3>
        </div>

        {isBankTransfer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold text-amber-800">Bank transfer order</p>
            <p className="text-xs text-amber-700 mt-1">
              Your cancellation will be sent to the supplier for review. Once they agree, they will upload proof of the returned payment.
            </p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Reason for cancellation *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
            placeholder="e.g. Changed my mind, ordered by mistake, found another supplier..."
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 min-w-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{isBankTransfer ? 'Request Cancellation' : 'Cancel Order'}</span>
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

function RefundReceiptDisplay({ path }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!path) return
    supabase.storage
      .from('payment-receipts')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl || null))
  }, [path])

  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:underline"
    >
      <ExternalLink className="w-4 h-4" /> View Refund Receipt
    </a>
  )
}

function SupplierProfileModal({ supplierId, businessName, onClose }) {
  const navigate = useNavigate()
  const [sp, setSp] = useState(null)

  useEffect(() => {
    if (!supplierId) return
    supabase.from('supplier_profiles')
      .select('business_name, description, category, city, website, avatar_url, is_verified')
      .eq('id', supplierId)
      .single()
      .then(({ data }) => setSp(data))
  }, [supplierId])

  function avatarUrl(path) {
    if (!path) return null
    if (path.startsWith('http')) return path
    return supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl || null
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 px-6 py-10 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          {sp?.avatar_url ? (
            <img src={avatarUrl(sp.avatar_url)} alt={sp.business_name} className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-white/20 shadow-xl" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Store className="w-14 h-14 text-white" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-white">{sp?.business_name || businessName || 'Supplier'}</h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {sp?.category && <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full">{sp.category}</span>}
            {sp?.is_verified && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-3">
          {!sp && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
          {sp?.description && <p className="text-sm text-slate-600 leading-relaxed">{sp.description}</p>}
          {sp?.city && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm font-medium text-slate-700">{sp.city}</p>
            </div>
          )}
          {sp?.website && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <a href={sp.website.startsWith('http') ? sp.website : `https://${sp.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-emerald-600 font-medium hover:underline truncate">
                {sp.website}
              </a>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={() => { onClose(); navigate(`/supplier/${supplierId}`) }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" /> View Products & Certificates
          </button>
          <button onClick={onClose} className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

function OrderDetailView({ split, profile, onBack, onMarkDelivered, onMarkNotDelivered, onCancelRequest, onConfirmRefund }) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const canCancel = CANCELLABLE.includes(split.status)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Order Details</h2>
        <StatusBadge status={split.status} />
      </div>

      {/* Cancellation requested banner */}
      {split.status === 'cancellation_requested' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-bold text-orange-800">Cancellation Pending</p>
          <p className="text-xs text-orange-700 mt-1">Your cancellation request has been sent to the supplier. They will review and process the refund.</p>
          {split.cancellation_reason && (
            <p className="text-xs text-orange-600 mt-2 italic">"{split.cancellation_reason}"</p>
          )}
        </div>
      )}

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
            <button
              onClick={() => setShowSupplierModal(true)}
              className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors text-left underline-offset-2 hover:underline"
            >
              {split.supplier?.business_name}
            </button>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Payment</p>
            <p className="font-semibold text-slate-900 capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">Items Ordered</p>
          <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {split.order_items?.map(item => {
              const img = getProductImageUrl(item.product?.image_url)
              return (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                    {img ? (
                      <img src={img} alt={item.product?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedProduct(item)}
                      className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition-colors text-left underline-offset-2 hover:underline truncate block max-w-full"
                    >
                      {item.product?.name}
                    </button>
                    <p className="text-xs text-slate-400">{item.quantity}× · €{Number(item.price_at_time).toFixed(2)} each</p>
                  </div>
                  <span className="font-bold text-slate-900 text-sm flex-shrink-0">€{(item.price_at_time * item.quantity).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <span className="text-xl font-bold text-slate-900">Total</span>
          <span className="text-2xl font-bold text-emerald-600">€{Number(split.subtotal).toFixed(2)}</span>
        </div>
      </div>

      {split.cancellation_reason && (split.status === 'cancelled' || split.status === 'refund_uploaded') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">Order Cancelled</p>
          <p>{split.cancellation_reason}</p>
        </div>
      )}

      {split.status === 'refund_uploaded' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-amber-800">Refund Receipt Uploaded</p>
          <p className="text-xs text-amber-700">The supplier has uploaded proof of refund. Please verify and confirm below.</p>
          {split.refund_receipt_url && <RefundReceiptDisplay path={split.refund_receipt_url} />}
          <button
            onClick={() => { onConfirmRefund(split.id); onBack() }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <CheckCircle className="w-4 h-4" /> Confirm Refund Received
          </button>
        </div>
      )}

      {split.status === 'delivery_dispute' && split.dispute_message && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Supplier Response
          </p>
          <p className="text-sm text-orange-700 italic">"{split.dispute_message}"</p>
          <p className="text-xs text-orange-500">The supplier is reviewing your dispute and will re-send or cancel the order.</p>
        </div>
      )}

      {split.status === 'delivery_dispute' && !split.dispute_message && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-bold text-orange-800">Dispute Pending</p>
          <p className="text-xs text-orange-700 mt-1">Your report has been sent to the supplier. They will respond shortly.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => generateInvoice(split.order, [split], profile)}
          className="flex items-center gap-2 px-4 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Download Invoice
        </button>
        {split.status === 'out_for_delivery' && (
          <button
            onClick={() => { onMarkDelivered(split.id); onBack() }}
            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
          >
            Mark as Delivered
          </button>
        )}
        {split.status === 'out_for_delivery' && (
          <button
            onClick={() => { onMarkNotDelivered(split.id); onBack() }}
            className="flex-1 py-3 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 transition-colors border border-orange-200"
          >
            I Didn't Receive It
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            Cancel Order
          </button>
        )}
      </div>

      {showCancelModal && (
        <CancelModal
          split={split}
          onCancel={async (id, reason, paymentMethod) => {
            await onCancelRequest(id, reason, paymentMethod)
            setShowCancelModal(false)
            onBack()
          }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {showSupplierModal && (
        <SupplierProfileModal
          supplierId={split.supplier_id}
          businessName={split.supplier?.business_name}
          onClose={() => setShowSupplierModal(false)}
        />
      )}

      {selectedProduct && (
        <ProductCardModal item={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('ongoing')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

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
          order_items(*, product:products(name, unit_type, image_url, description))
        )
      `)
      .eq('restaurant_owner_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function markDelivered(splitId) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'delivered',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Order marked as delivered!')
    fetchOrders()
  }

  async function markNotDelivered(splitId) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'delivery_dispute',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Report sent to supplier. They will respond shortly.')
    fetchOrders()
  }

  async function cancelOrder(splitId, reason, paymentMethod) {
    const newStatus = paymentMethod === 'bank_transfer' ? 'cancellation_requested' : 'cancelled'
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: newStatus,
      p_cancellation_reason: reason,
    })
    if (error) { toast.error(error.message); return }
    if (newStatus === 'cancellation_requested') {
      toast.success('Cancellation request sent to supplier.')
    } else {
      toast.success('Order cancelled.')
    }
    fetchOrders()
    setCancelTarget(null)
  }

  async function confirmRefund(splitId) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'completed',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Refund confirmed! Order completed.')
    fetchOrders()
  }

  const allSplits = orders.flatMap(order =>
    (order.order_splits || []).map(split => ({ ...split, order }))
  )
  const ongoingSplits = allSplits.filter(s => ONGOING.includes(s.status))
  const completedSplits = allSplits.filter(s => COMPLETED.includes(s.status))
  const displayed = tab === 'ongoing' ? ongoingSplits : completedSplits

  if (selectedOrder) {
    return (
      <OrderDetailView
        split={selectedOrder}
        profile={profile}
        onBack={() => { setSelectedOrder(null); fetchOrders() }}
        onMarkDelivered={markDelivered}
        onMarkNotDelivered={markNotDelivered}
        onCancelRequest={cancelOrder}
        onConfirmRefund={confirmRefund}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>

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
            <div key={split.id} onClick={() => setSelectedOrder(split)} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-slate-900">#{split.order.id.slice(0, 8).toUpperCase()}</span>
                    <StatusBadge status={split.status} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{split.supplier?.business_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  {split.cancellation_reason && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded-lg">
                      {split.status === 'cancellation_requested' ? 'Pending: ' : 'Reason: '}
                      {split.cancellation_reason}
                    </p>
                  )}
                  {split.status === 'delivery_dispute' && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {split.dispute_message ? `Supplier: ${split.dispute_message}` : 'Delivery dispute — awaiting supplier response'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <span className="text-xl font-bold text-slate-900">€{Number(split.subtotal).toFixed(2)}</span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedOrder(split)}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </button>
                    {split.status === 'out_for_delivery' && (
                      <button
                        onClick={() => markDelivered(split.id)}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {split.status === 'refund_uploaded' && (
                      <button
                        onClick={() => confirmRefund(split.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 justify-center"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm Refund
                      </button>
                    )}
                    {CANCELLABLE.includes(split.status) && (
                      <button
                        onClick={() => setCancelTarget(split)}
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
