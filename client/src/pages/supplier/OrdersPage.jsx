import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import StatusBadge from '../../components/ui/StatusBadge'
import { Package, CheckCircle, Truck, XCircle, AlertTriangle, ChevronRight, ArrowLeft, Upload, Loader2, MapPin, Phone, ExternalLink, MessageSquare, Flag } from 'lucide-react'
import ModalPortal from '../../components/ui/ModalPortal'
import ReportModal from '../../components/ui/ReportModal'
import OwnerProfileModal from '../../components/profile/OwnerProfileModal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { formatIBAN } from '../../lib/formatIBAN'

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'cancellation_requested', 'delivery_dispute']
const COMPLETED = ['delivered', 'cancelled', 'refund_uploaded', 'completed']

function CancelModal({ split, onCancel, onClose }) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const isBankTransfer = split.payment_method === 'bank_transfer'

  async function handleCancel() {
    if (!reason.trim()) return toast.error(t('toastCancellationReasonReq'))
    if (isBankTransfer && !file) return toast.error(t('toastUploadRefundForBankTransfer'))
    setLoading(true)
    await onCancel(split.id, reason.trim(), isBankTransfer ? file : null)
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-slate-900 text-lg">{t('cancelOrderTitle')}</h3>
        </div>

        {isBankTransfer && (
          <div className="bg-lionsmane border border-marigold-light rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold text-marigold-dark">{t('bankTransferOrderLabel')}</p>
            <p className="text-xs text-marigold-dark mt-1">{t('bankTransferCancelNote')}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('reasonForCancellationLabel')}</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
            placeholder={t('cancelReasonPlaceholder')}
            autoFocus
          />
        </div>

        {isBankTransfer && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('refundReceipt')} *</label>
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`w-full py-3 border-2 border-dashed rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                file ? 'border-herb-light bg-lionsmane text-midnight-dark' : 'border-slate-300 text-slate-500 hover:border-marigold-light hover:text-marigold-dark'
              }`}
            >
              {file ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {file ? file.name : t('uploadRefundProof')}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-lionsmane transition-colors">
            {t('keepOrderBtn')}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim() || (isBankTransfer && !file)}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {t('cancelOrder')}
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

function RefundSection({ split, supplierId, onUploaded }) {
  const { t } = useLanguage()
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
    if (!file) return toast.error(t('toastSelectReceiptFile'))
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
      toast.success(t('toastRefundUploaded'))
      onUploaded()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (split.refund_receipt_url) {
    return (
      <div className="bg-lionsmane border border-celeste rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-herb flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-midnight">{t('refundReceiptUploadedMsg')}</p>
          <p className="text-xs text-midnight-dark mt-0.5">{t('waitingOwnerConfirmRefund')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-lionsmane border border-marigold-light rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-marigold-dark">{t('bankTransferRefundRequired')}</p>
      <p className="text-xs text-marigold-dark">Please return the payment to the restaurant owner and upload your refund receipt.</p>
      {ownerBank ? (
        <div className="bg-white rounded-lg p-3 border border-marigold-light space-y-2">
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
        <p className="text-xs text-marigold-dark italic">Owner bank details not available — contact them directly.</p>
      )}
      <div className="space-y-2">
        <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-2.5 border-2 border-dashed border-marigold-light rounded-lg text-sm text-marigold-dark font-medium hover:bg-marigold-light transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {file ? file.name : t('selectRefundReceipt')}
        </button>
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 bg-marigold hover:bg-marigold-dark text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t('uploadAndNotifyOwner')}
          </button>
        )}
      </div>
    </div>
  )
}

function PaymentReceiptDisplay({ path }) {
  const { t } = useLanguage()
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
      className="flex items-center gap-1.5 text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
    >
      <ExternalLink className="w-4 h-4" /> {t('viewPaymentReceipt')}
    </a>
  )
}

function DisputeResponseModal({ split, onResend, onCancel, onClose }) {
  const { t } = useLanguage()
  const [message, setMessage] = useState('')
  const [action, setAction] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const isBankTransfer = split.payment_method === 'bank_transfer'

  async function handleSubmit() {
    if (!message.trim()) return toast.error(t('toastWriteMessage'))
    if (action === 'cancel' && isBankTransfer && !file) return toast.error(t('toastUploadRefundForBankTransfer'))
    setLoading(true)
    if (action === 'resend') {
      await onResend(split.id, message.trim())
    } else {
      await onCancel(split.id, message.trim(), isBankTransfer ? file : null)
    }
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <h3 className="font-bold text-slate-900 text-lg">{t('respondToDisputeTitle')}</h3>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 space-y-1.5">
          <p className="text-sm font-semibold text-orange-800">{t('ownerReportedNonDelivery')}</p>
          {split.dispute_message ? (
            <>
              <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">{t('ownersMessageLabel')}</p>
              <p className="text-sm text-orange-700 italic">"{split.dispute_message}"</p>
            </>
          ) : (
            <p className="text-xs text-orange-600">No additional note from the owner. Write your response and choose a resolution below.</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Message *</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-400 h-24 resize-none"
            placeholder="Explain what happened (e.g. driver was at the address but no one answered...)"
            autoFocus
          />
        </div>
        {action === null && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('chooseResolution')}</p>
            <button
              onClick={() => setAction('resend')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-celeste bg-lionsmane hover:bg-celeste transition-colors text-left"
            >
              <Truck className="w-4 h-4 text-midnight flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-midnight">{t('resendOrder')}</p>
                <p className="text-xs text-midnight">Mark out for delivery again — owner will be notified</p>
              </div>
            </button>
            <button
              onClick={() => setAction('cancel')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left"
            >
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">{t('cancelOrder')}</p>
                <p className="text-xs text-red-500">{isBankTransfer ? 'You must upload a refund receipt' : 'Order will be cancelled and owner notified'}</p>
              </div>
            </button>
          </div>
        )}
        {action === 'cancel' && isBankTransfer && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('refundReceipt')} *</label>
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`w-full py-3 border-2 border-dashed rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                file ? 'border-herb-light bg-lionsmane text-midnight-dark' : 'border-slate-300 text-slate-500 hover:border-marigold-light'
              }`}
            >
              {file ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {file ? file.name : t('uploadRefundProof')}
            </button>
          </div>
        )}
        {action !== null ? (
          <div className="flex gap-3">
            <button onClick={() => { setAction(null); setFile(null) }} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-lionsmane transition-colors">
              {t('back')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !message.trim() || (action === 'cancel' && isBankTransfer && !file)}
              className={`flex-1 flex items-center justify-center gap-2 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 ${
                action === 'resend' ? 'bg-midnight hover:bg-midnight-dark' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : action === 'resend' ? <Truck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {action === 'resend' ? t('resendOrder') : t('cancelOrder')}
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-lionsmane transition-colors">
            {t('close')}
          </button>
        )}
      </div>
    </div></ModalPortal>
  )
}


function OrderDetailView({ split, supplierId, onBack, onUpdateStatus, onCancel, onReload, onDispute }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [ownerInfo, setOwnerInfo] = useState(null)
  const [ownerDefaultAddress, setOwnerDefaultAddress] = useState(null)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const deliveryAddress = split.delivery_address

  async function handleChatWithOwner() {
    const orderId = split.id.slice(0, 8).toUpperCase()
    const productNames = (split.order_items || []).map(i => i.product?.name).filter(Boolean).join(', ')
    const autoMsg = encodeURIComponent(`RE: Order #${orderId} — ${productNames} — Total €${Number(split.subtotal).toFixed(2)}`)
    navigate(`/supplier/chat?owner_id=${split.restaurant_owner_id}&order_ref=${split.id}&auto_message=${autoMsg}`)
  }

  useEffect(() => {
    const ownerId = split.restaurant_owner_id
    if (!ownerId) return
    Promise.all([
      supabase.from('users').select('full_name, phone, avatar_url').eq('id', ownerId).single(),
      supabase.from('owner_profiles').select('restaurant_name, bio, city').eq('user_id', ownerId).maybeSingle(),
    ]).then(([{ data: u }, { data: op }]) => {
      if (u) setOwnerInfo({ ...u, restaurant_name: op?.restaurant_name ?? null, bio: op?.bio ?? null, city: op?.city ?? null })
    })
    // Fallback: if this order has no stored delivery address, fetch owner's default address
    if (!deliveryAddress) {
      supabase.from('addresses').select('label, street, postal_code, city, latitude, longitude')
        .eq('user_id', ownerId).eq('is_default', true).maybeSingle()
        .then(({ data }) => setOwnerDefaultAddress(data))
    }
  }, [split.restaurant_owner_id])

  const displayAddress = deliveryAddress || ownerDefaultAddress

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('backToOrders')}
      </button>
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-bold text-slate-900">{t('orderDetailsTitle')}</h2>
        <StatusBadge status={split.status} />
      </div>

      {/* Restaurant owner card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('deliveryToLabel')}</p>
          <button
            onClick={handleChatWithOwner}
            className="flex items-center gap-1.5 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t('chatWithOwnerBtn')}
          </button>
        </div>
        <div className="flex items-start gap-3">
          <button onClick={() => setShowOwnerModal(true)} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-celeste flex items-center justify-center overflow-hidden border-2 border-celeste">
              {ownerInfo?.avatar_url ? (
                <img src={ownerInfo.avatar_url} alt="owner" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-midnight-dark">
                  {(ownerInfo?.restaurant_name || ownerInfo?.full_name || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
          </button>
          <div className="flex-1 space-y-1.5">
            <button
              onClick={() => setShowOwnerModal(true)}
              className="font-bold text-slate-900 text-base hover:text-midnight transition-colors text-left underline-offset-2 hover:underline"
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
              <a
                href={`https://maps.google.com/?q=${displayAddress.latitude ? `${displayAddress.latitude},${displayAddress.longitude}` : encodeURIComponent([displayAddress.street, displayAddress.city].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 text-sm text-midnight hover:text-midnight-dark hover:underline transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  {[displayAddress.street, [displayAddress.postal_code, displayAddress.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                  {displayAddress.label && <span className="text-xs text-slate-400 ml-1">({displayAddress.label})</span>}
                  {!deliveryAddress && ownerDefaultAddress && (
                    <span className="text-xs text-marigold ml-1">(registered address)</span>
                  )}
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t('noDeliveryAddress')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('orderIdLabel')}</p>
            <p className="font-bold text-slate-900">#{split.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('datePlacedLabel')}</p>
            <p className="font-semibold text-slate-900">{format(new Date(split.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('paymentMethod')}</p>
            <p className="font-semibold text-slate-900 capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
            {split.payment_method === 'bank_transfer' && split.receipt_url && (
              <div className="mt-1">
                <PaymentReceiptDisplay path={split.receipt_url} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('statusLabel')}</p>
            <StatusBadge status={split.status} />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">{t('itemsOrderedLabel')}</p>
          <div className="bg-lionsmane p-4 rounded-xl space-y-2">
            {split.order_items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{item.quantity}× {item.product?.name}</span>
                <span className="font-semibold text-slate-900">€{(item.price_at_time * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <span className="text-xl font-bold text-slate-900">{t('totalLabel')}</span>
          <span className="text-2xl font-bold text-midnight">€{Number(split.subtotal).toFixed(2)}</span>
        </div>
      </div>

      {/* Owner cancellation request */}
      {split.status === 'cancellation_requested' && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-800">{t('cancellationRequestedByOwner')}</p>
              <p className="text-xs text-orange-700 mt-0.5">{t('ownerWantsCancelNote')}</p>
            </div>
          </div>
          {split.cancellation_reason && (
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-400 mb-1">{t('ownersReasonLabel')}</p>
              <p className="text-sm text-slate-700 italic">"{split.cancellation_reason}"</p>
            </div>
          )}
          {split.payment_method === 'bank_transfer' ? (
            <p className="text-xs text-orange-700">{t('paidViaBankTransferCancelNote')}</p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { onUpdateStatus(split.id, 'cancelled'); onBack() }}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> {t('acceptBtn')}
              </button>
              <button
                onClick={() => { onUpdateStatus(split.id, 'confirmed'); onBack() }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> {t('rejectBtn')}
              </button>
            </div>
          )}
        </div>
      )}

      {split.status === 'cancelled' && (split.cancellation_reason || split.cancelled_by) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">
            {t('cancelledByLabel')} {split.cancelled_by === 'supplier' ? t('cancelledByYouText') : split.cancelled_by === 'owner' ? t('restaurantOwner') : split.cancelled_by === 'admin' ? 'ProCuro Admin' : 'Unknown'}
          </p>
          {split.cancellation_reason && <p className="text-red-500">{split.cancellation_reason}</p>}
        </div>
      )}

      {/* Refund upload: shown for owner-initiated (cancellation_requested + bank_transfer)
          and as fallback for old cancelled bank transfer orders */}
      {(split.status === 'cancellation_requested' || split.status === 'cancelled') &&
        split.payment_method === 'bank_transfer' && !split.refund_receipt_url && (
        <RefundSection split={split} supplierId={supplierId} onUploaded={() => { onReload(); onBack() }} />
      )}

      {split.status === 'refund_uploaded' && (
        <div className="bg-lionsmane border border-celeste rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-herb flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-midnight">{t('refundReceiptUploadedMsg')}</p>
            <p className="text-xs text-midnight-dark mt-0.5">{t('waitingOwnerConfirmRefund')}</p>
          </div>
        </div>
      )}

      {split.status === 'delivery_dispute' && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">{t('deliveryNotReceived')}</p>
              {split.dispute_message && (
                <p className="text-xs text-orange-700 mt-1 italic">Owner's note: "{split.dispute_message}"</p>
              )}
              {!split.dispute_message && (
                <p className="text-xs text-orange-700 mt-0.5">{t('ownerReportedNonDelivery')}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onDispute(split)}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> {t('respondToDisputeBtn')}
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {split.status === 'pending_payment' && !split.receipt_url && (
          <div className="flex-1 py-3 bg-lionsmane rounded-xl text-marigold-dark text-sm text-center font-medium border border-marigold-light">
            {t('waitingForOwnerReceipt')}
          </div>
        )}
        {(split.status === 'pending_confirmation' || (split.status === 'pending_payment' && split.receipt_url)) && (
          <>
            <button onClick={() => { onUpdateStatus(split.id, 'confirmed'); onBack() }} className="flex-1 py-3 bg-midnight text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> {t('confirmOrderBtn')}
            </button>
            <button onClick={() => onCancel(split)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              {t('cancel')}
            </button>
          </>
        )}
        {split.status === 'confirmed' && (
          <>
            <button onClick={() => { onUpdateStatus(split.id, 'out_for_delivery'); onBack() }} className="flex-1 py-3 bg-midnight text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" /> {t('outForDeliveryBtn')}
            </button>
            <button onClick={() => onCancel(split)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              {t('cancel')}
            </button>
          </>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-medium"
        >
          <Flag className="w-4 h-4" /> {t('reportThisOrder')}
        </button>
      </div>

      {showOwnerModal && (
        <OwnerProfileModal
          ownerInfo={ownerInfo}
          ownerId={split.restaurant_owner_id}
          deliveryAddress={displayAddress}
          onClose={() => setShowOwnerModal(false)}
        />
      )}
      {showReportModal && (
        <ReportModal
          type="order"
          targetId={split.id}
          targetName={`Order #${split.id.slice(0, 8).toUpperCase()}`}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  )
}

export default function SupplierOrdersPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [splits, setSplits] = useState([])
  const [tab, setTab] = useState('ongoing')
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [selectedSplit, setSelectedSplit] = useState(null)
  const [disputeTarget, setDisputeTarget] = useState(null)

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
    setSelectedSplit(prev => prev?.id === splitId ? { ...prev, status } : prev)
    const msgs = { confirmed: t('toastOrderConfirmed'), out_for_delivery: t('toastMarkedOutForDelivery'), cancelled: t('toastCancellationAccepted') }
    toast.success(msgs[status] || t('toastStatusUpdated'))
  }

  async function resendOrder(splitId, disputeMsg) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'out_for_delivery',
      p_dispute_message: disputeMsg,
    })
    if (error) { toast.error(error.message); return }
    const split = splits.find(s => s.id === splitId)
    if (split?.restaurant_owner_id) {
      await supabase.from('notifications').insert({
        user_id: split.restaurant_owner_id,
        title: 'Order Re-dispatched',
        message: `Supplier responded to your dispute: "${disputeMsg}". Your order is out for delivery again.`,
        type: 'info',
        link: '/owner/orders',
      })
    }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, status: 'out_for_delivery', dispute_message: disputeMsg } : s))
    setSelectedSplit(prev => prev?.id === splitId ? { ...prev, status: 'out_for_delivery' } : prev)
    toast.success(t('toastOrderReSent'))
    setDisputeTarget(null)
  }

  async function cancelFromDispute(splitId, message, refundFile = null) {
    let refundReceiptUrl = null
    if (refundFile) {
      const ext = refundFile.name.split('.').pop()
      const path = `refunds/${supplierProfile.id}/${Date.now()}-${splitId}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts').upload(path, refundFile)
      if (uploadError) { toast.error(uploadError.message); return }
      refundReceiptUrl = uploadData.path
    }
    const newStatus = refundFile ? 'refund_uploaded' : 'cancelled'
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: newStatus,
      p_cancellation_reason: message,
      p_dispute_message: message,
      p_refund_receipt_url: refundReceiptUrl,
      p_cancelled_by: 'supplier',
    })
    if (error) { toast.error(error.message); return }
    const patch = { status: newStatus, cancellation_reason: message, dispute_message: message, refund_receipt_url: refundReceiptUrl, cancelled_by: 'supplier' }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, ...patch } : s))
    toast.success(refundFile ? t('toastOrderCancelledWithRefund') : t('toastOrderCancelled'))
    setDisputeTarget(null)
    setSelectedSplit(null)
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

    const newStatus = refundFile ? 'refund_uploaded' : 'cancelled'

    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: newStatus,
      p_cancellation_reason: reason,
      p_refund_receipt_url: refundReceiptUrl,
      p_cancelled_by: 'supplier',
    })
    if (error) { toast.error(error.message); return }

    const patch = { status: newStatus, cancellation_reason: reason, refund_receipt_url: refundReceiptUrl, cancelled_by: 'supplier' }
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, ...patch } : s))
    toast.success(refundFile ? t('toastOrderCancelledRefundSent') : t('toastOrderCancelled'))
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
          onDispute={s => setDisputeTarget(s)}
        />
        {cancelTarget && (
          <CancelModal split={cancelTarget} onCancel={cancelOrder} onClose={() => setCancelTarget(null)} />
        )}
        {disputeTarget && (
          <DisputeResponseModal
            split={disputeTarget}
            onResend={resendOrder}
            onCancel={cancelFromDispute}
            onClose={() => setDisputeTarget(null)}
          />
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">{t('orders')}</h1>

      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'ongoing', label: t('ongoingOrdersTab'), count: ongoing.length },
          { id: 'completed', label: t('completedOrdersTab'), count: completed.length },
        ].map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`pb-2 px-1 text-sm font-bold transition-colors flex items-center gap-1.5 ${tab === tab_.id ? 'text-midnight border-b-2 border-midnight' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab_.label}
            {tab_.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === tab_.id ? 'bg-celeste text-midnight-dark' : 'bg-slate-100 text-slate-500'}`}>
                {tab_.count}
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
          <p className="text-slate-500 font-medium">{t('noTabOrders')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(split => (
            <div
              key={split.id}
              onClick={() => setSelectedSplit(split)}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-slate-900">#{split.id.slice(0, 8).toUpperCase()}</span>
                    <StatusBadge status={split.status} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{t('restaurantOwner')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  {split.status === 'cancellation_requested' && split.cancellation_reason && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {t('cancellationRequestedByOwner')}: {split.cancellation_reason}
                    </p>
                  )}
                  {split.status === 'cancelled' && (
                    <p className="text-xs text-red-500 mt-1 bg-red-50 px-2 py-1 rounded-lg">
                      {t('cancelledByLabel')} {split.cancelled_by === 'supplier' ? t('cancelledByYouText') : split.cancelled_by === 'owner' ? t('restaurantOwner') : 'admin'}
                      {split.cancellation_reason ? `: ${split.cancellation_reason}` : ''}
                    </p>
                  )}
                  {split.status === 'delivery_dispute' && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {t('ownerReportedDeliveryDispute')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <span className="text-xl font-bold text-slate-900">€{Number(split.subtotal).toFixed(2)}</span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedSplit(split)}
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-lionsmane transition-colors"
                    >
                      {t('viewDetails')} <ChevronRight className="w-4 h-4" />
                    </button>
                    {(split.status === 'pending_confirmation' || (split.status === 'pending_payment' && split.receipt_url)) && (
                      <button
                        onClick={() => updateStatus(split.id, 'confirmed')}
                        className="px-3 py-1.5 bg-midnight text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 justify-center"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> {t('confirm')}
                      </button>
                    )}
                    {split.status === 'delivery_dispute' && (
                      <button
                        onClick={() => { setDisputeTarget(split) }}
                        className="px-3 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 justify-center"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> {t('respondToDisputeBtn')}
                      </button>
                    )}
                    {split.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(split.id, 'out_for_delivery')}
                        className="px-3 py-1.5 bg-midnight text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 justify-center"
                      >
                        <Truck className="w-3.5 h-3.5" /> {t('outForDeliveryBtn')}
                      </button>
                    )}
                    {(split.status === 'pending_confirmation' || split.status === 'confirmed') && (
                      <button
                        onClick={() => setCancelTarget(split)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
                      >
                        {t('cancel')}
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
      {disputeTarget && (
        <DisputeResponseModal
          split={disputeTarget}
          onResend={resendOrder}
          onCancel={cancelFromDispute}
          onClose={() => setDisputeTarget(null)}
        />
      )}
    </div>
  )
}
