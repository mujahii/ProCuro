import { useState } from 'react'

// Germany border traced from real lat/lng waypoints projected into the same
// coordinate space as project() below.
// x = (lng - 5.5) / 9.7 * 340,  y = 340 - (lat - 47.0) / 8.1 * 340
const GERMANY_PATH = [
  // Dutch/German coast border (starting point)
  [53,70],
  // North Sea coast going east
  [60,67],[78,60],[113,52],[140,48],
  // West coast of Schleswig-Holstein going north
  [124,26],
  // Danish land border (west end → Flensburg)
  [108,12],[138,13],
  // South into Schleswig-Holstein peninsula
  [142,25],[162,33],
  // Baltic coast east (Lübeck → Wismar → Rostock → Stralsund → Wolgast)
  [188,43],[208,42],[231,39],[269,28],[290,51],
  // Polish border — Oder river going south
  [304,58],[313,78],[317,116],
  // Cottbus / Görlitz eastward bulge
  [310,140],[332,166],[326,176],
  // Czech / Erzgebirge border going west
  [281,193],[235,205],
  // Bavarian Forest south to Passau
  [244,238],[269,251],[280,274],
  // Alpine border west (Berchtesgaden → Garmisch → Lindau)
  [262,314],[197,319],[147,317],
  // Swiss border / Rhine at Basel
  [73,317],
  // Alsace / Rhine going north to Palatinate Forest
  [65,309],[82,274],[95,257],
  // Saarbrücken → Trier → Luxembourg border
  [52,246],[40,225],[22,209],
  // Belgian border → Aachen corner
  [17,182],[13,170],
  // Dutch border south → north back to coast
  [21,137],[52,109],[53,70],
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
