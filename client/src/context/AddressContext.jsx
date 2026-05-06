import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AddressContext = createContext(null)

export function AddressProvider({ children }) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)

  useEffect(() => {
    if (user) {
      loadAddresses()
    } else {
      setAddresses([])
      setSelectedAddress(null)
    }
  }, [user])

  async function loadAddresses() {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })

    if (data) {
      setAddresses(data)
      setSelectedAddress(data.find(a => a.is_default) || data[0] || null)
    }
  }

  function selectAddress(id) {
    const addr = addresses.find(a => a.id === id)
    if (addr) setSelectedAddress(addr)
  }

  async function addAddress(addressData) {
    const isFirst = addresses.length === 0
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...addressData, user_id: user.id, is_default: isFirst })
      .select()
      .single()
    if (error) throw error
    setAddresses(prev => [...prev, data])
    if (isFirst) setSelectedAddress(data)
    return data
  }

  async function updateAddress(id, addressData) {
    const { data, error } = await supabase
      .from('addresses')
      .update(addressData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setAddresses(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  async function deleteAddress(id) {
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) throw error
    setAddresses(prev => prev.filter(a => a.id !== id))
    if (selectedAddress?.id === id) {
      const remaining = addresses.filter(a => a.id !== id)
      setSelectedAddress(remaining[0] || null)
    }
  }

  async function setDefault(id) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    selectAddress(id)
  }

  return (
    <AddressContext.Provider value={{ addresses, selectedAddress, selectAddress, addAddress, updateAddress, deleteAddress, setDefault, reload: loadAddresses }}>
      {children}
    </AddressContext.Provider>
  )
}

export function useAddresses() {
  return useContext(AddressContext)
}
