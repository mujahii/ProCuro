import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function usePlaceOrder() {
  const { user } = useAuth()
  const { clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function placeOrder({ groups, totalAmount, deliveryAddress }) {
    setLoading(true)
    setError(null)
    try {
      // Upload receipts first (client side, requires auth session for storage policy)
      const groupsWithUrls = {}
      for (const [supplierId, group] of Object.entries(groups)) {
        let receiptUrl = null
        if (group.paymentMethod === 'bank_transfer' && group.receiptFile) {
          const ext = group.receiptFile.name.split('.').pop()
          const path = `${user.id}/${Date.now()}-${supplierId}.${ext}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-receipts')
            .upload(path, group.receiptFile)
          if (uploadError) throw uploadError
          receiptUrl = uploadData.path
        }
        groupsWithUrls[supplierId] = {
          ...group,
          receiptUrl,
          items: group.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            unitType: item.product.unit_type,
          })),
        }
      }

      // Convert to array format for RPC (items are already mapped to flat {productId, quantity, price, unitType})
      const groupsForRpc = Object.entries(groupsWithUrls).map(([supplierId, group]) => ({
        supplier_id: supplierId,
        payment_method: group.paymentMethod,
        receipt_url: group.receiptUrl,
        subtotal: Number(group.subtotal) || 0,
        estimated_delivery_at: group.estimatedDeliveryAt || null,
        items: group.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: Number(item.price),
          unit_type: item.unitType,
        })),
      }))

      const { data, error: rpcError } = await supabase.rpc('place_order', {
        p_owner_id: user.id,
        p_total_amount: totalAmount,
        p_groups: groupsForRpc,
        p_delivery_address: deliveryAddress ? {
          label: deliveryAddress.label || null,
          street: deliveryAddress.street || null,
          postal_code: deliveryAddress.postal_code || null,
          city: deliveryAddress.city || null,
        } : null,
      })
      if (rpcError) throw rpcError
      clearCart()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { placeOrder, loading, error }
}
