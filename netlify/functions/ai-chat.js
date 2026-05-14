const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function buildSystemPrompt(role, name, contextData) {
  const base = `You are ProCuro Assistant, an expert AI helper for a Halal food procurement platform in Germany.
The user's name is ${name || 'there'}.
Be concise, warm, and professional. Use bullet points for lists. Keep responses under 250 words unless the user asks for detail.
Only reference data that is provided in the context below. Never fabricate order numbers, amounts, or supplier names.
If the context is empty, answer from general knowledge about food procurement and restaurant management.`

  const roleGuide = {
    restaurant_owner: `You are helping a restaurant owner manage Halal food procurement. Help them track orders, monitor spending, find suppliers, and optimize their purchasing decisions.`,
    supplier: `You are helping a Halal food supplier manage their business on ProCuro. Help them understand their orders, manage inventory, and grow their sales.`,
    admin: `You are helping a ProCuro platform administrator. Help them understand platform metrics, manage users, and identify issues or opportunities.`,
  }

  const ctx = contextData && Object.keys(contextData).length > 0
    ? `\n\n--- USER DATA CONTEXT ---\n${JSON.stringify(contextData, null, 2)}\n--- END CONTEXT ---`
    : ''

  return `${base}\n\n${roleGuide[role] || roleGuide.restaurant_owner}${ctx}`
}

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

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization token' }) }
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account is banned' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { prompt, context } = body
  if (!prompt?.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) }
  }

  try {
    const systemPrompt = buildSystemPrompt(profile?.role, profile?.full_name, context)
    const fullPrompt = `${systemPrompt}\n\nUser message: ${prompt}`
    const result = await model.generateContent(fullPrompt)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: result.response.text() }),
    }
  } catch (err) {
    console.error('Gemini error:', err)
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'AI assistant is temporarily unavailable. Please try again.' }) }
  }
}
