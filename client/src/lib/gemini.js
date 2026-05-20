const CHAT_URL = import.meta.env.DEV
  ? '/api/ai/chat'
  : '/.netlify/functions/ai-chat'

const ANALYTICS_URL = import.meta.env.DEV
  ? '/api/ai/analytics-summary'
  : '/.netlify/functions/ai-analytics-summary'

export async function askGemini(prompt, context, accessToken, { language = 'en' } = {}) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, context, language }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error(`AI chat error [${res.status}]:`, errBody)
    const detail = errBody.detail ? ` — ${errBody.detail}` : ''
    throw new Error(`${errBody.error || `AI service error (${res.status})`}${detail}`)
  }
  const data = await res.json()
  return data.response
}

export async function getAnalyticsSummary(context, accessToken, { force = false, language = 'en' } = {}) {
  const res = await fetch(ANALYTICS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context, force, language }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error(`AI analytics error [${res.status}]:`, errBody)
    const detail = errBody.detail ? ` — ${errBody.detail}` : ''
    throw new Error(`${errBody.error || `AI service error (${res.status})`}${detail}`)
  }
  const data = await res.json()
  // Returns { summary, generated_at, cached, stale? }
  return data
}
