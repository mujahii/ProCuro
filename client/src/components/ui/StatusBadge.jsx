import { useLanguage } from '../../context/LanguageContext'

const STATUS_STYLES = {
  pending_payment: 'bg-marigold-light text-marigold-dark',
  pending_confirmation: 'bg-marigold-light text-marigold-dark',
  pending: 'bg-marigold-light text-marigold-dark',
  confirmed: 'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-celeste text-midnight-dark',
  refund_uploaded: 'bg-marigold-light text-marigold-dark',
  completed: 'bg-celeste text-midnight-dark',
  cancellation_requested: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
  verified: 'bg-lionsmane text-midnight border border-celeste',
  approved: 'bg-lionsmane text-midnight border border-celeste',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
}

const STATUS_KEYS = {
  pending_payment: 'statusPendingPayment',
  pending_confirmation: 'statusPendingConfirmation',
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  out_for_delivery: 'statusOutForDelivery',
  delivered: 'statusDelivered',
  refund_uploaded: 'statusRefundUploaded',
  completed: 'statusCompleted',
  cancellation_requested: 'statusCancellationRequested',
  cancelled: 'statusCancelled',
  verified: 'statusVerified',
  approved: 'statusApproved',
  rejected: 'statusRejected',
}

export default function StatusBadge({ status }) {
  const { t } = useLanguage()
  const key = status?.toLowerCase().replace(/ /g, '_')
  const style = STATUS_STYLES[key] || 'bg-gray-100 text-gray-600'
  const tKey = STATUS_KEYS[key]
  const label = tKey ? t(tKey) : (status || '')
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}
