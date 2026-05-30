import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, Upload, CheckCircle, Loader2, CreditCard, Banknote, ArrowLeft, MapPin, Package, Truck, ChevronRight, X, Navigation, AlertTriangle, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { reverseGeocode, forwardGeocode } from '../../lib/geocode'
import { haversineKm } from '../../lib/haversine'
import { useCart } from '../../context/CartContext'
import { useAddresses } from '../../context/AddressContext'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'
import SupplierProfileModal from '../../components/profile/SupplierProfileModal'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function CartPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { groupedBySupplier, total, updateQty, removeItem, clearCart } = useCart()
  const { selectedAddress, addresses, selectAddress } = useAddresses()
  const { placeOrder, loading } = usePlaceOrder()
  const [step, setStep] = useState(1)
  const [selectedPayment, setSelectedPayment] = useState('')
  const [receiptFiles, setReceiptFiles] = useState({})
  const [bankDetails, setBankDetails] = useState({})
  const [orderIds, setOrderIds] = useState([])
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [deliveryFees, setDeliveryFees] = useState({})
  const [deliveryRecalcLoading, setDeliveryRecalcLoading] = useState(false)
  const [bannedSupplierIds, setBannedSupplierIds] = useState(new Set())
  const [taxRate, setTaxRate] = useState(0.07)
  const [profileModalId, setProfileModalId] = useState(null)

  const groups = Object.entries(groupedBySupplier)
  const supplierIdsKey = useMemo(() => groups.map(([id]) => id).sort().join(','), [groups])
  const hasBannedSupplierInCart = groups.some(([sid]) => bannedSupplierIds.has(sid))

  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'tax_rate').maybeSingle()
      .then(({ data }) => { if (data?.value) setTaxRate(parseFloat(data.value)) })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function checkBans() {
      if (groups.length === 0) { if (!cancelled) setBannedSupplierIds(new Set()); return }
      const supplierIds = groups.map(([id]) => id)
      const { data } = await supabase.from('supplier_profiles').select('id, users:user_id(is_banned)').in('id', supplierIds)
      const banned = new Set((data || []).filter(s => s.users?.is_banned === true).map(s => s.id))
      if (!cancelled) setBannedSupplierIds(banned)
    }
    checkBans()
    return () => { cancelled = true }
  }, [supplierIdsKey])

  // Recompute delivery fee per supplier whenever the selected delivery address changes
  useEffect(() => {
    let cancelled = false
    async function recalcAll() {
      if (groups.length === 0) return
      if (!selectedAddress) { if (!cancelled) setDeliveryFees({}); return }
      setDeliveryRecalcLoading(true)
      try {
        let ownerLat = selectedAddress.latitude || null
        let ownerLng = selectedAddress.longitude || null
        if (!ownerLat && (selectedAddress.city || selectedAddress.postal_code)) {
          const query = [selectedAddress.postal_code, selectedAddress.city].filter(Boolean).join(' ')
          try { const geo = await forwardGeocode(query); if (geo) { ownerLat = parseFloat(geo.lat); ownerLng = parseFloat(geo.lon) } } catch {}
        }
        const supplierIds = groups.map(([id]) => id)
        const [{ data: suppliers }, { data: rules }] = await Promise.all([
          supabase.from('supplier_profiles').select('id, latitude, longitude').in('id', supplierIds),
          supabase.from('delivery_fee_rules').select('*').order('min_km', { ascending: true }),
        ])
        const fees = {}
        for (const sid of supplierIds) {
          const sp = (suppliers || []).find(s => s.id === sid)
          if (!ownerLat || !ownerLng || !sp?.latitude || !sp?.longitude) { fees[sid] = 0; continue }
          const km = haversineKm(ownerLat, ownerLng, sp.latitude, sp.longitude)
          const rule = (rules || []).find(r => km >= r.min_km && (r.max_km === null || km < r.max_km))
          fees[sid] = rule ? Number(rule.fee) : 0
        }
        if (!cancelled) setDeliveryFees(fees)
      } finally { if (!cancelled) setDeliveryRecalcLoading(false) }
    }
    recalcAll()
    return () => { cancelled = true }
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude, supplierIdsKey])

  // Batch-fetch bank details when entering payment step (fixes N+1)
  useEffect(() => {
    if (step === 2 && groups.length > 0) {
      const supplierIds = groups.map(([id]) => id)
      supabase.from('supplier_bank_details').select('*').in('supplier_id', supplierIds)
        .then(({ data }) => {
          const map = {}
          ;(data || []).forEach(b => { map[b.supplier_id] = b })
          setBankDetails(map)
        })
    }
  }, [step])

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => navigate('/owner/store'), 4000)
      return () => clearTimeout(timer)
    }
  }, [step])

  function feeFor(supplierId, group) {
    if (deliveryFees[supplierId] != null) return Number(deliveryFees[supplierId])
    return Number(group.items[0]?.product?.delivery_fee || 0)
  }

  function taxFor(subtotal) { return subtotal * taxRate }

  function handleReceiptFile(supplierId, file) {
    if (file?.size > 5 * 1024 * 1024) { toast.error(t('toastFileTooLarge')); return }
    setReceiptFiles(f => ({ ...f, [supplierId]: file }))
  }

  async function handlePlaceOrder() {
    if (profile?.is_banned) { toast.error(t('toastAccountSuspended')); return }
    if (hasBannedSupplierInCart) { toast.error(t('supplierBannedCartNotice')); return }
    if (selectedPayment === 'bank_transfer') {
      const missingReceipt = groups.find(([supplierId]) => !receiptFiles[supplierId])
      if (missingReceipt) { toast.error(t('missingReceiptError')); return }
    }
    const fullGroups = {}
    for (const [supplierId, group] of groups) {
      fullGroups[supplierId] = { ...group, paymentMethod: selectedPayment, receiptFile: receiptFiles[supplierId] || null }
    }
    try {
      const totalWithTaxAndDelivery = groups.reduce((s, [sid, g]) => s + g.subtotal + feeFor(sid, g) + taxFor(g.subtotal), 0)
      const ids = await placeOrder({ groups: fullGroups, totalAmount: totalWithTaxAndDelivery, deliveryAddress: selectedAddress })
      setOrderIds(ids || [])
      clearCart?.()
      setStep(3)
    } catch (err) {
      toast.error(err.message || t('toastOrderFailed'))
    }
  }

  // — Totals (Step 1 summary + button)
  const totalDelivery = groups.reduce((sum, [sid, group]) => sum + feeFor(sid, group), 0)
  const totalTax = groups.reduce((sum, [, group]) => sum + taxFor(group.subtotal), 0)
  const grandTotal = total + totalDelivery + totalTax

  if (groups.length === 0 && step !== 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-midnight mb-2">{t('cartEmpty')}</h2>
        <p className="text-slate-500 text-sm mb-6">{t('cartEmptyMainDesc')}</p>
        <button onClick={() => navigate('/owner/store')} className="bg-midnight text-white font-bold px-6 py-3 rounded-xl hover:bg-midnight-dark transition-colors shadow-md">
          {t('cartEmptyBrowse')}
        </button>
      </div>
    )
  }

  /* Step 3 — Success */
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-celeste rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-midnight" />
        </div>
        <h1 className="text-3xl font-bold text-midnight mb-2">{t('orderPlacedTitle')}</h1>
        <p className="text-slate-500 mb-2">{t('orderPlacedDesc')}</p>
        {orderIds.length > 0 && (
          <div className="space-y-1 mb-6">
            {orderIds.map(id => <p key={id} className="text-xs text-slate-400 font-mono">Order #{id}</p>)}
          </div>
        )}
        <p className="text-xs text-slate-400 mb-6">{t('redirectingToStore')}</p>
        <button onClick={() => navigate('/owner/store')} className="bg-midnight text-white font-bold px-8 py-3 rounded-xl hover:bg-midnight-dark transition-colors shadow-md">
          {t('backToStore')}
        </button>
      </div>
    )
  }

  /* Step 2 — Payment */
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('backToCart')}
        </button>

        <h1 className="font-display text-2xl font-bold text-midnight">{t('paymentMethod')}</h1>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'bank_transfer', icon: CreditCard, label: t('bankTransfer') },
            { id: 'cash_on_delivery', icon: Banknote, label: t('cashOnDelivery') },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setSelectedPayment(id)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedPayment === id ? 'border-herb bg-lionsmane text-midnight-dark' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}
            >
              <Icon className="w-8 h-8" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Bank Transfer — per-supplier breakdown with total incl. delivery + 7% MwSt. */}
        {selectedPayment === 'bank_transfer' && (
          <div className="card p-5 space-y-5">
            {groups.map(([supplierId, group]) => {
              const bank = bankDetails[supplierId]
              const fee = feeFor(supplierId, group)
              const tax = taxFor(group.subtotal)
              const supplierGrandTotal = group.subtotal + fee + tax
              return (
                <div key={supplierId}>
                  <p className="font-bold text-midnight mb-2">{group.supplier?.business_name}</p>
                  {bank ? (
                    <div className="bg-lionsmane p-3 rounded-lg text-sm space-y-1 mb-3">
                      {bank.bank_name && (
                        <p><span className="text-slate-500">{t('bankNameLabel')}:</span> <span className="font-medium">{bank.bank_name}</span></p>
                      )}
                      <p><span className="text-slate-500">{t('accountHolderLabel')}:</span> <span className="font-medium">{bank.account_holder || bank.account_name}</span></p>
                      <p><span className="text-slate-500">{t('ibanLabel')}:</span> <span className="font-mono font-semibold">{bank.iban}</span></p>
                      {bank.bic && (
                        <p><span className="text-slate-500">{t('bicSwiftLabel')}:</span> <span className="font-mono font-semibold">{bank.bic}</span></p>
                      )}
                      <div className="border-t border-slate-200 pt-1 mt-1 space-y-0.5">
                        <p className="text-xs text-slate-400">{t('itemsSubtotal')}: €{group.subtotal.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{t('deliveryLineLabel')}: €{fee.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{t('taxLabel')}: €{tax.toFixed(2)}</p>
                      </div>
                      <p><span className="text-slate-500">{t('amountLabel')}:</span> <span className="font-bold text-midnight-dark">€{supplierGrandTotal.toFixed(2)}</span></p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mb-3">{t('loadingBankDetails')}</p>
                  )}
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-herb-light transition-colors">
                    <input type="file" accept="image/*,.pdf" className="hidden" id={`receipt-${supplierId}`} onChange={e => handleReceiptFile(supplierId, e.target.files[0])} />
                    <label htmlFor={`receipt-${supplierId}`} className="cursor-pointer flex flex-col items-center gap-2">
                      {receiptFiles[supplierId] ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-midnight" />
                          <p className="text-sm font-medium text-midnight-dark">{receiptFiles[supplierId].name}</p>
                          <p className="text-xs text-slate-400">{t('clickToChange')}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">{t('uploadReceiptLabel')}</p>
                          <p className="text-xs text-slate-400">{t('imageOrPdfLabel')}</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Cash on Delivery — per-supplier breakdown */}
        {selectedPayment === 'cash_on_delivery' && (
          <div className="bg-lionsmane border border-marigold-light rounded-xl p-4 text-sm text-marigold-dark space-y-3">
            <p className="font-bold text-base">{t('cashOnDelivery')}</p>
            {groups.map(([supplierId, group]) => {
              const fee = feeFor(supplierId, group)
              const tax = taxFor(group.subtotal)
              const supplierGrandTotal = group.subtotal + fee + tax
              return (
                <div key={supplierId} className="border-t border-marigold-light pt-2 first:border-0 first:pt-0">
                  <p className="font-semibold text-midnight-dark">{group.supplier?.business_name}: <strong>€{supplierGrandTotal.toFixed(2)}</strong></p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('itemsSubtotal')} €{group.subtotal.toFixed(2)} · {t('deliveryLineLabel')} €{fee.toFixed(2)} · {t('taxLabel')} €{tax.toFixed(2)}
                  </p>
                </div>
              )
            })}
            <div className="border-t border-marigold-light pt-2">
              <p className="font-bold text-midnight-dark">{t('grandTotal')}: <strong>€{grandTotal.toFixed(2)}</strong></p>
              <p className="text-xs text-slate-500 mt-0.5">{t('cashOnDeliveryNote')}</p>
            </div>
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={!selectedPayment || loading}
          className="w-full py-4 text-lg bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${t('placeOrderBtn')} — €${grandTotal.toFixed(2)}`}
        </button>
      </div>
    )
  }

  /* Step 1 — Cart */
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-midnight">{t('myCart')}</h1>

      {profile?.is_banned && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">{t('accountSuspendedTitle')}</p>
            <p className="text-sm text-red-700 mt-0.5">Your account has been suspended. You cannot place new orders. To appeal, please <a href="/owner/chat" className="font-semibold underline underline-offset-2 hover:text-red-900 inline-flex items-center gap-0.5">chat with the admin →</a></p>
          </div>
        </div>
      )}

      {/* Delivery address */}
      <button onClick={() => setShowAddressPicker(true)}
        className="w-full bg-lionsmane p-4 rounded-xl border border-slate-200 flex items-center gap-3 hover:border-celeste-dark transition-colors text-left"
      >
        <MapPin className="w-5 h-5 text-midnight flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium">{t('deliveringTo')}</p>
          {selectedAddress ? (
            <>
              <p className="text-sm font-semibold text-midnight truncate">
                {[selectedAddress.street, selectedAddress.house_number].filter(Boolean).join(' ') || selectedAddress.label}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {[selectedAddress.postal_code, selectedAddress.city, selectedAddress.country].filter(Boolean).join(', ')}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-midnight">{t('addDeliveryAddressBtn')}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {showAddressPicker && (
        <AddressPickerModal
          addresses={addresses}
          selectedAddress={selectedAddress}
          onSelect={id => { selectAddress(id); setShowAddressPicker(false) }}
          onClose={() => setShowAddressPicker(false)}
        />
      )}

      {/* Cart items grouped by supplier */}
      <div className="space-y-3">
        {groups.map(([supplierId, group]) => {
          const deliveryFee = feeFor(supplierId, group)
          const tax = taxFor(group.subtotal)
          const supplierIsBanned = bannedSupplierIds.has(supplierId)
          return (
            <div key={supplierId} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${supplierIsBanned ? 'border-red-300' : 'border-slate-100'}`}>
              <div className={`px-5 py-3 border-b flex items-center justify-between ${supplierIsBanned ? 'bg-red-50 border-red-200' : 'bg-lionsmane border-slate-100'}`}>
                <button
                  onClick={() => setProfileModalId(supplierId)}
                  className="font-bold text-midnight text-sm flex items-center gap-2 hover:text-midnight hover:underline underline-offset-2 transition-colors"
                >
                  {group.supplier?.business_name || 'Supplier'}
                  {supplierIsBanned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      <Ban className="w-3 h-3" /> {t('supplierBannedShort')}
                    </span>
                  )}
                </button>
              </div>
              {supplierIsBanned && (
                <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 text-xs text-red-700">{t('supplierBannedCartNotice')}</div>
              )}
              <div className="divide-y divide-slate-50">
                {group.items.map(item => {
                  const imgUrl = getProductImageUrl(item.product.image_url)
                  return (
                    <div key={item.productId} className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {imgUrl ? <img src={imgUrl} alt={item.product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="w-6 h-6" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-midnight text-sm leading-tight">{item.product.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">€{Number(item.product.price).toFixed(2)} / {item.product.unit_type}</p>
                        </div>
                        <p className="text-sm font-bold text-midnight flex-shrink-0">€{(item.product.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center justify-between pl-[68px]">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors"><Minus className="w-3 h-3 text-slate-600" /></button>
                          <span className="w-6 text-center text-sm font-bold text-midnight">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, Math.min(item.product.stock_quantity ?? Infinity, item.quantity + 1))} disabled={item.quantity >= (item.product.stock_quantity ?? Infinity)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="w-3 h-3 text-slate-600" /></button>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Per-supplier subtotal + delivery + tax */}
              <div className="px-5 py-3 border-t border-slate-100 bg-lionsmane/50 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{t('itemsSubtotal')}</span>
                  <span>€{group.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {t('deliveryLineLabel')}</span>
                  <span>{deliveryFee > 0 ? `€${deliveryFee.toFixed(2)}` : <span className="text-midnight font-medium">{t('freeText')}</span>}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{t('taxLabel')}</span>
                  <span>€{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-slate-100">
                  <span>{t('supplierTotal')}</span>
                  <span>€{(group.subtotal + deliveryFee + tax).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order summary */}
      <div className="card p-5">
        <h3 className="font-bold text-midnight mb-4">{t('orderSummary')}</h3>
        <div className="space-y-2 mb-3">
          {groups.map(([supplierId, group]) => {
            const fee = feeFor(supplierId, group)
            const tax = taxFor(group.subtotal)
            return (
              <div key={supplierId} className="flex justify-between text-sm text-slate-500">
                <span className="truncate mr-2">{group.supplier?.business_name || 'Supplier'}</span>
                <span className="font-medium text-slate-700 flex-shrink-0">€{(group.subtotal + fee + tax).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>{t('itemsSubtotal')}</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t('totalDeliveryLabel')}</span>
            <span>
              {deliveryRecalcLoading
                ? <span className="text-slate-400 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {t('loading')}</span>
                : totalDelivery > 0 ? `€${totalDelivery.toFixed(2)}` : <span className="text-midnight font-medium">{t('freeText')}</span>

              }
            </span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>{t('taxLabel')}</span>
            <span>€{totalTax.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-lg text-slate-900">
            <span>{t('grandTotal')}</span>
            <span>€{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!selectedAddress && (
        <p className="text-xs text-marigold font-medium text-center -mb-2">Please select a delivery address to continue</p>
      )}
      {hasBannedSupplierInCart && (
        <p className="text-xs text-red-600 font-medium text-center -mb-2">{t('supplierBannedCartNotice')}</p>
      )}
      <button
        onClick={() => setStep(2)}
        disabled={!!profile?.is_banned || !selectedAddress || deliveryRecalcLoading || hasBannedSupplierInCart}
        className="w-full py-4 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors shadow-md text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {deliveryRecalcLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('continueToPayment')} — €{grandTotal.toFixed(2)}
      </button>

      {profileModalId && (
        <SupplierProfileModal
          supplierId={profileModalId}
          businessName={groupedBySupplier[profileModalId]?.supplier?.business_name}
          onClose={() => setProfileModalId(null)}
        />
      )}
    </div>
  )
}

function AddressPickerModal({ addresses, selectedAddress, onSelect, onClose }) {
  const { addAddress } = useAddresses()
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(addresses.length === 0)
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [form, setForm] = useState({ label: '', street: '', postal_code: '', city: '' })

  function update(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function detectGPS() {
    if (!navigator.geolocation) { toast.error(t('toastGpsNotSupported')); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const data = await reverseGeocode(lat, lng)
          const addr = data.address || {}
          setForm(f => ({ ...f, street: [addr.road, addr.house_number].filter(Boolean).join(' ') || '', postal_code: addr.postcode || '', city: addr.city || addr.town || addr.village || addr.suburb || '', latitude: lat, longitude: lng }))
          toast.success(t('toastLocationDetectedCart'))
        } catch { toast.error(t('toastGpsCouldNotFetch')) } finally { setGpsLoading(false) }
      },
      () => { toast.error(t('toastGpsPermDenied')); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSave() {
    if (!form.street.trim() || !form.city.trim()) { toast.error(t('toastStreetCityRequired')); return }
    setSaving(true)
    try {
      const data = await addAddress(form)
      onSelect(data.id)
    } catch (err) {
      toast.error(err.message || t('toastFailedSaveAddress'))
      setSaving(false)
    }
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-0 sm:pb-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-midnight">{showForm ? t('addNewAddress') : t('deliveryAddress')}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {!showForm ? (
            <>
              {addresses.map(addr => (
                <button key={addr.id} onClick={() => onSelect(addr.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 flex items-start gap-3 transition-colors ${selectedAddress?.id === addr.id ? 'border-herb bg-lionsmane' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedAddress?.id === addr.id ? 'text-midnight' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    {addr.label && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{addr.label}</p>}
                    <p className="text-sm font-semibold text-midnight">{[addr.street, addr.house_number].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-slate-400">{[addr.postal_code, addr.city, addr.country].filter(Boolean).join(', ')}</p>
                  </div>
                  {selectedAddress?.id === addr.id && <CheckCircle className="w-4 h-4 text-herb ml-auto flex-shrink-0 mt-0.5" />}
                </button>
              ))}
              <button onClick={() => setShowForm(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm hover:border-herb-light hover:text-midnight transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" /> {t('addNewAddress')}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {addresses.length > 0 && (
                <button onClick={() => setShowForm(false)} className="text-sm text-herb font-bold underline underline-offset-2 hover:text-herb-dark flex items-center gap-1">
                  {t('backToSavedAddresses')}
                </button>
              )}
              <button type="button" onClick={detectGPS} disabled={gpsLoading}
                className="flex items-center gap-1.5 text-xs text-herb font-bold underline underline-offset-2 hover:text-herb-dark disabled:opacity-50">
                {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                {gpsLoading ? 'Detecting...' : t('useMyLocation')}
              </button>
              <div className="space-y-2.5">
                <input value={form.label} onChange={e => update('label', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                  placeholder={t('addressLabelHint')} />
                <input value={form.street} onChange={e => update('street', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                  placeholder={`${t('streetPlaceholderLabel')} *`} />
                <div className="flex gap-2">
                  <input value={form.postal_code} onChange={e => update('postal_code', e.target.value)}
                    className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                    placeholder={t('postalCodeLabel2')} />
                  <input value={form.city} onChange={e => update('city', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                    placeholder={`${t('cityLabel2')} *`} />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('saveAddressBtn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div></ModalPortal>
  )
}
