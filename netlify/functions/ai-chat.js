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

function buildSystemPrompt(role, name, contextData) {
  const base = `You are ProCuro Assistant, an expert AI helper for a Halal food procurement platform in Germany.
The user's name is ${name || 'there'}.
Be concise, warm, and professional. Use bullet points for lists. Keep responses under 200 words unless the user asks for detail.
Only reference data that is provided in the context below. Never fabricate order numbers, amounts, supplier names, or IDs.
If the context is empty, answer from general knowledge about food procurement and restaurant management.

IMPORTANT — Clickable links formatting:
When mentioning a supplier from the context, write their name as: [SupplierName](/supplier/SUPPLIER_ID)
When mentioning a product from the context, write it as: [ProductName](/owner/store?q=ProductName)
When mentioning a restaurant owner from the context, write as: [OwnerName](/supplier/orders) — only if their profile link is in the context.
Use this link format ONLY when you have the exact ID from the context data. Never invent IDs.`

  const roleGuide = {
    restaurant_owner: `You are helping a restaurant owner manage Halal food procurement. Help them track orders, monitor spending, find and suggest suppliers near them, and optimize purchasing. If they ask about nearby suppliers, list the ones in the context whose city matches or is closest to the owner's city. If they ask to order from a supplier, tell them to click the supplier link to open their store.`,
    supplier: `You are helping a Halal food supplier manage their business on ProCuro. Help them understand orders, inventory, and sales. If asked about top restaurant owners or who ordered most, reference the owner data in context.`,
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

  const { prompt, context } = body
  if (!prompt?.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) }
  }

  try {
    const systemPrompt = buildSystemPrompt(profile?.role, profile?.full_name, context)
    const fullPrompt = `${systemPrompt}\n\nUser message: ${prompt}`
    const response = await generateWithFallback(fullPrompt)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response }),
    }
  } catch (err) {
    console.error('Gemini chat error:', err?.message || err, err?.stack)
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'AI assistant is temporarily unavailable. Please try again.',
        detail: err?.message || String(err),
      }),
    }
  }
}
