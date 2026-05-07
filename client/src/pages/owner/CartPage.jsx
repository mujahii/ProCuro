import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, Upload, CheckCircle, Loader2, CreditCard, Banknote, ArrowLeft, MapPin, Package, Truck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../context/CartContext'
import { useAddresses } from '../../context/AddressContext'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import toast from 'react-hot-toast'

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function CartPage() {
  const navigate = useNavigate()
  const { groupedBySupplier, total, updateQty, removeItem, clearCart } = useCart()
  const { selectedAddress, addresses, selectAddress } = useAddresses()
  const { placeOrder, loading } = usePlaceOrder()
  const [step, setStep] = useState(1)
  const [selectedPayment, setSelectedPayment] = useState('')
  const [receiptFiles, setReceiptFiles] = useState({})
  const [bankDetails, setBankDetails] = useState({})
  const [orderIds, setOrderIds] = useState([])

  const groups = Object.entries(groupedBySupplier)

  useEffect(() => {
    if (step === 2) {
      groups.forEach(async ([supplierId]) => {
        if (!bankDetails[supplierId]) {
          const { data } = await supabase.from('supplier_bank_details').select('*').eq('supplier_id', supplierId).single()
          if (data) setBankDetails(d => ({ ...d, [supplierId]: data }))
        }
      })
    }
  }, [step])

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => navigate('/owner/store'), 4000)
      return () => clearTimeout(timer)
    }
  }, [step])

  function handleReceiptFile(supplierId, file) {
    if (file?.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setReceiptFiles(f => ({ ...f, [supplierId]: file }))
  }

  async function handlePlaceOrder() {
    if (selectedPayment === 'bank_transfer') {
      const missingReceipt = groups.find(([supplierId]) => !receiptFiles[supplierId])
      if (missingReceipt) {
        toast.error('Please upload a payment receipt for all suppliers')
        return
      }
    }
    const fullGroups = {}
    for (const [supplierId, group] of groups) {
      fullGroups[supplierId] = {
        ...group,
        paymentMethod: selectedPayment,
        receiptFile: receiptFiles[supplierId] || null,
      }
    }
    try {
      const ids = await placeOrder({ groups: fullGroups, totalAmount: total })
      setOrderIds(ids || [])
      clearCart?.()
      setStep(3)
    } catch (err) {
      toast.error(err.message || 'Order failed. Please try again.')
    }
  }

  if (groups.length === 0 && step !== 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 text-sm mb-6">Add some products from the store to get started.</p>
        <button
          onClick={() => navigate('/owner/store')}
          className="bg-slate-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-md"
        >
          Browse Products
        </button>
      </div>
    )
  }

  /* Step 3 — Success */
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Placed!</h1>
        <p className="text-slate-500 mb-2">Your order has been sent to the supplier(s).</p>
        {orderIds.length > 0 && (
          <div className="space-y-1 mb-6">
            {orderIds.map(id => (
              <p key={id} className="text-xs text-slate-400 font-mono">Order #{id}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mb-6">Redirecting to store in a few seconds...</p>
        <button
          onClick={() => navigate('/owner/store')}
          className="bg-slate-900 text-white font-bold px-8 py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-md"
        >
          Back to Store
        </button>
      </div>
    )
  }

  /* Step 2 — Payment */
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </button>

        <h1 className="text-2xl font-bold text-slate-900">Payment Method</h1>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'card', icon: CreditCard, label: 'Card Payment' },
            { id: 'cash_on_delivery', icon: Banknote, label: 'Cash on Delivery' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSelectedPayment(id)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${selectedPayment === id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}
            >
              <Icon className="w-8 h-8" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>

        <div
          onClick={() => setSelectedPayment('bank_transfer')}
          className={`p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer transition-all ${selectedPayment === 'bank_transfer' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPayment === 'bank_transfer' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
            {selectedPayment === 'bank_transfer' && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div>
            <p className={`font-semibold text-sm ${selectedPayment === 'bank_transfer' ? 'text-emerald-700' : 'text-slate-700'}`}>Bank Transfer</p>
            <p className="text-xs text-slate-400">Transfer to supplier's account + upload receipt</p>
          </div>
        </div>

        {selectedPayment === 'bank_transfer' && (
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
            {groups.map(([supplierId, group]) => {
              const bank = bankDetails[supplierId]
              return (
                <div key={supplierId}>
                  <p className="font-bold text-slate-900 mb-2">{group.supplier?.business_name}</p>
                  {bank ? (
                    <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1 mb-3">
                      <p><span className="text-slate-500">Account:</span> <span className="font-medium">{bank.account_holder || bank.account_name}</span></p>
                      <p><span className="text-slate-500">IBAN:</span> <span className="font-mono font-semibold">{bank.iban}</span></p>
                      <p><span className="text-slate-500">Amount:</span> <span className="font-bold text-emerald-700">€{group.subtotal.toFixed(2)}</span></p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mb-3">Loading bank details...</p>
                  )}
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                    <input type="file" accept="image/*,.pdf" className="hidden" id={`receipt-${supplierId}`} onChange={e => handleReceiptFile(supplierId, e.target.files[0])} />
                    <label htmlFor={`receipt-${supplierId}`} className="cursor-pointer flex flex-col items-center gap-2">
                      {receiptFiles[supplierId] ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-600" />
                          <p className="text-sm font-medium text-emerald-700">{receiptFiles[supplierId].name}</p>
                          <p className="text-xs text-slate-400">Click to change</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">Upload payment receipt</p>
                          <p className="text-xs text-slate-400">Image or PDF</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedPayment === 'cash_on_delivery' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <p className="font-semibold mb-1">Cash on Delivery</p>
            <p>Please have the exact amount of <strong>€{total.toFixed(2)}</strong> ready when your order arrives.</p>
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={!selectedPayment || loading}
          className="w-full py-4 text-lg bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Place Order — €${(total + groups.reduce((s, [, g]) => s + Number(g.items[0]?.product?.delivery_fee || 0), 0)).toFixed(2)}`}
        </button>
      </div>
    )
  }

  /* Step 1 — Cart */
  const totalDelivery = groups.reduce((sum, [, group]) => {
    const fee = group.items[0]?.product?.delivery_fee || 0
    return sum + Number(fee)
  }, 0)
  const grandTotal = total + totalDelivery

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Cart</h1>

      {/* Delivery address */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium mb-0.5">Delivering To</p>
          {selectedAddress ? (
            <p className="text-sm font-semibold text-slate-900 truncate">{selectedAddress.street || selectedAddress.label || selectedAddress.city}</p>
          ) : (
            <p className="text-sm text-slate-400">No address selected</p>
          )}
        </div>
        {addresses.length > 1 && (
          <select
            value={selectedAddress?.id || ''}
            onChange={e => selectAddress(e.target.value)}
            className="text-xs text-emerald-600 font-semibold bg-transparent border-none outline-none cursor-pointer"
          >
            {addresses.map(a => (
              <option key={a.id} value={a.id}>{a.label || a.city}</option>
            ))}
          </select>
        )}
      </div>

      {/* Cart items grouped by supplier */}
      <div className="space-y-3">
        {groups.map(([supplierId, group]) => {
          const deliveryFee = Number(group.items[0]?.product?.delivery_fee || 0)
          return (
            <div key={supplierId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{group.supplier?.business_name || 'Supplier'}</p>
              </div>
              <div className="divide-y divide-slate-50">
                {group.items.map(item => {
                  const imgUrl = getProductImageUrl(item.product.image_url)
                  return (
                    <div key={item.productId} className="flex items-center gap-4 p-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-7 h-7" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{item.product.name}</p>
                        <p className="text-xs text-slate-400">€{Number(item.product.price).toFixed(2)} / {item.product.unit_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors">
                          <Minus className="w-3 h-3 text-slate-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors">
                          <Plus className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-slate-900 w-14 text-right">€{(item.product.price * item.quantity).toFixed(2)}</p>
                      <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
              {/* Per-supplier subtotal + delivery */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Items subtotal</span>
                  <span>€{group.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery</span>
                  <span>{deliveryFee > 0 ? `€${deliveryFee.toFixed(2)}` : <span className="text-emerald-600 font-medium">Free</span>}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-slate-100">
                  <span>Supplier total</span>
                  <span>€{(group.subtotal + deliveryFee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>
        <div className="space-y-2 mb-3">
          {groups.map(([supplierId, group]) => {
            const fee = Number(group.items[0]?.product?.delivery_fee || 0)
            return (
              <div key={supplierId} className="flex justify-between text-sm text-slate-500">
                <span className="truncate mr-2">{group.supplier?.business_name || 'Supplier'}</span>
                <span className="font-medium text-slate-700 flex-shrink-0">€{(group.subtotal + fee).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Items subtotal</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Total delivery</span>
            <span>{totalDelivery > 0 ? `€${totalDelivery.toFixed(2)}` : <span className="text-emerald-600 font-medium">Free</span>}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-lg text-slate-900">
            <span>Grand Total</span>
            <span>€{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md text-base"
      >
        Continue to Payment — €{grandTotal.toFixed(2)}
      </button>
    </div>
  )
}
