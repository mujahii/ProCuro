import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = {
  pending_payment: '#F59E0B',
  pending_confirmation: '#F59E0B',
  confirmed: '#3B82F6',
  out_for_delivery: '#8B5CF6',
  shipped: '#8B5CF6',
  delivered: '#1B4332',
  completed: '#1B4332',
  cancelled: '#EF4444',
}

const LABELS = {
  pending_payment: 'Pending Payment',
  pending_confirmation: 'Pending Confirm',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function OrdersByStatusChart({ data = [], title = 'Orders by Status' }) {
  const chartData = data
    .filter(d => d.value > 0)
    .map(d => ({
      ...d,
      label: LABELS[d.name] || d.name.replace(/_/g, ' '),
      color: COLORS[d.name] || '#9ca3af',
    }))

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} width={28} />
            <Tooltip
              formatter={(value, _name, props) => [value, props.payload.label]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
