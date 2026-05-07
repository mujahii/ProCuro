import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import { Package, CheckCircle, Truck, XCircle, AlertTriangle, ChevronRight, ArrowLeft, Upload, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { formatIBAN } from '../../lib/formatIBAN'

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery']
const COMPLETED = ['delivered', 'cancelled', 'refund_uploaded', 'completed']

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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  )
}

function RefundSection({ split, supplierId, onUploaded }) {
  const [ownerBank, setOwnerBank] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (split.order?.restaurant_owner_id) {
      supabase
        .from('owner_bank_details')
        .select('*')
        .eq('owner_id', split.order.restaurant_owner_id)
        .maybeSingle()
        .then(({ data }) => setOwnerBank(data))
    }
  }, [split.order?.restaurant_owner_id])

  async function handleUpload() {
    if (!file) return toast.error('Please select a receipt file')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `refunds/${supplierId}/${Date.now()}-${split.id}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { error: rpcError } = await supabase.rpc('update_order_split_status', {
        p_split_id: split.id,
        p_status: 'refund_uploaded',
        p_refund_receipt_url: uploadData.path,
      })
      if (rpcError) throw rpcError
      toast.success('Refund receipt uploaded! Owner has been notified.')
      onUploaded()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (split.refund_receipt_url) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800">Refund receipt uploaded</p>
          <p className="text-xs text-emerald-700 mt-0.5">Waiting for the restaurant owner to confirm.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-amber-800">Bank Transfer Refund Required</p>
      <p className="text-xs text-amber-700">This order was paid via bank transfer. Please return the payment to the restaurant owner and upload your refund receipt.</p>
      {ownerBank ? (
        <div className="bg-white rounded-lg p-3 border border-amber-100 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Owner Bank Details</p>
          {ownerBank.bank_name && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Bank</p>
              <p className="text-sm text-slate-800 uppercase">{ownerBank.bank_name}</p>
            </div>
          )}
          {ownerBank.account_holder && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Account Holder</p>
              <p className="text-sm text-slate-800 uppercase">{ownerBank.account_holder}</p>
            </div>
          )}
          {ownerBank.iban && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">IBAN</p>
              <p className="text-sm text-slate-800 font-mono break-all">{formatIBAN(ownerBank.iban)}</p>
            </div>
          )}
          {ownerBank.bic && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">BIC</p>
              <p className="text-sm text-slate-800 font-mono uppercase">{ownerBank.bic}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-700 italic">Owner bank details not available — contact them directly.</p>
      )}
      <div className="space-y-2">
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-2.5 border-2 border-dashed border-amber-300 rounded-lg text-sm text-amber-800 font-medium hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {file ? file.name : 'Select Refund Receipt'}
        </button>
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload & Notify Owner
          </button>
        )}
      </div>
    </div>
  )
}

function OrderDetailView({ split, supplierId, onBack, onUpdateStatus, onCancel, onReload }) {
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
            <p className="font-semibold text-slate-900">{split.order?.created_at ? format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm') : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Restaurant</p>
            <p className="font-semibold text-slate-900">Restaurant Owner</p>
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

      {split.cancellation_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">Cancellation Reason</p>
          <p>{split.cancellation_reason}</p>
        </div>
      )}

      {split.status === 'cancelled' && split.payment_method === 'bank_transfer' && (
        <RefundSection split={split} supplierId={supplierId} onUploaded={() => { onReload(); onBack() }} />
      )}

      {split.status === 'refund_uploaded' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Refund receipt uploaded</p>
            <p className="text-xs text-emerald-700 mt-0.5">Waiting for the restaurant owner to confirm the refund.</p>
          </div>
        </div>
      )}

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
            <button onClick={() => { onUpdateStatus(split.id, 'out_for_delivery'); onBack() }} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" /> Mark Out for Delivery
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
    const { data, error } = await supabase
      .from('order_splits')
      .select(`*, order:orders(created_at, restaurant_owner_id), order_items(*, product:products(name, unit_type))`)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
    if (error) console.error('loadOrders error:', error)
    setSplits(data || [])
    setLoading(false)
  }

  async function updateStatus(splitId, status) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: status,
    })
    if (error) { toast.error(error.message); return }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status } : s))
    if (selectedSplit?.id === splitId) setSelectedSplit(prev => ({ ...prev, status }))
    const msgs = { confirmed: 'Order confirmed!', out_for_delivery: 'Marked as out for delivery!' }
    toast.success(msgs[status] || 'Status updated')
  }

  async function cancelOrder(splitId, reason) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'cancelled',
      p_cancellation_reason: reason,
    })
    if (error) { toast.error(error.message); return }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status: 'cancelled', cancellation_reason: reason } : s))
    toast.success('Order cancelled')
    setCancelTarget(null)
    if (selectedSplit?.id === splitId) setSelectedSplit(null)
  }

  const ongoing = splits.filter(s => ONGOING.includes(s.status))
  const completed = splits.filter(s => COMPLETED.includes(s.status))
  const displayed = tab === 'ongoing' ? ongoing : completed

  if (selectedSplit) {
    return (
      <>
        <OrderDetailView
          split={selectedSplit}
          supplierId={supplierProfile?.id}
          onBack={() => setSelectedSplit(null)}
          onUpdateStatus={updateStatus}
          onCancel={s => setCancelTarget(s)}
          onReload={() => supplierProfile && loadOrders(supplierProfile.id)}
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
                  <p className="text-sm text-slate-600 font-medium">Restaurant Owner</p>
                  <p className="text-xs text-slate-400 mt-0.5">{split.order?.created_at ? format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm') : '—'}</p>
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
                        onClick={() => updateStatus(split.id, 'out_for_delivery')}
                        className="px-3 py-1.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 justify-center"
                      >
                        <Truck className="w-3.5 h-3.5" /> Out for Delivery
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
