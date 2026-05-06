import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAnalyticsSummary } from '../../lib/gemini'
import Skeleton from '../ui/Skeleton'

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
      const text = await getAnalyticsSummary(context, session.access_token)
      setSummary(text)
    } catch {
      setError('AI analysis is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-bold text-gray-900">AI Insights</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-gray-400">{error}</p>
      ) : summary ? (
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-gray-400">Click refresh to generate insights.</p>
      )}
    </div>
  )
}
