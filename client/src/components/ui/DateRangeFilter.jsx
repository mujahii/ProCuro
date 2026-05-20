import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const PRESET_KEYS = [
  { key: 'week',  labelKey: 'dateFilterWeek' },
  { key: 'month', labelKey: 'dateFilterMonth' },
  { key: 'year',  labelKey: 'dateFilterYear' },
]

function startOfWeek(d) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Mon = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}
function startOfMonth(d) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(1); return x }
function endOfDay(d)     { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

export function rangeFromKey(key) {
  const now = new Date()
  if (key === 'week') return { key, from: startOfWeek(now), to: endOfDay(now) }
  if (key === 'year') {
    const from = new Date(now.getFullYear(), 0, 1) // Jan 1 of current calendar year
    return { key, from, to: endOfDay(now) }
  }
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
  const { t } = useLanguage()
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

  const activePresetLabel = PRESET_KEYS.find(p => p.key === value?.key)
  const activeLabel =
    value?.key === 'custom' && value?.from && value?.to
      ? `${value.from.toLocaleDateString()} – ${value.to.toLocaleDateString()}`
      : activePresetLabel ? t(activePresetLabel.labelKey) : t('dateFilterMonth')

  const customActive = value?.key === 'custom'

  return (
    <div className="relative" ref={ref}>
      {/* ── Pill group (desktop) ── */}
      <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-xl">
        {PRESET_KEYS.map(p => (
          <button
            key={p.key}
            onClick={() => pickPreset(p.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              value?.key === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
        {/* Custom inside the pill group */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            customActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-3 h-3" />
          {customActive ? activeLabel : t('dateFilterCustom')}
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* ── Single button (mobile) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="sm:hidden flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>{activeLabel}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* ── Dropdown (shared) ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-30 p-4 space-y-3">
          {/* Preset chips on mobile */}
          <div className="sm:hidden grid grid-cols-3 gap-1">
            {PRESET_KEYS.map(p => (
              <button
                key={p.key}
                onClick={() => pickPreset(p.key)}
                className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                  value?.key === p.key ? 'bg-midnight text-white border-midnight' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('dateFilterCustomRange')}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-gray-500">
                {t('dateFilterFrom')}
                <input
                  type="date"
                  value={fromInput}
                  max={toInput || undefined}
                  onChange={e => setFromInput(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight"
                />
              </label>
              <label className="block text-[11px] text-gray-500">
                {t('dateFilterTo')}
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
              <X className="w-3 h-3" /> {t('clearBtn')}
            </button>
            <button
              onClick={applyCustom}
              disabled={!fromInput || !toInput}
              className="flex-1 py-2 text-xs font-semibold bg-midnight text-white rounded-lg hover:bg-slate-800 disabled:opacity-40"
            >
              {t('applyBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
