import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLanguage } from '../../context/LanguageContext'

export default function UserGrowthChart({ data = [], title = 'User Growth' }) {
  const { t } = useLanguage()
  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('chartNoData')}</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="owners" stroke="#083A4F" strokeWidth={2} dot={false} name={t('statRestaurants')} />
            <Line type="monotone" dataKey="suppliers" stroke="#A58D66" strokeWidth={2} dot={false} name={t('statSuppliers')} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
