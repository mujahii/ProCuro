const statusConfig = {
  pending: 'badge-pending',
  pending_payment: 'badge-pending',
  pending_confirmation: 'badge-pending',
  confirmed: 'badge-confirmed',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  active: 'badge-approved',
  inactive: 'badge-cancelled',
}

const statusLabels = {
  pending_payment: 'Pending Payment',
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
}

export default function Badge({ status, className = '' }) {
  const cls = statusConfig[status] || 'badge-pending'
  return (
    <span className={`${cls} ${className}`}>
      {statusLabels[status] || status}
    </span>
  )
}
