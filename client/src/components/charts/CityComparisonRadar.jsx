import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts'

// Radar chart — intentionally a different chart family from the rest of the
// admin dashboard (no other panel uses Radar). Each city is an axis;
// suppliers and owners are two overlaid series.
export default function CityComparisonRadar({ data = [], title = 'Suppliers vs Owners by City' }) {
  // Show every city; cap only to keep the radar legible if the dataset grows.
  const top = data.slice(0, 12)
  const allValues = top.flatMap(d => [d.suppliers ?? 0, d.owners ?? 0])
  const dataMax = Math.max(...allValues, 1)
  const domainMax = Math.ceil(dataMax * 1.15)
  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{top.length} {top.length === 1 ? 'city' : 'cities'} by combined user count</p>
      {top.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No city data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={top}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="city" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={[0, domainMax]} />
            <Radar name="Suppliers" dataKey="suppliers" stroke="#083A4F" fill="#083A4F" fillOpacity={0.35} />
            <Radar name="Owners" dataKey="owners" stroke="#D4A017" fill="#D4A017" fillOpacity={0.35} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
