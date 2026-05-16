import { useState, useEffect, useRef } from 'react'
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAnalyticsSummary } from '../../lib/gemini'
import Skeleton from '../ui/Skeleton'

const INSIGHT_META = [
  { key: 'sales', icon: TrendingUp,      bg: 'bg-herb/10',     border: 'border-herb/20',     iconBg: 'bg-herb',     text: 'text-herb-dark' },
  { key: 'stock', icon: AlertTriangle,   bg: 'bg-marigold/10', border: 'border-marigold/20', iconBg: 'bg-marigold', text: 'text-marigold-dark' },
  { key: 'demand',icon: Calendar,        bg: 'bg-celeste/30',  border: 'border-celeste',      iconBg: 'bg-midnight', text: 'text-midnight' },
  { key: 'tip',   icon: Lightbulb,       bg: 'bg-lionsmane',   border: 'border-marigold/30', iconBg: 'bg-marigold-dark', text: 'text-slate-700' },
]

function renderInlineBold(text) {
  const parts = text.split(/\*\*([^*]+)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold">{part}</strong>
      : <span key={i}>{part}</span>
  )
}

function AIText({ text }) {
  if (!text) return null
  const paragraphs = text.split(/\n+/).filter(p => p.trim())

  return (
    <div className="space-y-3">
      {paragraphs.map((para, idx) => {
        // Match: "1. **Title:** rest" or "1. **Title** rest"
        const numbered = para.match(/^(\d+)\.\s+\*\*([^*:]+)[*:]?\*?\*?[:\s]*(.*)/)
        if (numbered) {
          const [, num, title, rest] = numbered
          const meta = INSIGHT_META[(Number(num) - 1) % INSIGHT_META.length]
          const Icon = meta.icon
          return (
            <div key={idx} className={`flex gap-3 p-4 rounded-2xl border ${meta.bg} ${meta.border}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg} shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold mb-0.5 ${meta.text}`}>{title.replace(/[*:]+$/, '')}</p>
                {rest && <p className="text-sm text-slate-600 leading-relaxed">{renderInlineBold(rest)}</p>}
              </div>
            </div>
          )
        }
        if (para.startsWith('Here') || para.startsWith('Based')) {
          return (
            <p key={idx} className="text-xs text-slate-400 italic leading-relaxed px-1">
              {renderInlineBold(para)}
            </p>
          )
        }
        return (
          <p key={idx} className="text-sm text-slate-600 leading-relaxed px-1">
            {renderInlineBold(para)}
          </p>
        )
      })}
    </div>
  )
}

export default function AnalyticsSummary({ context }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const hasGenerated = useRef(false)
  useEffect(() => {
    if (context && !hasGenerated.current) {
      hasGenerated.current = true
      generate()
    }
  }, [context])

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const text = await getAnalyticsSummary(context, session?.access_token ?? '')
      setSummary(text)
    } catch (err) {
      setError(err?.message || 'AI analysis is temporarily unavailable.')
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
            <h3 className="font-bold text-white text-sm tracking-wide">AI Insights</h3>
            <p className="text-xs text-white/60">Powered by Gemini</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors group"
          title="Refresh insights"
        >
          <RefreshCw className={`w-4 h-4 text-white/70 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
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
            <button onClick={generate} className="text-xs text-midnight font-semibold hover:text-midnight-dark underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : summary ? (
          <AIText text={summary} />
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gradient-to-br from-midnight to-herb rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Analyse your sales data</p>
            <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">Get AI-powered insights on revenue, top products, and growth opportunities.</p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight-dark transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate Insights
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
