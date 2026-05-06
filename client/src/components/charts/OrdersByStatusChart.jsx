import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
  pending_payment: '#F59E0B',
  pending_confirmation: '#F59E0B',
  confirmed: '#3B82F6',
  shipped: '#8B5CF6',
  delivered: '#1B4332',
  cancelled: '#EF4444',
}

export default function OrdersByStatusChart({ data = [], title = 'Orders by Status' }) {
  const chartData = data.filter(d => d.value > 0)

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[entry.name] || '#9ca3af'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name.replace('_', ' ')]} />
            <Legend
              formatter={value => value.replace(/_/g, ' ')}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
