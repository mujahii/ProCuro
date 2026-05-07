import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import { Package, CheckCircle, Truck, XCircle, AlertTriangle, ChevronRight, ArrowLeft, Upload, Loader2, MapPin, Phone, Store, X, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { formatIBAN } from '../../lib/formatIBAN'

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'cancellation_requested']
const COMPLETED = ['delivered', 'cancelled', 'refund_uploaded', 'completed']

function CancelModal({ split, onCancel, onClose }) {
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const isBankTransfer = split.payment_method === 'bank_transfer'

  async function handleCancel() {
    if (!reason.trim()) return toast.error('Please provide a cancellation reason')
    if (isBankTransfer && !file) return toast.error('Please upload a refund receipt before cancelling a bank transfer order')
    setLoading(true)
    await onCancel(split.id, reason.trim(), isBankTransfer ? file : null)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-slate-900 text-lg">Cancel Order</h3>
        </div>

        {isBankTransfer && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold text-amber-800">Bank transfer order</p>
            <p className="text-xs text-amber-700 mt-1">You must upload proof of the returned payment before this cancellation can be submitted.</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cancellation Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
            placeholder="Out of stock, delivery not possible, etc."
            autoFocus
          />
        </div>

        {isBankTransfer && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Refund Receipt *</label>
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`w-full py-3 border-2 border-dashed rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                file ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-700'
              }`}
            >
              {file ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {file ? file.name : 'Upload refund proof (image or PDF)'}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors">
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim() || (isBankTransfer && !file)}
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
    if (split.restaurant_owner_id) {
      supabase
        .from('owner_bank_details')
        .select('*')
        .eq('owner_id', split.restaurant_owner_id)
        .maybeSingle()
        .then(({ data }) => setOwnerBank(data))
    }
  }, [split.restaurant_owner_id])

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
      <p className="text-xs text-amber-700">Please return the payment to the restaurant owner and upload your refund receipt.</p>
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

function PaymentReceiptDisplay({ path }) {
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
      className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:underline"
    >
      <ExternalLink className="w-4 h-4" /> View Payment Receipt
    </a>
  )
}

function OwnerProfileModal({ ownerInfo, deliveryAddress, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 px-6 py-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {ownerInfo?.restaurant_name || ownerInfo?.full_name || 'Restaurant'}
          </h2>
          {ownerInfo?.restaurant_name && ownerInfo?.full_name && (
            <p className="text-emerald-100 text-sm mt-1">{ownerInfo.full_name}</p>
          )}
        </div>

        <div className="p-5 space-y-3">
          {ownerInfo?.phone && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">Phone</p>
                <a href={`tel:${ownerInfo.phone}`} className="text-sm font-medium text-slate-800 hover:underline">
                  {ownerInfo.phone}
                </a>
              </div>
            </div>
          )}
          {deliveryAddress && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
                  Delivery Address{deliveryAddress.label ? ` · ${deliveryAddress.label}` : ''}
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {[
                    deliveryAddress.street,
                    [deliveryAddress.postal_code, deliveryAddress.city].filter(Boolean).join(' '),
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
          {!ownerInfo?.phone && !deliveryAddress && (
            <p className="text-sm text-slate-400 text-center py-2">No additional contact details available.</p>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderDetailView({ split, supplierId, onBack, onUpdateStatus, onCancel, onReload }) {
  const [ownerInfo, setOwnerInfo] = useState(null)
  const [ownerDefaultAddress, setOwnerDefaultAddress] = useState(null)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const deliveryAddress = split.delivery_address

  useEffect(() => {
    const ownerId = split.restaurant_owner_id
    if (!ownerId) return
    supabase.from('users').select('full_name, restaurant_name, phone').eq('id', ownerId).single()
      .then(({ data }) => setOwnerInfo(data))
    // Fallback: if this order has no stored delivery address, fetch owner's default address
    if (!deliveryAddress) {
      supabase.from('addresses').select('label, street, postal_code, city')
        .eq('user_id', ownerId).eq('is_default', true).maybeSingle()
        .then(({ data }) => setOwnerDefaultAddress(data))
    }
  }, [split.restaurant_owner_id])

  const displayAddress = deliveryAddress || ownerDefaultAddress

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Order Details</h2>
        <StatusBadge status={split.status} />
      </div>

      {/* Restaurant owner card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery To</p>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 space-y-1.5">
            <button
              onClick={() => setShowOwnerModal(true)}
              className="font-bold text-slate-900 text-base hover:text-emerald-600 transition-colors text-left underline-offset-2 hover:underline"
            >
              {ownerInfo?.restaurant_name || ownerInfo?.full_name || 'Restaurant Owner'}
            </button>
            {ownerInfo?.full_name && ownerInfo?.restaurant_name && (
              <p className="text-sm text-slate-500">{ownerInfo.full_name}</p>
            )}
            {ownerInfo?.phone && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${ownerInfo.phone}`} className="hover:underline">{ownerInfo.phone}</a>
              </div>
            )}
            {displayAddress ? (
              <div className="flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  {[displayAddress.street, [displayAddress.postal_code, displayAddress.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                  {displayAddress.label && <span className="text-xs text-slate-400 ml-1">({displayAddress.label})</span>}
                  {!deliveryAddress && ownerDefaultAddress && (
                    <span className="text-xs text-amber-500 ml-1">(registered address)</span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>No delivery address on file</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Order ID</p>
            <p className="font-bold text-slate-900">#{split.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Date Placed</p>
            <p className="font-semibold text-slate-900">{format(new Date(split.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Payment</p>
            <p className="font-semibold text-slate-900 capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
            {split.payment_method === 'bank_transfer' && split.receipt_url && (
              <div className="mt-1">
                <PaymentReceiptDisplay path={split.receipt_url} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
            <StatusBadge status={split.status} />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">Items Ordered</p>
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

      {/* Owner cancellation request */}
      {split.status === 'cancellation_requested' && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-800">Cancellation Requested by Owner</p>
              <p className="text-xs text-orange-700 mt-0.5">The restaurant owner wants to cancel this order.</p>
            </div>
          </div>
          {split.cancellation_reason && (
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-400 mb-1">Owner's Reason</p>
              <p className="text-sm text-slate-700 italic">"{split.cancellation_reason}"</p>
            </div>
          )}
          {split.payment_method === 'bank_transfer' ? (
            <p className="text-xs text-orange-700">Paid via bank transfer — upload the refund proof below to accept this cancellation.</p>
          ) : (
            <button
              onClick={() => { onUpdateStatus(split.id, 'cancelled'); onBack() }}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Accept Cancellation
            </button>
          )}
        </div>
      )}

      {split.cancellation_reason && split.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">Cancellation Reason</p>
          <p>{split.cancellation_reason}</p>
        </div>
      )}

      {/* Refund upload: shown for owner-initiated (cancellation_requested + bank_transfer)
          and as fallback for old cancelled bank transfer orders */}
      {(split.status === 'cancellation_requested' || split.status === 'cancelled') &&
        split.payment_method === 'bank_transfer' && !split.refund_receipt_url && (
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

      {showOwnerModal && (
        <OwnerProfileModal
          ownerInfo={ownerInfo}
          deliveryAddress={displayAddress}
          onClose={() => setShowOwnerModal(false)}
        />
      )}
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
      .select(`*, order_items(*, product:products(name, unit_type))`)
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
    const msgs = { confirmed: 'Order confirmed!', out_for_delivery: 'Marked as out for delivery!', cancelled: 'Cancellation accepted.' }
    toast.success(msgs[status] || 'Status updated')
  }

  async function cancelOrder(splitId, reason, refundFile = null) {
    let refundReceiptUrl = null

    if (refundFile) {
      const ext = refundFile.name.split('.').pop()
      const path = `refunds/${supplierProfile.id}/${Date.now()}-${splitId}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(path, refundFile)
      if (uploadError) { toast.error(uploadError.message); return }
      refundReceiptUrl = uploadData.path
    }

    // Bank transfer: go straight to refund_uploaded (receipt already uploaded)
    // COD: go to cancelled
    const newStatus = refundFile ? 'refund_uploaded' : 'cancelled'

    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: newStatus,
      p_cancellation_reason: reason,
      p_refund_receipt_url: refundReceiptUrl,
    })
    if (error) { toast.error(error.message); return }

    const patch = { status: newStatus, cancellation_reason: reason, refund_receipt_url: refundReceiptUrl }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, ...patch } : s))
    toast.success(refundFile ? 'Order cancelled — refund receipt sent to owner.' : 'Order cancelled.')
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
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  {split.status === 'cancellation_requested' && split.cancellation_reason && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Owner wants to cancel: {split.cancellation_reason}
                    </p>
                  )}
                  {split.status === 'cancelled' && split.cancellation_reason && (
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
