const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const verifySupabaseJWT = require('../middleware/verifySupabaseJWT')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', verifySupabaseJWT, requireAdmin, async (req, res) => {
  const { userId } = req.params
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/certificates/:certId/approve
router.post('/certificates/:certId/approve', verifySupabaseJWT, requireAdmin, async (req, res) => {
  const { certId } = req.params

  try {
    // Update certificate status
    const { data: cert, error: certError } = await supabaseAdmin
      .from('halal_certificates')
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', certId)
      .select('supplier_id')
      .single()

    if (certError) throw certError

    // Activate supplier
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('supplier_profiles')
      .update({ is_verified: true, is_active: true })
      .eq('id', cert.supplier_id)
      .select('user_id, business_name')
      .single()

    if (supplierError) throw supplierError

    // Notify supplier
    await supabaseAdmin.from('notifications').insert({
      user_id: supplier.user_id,
      title: 'Halal Certificate Approved!',
      message: `Your Halal certificate has been approved. Your account is now active and your products will appear in the marketplace.`,
      type: 'certificate_reviewed',
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/certificates/:certId/reject
router.post('/certificates/:certId/reject', verifySupabaseJWT, requireAdmin, async (req, res) => {
  const { certId } = req.params
  const { reason } = req.body

  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' })
  }

  try {
    const { data: cert, error: certError } = await supabaseAdmin
      .from('halal_certificates')
      .update({
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', certId)
      .select('supplier_id')
      .single()

    if (certError) throw certError

    const { data: supplier } = await supabaseAdmin
      .from('supplier_profiles')
      .select('user_id')
      .eq('id', cert.supplier_id)
      .single()

    if (supplier) {
      await supabaseAdmin.from('notifications').insert({
        user_id: supplier.user_id,
        title: 'Halal Certificate Rejected',
        message: `Your Halal certificate was rejected. Reason: ${reason}. Please upload a new valid certificate.`,
        type: 'certificate_reviewed',
      })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/stats — platform-wide stats
router.get('/stats', verifySupabaseJWT, requireAdmin, async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalSuppliers },
      { count: totalOwners },
      { count: pendingCerts },
      { count: totalOrders },
      { data: revenueData },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'supplier'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner'),
      supabaseAdmin.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('order_splits').select('subtotal').eq('status', 'delivered'),
    ])

    const totalRevenue = revenueData?.reduce((sum, s) => sum + Number(s.subtotal), 0) || 0

    res.json({
      totalUsers,
      totalSuppliers,
      totalOwners,
      pendingCerts,
      totalOrders,
      totalRevenue,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
