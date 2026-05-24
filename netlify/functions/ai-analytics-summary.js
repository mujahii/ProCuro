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

// Same-user requests served from cache for this many ms (24h).
// Only an explicit { force: true } from the UI bypasses the cache.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Deterministic non-AI summary built from the same context the prompt uses.
// Returned when Gemini errors (e.g. 429) and there is no cached row yet, so
// the user always sees something useful instead of an error wall.
function buildFallbackSummary(role, context) {
  const c = context || {}
  if (role === 'supplier') {
    const revenue = c.revenueThisPeriod ?? c.revenueThisMonth ?? '0'
    const orders = c.ordersThisPeriod ?? c.ordersThisMonth ?? 0
    const best = c.bestProduct ?? c.topProduct ?? '—'
    const active = c.activeProducts ?? 0
    return [
      `• **Sales** — €${revenue} from ${orders} order${orders === 1 ? '' : 's'} this period`,
      `• **Best seller** — ${best}`,
      `• **Stock** — ${active} active product${active === 1 ? '' : 's'} live in your store`,
      `• **Action** — AI quota exhausted; richer insights return tomorrow or on refresh`,
    ].join('\n')
  }
  if (role === 'admin') {
    return [
      `• **Health** — Live platform overview available in the dashboard charts`,
      `• **Revenue** — Check GMV chart for this period's totals`,
      `• **Flag** — No anomalies detected from available data`,
      `• **Next step** — AI quota exhausted; executive summary returns tomorrow or on refresh`,
    ].join('\n')
  }
  // restaurant_owner (default)
  const spend = c.totalSpendThisMonth ?? '0'
  const orders = c.totalOrdersThisMonth ?? 0
  const cat = c.topCategory ?? '—'
  const top = (c.topProducts && c.topProducts[0]) || '—'
  return [
    `• **Spending** — €${spend} across ${orders} order${orders === 1 ? '' : 's'} this month`,
    `• **Top pick** — ${top}`,
    `• **Trend** — Compare with last period in your order history`,
    `• **Tip** — AI quota exhausted; richer insights return tomorrow or on refresh`,
  ].join('\n')
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
  let userId = null

  const authHeader = event.headers.authorization || event.headers.Authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (!authError && user) {
      userId = user.id
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

  const { context, force, language } = body
  const isDE = language === 'de'

  // Cache hit: signed-in user, not forcing, last summary is fresh.
  // Summary is stored as JSON { en: "...", de: "..." } so either language is
  // served from the same cache entry — no regeneration needed on language switch.
  if (userId && !force) {
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('summary, generated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (cached?.summary) {
      const age = Date.now() - new Date(cached.generated_at).getTime()
      if (age < CACHE_TTL_MS) {
        let summaryForLang = cached.summary
        try {
          const parsed = JSON.parse(cached.summary)
          if (parsed.en && parsed.de) summaryForLang = parsed[language] || parsed.en
        } catch {}
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ summary: summaryForLang, generated_at: cached.generated_at, cached: true }),
        }
      }
    }
  }

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

  function buildPrompt(lang, role) {
    const de = lang === 'de'
    const instr = de ? 'Antworte ausschließlich auf Deutsch.\n' : ''
    const noHeader = 'Do NOT include any introductory sentence or header. Start directly with the first bullet point.\n'
    const dataStr = JSON.stringify(context)
    const season = eventContext ? `Season: ${eventContext}` : ''
    if (role === 'restaurant_owner') return `${instr}${noHeader}You are a food procurement analyst. Analyze this Halal restaurant owner's data.
Data: ${dataStr}
${season}
Reply with exactly 4 bullet points (each ≤ 18 words):
• **${de ? 'Ausgaben' : 'Spending'}** — total spent and top supplier this period
• **${de ? 'Top-Produkt' : 'Top pick'}** — most ordered category or product
• **${de ? 'Trend' : 'Trend'}** — spending up, down, or stable vs. last period
• **${de ? 'Tipp' : 'Tip'}** — one action to save money or prepare for demand`
    if (role === 'supplier') return `${instr}${noHeader}You are a business analyst for a Halal food supplier in Germany. Analyze this data.
Data: ${dataStr}
${season}
Reply with exactly 4 bullet points (each ≤ 18 words):
• **${de ? 'Umsatz' : 'Sales'}** — revenue and order count this period
• **${de ? 'Bestseller' : 'Best seller'}** — top product by volume
• **${de ? 'Lagerwarnung' : 'Stock alert'}** — any item with stock ≤ 3 (or "${de ? 'alles in Ordnung' : 'all good'}")
• **${de ? 'Maßnahme' : 'Action'}** — one concrete step to grow or prepare`
    return `${instr}${noHeader}You are a platform analyst for ProCuro marketplace in Germany. Analyze this data.
Data: ${dataStr}
${season}
Reply with exactly 4 bullet points (each ≤ 18 words):
• **${de ? 'Status' : 'Health'}** — active users and total orders this period
• **${de ? 'Umsatz' : 'Revenue'}** — platform GMV and whether it grew this period
• **${de ? 'Hinweis' : 'Flag'}** — top issue or anomaly needing attention
• **${de ? 'Nächster Schritt' : 'Next step'}** — one platform action to take now`
  }

  const role = profile?.role || 'restaurant_owner'

  try {
    // Generate both languages in parallel — cached together so switching
    // language in the UI is instant (no extra Gemini call needed).
    const [summaryEN, summaryDE] = await Promise.all([
      generateWithFallback(buildPrompt('en', role)),
      generateWithFallback(buildPrompt('de', role)),
    ])
    const dual = JSON.stringify({ en: summaryEN, de: summaryDE })
    const generated_at = new Date().toISOString()
    const summaryForLang = isDE ? summaryDE : summaryEN

    if (userId) {
      await supabase
        .from('ai_insights_cache')
        .upsert(
          { user_id: userId, scope: 'analytics', summary: dual, generated_at, language: 'both' },
          { onConflict: 'user_id' }
        )
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary: summaryForLang, generated_at, cached: false }),
    }
  } catch (err) {
    console.error('Gemini analytics error:', err?.message || err, err?.stack)

    if (userId) {
      const { data: stale } = await supabase
        .from('ai_insights_cache')
        .select('summary, generated_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (stale?.summary) {
        let summaryForLang = stale.summary
        try {
          const parsed = JSON.parse(stale.summary)
          if (parsed.en && parsed.de) summaryForLang = parsed[language] || parsed.en
        } catch {}
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ summary: summaryForLang, generated_at: stale.generated_at, cached: true, stale: true }),
        }
      }
    }

    // No cache and Gemini failed — fall back to a deterministic summary built
    // straight from the context, so the user never sees a hard error wall.
    // Not persisted, so we keep retrying Gemini on the next load.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: buildFallbackSummary(profile?.role, context),
        generated_at: new Date().toISOString(),
        cached: false,
        fallback: true,
      }),
    }
  }
}
