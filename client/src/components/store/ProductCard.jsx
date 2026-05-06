import { useState } from 'react'
import { ShoppingCart, ImageOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function getImageUrl(imagePath) {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath, {
    transform: { width: 400, height: 300, resize: 'cover' },
  })
  return data?.publicUrl
}

export default function ProductCard({ product, onAddToCart }) {
  const { user, role } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const imageUrl = getImageUrl(product.image_url)

  function handleAdd() {
    if (!user) {
      navigate('/login')
      return
    }
    if (role !== 'restaurant_owner') return
    if (onAddToCart) {
      onAddToCart(product)
    } else {
      addItem(product, 1)
      toast.success(`${product.name} added to cart`)
    }
  }

  return (
    <div className="card overflow-hidden group hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-primary/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {product.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">
          {product.supplier?.business_name || 'Supplier'}
        </p>
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-black text-gray-900">€{Number(product.price).toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">/{product.unit_type}</span>
          </div>
          {product.stock_quantity !== undefined && (
            <span className={`text-xs ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </span>
          )}
        </div>

        {role !== 'supplier' && role !== 'admin' && (
          <button
            onClick={handleAdd}
            disabled={product.stock_quantity === 0}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            {!user ? 'Log in to Order' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  )
}
