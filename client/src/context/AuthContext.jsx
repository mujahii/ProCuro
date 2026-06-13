import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)  // raw Supabase session user
  const [profile, setProfile] = useState(null)    // public.users row
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const currentUserId = useRef(null)               // last user id we fetched a profile for

  const fetchProfile = useCallback(async (userId) => {
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
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        currentUserId.current = session.user.id
        setAuthUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setAuthUser(u)
      if (!u) {
        currentUserId.current = null
        setProfile(null)
        return
      }
      // Only refetch the profile when the signed-in user actually changes.
      // Supabase fires SIGNED_IN/TOKEN_REFRESHED on tab focus; refetching on
      // every event caused a refetch storm. Defer out of the callback so we
      // never await a Supabase call inside onAuthStateChange (deadlock risk).
      if (u.id !== currentUserId.current) {
        currentUserId.current = u.id
        setProfileLoading(true)
        setTimeout(async () => {
          const p = await fetchProfile(u.id)
          setProfile(p)
          setProfileLoading(false)
        }, 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    currentUserId.current = data.user.id
    // Fetch profile before setting state so React batches both updates into one render,
    // preventing a flash of the SelectRole page between setAuthUser and setProfile.
    const p = await fetchProfile(data.user.id)
    setAuthUser(data.user)
    setProfile(p)
    return p
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
    return p
  }, [fetchProfile])

  const updateProfileState = useCallback((updates) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' })
    currentUserId.current = null
    setAuthUser(null)
    setProfile(null)
    window.location.href = '/'
  }, [])

  const value = useMemo(() => ({
    user: profile,
    authUser,
    profile,
    role: profile?.role ?? null,
    loading,
    profileLoading,
    signIn,
    signOut,
    refreshProfile,
    updateProfileState,
  }), [profile, authUser, loading, profileLoading, signIn, signOut, refreshProfile, updateProfileState])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
