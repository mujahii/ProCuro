import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, Plus } from 'lucide-react'
import { useAddresses } from '../../context/AddressContext'
import { useAuth } from '../../context/AuthContext'

export default function AddressSwitcher({ onAddNew }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addresses, selectedAddress, selectAddress } = useAddresses()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm transition-colors max-w-xs"
      >
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="truncate max-w-[160px] text-gray-700 font-medium">
          {selectedAddress ? `${selectedAddress.label || selectedAddress.city}` : 'Add address'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
          {addresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => { selectAddress(addr.id); setOpen(false) }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 ${selectedAddress?.id === addr.id ? 'bg-primary-50' : ''}`}
            >
              <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedAddress?.id === addr.id ? 'text-primary' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{addr.label || 'Address'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{addr.street}, {addr.city}</p>
              </div>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onAddNew?.(); navigate('/owner/profile#addresses') }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-sm text-primary font-medium"
            >
              <Plus className="w-4 h-4" /> Add new address
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
