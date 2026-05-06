import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const MOCK_PROFILES = {
  restaurant_owner: {
    id: 'demo-owner-001',
    email: 'owner@demo.com',
    full_name: 'Star Doner Kebab',
    role: 'restaurant_owner',
    is_banned: false,
    phone: '+49 30 12345678',
    created_at: new Date().toISOString(),
  },
  supplier: {
    id: 'demo-supplier-001',
    email: 'supplier@demo.com',
    full_name: 'Berlin Halal Meats',
    role: 'supplier',
    is_banned: false,
    is_verified: true,
    phone: '+49 30 98765432',
    created_at: new Date().toISOString(),
  },
  admin: {
    id: 'demo-admin-001',
    email: 'admin@demo.com',
    full_name: 'ProCuro Admin',
    role: 'admin',
    is_banned: false,
    created_at: new Date().toISOString(),
  },
}

const STORAGE_KEY = 'procuro_mock_user'

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setProfile(JSON.parse(saved))
    } catch (_) {}
    setLoading(false)
  }, [])

  function signIn(email, password, role = 'restaurant_owner') {
    const base = MOCK_PROFILES[role] || MOCK_PROFILES.restaurant_owner
    const mock = { ...base, email: email || base.email }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mock))
    setProfile(mock)
    return mock
  }

  function signUp(name, email, role = 'restaurant_owner') {
    const base = MOCK_PROFILES[role] || MOCK_PROFILES.restaurant_owner
    const mock = { ...base, full_name: name || base.full_name, email: email || base.email }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mock))
    setProfile(mock)
    return mock
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('procuro_cart')
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user: profile,
      profile,
      role: profile?.role ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
