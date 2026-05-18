import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

const PRESETS = [
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
]

function startOfWeek(d) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Mon = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}
function startOfMonth(d) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(1); return x }
function startOfYear(d)  { const x = new Date(d); x.setHours(0,0,0,0); x.setMonth(0, 1); return x }
function endOfDay(d)     { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

export function rangeFromKey(key) {
  const now = new Date()
  if (key === 'week')  return { key, from: startOfWeek(now),  to: endOfDay(now) }
  if (key === 'year')  return { key, from: startOfYear(now),  to: endOfDay(now) }
  return { key: 'month', from: startOfMonth(now), to: endOfDay(now) }
}

export function customRange(fromStr, toStr) {
  return {
    key: 'custom',
    from: fromStr ? new Date(fromStr + 'T00:00:00') : null,
    to: toStr ? endOfDay(new Date(toStr + 'T00:00:00')) : null,
  }
}

function fmtInput(d) {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function DateRangeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [fromInput, setFromInput] = useState(value?.key === 'custom' ? fmtInput(value.from) : '')
  const [toInput, setToInput] = useState(value?.key === 'custom' ? fmtInput(value.to) : '')
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function pickPreset(key) {
    onChange(rangeFromKey(key))
    setOpen(false)
  }

  function applyCustom() {
    if (!fromInput || !toInput) return
    onChange(customRange(fromInput, toInput))
    setOpen(false)
  }

  const activeLabel =
    value?.key === 'custom' && value?.from && value?.to
      ? `${value.from.toLocaleDateString()} – ${value.to.toLocaleDateString()}`
      : PRESETS.find(p => p.key === value?.key)?.label || 'This Month'

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-xl">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => pickPreset(p.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              value?.key === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            value?.key === 'custom' ? 'bg-midnight text-white border-midnight' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {value?.key === 'custom' ? activeLabel : 'Custom'}
          </span>
          <span className="sm:hidden">{activeLabel}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
            <div className="sm:hidden grid grid-cols-3 gap-1">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => pickPreset(p.key)}
                  className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                    value?.key === p.key ? 'bg-midnight text-white border-midnight' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-gray-500">
                  From
                  <input
                    type="date"
                    value={fromInput}
                    max={toInput || undefined}
                    onChange={e => setFromInput(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight"
                  />
                </label>
                <label className="block text-[11px] text-gray-500">
                  To
                  <input
                    type="date"
                    value={toInput}
                    min={fromInput || undefined}
                    onChange={e => setToInput(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setFromInput(''); setToInput(''); pickPreset('month') }}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <X className="w-3 h-3" /> Clear
              </button>
              <button
                onClick={applyCustom}
                disabled={!fromInput || !toInput}
                className="flex-1 py-2 text-xs font-semibold bg-midnight text-white rounded-lg hover:bg-slate-800 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
