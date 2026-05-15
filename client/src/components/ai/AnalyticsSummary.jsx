import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAnalyticsSummary } from '../../lib/gemini'
import Skeleton from '../ui/Skeleton'

function renderInlineBold(text) {
  const parts = text.split(/\*\*([^*]+)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-slate-800">{part}</strong>
      : <span key={i}>{part}</span>
  )
}

function AIText({ text }) {
  if (!text) return null
  const paragraphs = text.split(/\n+/).filter(p => p.trim())

  return (
    <div className="space-y-3">
      {paragraphs.map((para, idx) => {
        const numbered = para.match(/^(\d+)\.\s+\*\*([^*:]+)\*\*[:\s]*(.*)/)
        if (numbered) {
          const [, num, title, rest] = numbered
          return (
            <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {num}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 mb-0.5">{title}</p>
                {rest && <p className="text-sm text-slate-600 leading-relaxed">{renderInlineBold(rest)}</p>}
              </div>
            </div>
          )
        }
        if (para.startsWith('Here') || para.startsWith('Based')) {
          return (
            <p key={idx} className="text-xs text-slate-400 italic leading-relaxed">
              {renderInlineBold(para)}
            </p>
          )
        }
        return (
          <p key={idx} className="text-sm text-slate-600 leading-relaxed">
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

  useEffect(() => {
    if (context) generate()
  }, [])

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const text = await getAnalyticsSummary(context, session?.access_token ?? '')
      setSummary(text)
    } catch {
      setError('AI analysis is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">AI Insights</h3>
            <p className="text-xs text-slate-400">Powered by Gemini</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-2.5">
            <div className="flex gap-3">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400">{error}</p>
            <button onClick={generate} className="mt-2 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
              Try again
            </button>
          </div>
        ) : summary ? (
          <AIText text={summary} />
        ) : (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-3">Get AI-powered insights about your procurement patterns.</p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate Insights
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
