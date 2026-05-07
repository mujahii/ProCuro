import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (p?.is_banned) {
          await supabase.auth.signOut()
          toast.error('Your account has been suspended.')
          setProfile(null)
        } else {
          setProfile(p)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (p?.is_banned) {
          await supabase.auth.signOut()
          toast.error('Your account has been suspended.')
          setProfile(null)
        } else {
          setProfile(p)
        }
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const p = await fetchProfile(data.user.id)
    if (p?.is_banned) {
      await supabase.auth.signOut()
      throw new Error('Your account has been suspended.')
    }
    setProfile(p)
    return p
  }

  async function signUp(name, email, password, role = 'restaurant_owner') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    })
    if (error) throw error

    // Insert into public.users
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: name,
        role,
      })
    }
    return data
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
    setProfile(null)
    window.location.href = '/'
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
