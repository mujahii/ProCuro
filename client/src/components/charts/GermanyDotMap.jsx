import { useState } from 'react'

// Germany border traced from real lat/lng waypoints projected into the SVG viewBox.
// Projection: x = (lng - 5.5) / 9.7 * 340,  y = 340 - (lat - 47.0) / 8.1 * 340
// ~47 waypoints covering the full land border clockwise from the NW corner.
const GERMANY_PATH = [
  // NW: Dutch-German border, heading north
  [53,81],[55,67],[61,59],
  // North Sea coast going east
  [84,58],[101,42],[112,31],
  // Schleswig-Holstein peninsula going north
  [119,13],[138,2],
  // Danish border (west → east)
  [140,11],[158,12],[193,12],[250,12],
  // Baltic coast going south-east
  [260,24],[281,30],[299,42],[306,51],[312,53],
  // Polish border — Oder-Neisse going south
  [319,67],[317,95],[317,116],[322,130],[333,154],[328,171],[325,175],
  // Czech border going west through Erzgebirge to Bohemian Forest
  [298,186],[280,198],[240,211],[271,253],[279,274],
  // Austrian border going west (Inn → Alps → Lindau)
  [257,291],[263,306],[262,314],[231,312],[196,320],[146,317],
  // Swiss border going west to Basel
  [129,312],[110,311],[74,317],
  // French border going north — Rhine then Palatinate Forest
  [74,296],[79,275],[94,258],[86,254],[53,246],
  // Luxembourg → Belgian borders
  [31,237],[22,207],[18,183],[18,170],
  // Dutch border going north then east back to coast
  [21,152],[21,141],[25,137],[43,122],[53,109],[53,86],
].map(([x, y]) => `${x},${y}`).join(' L ')
  .replace(/^/, 'M ') + ' Z'

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
