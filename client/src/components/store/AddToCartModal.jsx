import { useState, useEffect } from 'react'
import { X, Truck, Package, Flag, MapPin, Loader2, Share2, Ban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAddresses } from '../../context/AddressContext'
import { useLanguage } from '../../context/LanguageContext'
import { supabase } from '../../lib/supabase'
import { forwardGeocode } from '../../lib/geocode'
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
  const { t } = useLanguage()
  const { selectedAddress, addresses } = useAddresses()
  const [qty, setQty] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [ownerHasLocation, setOwnerHasLocation] = useState(true)
  const [supplierBanned, setSupplierBanned] = useState(false)

  const price = Number(product.price)
  const inStock = product.is_active
  const total = price * qty * (1 - appliedDiscount)
  const imgUrl = getProductImageUrl(product.image_url)
  const canAdd = inStock && !supplierBanned

  useEffect(() => {
    calcDeliveryFee()
  }, [selectedAddress])

  useEffect(() => {
    let cancelled = false
    async function checkSupplierBan() {
      if (!product.supplier_id) return
      const { data } = await supabase
        .from('supplier_profiles')
        .select('users:user_id(is_banned)')
        .eq('id', product.supplier_id)
        .maybeSingle()
      if (!cancelled) setSupplierBanned(data?.users?.is_banned === true)
    }
    checkSupplierBan()
    return () => { cancelled = true }
  }, [product.supplier_id])

  async function calcDeliveryFee() {
    setDeliveryLoading(true)
    try {
      // No selected address → ask user to add one; never fall back to other sources
      if (!selectedAddress) {
        setOwnerHasLocation(false)
        setDeliveryFee(null)
        return
      }

      let ownerLat = selectedAddress.latitude || null
      let ownerLng = selectedAddress.longitude || null

      // If selected address has no coordinates, forward-geocode its city/postcode
      if (!ownerLat && (selectedAddress.city || selectedAddress.postal_code)) {
        const query = [selectedAddress.postal_code, selectedAddress.city].filter(Boolean).join(' ')
        try {
          const geo = await forwardGeocode(query)
          if (geo) { ownerLat = parseFloat(geo.lat); ownerLng = parseFloat(geo.lon) }
        } catch {}
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
      setDiscountMessage(t('discountApplied'))
    } else {
      setAppliedDiscount(0)
      setDiscountMessage(t('discountInvalid'))
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/supplier/${product.supplier_id}`
    if (navigator.share) {
      await navigator.share({ title: product.name, text: `${product.name} at ${product.supplier?.business_name} on ProCuro`, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  function handleAdd() {
    if (supplierBanned) {
      toast.error(t('supplierBannedCannotAdd'))
      return
    }
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
          <button
            onClick={handleShare}
            className="absolute top-4 left-4 bg-white/50 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors"
            title="Share product"
          >
            <Share2 className="w-5 h-5 text-slate-700" />
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
                className="text-midnight font-bold text-lg hover:underline text-left"
              >{product.supplier?.business_name}</button>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">€{price.toFixed(2)}</p>
              <p className="text-xs text-slate-400">{t('perUnit')} {product.unit_type}</p>
            </div>
          </div>

          {product.description && (
            <p className="text-slate-600 mb-4 leading-relaxed">{product.description}</p>
          )}

          {supplierBanned && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4 flex items-start gap-2">
              <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 text-sm">{t('supplierBannedTitle')}</p>
                <p className="text-xs text-red-600 mt-0.5">{t('supplierBannedBanner')}</p>
              </div>
            </div>
          )}

          {/* Delivery fee row */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {deliveryLoading ? (
              <span className="text-slate-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('calculatingDeliveryFee')}</span>
            ) : !ownerHasLocation ? (
              <button
                onClick={() => { onClose(); navigate('/owner/profile') }}
                className="text-marigold font-semibold hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" /> {t('addAddressForDelivery')}
              </button>
            ) : deliveryFee === null ? (
              <span className="text-slate-400">{t('deliveryFeeUnavailable')}</span>
            ) : deliveryFee === 0 ? (
              <span className="text-midnight font-semibold">{t('freeDelivery')}</span>
            ) : (
              <span className="text-slate-600">{t('deliveryLabelText')} <span className="font-semibold text-slate-800">€{deliveryFee.toFixed(2)}</span></span>
            )}
          </div>

          {inStock ? (
            <div className="space-y-4 mb-6">
              {/* Quantity */}
              <div className="flex items-center gap-4 p-4 bg-lionsmane rounded-xl">
                <span className="font-bold text-slate-700">{t('quantity')}</span>
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
                    placeholder={t('discountCode')}
                    className="flex-1 p-3 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-herb focus:border-transparent"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-lionsmane transition-colors"
                  >{t('apply')}</button>
                </div>
                {discountMessage && (
                  <p className={`text-xs mt-1 ${discountMessage.includes('Applied') ? 'text-midnight' : 'text-red-500'}`}>
                    {discountMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-600 font-bold text-center rounded-xl mb-6">
              {t('currentlyOutOfStock')}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-lionsmane transition-colors"
            >{t('close')}</button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="flex-[2] py-3 bg-midnight text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {supplierBanned
                ? t('supplierBannedShort')
                : inStock
                  ? `${t('addToCart')} - €${total.toFixed(2)}`
                  : t('unavailable')}
            </button>
          </div>

          {/* Report button */}
          <button
            onClick={() => setShowReport(true)}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors mx-auto"
          >
            <Flag className="w-3.5 h-3.5" /> {t('reportThisProduct')}
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
