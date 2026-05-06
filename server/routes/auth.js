const express = require('express')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/auth/register
// Creates a user instantly — no email confirmation, no rate limits
router.post('/register', async (req, res) => {
  const { fullName, email, password, role } = req.body
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: 'fullName, email, password and role are required' })
  }

  // Create auth user with admin API — email_confirm: true skips email entirely
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (authError) return res.status(400).json({ error: authError.message })

  const userId = authData.user.id

  // Upsert into public.users (trigger may have already created it)
  await adminSupabase.from('users').upsert({
    id: userId,
    email,
    full_name: fullName,
    role,
  }, { onConflict: 'id' })

  // If supplier, create supplier_profiles row
  if (role === 'supplier') {
    const { businessName, city } = req.body
    await adminSupabase.from('supplier_profiles').upsert({
      user_id: userId,
      business_name: businessName || fullName,
      city: city || '',
      is_visible: false,
    }, { onConflict: 'user_id' })
  }

  res.json({ userId, email })
})

module.exports = router
