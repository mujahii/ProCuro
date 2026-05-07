import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)  // raw Supabase session user
  const [profile, setProfile] = useState(null)    // public.users row
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, supplier_profiles(business_name)')
      .eq('id', userId)
      .single()
    if (error) return null
    const sp = Array.isArray(data?.supplier_profiles)
      ? data.supplier_profiles[0]
      : data?.supplier_profiles
    const { supplier_profiles: _, ...rest } = data
    return { ...rest, business_name: sp?.business_name || null }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (p?.is_banned) {
          await supabase.auth.signOut()
          toast.error('Your account has been suspended.')
          setAuthUser(null)
          setProfile(null)
        } else {
          setProfile(p)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (p?.is_banned) {
          await supabase.auth.signOut()
          toast.error('Your account has been suspended.')
          setAuthUser(null)
          setProfile(null)
        } else {
          setProfile(p)
        }
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
    setAuthUser(data.user)
    const p = await fetchProfile(data.user.id)
    if (p?.is_banned) {
      await supabase.auth.signOut()
      throw new Error('Your account has been suspended.')
    }
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
