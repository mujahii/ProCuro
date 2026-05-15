import { useState, useEffect } from 'react'
import { X, Truck, Package, Flag, MapPin, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { supabase } from '../../lib/supabase'
import ModalPortal from '../ui/ModalPortal'
import ReportModal from '../ui/ReportModal'
import toast from 'react-hot-toast'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function AddToCartModal({ product, onClose }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedAddress } = useAddresses()
  const [qty, setQty] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [ownerHasLocation, setOwnerHasLocation] = useState(true)

  const price = Number(product.price)
  const inStock = product.is_active
  const total = price * qty * (1 - appliedDiscount)
  const imgUrl = getProductImageUrl(product.image_url)

  useEffect(() => {
    calcDeliveryFee()
  }, [selectedAddress])

  async function calcDeliveryFee() {
    setDeliveryLoading(true)
    try {
      // Get owner location: from selected address, or from owner_profiles
      let ownerLat = selectedAddress?.latitude
      let ownerLng = selectedAddress?.longitude

      if ((!ownerLat || !ownerLng) && user) {
        const { data: op } = await supabase
          .from('owner_profiles')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .maybeSingle()
        ownerLat = op?.latitude
        ownerLng = op?.longitude
      }

      if (!ownerLat || !ownerLng) {
        setOwnerHasLocation(false)
        setDeliveryFee(null)
        return
      }
      setOwnerHasLocation(true)

      // Get supplier location
      const { data: sp } = await supabase
        .from('supplier_profiles')
        .select('latitude, longitude')
        .eq('id', product.supplier_id)
        .maybeSingle()

      if (!sp?.latitude || !sp?.longitude) {
        setDeliveryFee(0)
        return
      }

      const km = haversineKm(ownerLat, ownerLng, sp.latitude, sp.longitude)

      // Look up fee from rules table
      const { data: rules } = await supabase
        .from('delivery_fee_rules')
        .select('*')
        .order('min_km', { ascending: true })

      const rule = rules?.find(r => km >= r.min_km && (r.max_km === null || km < r.max_km))
      setDeliveryFee(rule ? Number(rule.fee) : 0)
    } catch {
      setDeliveryFee(null)
    } finally {
      setDeliveryLoading(false)
    }
  }

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
    addItem({ ...product, delivery_fee: deliveryFee ?? 0 }, qty)
    toast.success(`${product.name} added to cart`)
    onClose()
  }

  return (
    <>
    <ModalPortal><div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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
            <p className="text-slate-600 mb-4 leading-relaxed">{product.description}</p>
          )}

          {/* Delivery fee row */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {deliveryLoading ? (
              <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating delivery fee…</span>
            ) : !ownerHasLocation ? (
              <button
                onClick={() => { onClose(); navigate('/owner/profile') }}
                className="text-amber-600 font-semibold hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" /> Add your location to see delivery fee
              </button>
            ) : deliveryFee === null ? (
              <span className="text-slate-400">Delivery fee unavailable</span>
            ) : deliveryFee === 0 ? (
              <span className="text-emerald-600 font-semibold">Free delivery</span>
            ) : (
              <span className="text-slate-600">Delivery: <span className="font-semibold text-slate-800">€{deliveryFee.toFixed(2)}</span></span>
            )}
          </div>

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

          {/* Report button */}
          <button
            onClick={() => setShowReport(true)}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors mx-auto"
          >
            <Flag className="w-3.5 h-3.5" /> Report this product
          </button>
        </div>
      </div>
    </div></ModalPortal>
    {showReport && (
      <ReportModal
        type="product"
        targetId={product.id}
        targetName={product.name}
        onClose={() => setShowReport(false)}
      />
    )}
  </>
  )
}
