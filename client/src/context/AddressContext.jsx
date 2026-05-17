import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AddressContext = createContext(null)

// Keep the user's denormalised business-card city list aligned with the set
// of saved addresses. Cities the user no longer has any address for are
// removed; matching counts are preserved (so deleting one of two "Sepang"
// addresses keeps one Sepang chip). Returns null when nothing matches so
// the profile card falls back to its "Add address →" empty state.
function reconcileCities(profileCity, remainingAddresses) {
  const counts = {}
  for (const a of remainingAddresses) {
    if (a.city) counts[a.city] = (counts[a.city] || 0) + 1
  }
  const list = (profileCity || '').split(',').map(c => c.trim()).filter(Boolean)
  const filtered = []
  for (const c of list) {
    if ((counts[c] || 0) > 0) {
      filtered.push(c)
      counts[c] -= 1
    }
  }
  return filtered.length > 0 ? filtered.join(', ') : null
}

async function syncProfileCity(userId, role, remainingAddresses) {
  const table = role === 'supplier' ? 'supplier_profiles' : 'owner_profiles'
  const { data } = await supabase.from(table).select('city, latitude, longitude').eq('user_id', userId).maybeSingle()
  if (!data) return null
  const nextCity = reconcileCities(data.city, remainingAddresses)
  if (nextCity === data.city) return nextCity
  // If we cleared the city entirely, also clear the cached lat/lng so the
  // map link on the public profile doesn't point at a deleted location.
  const patch = nextCity === null
    ? { city: null, latitude: null, longitude: null }
    : { city: nextCity }
  await supabase.from(table).update(patch).eq('user_id', userId)
  return nextCity
}

export function AddressProvider({ children }) {
  const { user, role, refreshProfile, updateProfileState } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  // Bumped on every mutation so consumers (e.g. the supplier ProfilePage,
  // which keeps its own supplier_profile state) can refetch in sync.
  const [addressesVersion, setAddressesVersion] = useState(0)

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
    setAddressesVersion(v => v + 1)

    // If the user's business card currently has no location, seed it with
    // this new address so the card reflects the address book straight away.
    // (When the card already has cities the multi-city selection stays an
    // explicit choice via the Business Details modal.)
    if (user?.id && data.city) {
      const table = role === 'supplier' ? 'supplier_profiles' : 'owner_profiles'
      const { data: prof } = await supabase
        .from(table)
        .select('city')
        .eq('user_id', user.id)
        .maybeSingle()
      if (prof && !prof.city) {
        await supabase.from(table).update({
          city: data.city,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        }).eq('user_id', user.id)
        if (role !== 'supplier' && updateProfileState) {
          updateProfileState({
            city: data.city,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          })
        }
        if (refreshProfile) await refreshProfile()
      }
    }

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
    const remaining = addresses.filter(a => a.id !== id)
    setAddresses(remaining)
    if (selectedAddress?.id === id) {
      setSelectedAddress(remaining[0] || null)
    }
    setAddressesVersion(v => v + 1)
    // Keep the business-details card aligned with the address book.
    if (user?.id) {
      const nextCity = await syncProfileCity(user.id, role, remaining)
      if (role !== 'supplier' && updateProfileState) {
        updateProfileState({ city: nextCity })
      }
      if (refreshProfile) await refreshProfile()
    }
  }

  async function setDefault(id) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    selectAddress(id)
  }

  return (
    <AddressContext.Provider value={{ addresses, addressesVersion, selectedAddress, selectAddress, addAddress, updateAddress, deleteAddress, setDefault, reload: loadAddresses }}>
      {children}
    </AddressContext.Provider>
  )
}

export function useAddresses() {
  return useContext(AddressContext)
}
