import { useState } from 'react'
import { X, Minus, Plus, Package, Truck } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'

export default function AddToCartModal({ product, onClose }) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountError, setDiscountError] = useState('')

  const price = Number(product.price)
  const discount = discountApplied ? price * qty * 0.1 : 0
  const total = price * qty - discount

  function handleApplyDiscount() {
    if (discountCode.toUpperCase() === 'HALAL10') {
      setDiscountApplied(true)
      setDiscountError('')
    } else {
      setDiscountApplied(false)
      setDiscountError('Invalid discount code')
    }
  }

  function handleAdd() {
    addItem(product, qty)
    toast.success(`${product.name} added to cart`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        {/* Image */}
        <div className="relative h-64 bg-slate-100 flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Package className="w-16 h-16" />
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500 text-lg">Out of Stock</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/50 backdrop-blur-md p-2 rounded-full hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
              <p className="text-emerald-600 font-bold text-lg mt-0.5">{product.supplier?.business_name}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-900">€{price.toFixed(2)}</span>
              <span className="text-xs text-slate-400 block">/ {product.unit_type}</span>
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-slate-500">{product.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Truck className="w-4 h-4 text-slate-400" />
            <span>Delivery fee may apply based on your location</span>
          </div>

          {/* Quantity selector */}
          {product.in_stock && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm font-semibold text-slate-700 mb-3">Quantity</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span className="w-8 text-center font-bold text-slate-900 text-lg">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span className="text-sm text-slate-400">{product.unit_type}</span>
              </div>
            </div>
          )}

          {/* Discount code */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Discount code"
              value={discountCode}
              onChange={e => { setDiscountCode(e.target.value); setDiscountError(''); setDiscountApplied(false) }}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleApplyDiscount}
              className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Apply
            </button>
          </div>
          {discountApplied && (
            <p className="text-xs text-emerald-600 font-medium">10% discount applied! You save €{discount.toFixed(2)}</p>
          )}
          {discountError && (
            <p className="text-xs text-red-500">{discountError}</p>
          )}

          {/* Out of stock message */}
          {!product.in_stock && (
            <div className="p-4 bg-red-50 text-red-600 font-bold text-center rounded-xl">
              This product is currently out of stock
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleAdd}
              disabled={!product.in_stock}
              className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart — €{total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
