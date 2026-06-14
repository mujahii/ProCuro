import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { generateInvoice } from '../../lib/invoiceGenerator'
import StatusBadge from '../../components/ui/StatusBadge'
import { Download, Package, ChevronRight, ArrowLeft, CheckCircle, ExternalLink, XCircle, AlertTriangle, Loader2, ShoppingBag, Star, MessageSquare, Flag, Info, Clock, Truck } from 'lucide-react'
import ModalPortal from '../../components/ui/ModalPortal'
import ReportModal from '../../components/ui/ReportModal'
import SupplierProfileModal from '../../components/profile/SupplierProfileModal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

function ProductCardModal({ item, onClose }) {
  const { t } = useLanguage()
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
          <h3 className="text-lg font-bold text-midnight">{item.product?.name}</h3>
          {item.product?.description && (
            <p className="text-sm text-slate-500 leading-relaxed">{item.product.description}</p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{t('unitPrice')}</p>
              <p className="text-base font-bold text-midnight">€{Number(unitPrice).toFixed(2)} / {item.product?.unit_type || 'unit'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{t('qtyOrdered')}</p>
              <p className="text-base font-bold text-midnight">{item.quantity}×</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-500">{t('subtotalText')}</p>
            <p className="text-lg font-bold text-midnight">€{(unitPrice * item.quantity).toFixed(2)}</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors">
            {t('close')}
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

const ONGOING = ['pending_payment', 'pending_confirmation', 'confirmed', 'out_for_delivery', 'refund_uploaded', 'cancellation_requested', 'delivery_dispute']
const COMPLETED = ['delivered', 'completed', 'cancelled']
const CANCELLABLE = ['pending_payment', 'pending_confirmation', 'confirmed']
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000

// Within the 5-day window → cancel button is active
function isCancellable(split) {
  if (['pending_payment', 'pending_confirmation'].includes(split.status)) return true
  if (split.status === 'confirmed') return Date.now() - new Date(split.updated_at).getTime() <= FIVE_DAYS_MS
  return false
}

// Past the window or already out for delivery → show greyed button + toast
function isPastCancellationWindow(split) {
  if (split.status === 'out_for_delivery') return true
  if (split.status === 'confirmed') return Date.now() - new Date(split.updated_at).getTime() > FIVE_DAYS_MS
  return false
}

function NotReceivedModal({ split, onConfirm, onClose }) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!reason.trim()) { toast.error(t('toastDisputeDescRequired')); return }
    setLoading(true)
    await onConfirm(split.id, reason.trim())
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <h3 className="font-bold text-midnight text-lg">{t('reportNonDeliveryTitle')}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">{t('reportNonDeliveryDesc')}</p>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {t('reasonRequiredLabel')}
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-midnight resize-none"
            placeholder={t('whatHappenedPlaceholder')}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-lionsmane disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('sendReport')}
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

function CancelModal({ split, onCancel, onClose }) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const isBankTransfer = split.payment_method === 'bank_transfer'

  async function handleSubmit() {
    if (!reason.trim()) return toast.error(t('toastCancellationReasonRequired'))
    setLoading(true)
    await onCancel(split.id, reason.trim(), split.payment_method)
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-midnight text-lg">{t('cancelOrderTitle')}</h3>
        </div>

        {isBankTransfer && (
          <div className="bg-lionsmane border border-marigold-light rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold text-marigold-dark">{t('bankTransferOrderLabel')}</p>
            <p className="text-xs text-marigold-dark mt-1">{t('bankTransferCancelNote')}</p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {t('reasonForCancellationLabel')}
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
            placeholder={t('cancelReasonPlaceholder')}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-lionsmane transition-colors"
          >
            {t('keepOrderBtn')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 min-w-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{isBankTransfer ? t('requestCancellationBtn') : t('cancelOrderTitle')}</span>
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

  const { t } = useLanguage()
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark"
    >
      <ExternalLink className="w-4 h-4" /> {t('viewRefundReceiptLink')}
    </a>
  )
}


function RatingModal({ split, onSubmit, onSkip }) {
  const { t } = useLanguage()
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)

  const avatarUrl = split.supplier?.avatar_url
    ? (split.supplier.avatar_url.startsWith('http')
        ? split.supplier.avatar_url
        : supabase.storage.from('avatars').getPublicUrl(split.supplier.avatar_url).data?.publicUrl)
    : null

  async function handleSubmit() {
    if (!selected) return
    setLoading(true)
    await onSubmit(split, selected)
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="relative inline-block mb-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={split.supplier?.business_name} className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-celeste shadow-sm" />
          ) : (
            <div className="w-16 h-16 bg-lionsmane rounded-full flex items-center justify-center mx-auto border-2 border-celeste">
              <span className="text-xl font-bold text-midnight">{split.supplier?.business_name?.[0]?.toUpperCase() || '?'}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-herb rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-midnight mb-1">{t('ratingOrderDelivered')}</h3>
        <p className="text-sm text-slate-500 mb-5">
          {t('ratingHowWouldYouRate')} <span className="font-semibold text-slate-700">{split.supplier?.business_name}</span>?
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className="w-10 h-10 transition-colors"
                fill={(hovered || selected) >= star ? '#f59e0b' : 'none'}
                stroke={(hovered || selected) >= star ? '#f59e0b' : '#cbd5e1'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {selected > 0 && (
          <p className="text-sm font-semibold text-marigold mb-4">
            {['', t('ratingPoor'), t('ratingFair'), t('ratingGoodLabel'), t('ratingVeryGood'), t('ratingExcellent')][selected]}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onSkip} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-lionsmane transition-colors">
            {t('skipBtn')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="flex-1 py-2.5 bg-midnight text-white font-bold rounded-xl text-sm hover:bg-midnight-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('submitRating')}
          </button>
        </div>
      </div>
    </div></ModalPortal>
  )
}

const TRACKER_STEPS = [
  { statuses: ['pending_payment', 'pending_confirmation'], icon: Clock,        labelKey: 'statusPendingConfirmation' },
  { statuses: ['confirmed'],                               icon: CheckCircle,  labelKey: 'statusConfirmed' },
  { statuses: ['out_for_delivery'],                        icon: Truck,        labelKey: 'statusOutForDelivery' },
  { statuses: ['delivered', 'completed'],                  icon: Package,      labelKey: 'statusDelivered' },
]
const NEGATIVE_STATUSES = ['cancelled', 'cancellation_requested', 'refund_uploaded', 'delivery_dispute']

function OrderTracker({ status, t }) {
  const isNegative = NEGATIVE_STATUSES.includes(status)
  const currentIdx = TRACKER_STEPS.findIndex(s => s.statuses.includes(status))

  const nodes = TRACKER_STEPS.flatMap((step, i) => {
    const Icon = step.icon
    const isDone = !isNegative && currentIdx > i
    const isActive = !isNegative && currentIdx === i
    const stepNode = (
      <div key={`step-${i}`} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
          isDone   ? 'bg-herb shadow-sm' :
          isActive ? 'bg-midnight shadow-sm' :
                     'bg-slate-100'
        }`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isDone || isActive ? 'text-white' : 'text-slate-300'}`} />
        </div>
        <span className={`text-[9px] sm:text-[10px] font-semibold text-center leading-tight px-0.5 ${
          isDone   ? 'text-herb-dark' :
          isActive ? 'text-midnight' :
                     'text-slate-300'
        }`}>{t(step.labelKey)}</span>
      </div>
    )
    const arrowNode = i < TRACKER_STEPS.length - 1 ? (
      <ChevronRight key={`arrow-${i}`} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-2.5 sm:mt-3 ${
        isDone ? 'text-herb' : 'text-slate-200'
      }`} />
    ) : null
    return arrowNode ? [stepNode, arrowNode] : [stepNode]
  })

  if (isNegative) {
    nodes.push(
      <ChevronRight key="neg-arrow" className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-2.5 sm:mt-3 text-red-200" />,
      <div key="neg-step" className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
        </div>
        <span className="text-[9px] sm:text-[10px] font-semibold text-red-500 text-center leading-tight">
          {status === 'delivery_dispute' ? t('statusDeliveryDispute') || t('statusCancelled') : t('statusCancelled')}
        </span>
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start">{nodes}</div>
    </div>
  )
}

function OrderDetailView({ split, profile, taxRate, onBack, onMarkDelivered, onMarkNotDelivered, onCancelRequest, onConfirmRefund, ratedSplitIds, onRate }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const canCancel = isCancellable(split)
  const pastWindow = isPastCancellationWindow(split)

  async function handleChatWithSupplier() {
    const orderId = split.order.id.slice(0, 8).toUpperCase()
    const productNames = (split.order_items || []).map(i => i.product?.name).filter(Boolean).join(', ')
    const autoMsg = encodeURIComponent(`RE: Order #${orderId} — ${productNames} — Total €${Number(split.subtotal).toFixed(2)}`)
    navigate(`/owner/chat?supplier_id=${split.supplier_id}&order_ref=${split.order.id}&auto_message=${autoMsg}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('backToOrders')}
      </button>

      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-bold text-midnight">{t('orderDetailsTitle')}</h2>
        <StatusBadge status={split.status} />
      </div>

      <OrderTracker status={split.status} t={t} />

      {split.estimated_delivery_at && !['delivered', 'completed', 'cancelled', 'cancellation_requested', 'delivery_dispute'].includes(split.status) && (
        <div className="flex items-center gap-2 px-1">
          <Clock className="w-4 h-4 text-herb flex-shrink-0" />
          <p className="text-sm text-slate-600">
            {t('estimatedDelivery')}: <span className="font-semibold text-midnight">{format(new Date(split.estimated_delivery_at), 'd MMM yyyy')}</span>
          </p>
        </div>
      )}

      {/* Cancellation requested banner */}
      {split.status === 'cancellation_requested' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1.5">
          {split.cancelled_by === 'system' ? (
            <>
              <p className="text-sm font-bold text-orange-800">{t('autoExpiredCancelTitle')}</p>
              <p className="text-xs text-orange-700 leading-relaxed">
                {split.payment_method === 'bank_transfer'
                  ? t('autoExpiredOwnerBankTransferMsg')
                  : t('autoExpiredOwnerCodMsg')}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-orange-800">{t('cancellationPendingTitle')}</p>
              <p className="text-xs text-orange-700 mt-1">{t('cancellationPendingDesc')}</p>
              {split.cancellation_reason && (
                <p className="text-xs text-orange-600 mt-2 italic">"{split.cancellation_reason}"</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="card p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('orderIdLabel')}</p>
            <p className="font-bold text-midnight">#{split.order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('dateLabel')}</p>
            <p className="font-semibold text-midnight">{format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('supplierNameLabel')}</p>
            <button
              onClick={() => setShowSupplierModal(true)}
              className="font-semibold text-midnight-dark hover:text-midnight transition-colors text-left underline-offset-2 hover:underline"
            >
              {split.supplier?.business_name}
            </button>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{t('paymentLabel')}</p>
            <p className="font-semibold text-midnight capitalize">{split.payment_method?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-midnight mb-3">{t('itemsOrderedLabel')}</p>
          <div className="bg-lionsmane rounded-xl divide-y divide-slate-100 overflow-hidden">
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
                      className="text-sm font-semibold text-midnight hover:text-midnight transition-colors text-left underline-offset-2 hover:underline truncate block max-w-full"
                    >
                      {item.product?.name}
                    </button>
                    <p className="text-xs text-slate-400">{item.quantity}× · €{Number(item.price_at_time).toFixed(2)} each</p>
                  </div>
                  <span className="font-bold text-midnight text-sm flex-shrink-0">€{(item.price_at_time * item.quantity).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
          <span className="text-xl font-bold text-midnight">{t('totalLabel')}</span>
          <span className="text-2xl font-bold text-midnight">€{Number(split.subtotal).toFixed(2)}</span>
        </div>
      </div>

      {split.cancellation_reason && (split.status === 'cancelled' || split.status === 'refund_uploaded' || split.status === 'completed') && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">
            {t('orderCancelledTitle')}
            {split.cancelled_by && (
              <span className="font-normal text-red-400 ml-2">
                — {split.cancelled_by === 'supplier' ? t('cancelledBySupplierText') : split.cancelled_by === 'system' ? t('cancelledBySystem') : t('cancelledByYouText')}
              </span>
            )}
          </p>
          <p>{split.cancellation_reason}</p>
        </div>
      )}

      {split.status === 'refund_uploaded' && (
        <div className="bg-lionsmane border border-marigold-light rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-marigold-dark">{t('refundReceiptUploadedTitle')}</p>
          <p className="text-xs text-marigold-dark">{t('refundReceiptUploadedDesc')}</p>
          {split.refund_receipt_url && <RefundReceiptDisplay path={split.refund_receipt_url} />}
          <button
            onClick={() => { onConfirmRefund(split.id); onBack() }}
            className="w-full py-3 bg-midnight hover:bg-midnight-dark text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <CheckCircle className="w-4 h-4" /> {t('confirmRefundReceivedBtn')}
          </button>
        </div>
      )}

      {split.status === 'delivery_dispute' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {t('disputePendingTitle')}
          </p>
          <p className="text-xs text-orange-700 mt-1">{t('disputePendingDesc')}</p>
        </div>
      )}

      {/* Supplier's dispute response — shown after status moves past delivery_dispute */}
      {split.dispute_message && split.status !== 'delivery_dispute' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {t('disputeResolutionTitle')}
          </p>
          <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">{t('suppliersResponseLabel')}</p>
          <p className="text-sm text-orange-700 italic">"{split.dispute_message}"</p>
        </div>
      )}

      <div className="space-y-3">
        {split.status === 'out_for_delivery' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { onMarkDelivered(split.id); onBack() }}
              className="py-3.5 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors shadow-md text-sm"
            >
              {t('markAsDeliveredBtn')}
            </button>
            <button
              onClick={() => onMarkNotDelivered(split)}
              className="py-3.5 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 transition-colors border border-orange-200 text-sm"
            >
              {t('didntReceiveItBtn')}
            </button>
          </div>
        )}
        {/* Cancellation policy note — shown for any confirmed/out-for-delivery order */}
        {(canCancel || pastWindow) && (
          <div className="flex items-start gap-2 px-1">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">{t('cancellationPolicyNote')}</p>
          </div>
        )}

        {/* Active cancel button — within 5 days */}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            {t('cancelOrderTitle')}
          </button>
        )}

        {/* Expired cancel button — past 5 days or out for delivery */}
        {pastWindow && !canCancel && (
          <button
            onClick={() => toast.error(t('cancellationPeriodExpired'))}
            className="w-full py-3 bg-slate-50 text-slate-400 font-bold rounded-xl cursor-not-allowed border border-slate-200"
          >
            {t('cancelOrderTitle')}
          </button>
        )}
        {split.status === 'delivered' && ratedSplitIds && !ratedSplitIds.has(split.id) && (
          <button
            onClick={() => onRate(split)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-marigold/10 border border-marigold/30 text-marigold-dark font-semibold rounded-xl hover:bg-marigold/20 transition-colors text-sm"
          >
            <Star className="w-4 h-4 fill-marigold text-marigold" /> {t('rateSupplier') || 'Rate Supplier'}
          </button>
        )}
        {split.status === 'delivered' && ratedSplitIds && ratedSplitIds.has(split.id) && (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-herb font-semibold">
            <Star className="w-4 h-4 fill-herb text-herb" /> {t('rated') || 'Rated'}
          </div>
        )}
        <button
          onClick={handleChatWithSupplier}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-lionsmane transition-colors text-sm"
        >
          <MessageSquare className="w-4 h-4 text-midnight" /> {t('chatWithSupplierBtn')}
        </button>
        {(() => {
          const isDelivered = ['delivered', 'completed'].includes(split.status)
          return (
            <button
              onClick={() => {
                try {
                  generateInvoice(split.order, [split], profile, taxRate, isDelivered)
                } catch (err) {
                  toast.error(t('toastInvoiceError') || 'Could not generate PDF. Please try again.')
                  console.error('Invoice generation failed:', err)
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-lionsmane transition-colors text-sm"
            >
              <Download className="w-4 h-4" /> {isDelivered ? t('downloadReceipt') : t('downloadInvoice')}
            </button>
          )
        })()}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-medium"
        >
          <Flag className="w-4 h-4" /> {t('reportThisOrder')}
        </button>
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

export default function OrdersPage() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [tab, setTab] = useState('ongoing')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [notReceivedTarget, setNotReceivedTarget] = useState(null)
  const [ratingTarget, setRatingTarget] = useState(null)
  const [ratedSplitIds, setRatedSplitIds] = useState(new Set())
  const [taxRate, setTaxRate] = useState(0.07)

  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'tax_rate').maybeSingle()
      .then(({ data }) => { if (data?.value) setTaxRate(parseFloat(data.value)) })
  }, [])

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  async function fetchOrders() {
    setLoading(true)
    await supabase.rpc('auto_cancel_expired_pending_orders')
    const [ordersRes, ratingsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          order_splits(
            *,
            supplier:supplier_profiles(business_name, avatar_url),
            order_items(*, product:products(name, unit_type, image_url, description))
          )
        `)
        .eq('restaurant_owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('supplier_ratings')
        .select('order_split_id')
        .eq('owner_id', user.id),
    ])
    setOrders(ordersRes.data || [])
    setRatedSplitIds(new Set((ratingsRes.data || []).map(r => r.order_split_id)))
    setLoading(false)
  }

  async function markDelivered(splitId) {
    const splitForRating = orders.flatMap(o => (o.order_splits || []).map(s => ({ ...s, order: o }))).find(s => s.id === splitId)
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'delivered',
    })
    if (error) { toast.error(error.message); return }
    toast.success(t('toastOrderDelivered'))
    fetchOrders()
    if (splitForRating) setRatingTarget(splitForRating)
  }

  async function submitRating(split, rating) {
    const { error } = await supabase.from('supplier_ratings').insert({
      supplier_id: split.supplier_id,
      owner_id: user.id,
      order_split_id: split.id,
      rating,
    })
    if (error) {
      if (error.code === '23505') {
        toast.error(t('toastAlreadyRated'))
        setRatedSplitIds(prev => new Set([...prev, split.id]))
        setRatingTarget(null)
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success(t('toastRatingSent'))
    setRatedSplitIds(prev => new Set([...prev, split.id]))
    setRatingTarget(null)
  }

  async function markNotDelivered(splitId, reason) {
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: 'delivery_dispute',
      p_dispute_message: reason,
    })
    if (error) { toast.error(error.message); return }
    toast.success(t('toastDisputeSent'))
    setNotReceivedTarget(null)
    fetchOrders()
  }

  async function cancelOrder(splitId, reason, paymentMethod) {
    const newStatus = paymentMethod === 'bank_transfer' ? 'cancellation_requested' : 'cancelled'
    const { error } = await supabase.rpc('update_order_split_status', {
      p_split_id: splitId,
      p_status: newStatus,
      p_cancellation_reason: reason,
      p_cancelled_by: 'owner',
    })
    if (error) { toast.error(error.message); return }
    if (newStatus === 'cancellation_requested') {
      toast.success(t('toastCancellationRequestSent'))
    } else {
      toast.success(t('toastOrderCancelled'))
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
    toast.success(t('toastRefundConfirmed'))
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
      <>
        <OrderDetailView
          split={selectedOrder}
          profile={profile}
          taxRate={taxRate}
          onBack={() => { setSelectedOrder(null); fetchOrders() }}
          onMarkDelivered={markDelivered}
          onMarkNotDelivered={(splitToReport) => setNotReceivedTarget(splitToReport)}
          onCancelRequest={cancelOrder}
          onConfirmRefund={confirmRefund}
          ratedSplitIds={ratedSplitIds}
          onRate={setRatingTarget}
        />
        {notReceivedTarget && (
          <NotReceivedModal
            split={notReceivedTarget}
            onConfirm={markNotDelivered}
            onClose={() => setNotReceivedTarget(null)}
          />
        )}
        {ratingTarget && (
          <RatingModal
            split={ratingTarget}
            onSubmit={submitRating}
            onSkip={() => setRatingTarget(null)}
          />
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-midnight">{t('myOrders')}</h1>

      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'ongoing', label: t('ongoingOrdersTab'), count: ongoingSplits.length, showCount: true },
          { id: 'completed', label: t('completedOrdersTab'), count: completedSplits.length, showCount: false },
        ].map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`pb-2 px-1 text-sm font-bold transition-colors flex items-center gap-1.5 ${tab === tab_.id ? 'text-midnight border-b-2 border-midnight' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab_.label}
            {tab_.showCount && tab_.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === tab_.id ? 'bg-celeste text-midnight-dark' : 'bg-slate-100 text-slate-500'}`}>
                {tab_.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
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
              onClick={() => setSelectedOrder(split)}
              className="card card-lift p-4 cursor-pointer"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-midnight">#{split.order.id.slice(0, 8).toUpperCase()}</span>
                <StatusBadge status={split.status} />
              </div>

              {/* Supplier + date */}
              <p className="text-sm font-medium text-slate-700">{split.supplier?.business_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{format(new Date(split.order.created_at), 'dd MMM yyyy, HH:mm')}</p>

              {/* Status notes */}
              {split.cancellation_reason && (
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded-lg">
                  {split.cancelled_by === 'system'
                    ? t('autoExpiredCancelTitle')
                    : split.status === 'cancellation_requested'
                      ? t('cancelledPendingLabel')
                      : split.cancelled_by === 'supplier' ? t('cancelledBySupplierLabel') : t('cancelledByYouLabel')}
                  {split.cancelled_by !== 'system' && <>{' '}{split.cancellation_reason}</>}
                </p>
              )}
              {split.status === 'delivery_dispute' && (
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {t('disputePendingAwaitSupplier')}
                </p>
              )}
              {split.dispute_message && split.status !== 'delivery_dispute' && (
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {t('disputeResolvedLabel')} "{split.dispute_message}"
                </p>
              )}

              {/* Estimated delivery */}
              {split.estimated_delivery_at && !['delivered', 'completed', 'cancelled', 'cancellation_requested', 'delivery_dispute'].includes(split.status) && (
                <p className="text-xs text-herb font-medium mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {t('estimatedDelivery')}: {format(new Date(split.estimated_delivery_at), 'd MMM yyyy')}
                </p>
              )}

              {/* Footer: price + actions */}
              <div
                className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100"
                onClick={e => e.stopPropagation()}
              >
                <span className="text-lg font-bold text-midnight">€{Number(split.subtotal).toFixed(2)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOrder(split)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-lionsmane transition-colors"
                  >
                    {t('viewDetails')} <ChevronRight className="w-4 h-4" />
                  </button>
                  {split.status === 'out_for_delivery' && (
                    <button
                      onClick={e => { e.stopPropagation(); markDelivered(split.id) }}
                      className="px-3 py-1.5 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight-dark transition-colors"
                    >
                      {t('markDeliveredBtn')}
                    </button>
                  )}
                  {split.status === 'delivered' && !ratedSplitIds.has(split.id) && (
                    <button
                      onClick={e => { e.stopPropagation(); setRatingTarget({ ...split, order: { restaurant_owner_id: user.id } }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-marigold/10 border border-marigold/30 text-marigold-dark text-sm font-semibold rounded-xl hover:bg-marigold/20 transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 fill-marigold text-marigold" /> {t('rateSupplier') || 'Rate Supplier'}
                    </button>
                  )}
                  {split.status === 'delivered' && ratedSplitIds.has(split.id) && (
                    <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-herb font-semibold">
                      <Star className="w-3 h-3 fill-herb text-herb" /> {t('rated') || 'Rated'}
                    </span>
                  )}
                  {split.status === 'refund_uploaded' && (
                    <button
                      onClick={e => { e.stopPropagation(); confirmRefund(split.id) }}
                      className="px-3 py-1.5 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight-dark transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> {t('confirmRefundBtn')}
                    </button>
                  )}
                  {isCancellable(split) && (
                    <button
                      onClick={e => { e.stopPropagation(); setCancelTarget(split) }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notReceivedTarget && (
        <NotReceivedModal
          split={notReceivedTarget}
          onConfirm={markNotDelivered}
          onClose={() => setNotReceivedTarget(null)}
        />
      )}
      {cancelTarget && (
        <CancelModal
          split={cancelTarget}
          onCancel={cancelOrder}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {ratingTarget && (
        <RatingModal
          split={ratingTarget}
          onSubmit={submitRating}
          onSkip={() => setRatingTarget(null)}
        />
      )}
    </div>
  )
}
