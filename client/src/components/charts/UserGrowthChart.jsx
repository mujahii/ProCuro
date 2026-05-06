import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function UserGrowthChart({ data = [] }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">User Growth</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="owners" stroke="#1B4332" strokeWidth={2} dot={false} name="Owners" />
            <Line type="monotone" dataKey="suppliers" stroke="#D4A017" strokeWidth={2} dot={false} name="Suppliers" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
