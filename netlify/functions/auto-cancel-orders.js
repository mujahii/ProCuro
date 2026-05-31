const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

exports.handler = async () => {
  try {
    const { error } = await supabase.rpc('auto_cancel_stale_orders')
    if (error) throw error
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('[auto-cancel-orders]', err?.message || err)
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || String(err) }) }
  }
}
