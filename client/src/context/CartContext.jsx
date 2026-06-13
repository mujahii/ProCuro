import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

function cartKey(userId) {
  return userId ? `procuro_cart_${userId}` : 'procuro_cart_guest'
}

export function CartProvider({ children }) {
  const { authUser } = useAuth()
  const userId = authUser?.id ?? null

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(cartKey(userId))
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Reload from the correct per-user key whenever the logged-in user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey(userId))
      setItems(saved ? JSON.parse(saved) : [])
    } catch {
      setItems([])
    }
  }, [userId])

  // Persist to the correct per-user key on every change
  useEffect(() => {
    localStorage.setItem(cartKey(userId), JSON.stringify(items))
  }, [items, userId])

  function addItem(product, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, {
        productId: product.id,
        product,
        quantity,
        supplierId: product.supplier_id,
      }]
    })
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  function updateQty(productId, quantity) {
    if (quantity <= 0) return removeItem(productId)
    setItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, quantity } : i
    ))
  }

  function clearCart() {
    setItems([])
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  const groupedBySupplier = items.reduce((acc, item) => {
    const sid = item.product.supplier_id
    if (!acc[sid]) {
      acc[sid] = {
        supplier: item.product.supplier,
        supplierId: sid,
        items: [],
        subtotal: 0,
      }
    }
    acc[sid].items.push(item)
    acc[sid].subtotal += item.product.price * item.quantity
    return acc
  }, {})

  return (
    <CartContext.Provider value={{ items, itemCount, total, groupedBySupplier, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
