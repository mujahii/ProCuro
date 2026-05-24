import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useLanguage } from '../../context/LanguageContext'

// Radar chart — one spoke per city, no city-count cap.
// All cities the caller passes are rendered regardless of count or country.
export default function CityComparisonRadar({ data = [], title = 'Suppliers vs Owners by City' }) {
  const { t } = useLanguage()

  if (data.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">{t('chartNoCityData')}</div>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => (b.suppliers + b.owners) - (a.suppliers + a.owners))
  const maxVal = Math.max(...sorted.map(d => Math.max(d.suppliers || 0, d.owners || 0)), 1)

  return (
    <div className="card p-5">
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">
        {sorted.length} {sorted.length === 1 ? t('chartCity') : t('chartCities')} · {t('chartAllLocations')}
      </p>
      <ResponsiveContainer width="100%" height={288}>
        <RadarChart data={sorted} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="city"
            tick={{ fontSize: sorted.length > 12 ? 8 : 10, fill: '#6b7280' }}
          />
          <PolarRadiusAxis domain={[0, maxVal]} allowDecimals={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <Radar name={t('statSuppliers')} dataKey="suppliers" stroke="#083A4F" fill="#083A4F" fillOpacity={0.45} />
          <Radar name={t('chartOwners')} dataKey="owners" stroke="#D4A017" fill="#D4A017" fillOpacity={0.45} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
