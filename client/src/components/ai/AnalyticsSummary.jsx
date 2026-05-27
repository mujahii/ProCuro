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

function PrimaryInsightCard({ title, rest, meta }) {
  const Icon = meta.icon
  // Split multi-sentence rest into a lead sentence + supporting detail
  const sentences = rest ? rest.split(/(?<=\.)\s+/) : []
  const lead = sentences[0] || rest || ''
  const detail = sentences.slice(1).join(' ')
  return (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border h-full ${meta.bg} ${meta.border}`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className={`text-base font-bold leading-tight ${meta.text}`}>{title.replace(/[*:]+$/, '').trim()}</p>
      </div>
      {lead && (
        <p className="text-sm font-medium text-slate-700 leading-relaxed">{renderInlineBold(lead)}</p>
      )}
      {detail && (
        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2.5">{renderInlineBold(detail)}</p>
      )}
    </div>
  )
}

function SecondaryInsightCard({ title, rest, meta }) {
  const Icon = meta.icon
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${meta.bg} ${meta.border}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.iconBg} shadow-sm mt-0.5`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold ${meta.text}`}>{title.replace(/[*:]+$/, '').trim()}</p>
        {rest && <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{renderInlineBold(rest)}</p>}
      </div>
    </div>
  )
}

function parseInsightCards(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  const cards = []
  for (const line of lines) {
    const numbered = line.match(/^\d+\.\s+\*\*([^*]+?)\*\*[\s:—–-]*(.*)$/)
    if (numbered) { cards.push({ title: numbered[1], rest: numbered[2] }); continue }
    const bulleted = line.match(/^[•*\-–—]\s*\*\*([^*]+?)\*\*[\s:—–-]*(.*)$/)
    if (bulleted) { cards.push({ title: bulleted[1], rest: bulleted[2] }); continue }
    const plain = line.match(/^[•*\-–—]\s+(.+)$/)
    if (plain) cards.push({ title: 'Insight', rest: plain[1] })
  }
  return cards
}

function AIText({ text }) {
  if (!text) return null
  const cards = parseInsightCards(text)
  if (cards.length === 0) return null
  const [primary, ...secondary] = cards
  const primaryMeta = metaForTitle(primary.title, 0)
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="sm:w-[45%]">
        <PrimaryInsightCard title={primary.title} rest={primary.rest} meta={primaryMeta} />
      </div>
      {secondary.length > 0 && (
        <div className="sm:flex-1 flex flex-col gap-2">
          {secondary.map((card, i) => (
            <SecondaryInsightCard key={i} title={card.title} rest={card.rest} meta={metaForTitle(card.title, i + 1)} />
          ))}
        </div>
      )}
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
    <div>
      <style>{`
        @keyframes aiGlow {
          0%   { box-shadow: 0 0 18px 4px rgba(41,121,255,0.45), 0 2px 12px rgba(0,0,0,0.08); }
          25%  { box-shadow: 0 0 22px 6px rgba(170,0,255,0.40), 0 2px 12px rgba(0,0,0,0.08); }
          50%  { box-shadow: 0 0 22px 6px rgba(0,229,204,0.40), 0 2px 12px rgba(0,0,0,0.08); }
          75%  { box-shadow: 0 0 22px 6px rgba(255,109,0,0.40), 0 2px 12px rgba(0,0,0,0.08); }
          100% { box-shadow: 0 0 18px 4px rgba(41,121,255,0.45), 0 2px 12px rgba(0,0,0,0.08); }
        }
      `}</style>

      {/* Card with animated glow border — no spinning elements */}
      <div style={{ borderRadius: '1rem', overflow: 'hidden', animation: 'aiGlow 6s ease-in-out infinite', willChange: 'box-shadow' }}>

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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:w-[45%]">
              <div className="flex flex-col gap-3 p-5 rounded-2xl border border-slate-100 bg-slate-50 h-full">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
                <div className="space-y-2 border-t border-slate-200 pt-2.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="sm:flex-1 flex flex-col gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}
