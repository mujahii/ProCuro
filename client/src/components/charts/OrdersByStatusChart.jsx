import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = {
  pending_payment: '#F59E0B',
  pending_confirmation: '#F59E0B',
  confirmed: '#3B82F6',
  shipped: '#8B5CF6',
  delivered: '#1B4332',
  cancelled: '#EF4444',
}

function CustomContent({ x, y, width, height, name, value }) {
  const color = COLORS[name] || '#9ca3af'
  const label = name ? name.replace(/_/g, ' ') : ''
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        style={{ fill: color, stroke: '#fff', strokeWidth: 2, rx: 4 }}
        rx="4"
      />
      {width > 55 && height > 32 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold" style={{ pointerEvents: 'none' }}>
            {label}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={12} style={{ pointerEvents: 'none' }}>
            {value}
          </text>
        </>
      )}
    </g>
  )
}

export default function OrdersByStatusChart({ data = [], title = 'Orders by Status' }) {
  const chartData = data.filter(d => d.value > 0)

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <Treemap
            data={chartData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={<CustomContent />}
          >
            <Tooltip
              formatter={(value, name) => [value, name.replace(/_/g, ' ')]}
              contentStyle={{ fontSize: 12 }}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </div>
  )
}
