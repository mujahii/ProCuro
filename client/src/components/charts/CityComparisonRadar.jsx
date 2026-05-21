import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

// Grouped bar chart — one bar-pair per city, no city count cap.
// Renders every city the caller passes, regardless of whether it is in Germany.
export default function CityComparisonRadar({ data = [], title = 'Suppliers vs Owners by City' }) {
  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No city data yet</div>
      </div>
    )
  }

  // Sort by combined count descending so the busiest city is at the top.
  const sorted = [...data].sort((a, b) => (b.suppliers + b.owners) - (a.suppliers + a.owners))

  // Give every city at least 44px of vertical space so bars never overlap.
  const chartHeight = Math.max(240, sorted.length * 44)

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">
        {sorted.length} {sorted.length === 1 ? 'city' : 'cities'} · all locations in the system
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          barCategoryGap="30%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="city"
            width={90}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          <Tooltip
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="suppliers" name="Suppliers" fill="#083A4F" radius={[0, 3, 3, 0]} />
          <Bar dataKey="owners" name="Owners" fill="#D4A017" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
