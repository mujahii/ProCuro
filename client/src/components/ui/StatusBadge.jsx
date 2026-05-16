const STATUS_STYLES = {
  pending_payment: 'bg-marigold-light text-marigold-dark',
  pending_confirmation: 'bg-marigold-light text-marigold-dark',
  pending: 'bg-marigold-light text-marigold-dark',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
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

const STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  pending_confirmation: 'Pending Confirmation',
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  refund_uploaded: 'Refund Uploaded',
  completed: 'Completed',
  cancellation_requested: 'Cancellation Requested',
  cancelled: 'Cancelled',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase().replace(/ /g, '_')
  const style = STATUS_STYLES[key] || 'bg-gray-100 text-gray-600'
  const label = STATUS_LABELS[key] || status
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}
