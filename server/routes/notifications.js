const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const verifySupabaseJWT = require('../middleware/verifySupabaseJWT')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/notifications/receipt-uploaded — notify supplier that receipt was uploaded
router.post('/receipt-uploaded', verifySupabaseJWT, async (req, res) => {
  const { splitId } = req.body

  try {
    const { data: split } = await supabaseAdmin
      .from('order_splits')
      .select('supplier_id')
      .eq('id', splitId)
      .single()

    if (!split) return res.status(404).json({ error: 'Split not found' })

    const { data: supplierProfile } = await supabaseAdmin
      .from('supplier_profiles')
      .select('user_id')
      .eq('id', split.supplier_id)
      .single()

    if (supplierProfile) {
      await supabaseAdmin.from('notifications').insert({
        user_id: supplierProfile.user_id,
        title: 'Payment Receipt Uploaded',
        message: 'A restaurant owner has uploaded a bank transfer receipt. Please review and confirm.',
        type: 'receipt_uploaded',
      })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
