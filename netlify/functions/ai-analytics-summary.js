const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash-lite']

async function generateWithFallback(prompt) {
  const errors = []
  for (const name of MODEL_FALLBACKS) {
    try {
      const m = genAI.getGenerativeModel({ model: name })
      const r = await m.generateContent(prompt)
      return r.response.text()
    } catch (err) {
      errors.push(`${name}: ${err?.message?.split('\n')[0] || err}`)
    }
  }
  throw new Error(`All Gemini models failed → ${errors.join(' | ')}`)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket },
  }
)

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Authentication is optional - allow unauthenticated users with generic responses
  let profile = { role: 'default', full_name: null, is_banned: false }

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (!authError && user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, full_name, is_banned')
        .eq('id', user.id)
        .single()
      
      if (userProfile) {
        profile = userProfile
      }
    }
  }

  if (profile.is_banned) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account is banned' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { context } = body

  // Upcoming Islamic and German events (relative to current date)
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const islamicEventHints = []
  // Approximate month hints for recurring events
  if (month >= 2 && month <= 3) islamicEventHints.push('Ramadan is approaching — demand for halal meats, dates, and specialty foods spikes significantly.')
  if (month === 4) islamicEventHints.push('Eid al-Fitr is near — major orders for lamb, sweets, and festive ingredients are expected.')
  if (month >= 5 && month <= 6) islamicEventHints.push('Eid al-Adha is coming — very high demand for lamb, goat, and beef. Suppliers should restock heavily.')
  const germanEventHints = []
  if (month === 12) germanEventHints.push('Christmas and year-end season — restaurant orders typically surge for catering and events.')
  if (month === 10) germanEventHints.push('Oktoberfest season — high food service demand in Germany.')
  if (month >= 3 && month <= 4) germanEventHints.push('Spring/Easter season — increased restaurant traffic and catering orders.')
  const eventContext = [...islamicEventHints, ...germanEventHints].join(' ')

  const prompts = {
    restaurant_owner: `You are a food procurement analyst. Analyze this Halal restaurant owner's data.
Data: ${JSON.stringify(context)}
${eventContext ? `Season: ${eventContext}` : ''}
Reply with exactly 3 bullet points (each ≤ 15 words):
• **Spending** — total spent and main supplier
• **Top pick** — most ordered category or product
• **Tip** — one action to save money or prepare for demand`,

    supplier: `You are a business analyst for a Halal food supplier in Germany. Analyze this data.
Data: ${JSON.stringify(context)}
${eventContext ? `Season: ${eventContext}` : ''}
Reply with exactly 4 bullet points (each ≤ 15 words):
• **Sales** — revenue and order count this period
• **Best seller** — top product by volume
• **Stock alert** — any item with stock ≤ 3 (or "all good")
• **Action** — one concrete step to grow or prepare`,

    admin: `You are a platform analyst for ProCuro marketplace in Germany. Analyze this data.
Data: ${JSON.stringify(context)}
${eventContext ? `Season: ${eventContext}` : ''}
Reply with exactly 3 bullet points (each ≤ 15 words):
• **Health** — active users and order volume summary
• **Flag** — top issue or anomaly needing attention
• **Next step** — one platform action to take now`,
  }

  const prompt = prompts[profile?.role] || prompts.restaurant_owner

  try {
    const summary = await generateWithFallback(prompt)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary }),
    }
  } catch (err) {
    console.error('Gemini analytics error:', err?.message || err, err?.stack)
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'AI analysis is temporarily unavailable.',
        detail: err?.message || String(err),
      }),
    }
  }
}
