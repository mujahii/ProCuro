const express = require('express')
const router = express.Router()
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
const rateLimit = require('express-rate-limit')
const verifySupabaseJWT = require('../middleware/verifySupabaseJWT')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

// Service-role client for cache reads/writes (bypasses RLS).
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ANALYTICS_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many AI requests. Please wait a moment.' },
})

function buildSystemContext(role, contextData) {
  const base = `You are ProCuro Assistant, a helpful AI for a Halal food procurement platform in Germany.
Be concise, helpful, and professional. Only reference data provided in context. Never fabricate order data.
Keep responses under 200 words unless asked for detail.`

  const roleContext = {
    restaurant_owner: 'You are helping a restaurant owner manage their Halal food orders and inventory.',
    supplier: 'You are helping a Halal food supplier manage their product catalog and incoming orders.',
    admin: 'You are helping a platform admin analyze business metrics and manage the ProCuro marketplace.',
  }

  const dataContext = contextData
    ? `\n\nUser context data:\n${JSON.stringify(contextData, null, 2)}`
    : ''

  return `${base}\n${roleContext[role] || roleContext.restaurant_owner}${dataContext}`
}

// POST /api/ai/chat
router.post('/chat', verifySupabaseJWT, aiLimiter, async (req, res) => {
  const { prompt, context } = req.body

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const systemContext = buildSystemContext(req.user.role, context)
    const fullPrompt = `${systemContext}\n\nUser: ${prompt}`
    const result = await model.generateContent(fullPrompt)
    res.json({ response: result.response.text() })
  } catch (err) {
    console.error('Gemini error:', err)
    res.status(503).json({ error: 'AI assistant is temporarily unavailable.' })
  }
})

// POST /api/ai/analytics-summary
router.post('/analytics-summary', verifySupabaseJWT, aiLimiter, async (req, res) => {
  const { context, force } = req.body
  const userId = req.user.id

  // Cache hit: serve the previously-generated summary if it's under 24h old
  // and the client didn't explicitly request a refresh.
  if (userId && !force) {
    const { data: cached } = await supabaseAdmin
      .from('ai_insights_cache')
      .select('summary, generated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (cached?.summary) {
      const age = Date.now() - new Date(cached.generated_at).getTime()
      if (age < ANALYTICS_CACHE_TTL_MS) {
        return res.json({ summary: cached.summary, generated_at: cached.generated_at, cached: true })
      }
    }
  }

  const prompts = {
    restaurant_owner: `Analyze this restaurant owner's procurement data and provide a 3-sentence business insight plus one actionable recommendation:\n${JSON.stringify(context)}`,
    supplier: `Analyze this Halal supplier's business data and provide a 3-sentence insight plus one recommendation to grow sales:\n${JSON.stringify(context)}`,
    admin: `Platform overview for ProCuro Halal marketplace. Provide a 4-sentence executive summary and flag any concerns:\n${JSON.stringify(context)}`,
  }

  const prompt = prompts[req.user.role] || prompts.restaurant_owner

  try {
    const result = await model.generateContent(prompt)
    const summary = result.response.text()
    const generated_at = new Date().toISOString()

    if (userId) {
      await supabaseAdmin
        .from('ai_insights_cache')
        .upsert(
          { user_id: userId, scope: 'analytics', summary, generated_at },
          { onConflict: 'user_id' }
        )
    }

    res.json({ summary, generated_at, cached: false })
  } catch (err) {
    console.error('Gemini analytics error:', err)

    // If Gemini is rate-limited but we have a previous summary on file,
    // serve the stale copy instead of erroring out.
    if (userId) {
      const { data: stale } = await supabaseAdmin
        .from('ai_insights_cache')
        .select('summary, generated_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (stale?.summary) {
        return res.json({ summary: stale.summary, generated_at: stale.generated_at, cached: true, stale: true })
      }
    }

    res.status(503).json({ error: 'AI analysis is temporarily unavailable.' })
  }
})

module.exports = router
