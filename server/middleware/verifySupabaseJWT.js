const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySupabaseJWT(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Fetch role from public.users
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role, full_name, is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    return res.status(403).json({ error: 'Account is banned' })
  }

  req.user = { ...user, role: profile?.role, full_name: profile?.full_name }
  next()
}

module.exports = verifySupabaseJWT
