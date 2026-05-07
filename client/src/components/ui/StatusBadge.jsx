const STATUS_STYLES = {
  pending_payment: 'bg-amber-100 text-amber-700',
  pending_confirmation: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  refund_uploaded: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  verified: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
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
