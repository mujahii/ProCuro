import { X, ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import ModalPortal from '../ui/ModalPortal'

export default function CartDrawer({ open, onClose }) {
  const { groupedBySupplier, itemCount, total, updateQty, removeItem } = useCart()
  const groups = Object.values(groupedBySupplier)

  return (
    <>
      {open && <ModalPortal><div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} /></ModalPortal>}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-900">Cart ({itemCount})</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-medium text-gray-500">Your cart is empty</p>
              <button onClick={onClose} className="mt-4 btn-primary text-sm py-2">Browse Products</button>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.supplierId} className="border-b border-gray-100">
                <div className="bg-lionsmane px-5 py-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {group.supplier?.business_name || 'Supplier'}
                  </p>
                </div>
                <div className="px-5">
                  {group.items.map(item => (
                    <div key={item.productId} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">€{Number(item.product.price).toFixed(2)}/{item.product.unit_type}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-sm"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs font-semibold text-right py-2 text-gray-700">
                    Subtotal: €{group.subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {groups.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>€{total.toFixed(2)}</span>
            </div>
            <Link
              to="/owner/cart"
              onClick={onClose}
              className="btn-primary w-full text-center"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
