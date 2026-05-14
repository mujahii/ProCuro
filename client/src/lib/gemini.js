const CHAT_URL = import.meta.env.DEV
  ? '/api/ai/chat'
  : '/.netlify/functions/ai-chat'

const ANALYTICS_URL = import.meta.env.DEV
  ? '/api/ai/analytics-summary'
  : '/.netlify/functions/ai-analytics-summary'

export async function askGemini(prompt, context, accessToken) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, context }),
  })
  if (!res.ok) throw new Error('AI service unavailable')
  const data = await res.json()
  return data.response
}

export async function getAnalyticsSummary(context, accessToken) {
  const res = await fetch(ANALYTICS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context }),
  })
  if (!res.ok) throw new Error('AI service unavailable')
  const data = await res.json()
  return data.summary
}
