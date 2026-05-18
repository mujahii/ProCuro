import { useState } from 'react'

// Simplified Germany silhouette — single SVG path traced from a low-resolution
// outline. It does not need to be cartographically perfect; the dots placed by
// lat/lng are what tell the story.
const GERMANY_PATH = `
M118,12 L132,16 L138,28 L148,28 L160,18 L170,22 L182,34 L196,30
L208,40 L222,38 L228,52 L242,60 L246,76 L260,82 L272,98
L280,118 L288,138 L284,160 L268,180 L256,196 L248,220 L256,240
L246,258 L228,268 L210,276 L196,290 L186,304 L172,308 L156,300
L142,294 L130,288 L118,272 L108,256 L96,238 L86,218 L74,200
L62,182 L52,164 L46,144 L52,124 L62,108 L70,90 L80,76 L94,62
L102,48 L112,34 Z`

// Project (lng, lat) → (x, y) inside the SVG viewBox (340x340).
// Germany's bounding box: lng ~5.8–15.05, lat ~47.27–55.06.
const VB = { w: 340, h: 340 }
const LNG_MIN = 5.5, LNG_MAX = 15.2
const LAT_MIN = 47.0, LAT_MAX = 55.1
function project(lat, lng) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * VB.w
  const y = VB.h - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * VB.h
  return { x, y }
}

export default function GermanyDotMap({ data = [], title = 'Users Across Germany' }) {
  // data: [{ city, lat, lng, suppliers, owners }]
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
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-72">
          <defs>
            <linearGradient id="germanyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E5E1DD" />
              <stop offset="100%" stopColor="#dcd7d0" />
            </linearGradient>
          </defs>
          <path d={GERMANY_PATH} fill="url(#germanyFill)" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round" />

          {valid.map((d, i) => {
            const { x, y } = project(d.lat, d.lng)
            // Offset the two dots so they don't overlap exactly.
            const sx = x - 4
            const ox = x + 4
            return (
              <g key={`${d.city}-${i}`} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                {d.suppliers > 0 && (
                  <circle cx={sx} cy={y} r={Math.max(3, Math.min(9, 3 + d.suppliers))} fill="#083A4F" fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
                )}
                {d.owners > 0 && (
                  <circle cx={ox} cy={y} r={Math.max(3, Math.min(9, 3 + d.owners))} fill="#D4A017" fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
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
