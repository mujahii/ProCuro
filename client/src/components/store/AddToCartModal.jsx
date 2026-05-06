import { useState } from 'react'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

export default function AddToCartModal({ product, onClose }) {
  const { addItem, items } = useCart()
  const existingItem = items.find(i => i.productId === product.id)
  const [qty, setQty] = useState(1)

  function handleAdd() {
    addItem(product, qty)
    toast.success(`${product.name} added to cart`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-gray-900 text-lg mb-1 pr-8">{product.name}</h3>
        <p className="text-primary font-semibold mb-1">{product.supplier?.business_name}</p>
        <p className="text-xl font-black text-gray-900 mb-4">€{Number(product.price).toFixed(2)} <span className="text-sm font-normal text-gray-400">/{product.unit_type}</span></p>

        {existingItem && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            Already in cart: {existingItem.quantity} {product.unit_type}. Adding will increase quantity.
          </p>
        )}

        <div className="flex items-center gap-4 mb-5">
          <span className="text-sm font-medium text-gray-700">Quantity:</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-sm text-gray-500">{product.unit_type}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <button onClick={handleAdd} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
