import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Banknote, CreditCard } from 'lucide-react'

const LABELS = {
  bank_transfer: 'Bank Transfer',
  cash_on_delivery: 'Cash on Delivery',
}
const COLORS = {
  bank_transfer: '#083A4F',     // midnight
  cash_on_delivery: '#D4A017',  // marigold
}

export default function PaymentTypeChart({ data = [], title = 'Orders by Payment Type' }) {
  // data: [{ method: 'bank_transfer' | 'cash_on_delivery', count: number, total: number }]
  const pieData = data
    .filter(d => d.count > 0)
    .map(d => ({ ...d, name: LABELS[d.method] || d.method, value: d.count }))

  const totalOrders = pieData.reduce((s, d) => s + d.value, 0)
  const totalGMV = data.reduce((s, d) => s + Number(d.total || 0), 0)

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {pieData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No orders in this period</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                {pieData.map((d, i) => (
                  <Cell key={i} fill={COLORS[d.method] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, _n, ctx) => [`${v} orders · €${Number(ctx.payload.total).toFixed(2)}`, ctx.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2 w-full">
            {pieData.map(d => {
              const pct = totalOrders > 0 ? Math.round((d.value / totalOrders) * 100) : 0
              const Icon = d.method === 'cash_on_delivery' ? Banknote : CreditCard
              return (
                <div key={d.method} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[d.method]}1a`, color: COLORS[d.method] }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{d.name}</p>
                    <p className="text-[10px] text-gray-400">€{Number(d.total || 0).toFixed(2)} GMV</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{d.value}</p>
                    <p className="text-[10px] text-gray-400">{pct}%</p>
                  </div>
                </div>
              )
            })}
            {totalGMV > 0 && (
              <p className="text-[10px] text-gray-400 pt-1">Total GMV in period: <span className="font-bold text-gray-700">€{totalGMV.toFixed(2)}</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
