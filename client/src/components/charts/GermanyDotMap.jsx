import { useState } from 'react'

// SVG viewBox matches /public/Deutschland.svg (443 × 599 displayed).
const VB = { w: 443, h: 599 }

// Germany's real geographic bounds (extrema of the mainland).
// Combined with Mercator projection these match the aspect of the supplied SVG
// (ratio ≈ 0.83). Tweak only if dots land outside the country outline.
const BOUNDS = {
  top: 55.06,    // List, Sylt — northernmost point
  bottom: 47.27, // Haldenwanger Eck — southernmost point
  left: 5.87,    // Isenbruch — westernmost point
  right: 15.04,  // Deschka, Saxony — easternmost point
}

function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
}

const Y_TOP_M = mercatorY(BOUNDS.top)
const Y_BOTTOM_M = mercatorY(BOUNDS.bottom)

// Project (lat, lng) → (x, y) inside the SVG viewBox using Mercator vertical
// and equirectangular horizontal — same projection family Wikimedia uses for
// its Germany location-map SVGs.
function project(lat, lng) {
  const x = ((lng - BOUNDS.left) / (BOUNDS.right - BOUNDS.left)) * VB.w
  const y = ((Y_TOP_M - mercatorY(lat)) / (Y_TOP_M - Y_BOTTOM_M)) * VB.h
  return { x, y }
}

function dotRadius(count) {
  return Math.max(4, Math.min(12, 4 + count * 1.3))
}

export default function GermanyDotMap({ data = [], title = 'Users Across Germany' }) {
  const [hover, setHover] = useState(null)
  const valid = data.filter(d => d.lat != null && d.lng != null)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#083A4F' }} /> Supplier</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#D4A017' }} /> Owner</span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-72" preserveAspectRatio="xMidYMid meet">
          <image href="/Deutschland.svg" x="0" y="0" width={VB.w} height={VB.h} preserveAspectRatio="xMidYMid meet" />

          {valid.map((d, i) => {
            const { x, y } = project(d.lat, d.lng)
            const sx = x - 5
            const ox = x + 5
            return (
              <g key={`${d.city}-${i}`} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                {d.suppliers > 0 && (
                  <circle cx={sx} cy={y} r={dotRadius(d.suppliers)} fill="#083A4F" fillOpacity="0.85" stroke="#fff" strokeWidth="2" />
                )}
                {d.owners > 0 && (
                  <circle cx={ox} cy={y} r={dotRadius(d.owners)} fill="#D4A017" fillOpacity="0.85" stroke="#fff" strokeWidth="2" />
                )}
              </g>
            )
          })}
        </svg>
        {hover && (
          <div className="absolute top-2 right-2 bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
            <p className="font-bold text-gray-900">{hover.city}</p>
            <p className="text-gray-600">Suppliers: <span className="font-semibold text-midnight">{hover.suppliers}</span></p>
            <p className="text-gray-600">Owners: <span className="font-semibold text-marigold-dark">{hover.owners}</span></p>
          </div>
        )}
      </div>
      {valid.length === 0 && (
        <p className="text-center text-xs text-gray-400 mt-3">No mapped users yet — coordinates are required.</p>
      )}
    </div>
  )
}
