import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function SelectRolePage() {
  const { user, authUser, role, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selecting, setSelecting] = useState(false)

  // Returning user already has a profile — skip straight to dashboard
  useEffect(() => {
    if (loading) return
    if (!authUser) { navigate('/login', { replace: true }); return }
    if (user && role) {
      if (role === 'restaurant_owner') navigate('/owner/store', { replace: true })
      else if (role === 'supplier') navigate('/supplier/dashboard', { replace: true })
      else if (role === 'admin') navigate('/admin/dashboard', { replace: true })
    }
  }, [user, authUser, role, loading])

  async function handleSelectRole(selectedRole) {
    setSelecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login', { replace: true }); return }

      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] || ''

      const { error } = await supabase.rpc('create_profile_from_oauth', {
        p_role: selectedRole,
        p_full_name: fullName,
      })
      if (error) throw error

      await refreshProfile()
      navigate(selectedRole === 'restaurant_owner' ? '/owner/store' : '/supplier/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Failed to set up account')
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authUser) return null

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShoppingCart className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold text-slate-900">ProCuro</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">One last step</h2>
          <p className="text-sm text-slate-500">
            How will you use ProCuro?{' '}
            <span className="font-semibold text-slate-700">This choice is permanent and cannot be changed.</span>
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSelectRole('restaurant_owner')}
            disabled={selecting}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-3xl">🍽️</span>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-base">Restaurant Owner</p>
              <p className="text-xs text-slate-500 mt-0.5">Browse and order from verified Halal suppliers</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
          </button>

          <button
            onClick={() => handleSelectRole('supplier')}
            disabled={selecting}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-3xl">🏪</span>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-base">Supplier</p>
              <p className="text-xs text-slate-500 mt-0.5">Sell your Halal products to restaurants across Germany</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
          </button>
        </div>

        {selecting && (
          <p className="text-center text-sm text-slate-500 mt-5">Setting up your account...</p>
        )}
      </div>
    </div>
  )
}
