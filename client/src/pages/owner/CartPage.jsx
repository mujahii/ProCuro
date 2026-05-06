import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, Upload, CheckCircle, Loader2, CreditCard, Banknote } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../context/CartContext'
import { useAddresses } from '../../context/AddressContext'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import toast from 'react-hot-toast'

export default function CartPage() {
  const navigate = useNavigate()
  const { groupedBySupplier, total, updateQty, removeItem } = useCart()
  const { selectedAddress, addresses, selectAddress } = useAddresses()
  const { placeOrder, loading } = usePlaceOrder()
  const [paymentMethods, setPaymentMethods] = useState({})
  const [receiptFiles, setReceiptFiles] = useState({})
  const [bankDetails, setBankDetails] = useState({})

  const groups = Object.entries(groupedBySupplier)

  useEffect(() => {
    groups.forEach(([supplierId]) => {
      if (!paymentMethods[supplierId]) {
        setPaymentMethods(p => ({ ...p, [supplierId]: 'cash_on_delivery' }))
      }
    })
  }, [groupedBySupplier])

  async function loadBankDetails(supplierId) {
    if (bankDetails[supplierId]) return
    const { data } = await supabase
      .from('supplier_bank_details')
      .select('*')
      .eq('supplier_id', supplierId)
      .single()
    if (data) setBankDetails(d => ({ ...d, [supplierId]: data }))
  }

  function handlePaymentMethodChange(supplierId, method) {
    setPaymentMethods(p => ({ ...p, [supplierId]: method }))
    if (method === 'bank_transfer') loadBankDetails(supplierId)
  }

  function handleReceiptFile(supplierId, file) {
    if (file?.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setReceiptFiles(f => ({ ...f, [supplierId]: file }))
  }

  async function handlePlaceOrder() {
    if (groups.length === 0) return
    const fullGroups = {}
    for (const [supplierId, group] of groups) {
      const method = paymentMethods[supplierId] || 'cash_on_delivery'
      if (method === 'bank_transfer' && !receiptFiles[supplierId]) {
        toast.error(`Please upload a payment receipt for ${group.supplier?.business_name || 'supplier'}`)
        return
      }
      fullGroups[supplierId] = {
        ...group,
        paymentMethod: method,
        receiptFile: receiptFiles[supplierId] || null,
      }
    }
    try {
      await placeOrder({ groups: fullGroups, totalAmount: total })
      toast.success('Order placed successfully!')
      navigate('/owner/orders')
    } catch (err) {
      toast.error(err.message || 'Order failed. Please try again.')
    }
  }

  if (groups.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <button onClick={() => navigate('/owner/store')} className="btn-primary mt-4">Browse Products</button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Checkout</h1>

      {/* Delivery address */}
      <div className="card p-4 mb-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Delivery Address</h2>
        <div className="flex flex-wrap gap-2">
          {addresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => selectAddress(addr.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${selectedAddress?.id === addr.id ? 'border-primary bg-primary-50 text-primary font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {addr.label || addr.city}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier groups */}
      <div className="space-y-4 mb-6">
        {groups.map(([supplierId, group]) => {
          const method = paymentMethods[supplierId] || 'cash_on_delivery'
          const bank = bankDetails[supplierId]

          return (
            <div key={supplierId} className="card overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{group.supplier?.business_name || 'Supplier'}</p>
              </div>

              <div className="px-5">
                {group.items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-500">€{Number(item.product.price).toFixed(2)} / {item.product.unit_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-7 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeItem(item.productId)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-bold w-16 text-right">€{(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-4">
                <div className="flex justify-end mb-3">
                  <p className="text-sm font-bold text-gray-900">Subtotal: €{group.subtotal.toFixed(2)}</p>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePaymentMethodChange(supplierId, 'cash_on_delivery')}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${method === 'cash_on_delivery' ? 'border-primary bg-primary-50 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <Banknote className="w-4 h-4" /> Cash on Delivery
                    </button>
                    <button
                      onClick={() => handlePaymentMethodChange(supplierId, 'bank_transfer')}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${method === 'bank_transfer' ? 'border-primary bg-primary-50 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      <CreditCard className="w-4 h-4" /> Bank Transfer
                    </button>
                  </div>

                  {method === 'bank_transfer' && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-4">
                      {bank ? (
                        <div className="space-y-1 mb-3">
                          <p className="text-xs font-bold text-gray-700 mb-2">Transfer to:</p>
                          <p className="text-sm"><span className="text-gray-500">Bank:</span> {bank.bank_name}</p>
                          <p className="text-sm"><span className="text-gray-500">Account:</span> {bank.account_holder}</p>
                          <p className="text-sm font-mono font-semibold"><span className="text-gray-500 font-sans font-normal">IBAN:</span> {bank.iban}</p>
                          <p className="text-sm"><span className="text-gray-500">BIC:</span> {bank.bic}</p>
                          <p className="text-sm font-semibold text-primary">Amount: €{group.subtotal.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mb-3">Loading bank details...</p>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Upload Payment Receipt *</p>
                        <div className="border-2 border-dashed border-blue-200 rounded-lg p-3 text-center">
                          <input type="file" accept="image/*,.pdf" className="hidden" id={`receipt-${supplierId}`} onChange={e => handleReceiptFile(supplierId, e.target.files[0])} />
                          <label htmlFor={`receipt-${supplierId}`} className="cursor-pointer">
                            {receiptFiles[supplierId] ? (
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600 font-medium">{receiptFiles[supplierId].name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-blue-500">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">Upload receipt</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order summary */}
      <div className="card p-5 mb-5">
        <div className="flex justify-between text-lg font-black">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{groups.length} supplier{groups.length > 1 ? 's' : ''} · {Object.values(groupedBySupplier).reduce((s, g) => s + g.items.length, 0)} item{total > 1 ? 's' : ''}</p>
      </div>

      <button onClick={handlePlaceOrder} disabled={loading} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Order'}
      </button>
    </div>
  )
}
