import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'

// SVG viewBox matches /public/Deutschland.svg (443 × 599 displayed).
const VB = { w: 443, h: 599 }

// Germany's real geographic bounds (extrema of the mainland).
const BOUNDS = {
  top: 55.06,
  bottom: 47.27,
  left: 5.87,
  right: 15.04,
}

function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
}

const Y_TOP_M = mercatorY(BOUNDS.top)
const Y_BOTTOM_M = mercatorY(BOUNDS.bottom)

function project(lat, lng) {
  const x = ((lng - BOUNDS.left) / (BOUNDS.right - BOUNDS.left)) * VB.w
  const y = ((Y_TOP_M - mercatorY(lat)) / (Y_TOP_M - Y_BOTTOM_M)) * VB.h
  return { x, y }
}

export default function GermanyDotMap({ data = [], title = 'Users Across Germany' }) {
  const { t } = useLanguage()
  const [hover, setHover] = useState(null)
  // data: [{ id, city, lat, lng, role: 'supplier'|'restaurant_owner' }]
  const valid = data.filter(d => d.lat != null && d.lng != null && !isNaN(d.lat) && !isNaN(d.lng))

  // Project every dot, then fan out any that land on the same point (e.g. many
  // suppliers in one city) into a small ring so each user stays individually visible.
  const groups = {}
  valid.forEach(d => {
    const p = project(d.lat, d.lng)
    const key = `${Math.round(p.x)},${Math.round(p.y)}`
    ;(groups[key] ||= []).push({ d, ...p })
  })
  const positioned = []
  Object.values(groups).forEach(items => {
    if (items.length === 1) {
      positioned.push({ ...items[0], cx: items[0].x, cy: items[0].y })
    } else {
      const R = 7
      items.forEach((it, i) => {
        const angle = (2 * Math.PI * i) / items.length
        positioned.push({ ...it, cx: it.x + R * Math.cos(angle), cy: it.y + R * Math.sin(angle) })
      })
    }
  })

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#083A4F' }} /> {t('chartSupplier')}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#A58D66' }} /> {t('chartRestaurant')}</span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-72" preserveAspectRatio="xMidYMid meet">
          <image href="/Deutschland.svg" x="0" y="0" width={VB.w} height={VB.h} preserveAspectRatio="xMidYMid meet" />

          {positioned.map(({ d, cx, cy }) => {
            const isSupplier = d.role === 'supplier'
            return (
              <circle
                key={d.id}
                cx={cx}
                cy={cy}
                r={5}
                fill={isSupplier ? '#083A4F' : '#A58D66'}
                fillOpacity="0.85"
                stroke="#fff"
                strokeWidth="1.5"
                className="cursor-pointer"
                onMouseEnter={() => setHover({ ...d, x: cx, y: cy })}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
        {hover && (
          <div className="absolute top-2 right-2 bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs pointer-events-none">
            <p className="font-bold text-gray-900">{hover.city}</p>
            <p className="text-gray-500 capitalize">{hover.role === 'supplier' ? t('chartSupplier') : t('chartRestaurant')}</p>
          </div>
        )}
      </div>
      {valid.length === 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">{t('chartNoMappedLocations')}</p>
      )}
    </div>
  )
}
