import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function usePlaceOrder() {
  const { user } = useAuth()
  const { clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function placeOrder({ groups, totalAmount }) {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()

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

      // Create order via server (transactional)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groups: groupsWithUrls, totalAmount }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Order failed')
      }

      const data = await res.json()
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
