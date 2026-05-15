const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

  const prompts = {
    restaurant_owner: `You are an expert food procurement analyst. Analyze this restaurant owner's procurement data from the ProCuro Halal platform.
Data: ${JSON.stringify(context)}
Provide:
1. A 2-3 sentence summary of their spending and order patterns
2. One key insight (e.g. top supplier, most ordered category)
3. One actionable recommendation to optimize their procurement
Keep it concise and practical.`,

    supplier: `You are an expert business analyst for Halal food suppliers. Analyze this supplier's business data from ProCuro.
Data: ${JSON.stringify(context)}
Provide:
1. A 2-3 sentence summary of their sales performance
2. One key insight about their top products or order trends
3. One actionable recommendation to grow their business
Keep it concise and practical.`,

    admin: `You are a platform analytics expert for ProCuro, a Halal food procurement marketplace in Germany. Analyze this platform data.
Data: ${JSON.stringify(context)}
Provide:
1. A 3-4 sentence executive summary of platform health
2. Any concerns or anomalies worth flagging
3. One strategic recommendation
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
