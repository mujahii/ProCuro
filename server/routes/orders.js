const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const verifySupabaseJWT = require('../middleware/verifySupabaseJWT')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/orders — transactional order creation
router.post('/', verifySupabaseJWT, async (req, res) => {
  const { groups, totalAmount } = req.body
  const userId = req.user.id

  try {
    // Create parent order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({ restaurant_owner_id: userId, total_amount: totalAmount })
      .select()
      .single()

    if (orderError) throw orderError

    const splits = []

    for (const [supplierId, group] of Object.entries(groups)) {
      const { data: split, error: splitError } = await supabaseAdmin
        .from('order_splits')
        .insert({
          order_id: order.id,
          supplier_id: supplierId,
          payment_method: group.paymentMethod,
          receipt_url: group.receiptUrl || null,
          subtotal: group.subtotal,
          status: group.paymentMethod === 'cash_on_delivery'
            ? 'pending_confirmation'
            : 'pending_payment',
        })
        .select()
        .single()

      if (splitError) throw splitError

      // Insert order items
      const items = group.items.map(item => ({
        order_split_id: split.id,
        product_id: item.productId,
        quantity: item.quantity,
        price_at_time: item.price,
        unit_type: item.unitType,
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Decrement stock via RPC
      for (const item of group.items) {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity,
        })
      }

      // Notify supplier
      const { data: supplierProfile } = await supabaseAdmin
        .from('supplier_profiles')
        .select('user_id')
        .eq('id', supplierId)
        .single()

      if (supplierProfile) {
        await supabaseAdmin.from('notifications').insert({
          user_id: supplierProfile.user_id,
          title: 'New Order Received',
          message: `You have a new order for €${group.subtotal.toFixed(2)}. Review and confirm it.`,
          type: 'order_placed',
        })
      }

      splits.push(split)
    }

    // Notify owner
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Order Placed Successfully',
      message: `Your order of €${totalAmount.toFixed(2)} has been placed with ${Object.keys(groups).length} supplier(s).`,
      type: 'order_placed',
    })

    res.json({ order, splits })
  } catch (err) {
    console.error('Order creation error:', err)
    res.status(500).json({ error: err.message || 'Failed to create order' })
  }
})

// PATCH /api/orders/splits/:splitId/status
router.patch('/splits/:splitId/status', verifySupabaseJWT, async (req, res) => {
  const { splitId } = req.params
  const { status, cancellationReason } = req.body

  try {
    const updates = { status, updated_at: new Date().toISOString() }
    if (cancellationReason) updates.cancellation_reason = cancellationReason

    const { data: split, error } = await supabaseAdmin
      .from('order_splits')
      .update(updates)
      .eq('id', splitId)
      .select('*, order:orders(restaurant_owner_id)')
      .single()

    if (error) throw error

    // Notify the restaurant owner of status change
    const ownerId = split.order?.restaurant_owner_id
    if (ownerId) {
      const statusMessages = {
        confirmed: 'Your order has been confirmed by the supplier.',
        shipped: 'Your order has been shipped and is on its way.',
        delivered: 'Your order has been marked as delivered.',
        cancelled: `Your order has been cancelled. ${cancellationReason ? 'Reason: ' + cancellationReason : ''}`,
      }
      if (statusMessages[status]) {
        await supabaseAdmin.from('notifications').insert({
          user_id: ownerId,
          title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: statusMessages[status],
          type: 'order_status_change',
        })
      }
    }

    res.json(split)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
