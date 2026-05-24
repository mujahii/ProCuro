import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Calendar,
  DollarSign, Trophy, Package, Target, Activity, Flag, ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAnalyticsSummary } from '../../lib/gemini'
import { useLanguage } from '../../context/LanguageContext'
import Skeleton from '../ui/Skeleton'

const FALLBACK_META = [
  { icon: TrendingUp,    bg: 'bg-herb/10',     border: 'border-herb/20',     iconBg: 'bg-herb',          text: 'text-herb-dark' },
  { icon: AlertTriangle, bg: 'bg-marigold/10', border: 'border-marigold/20', iconBg: 'bg-marigold',      text: 'text-marigold-dark' },
  { icon: Calendar,      bg: 'bg-celeste/30',  border: 'border-celeste',     iconBg: 'bg-midnight',      text: 'text-midnight' },
  { icon: Lightbulb,     bg: 'bg-lionsmane',   border: 'border-marigold/30', iconBg: 'bg-marigold-dark', text: 'text-slate-700' },
]

// Title keyword → icon + colour mapping. Matches keywords from the analytics
// prompts (Sales, Spending, Stock, Top pick, Best seller, Tip, Action, etc.).
const TITLE_META = [
  { match: /spend|revenue|sales|payment|invoice/i, icon: DollarSign,    bg: 'bg-herb/10',     border: 'border-herb/20',     iconBg: 'bg-herb',          text: 'text-herb-dark' },
  { match: /top|best|seller|pick|favorite|popular/i, icon: Trophy,      bg: 'bg-celeste/30',  border: 'border-celeste',     iconBg: 'bg-midnight',      text: 'text-midnight' },
  { match: /stock|inventory|low|out\s*of/i,        icon: Package,       bg: 'bg-marigold/10', border: 'border-marigold/20', iconBg: 'bg-marigold',      text: 'text-marigold-dark' },
  { match: /tip|advice|suggest|recommend/i,        icon: Lightbulb,     bg: 'bg-lionsmane',   border: 'border-marigold/30', iconBg: 'bg-marigold-dark', text: 'text-slate-700' },
  { match: /action|next|step|grow/i,               icon: ArrowRight,    bg: 'bg-herb/10',     border: 'border-herb/20',     iconBg: 'bg-herb-dark',     text: 'text-herb-dark' },
  { match: /alert|warning|issue|problem|concern/i, icon: AlertTriangle, bg: 'bg-red-50',      border: 'border-red-100',     iconBg: 'bg-red-500',       text: 'text-red-700' },
  { match: /flag|risk/i,                           icon: Flag,          bg: 'bg-red-50',      border: 'border-red-100',     iconBg: 'bg-red-500',       text: 'text-red-700' },
  { match: /health|activity|active|user/i,         icon: Activity,      bg: 'bg-celeste/30',  border: 'border-celeste',     iconBg: 'bg-midnight',      text: 'text-midnight' },
  { match: /target|goal|objective/i,               icon: Target,        bg: 'bg-celeste/30',  border: 'border-celeste',     iconBg: 'bg-midnight',      text: 'text-midnight' },
  { match: /season|demand|event|holiday|ramadan|eid|christmas/i, icon: Calendar, bg: 'bg-celeste/30', border: 'border-celeste', iconBg: 'bg-midnight', text: 'text-midnight' },
  { match: /trend|growth|increase/i,               icon: TrendingUp,    bg: 'bg-herb/10',     border: 'border-herb/20',     iconBg: 'bg-herb',          text: 'text-herb-dark' },
]

function metaForTitle(title, fallbackIdx) {
  for (const m of TITLE_META) if (m.match.test(title)) return m
  return FALLBACK_META[fallbackIdx % FALLBACK_META.length]
}

function renderInlineBold(text) {
  const parts = text.split(/\*\*([^*]+)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold">{part}</strong>
      : <span key={i}>{part}</span>
  )
}

function InsightCard({ title, rest, meta }) {
  const Icon = meta.icon
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border ${meta.bg} ${meta.border}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg} shadow-sm`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold mb-0.5 ${meta.text}`}>{title.replace(/[*:]+$/, '').trim()}</p>
        {rest && <p className="text-sm text-slate-600 leading-relaxed">{renderInlineBold(rest)}</p>}
      </div>
    </div>
  )
}

function AIText({ text }) {
  if (!text) return null
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  let cardIdx = 0

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        // Numbered: "1. **Title:** rest"
        const numbered = line.match(/^\d+\.\s+\*\*([^*]+?)\*\*[\s:—–-]*(.*)$/)
        if (numbered) {
          const [, title, rest] = numbered
          const meta = metaForTitle(title, cardIdx++)
          return <InsightCard key={idx} title={title} rest={rest} meta={meta} />
        }
        // Bulleted: "• **Title** — rest" / "- **Title**: rest" / "* **Title** rest"
        const bulleted = line.match(/^[•*\-–—]\s*\*\*([^*]+?)\*\*[\s:—–-]*(.*)$/)
        if (bulleted) {
          const [, title, rest] = bulleted
          const meta = metaForTitle(title, cardIdx++)
          return <InsightCard key={idx} title={title} rest={rest} meta={meta} />
        }
        // Plain bullet without bold ("• rest" or "- rest")
        const plainBullet = line.match(/^[•*\-–—]\s+(.+)$/)
        if (plainBullet) {
          const rest = plainBullet[1]
          const meta = FALLBACK_META[cardIdx++ % FALLBACK_META.length]
          return <InsightCard key={idx} title="Insight" rest={rest} meta={meta} />
        }
        if (line.startsWith('Here') || line.startsWith('Based')) {
          return (
            <p key={idx} className="text-xs text-slate-400 italic leading-relaxed px-1">
              {renderInlineBold(line)}
            </p>
          )
        }
        return (
          <p key={idx} className="text-sm text-slate-600 leading-relaxed px-1">
            {renderInlineBold(line)}
          </p>
        )
      })}
    </div>
  )
}

function timeAgo(iso, t) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return t('aiJustNow')
  if (mins < 60) return `${mins}${t('aiMinutesAgo')}`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}${t('aiHoursAgo')}`
  const days = Math.round(hours / 24)
  return `${days}${t('aiDaysAgo')}`
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export default function AnalyticsSummary({ context }) {
  const { lang: language, t } = useLanguage()
  const [summary, setSummary] = useState('')
  const [generatedAt, setGeneratedAt] = useState(null)
  const [stale, setStale] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // True when the last generation is still fresh (< 24h). While true the
  // refresh button is dimmed and non-interactive.
  const isWithin24h = generatedAt
    ? Date.now() - new Date(generatedAt).getTime() < CACHE_TTL_MS
    : false

  const hasGenerated = useRef(false)
  const prevLanguage = useRef(language)

  useEffect(() => {
    if (context && !hasGenerated.current) {
      hasGenerated.current = true
      generate({ force: false })
    }
  }, [context])

  // On language switch, re-fetch from cache (both languages are stored together —
  // no Gemini call is needed, the server returns the other language instantly).
  useEffect(() => {
    if (prevLanguage.current !== language) {
      prevLanguage.current = language
      if (context && hasGenerated.current) {
        generate({ force: false })
      }
    }
  }, [language, context])

  async function generate({ force = false } = {}) {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const result = await getAnalyticsSummary(context, session?.access_token ?? '', { force, language })
      setSummary(result.summary || '')
      setGeneratedAt(result.generated_at || null)
      setStale(Boolean(result.stale))
      setFallback(Boolean(result.fallback))
    } catch (err) {
      setError(err?.message || t('aiUnavailable'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      {/* Header — gradient bar */}
      <div className="bg-gradient-to-r from-midnight to-herb px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide">{t('aiInsightsTitle')}</h3>
            <p className="text-xs text-white/60">
              {generatedAt
                ? <>{t('aiUpdated')} {timeAgo(generatedAt, t)}{fallback ? ` · ${t('aiBasicMode')}` : stale ? ` · ${t('aiCached')}` : ''} · {t('aiOnce24h')}</>
                : t('aiPoweredByGemini')}
            </p>
          </div>
        </div>
        <button
          onClick={() => !isWithin24h && generate({ force: true })}
          disabled={loading || isWithin24h}
          className={`p-2 rounded-xl transition-colors group ${isWithin24h ? 'cursor-not-allowed opacity-30' : 'hover:bg-white/10'}`}
          title={isWithin24h ? t('aiAvailableAgain24h') : t('aiForceRegenerate')}
        >
          <RefreshCw className={`w-4 h-4 text-white/70 ${loading ? 'animate-spin' : ''} ${!isWithin24h ? 'group-hover:text-white' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="bg-white p-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <Skeleton className="h-8 w-8 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-slate-400 mb-3">{error}</p>
            <button onClick={() => generate({ force: true })} className="text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark">
              {t('aiTryAgain')}
            </button>
          </div>
        ) : summary ? (
          <AIText text={summary} />
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gradient-to-br from-midnight to-herb rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{t('aiAnalyseTitle')}</p>
            <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">{t('aiAnalyseDesc')}</p>
            <button
              onClick={() => generate({ force: false })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight-dark transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> {t('aiGenerateButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
