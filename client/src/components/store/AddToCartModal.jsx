import { useState } from 'react'
import { X, Truck, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function AddToCartModal({ product, onClose }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')

  const price = Number(product.price)
  const deliveryFee = Number(product.delivery_fee) || 0
  const inStock = product.is_active
  const total = price * qty * (1 - appliedDiscount)
  const imgUrl = getProductImageUrl(product.image_url)

  function handleApplyDiscount() {
    if (discountCode.toUpperCase() === 'HALAL10') {
      setAppliedDiscount(0.1)
      setDiscountMessage('10% Discount Applied!')
    } else {
      setAppliedDiscount(0)
      setDiscountMessage('Code is not correct')
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
        <div className="relative h-64">
          {imgUrl ? (
            <img src={imgUrl} alt={product.name} className="w-full h-full object-cover rounded-t-2xl" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-t-2xl">
              <Package className="w-16 h-16 text-slate-300" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/50 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Name + Price */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
              <button
                onClick={() => { onClose(); navigate(`/supplier/${product.supplier_id}`) }}
                className="text-emerald-600 font-bold text-lg hover:underline text-left"
              >{product.supplier?.business_name}</button>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">€{price.toFixed(2)}</p>
              <p className="text-xs text-slate-400">per {product.unit_type}</p>
            </div>
          </div>

          {product.description && (
            <p className="text-slate-600 mb-6 leading-relaxed">{product.description}</p>
          )}

          {deliveryFee > 0 && (
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
              <span className="flex items-center gap-1">
                <Truck className="w-4 h-4" /> Delivery: €{deliveryFee.toFixed(2)}
              </span>
            </div>
          )}

          {inStock ? (
            <div className="space-y-4 mb-6">
              {/* Quantity */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">Quantity</span>
                <div className="flex items-center gap-4 ml-auto">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 font-bold"
                  >-</button>
                  <span className="font-bold w-8 text-center text-slate-900">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 font-bold"
                  >+</button>
                </div>
              </div>

              {/* Discount */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={e => { setDiscountCode(e.target.value); setDiscountMessage(''); setAppliedDiscount(0) }}
                    placeholder="Discount Code"
                    className="flex-1 p-3 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >Apply</button>
                </div>
                {discountMessage && (
                  <p className={`text-xs mt-1 ${discountMessage.includes('Applied') ? 'text-emerald-600' : 'text-red-500'}`}>
                    {discountMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-600 font-bold text-center rounded-xl mb-6">
              Currently Out of Stock
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >Close</button>
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inStock ? `Add to Cart - €${total.toFixed(2)}` : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
