const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: { transport: WebSocket },
    auth: { autoRefreshToken: false, persistSession: false },
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
    restaurant_owner: `You are an expert food procurement analyst for a Halal restaurant in Germany. Analyze this restaurant owner's procurement data from ProCuro.
Data: ${JSON.stringify(context)}
${eventContext ? `Seasonal context: ${eventContext}` : ''}
Provide exactly 3 numbered points:
1. **Spending Summary** — 2 sentences on spending and order patterns
2. **Key Insight** — top supplier, most ordered category, or notable trend
3. **Recommendation** — one actionable tip to optimize procurement or prepare for upcoming demand
Keep it concise and practical.`,

    supplier: `You are an expert business analyst for a Halal food supplier in Germany. Analyze this supplier's data from ProCuro.
Data: ${JSON.stringify(context)}
${eventContext ? `Seasonal context: ${eventContext}` : ''}
Pay special attention to:
- Products with low or zero stock_quantity (flag them as needing restocking)
- Products that are best-sellers (high order volume) — these need buffer stock
- Upcoming Islamic events (Ramadan, Eid) or German events that will spike demand for specific products
Provide exactly 4 numbered points:
1. **Sales Performance** — summary of revenue, orders, and top products
2. **Stock Alert** — which products need restocking urgently (if any have stock ≤ 3 or 0)
3. **Upcoming Demand** — based on season/events, which products to prepare more of
4. **Growth Tip** — one actionable recommendation to grow sales
Keep it concise and data-driven.`,

    admin: `You are a platform analytics expert for ProCuro, a Halal food procurement marketplace in Germany. Analyze this platform data.
Data: ${JSON.stringify(context)}
${eventContext ? `Seasonal context: ${eventContext}` : ''}
Provide exactly 3 numbered points:
1. **Platform Health** — 2-3 sentence executive summary of activity and health
2. **Flag** — any concerns, anomalies, or urgent items worth the admin's attention
3. **Strategic Recommendation** — one platform-level action to improve performance or address risks
Keep it professional and data-driven.`,
  }

  const prompt = prompts[profile?.role] || prompts.restaurant_owner

  try {
    const result = await model.generateContent(prompt)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary: result.response.text() }),
    }
  } catch (err) {
    console.error('Gemini analytics error:', err)
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'AI analysis is temporarily unavailable.' }) }
  }
}
