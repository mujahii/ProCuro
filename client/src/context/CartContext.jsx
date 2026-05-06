import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('procuro_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('procuro_cart', JSON.stringify(items))
  }, [items])

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
