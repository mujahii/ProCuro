export async function askGemini(prompt, context, accessToken) {
  const res = await fetch('/api/ai/chat', {
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
  const res = await fetch('/api/ai/analytics-summary', {
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
