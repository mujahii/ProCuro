import { useState } from 'react'
import { ImageOff, Plus, Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

function getImageUrl(imagePath) {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath, {
    transform: { width: 400, height: 300, resize: 'cover' },
  })
  return data?.publicUrl
}

export default function ProductCard({ product, onAddToCart, onReport }) {
  const { user, role } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)
  const imageUrl = getImageUrl(product.image_url)

  const discountPct = product.discount_percentage
  const displayPrice = discountPct > 0
    ? (Number(product.price) * (1 - discountPct / 100))
    : Number(product.price)

  function handleAdd() {
    if (!user) { navigate('/login'); return }
    if (role !== 'restaurant_owner') return
    if (onAddToCart) {
      onAddToCart(product)
    } else {
      addItem(product, 1)
      toast.success(`${product.name} ${t('addedToCart')}`)
    }
  }

  const outOfStock = product.stock_quantity === 0 || product.is_active === false

  return (
    <div className="card card-lift overflow-hidden active:scale-[0.98]">
      {/* Image */}
      <div className="relative h-40 bg-lionsmane overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageOff className="w-8 h-8 text-marigold/40" />
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-white/90 backdrop-blur-sm text-midnight text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm">
            {product.category}
          </span>
        </div>

        {/* Discount badge */}
        {discountPct > 0 && (
          <div className="absolute top-2 right-2">
            <span className="bg-marigold text-midnight text-xs px-2 py-0.5 rounded-full font-bold">
              -{discountPct}%
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-midnight/50 flex items-center justify-center">
            <span className="bg-midnight text-white text-xs font-bold px-3 py-1 rounded-full">Sold Out</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        <p className="text-[11px] text-herb font-semibold uppercase tracking-wide mb-0.5 truncate">
          {product.supplier?.business_name || 'Supplier'}
        </p>
        <h3 className="font-display font-bold text-midnight text-sm leading-snug line-clamp-2 mb-2">
          {product.name}
        </h3>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-midnight">€{displayPrice.toFixed(2)}</span>
              <span className="text-xs text-herb">/{product.unit_type}</span>
            </div>
            {discountPct > 0 && (
              <span className="text-xs text-herb/60 line-through">€{Number(product.price).toFixed(2)}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onReport && role === 'restaurant_owner' && (
              <button
                onClick={e => { e.stopPropagation(); onReport(product) }}
                className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors"
                aria-label="Report product"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
            {role !== 'supplier' && role !== 'admin' && (
              <button
                onClick={handleAdd}
                disabled={outOfStock}
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/25 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-transform"
                aria-label="Add to cart"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
