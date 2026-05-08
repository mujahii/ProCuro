import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)  // raw Supabase session user
  const [profile, setProfile] = useState(null)    // public.users row
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, supplier_profiles(business_name), owner_profiles(*)')
      .eq('id', userId)
      .single()
    if (error) return null
    const sp = Array.isArray(data?.supplier_profiles) ? data.supplier_profiles[0] : data?.supplier_profiles
    const op = Array.isArray(data?.owner_profiles) ? data.owner_profiles[0] : data?.owner_profiles
    const { supplier_profiles: _sp, owner_profiles: _op, ...rest } = data
    return {
      ...rest,
      business_name: sp?.business_name || null,
      restaurant_name: op?.restaurant_name || null,
      bio: op?.bio || null,
      tax_id: op?.tax_id || null,
      city: op?.city || null,
      website: op?.website || null,
      cuisine: op?.cuisine || null,
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setAuthUser(session.user)
        setProfile(p)
      } else {
        setAuthUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const p = await fetchProfile(data.user.id)
    setAuthUser(data.user)
    setProfile(p)
    return p
  }

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
    return p
  }

  function updateProfileState(updates) {
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: 'global' })
    localStorage.removeItem('procuro_cart')
    setAuthUser(null)
    setProfile(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{
      user: profile,
      authUser,
      profile,
      role: profile?.role ?? null,
      loading,
      signIn,
      signOut,
      refreshProfile,
      updateProfileState,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
