import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, ChevronRight, PartyPopper, Utensils, Store } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import OrbBackground from '../../components/ui/OrbBackground'
import toast from 'react-hot-toast'

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Maryam&backgroundColor=e0e7ff',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bilal&backgroundColor=fef9c3',
  'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
  'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
  'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
  'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
  'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/micah/svg?seed=Hassan&backgroundColor=fef2f2',
  'https://api.dicebear.com/7.x/micah/svg?seed=Nour&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/micah/svg?seed=Amira&backgroundColor=fdf4ff',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Berlin&backgroundColor=dbeafe',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Hamburg&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Munich&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Frankfurt&backgroundColor=fef3c7',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cologne&backgroundColor=fdf4ff',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Stuttgart&backgroundColor=f0fdf4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Duesseldorf&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Dortmund&backgroundColor=fff1f2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leipzig&backgroundColor=fef9c3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Hannover&backgroundColor=ffe4e6',
]

export default function SelectRolePage() {
  const { user, authUser, role, loading, profileLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [selecting, setSelecting] = useState(false)

  // Already has a role — go straight to their dashboard
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

      // Auto-assign a random avatar for new accounts
      const randomAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]
      try { await supabase.rpc('update_own_avatar', { p_url: randomAvatar }) } catch {}

      await refreshProfile()
      navigate(selectedRole === 'restaurant_owner' ? '/owner/store' : '/supplier/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Failed to set up account')
      setSelecting(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight">
        <div className="w-10 h-10 border-4 border-herb border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authUser) return null

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <OrbBackground />
      <div className="relative z-10 bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShoppingCart className="w-8 h-8 text-midnight" />
            <span className="font-display text-2xl font-bold text-slate-900">ProCuro</span>
          </div>
          <div className="mb-2 flex justify-center">
            <PartyPopper className="w-8 h-8 text-marigold" />
          </div>
          <h2 className="font-display text-xl font-black text-slate-900 mb-2">{t('welcomeToProcuro')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('accountReadyDesc')}{' '}
            <span className="font-semibold text-slate-700">{t('choiceIsPermanent')}</span>
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSelectRole('restaurant_owner')}
            disabled={selecting}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-herb hover:bg-lionsmane transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Utensils className="w-7 h-7 text-midnight flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-base">{t('restaurantOwner')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('roleOwnerDesc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-herb transition-colors flex-shrink-0" />
          </button>

          <button
            onClick={() => handleSelectRole('supplier')}
            disabled={selecting}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-herb hover:bg-lionsmane transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Store className="w-7 h-7 text-midnight flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-base">{t('supplier')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('roleSupplierDesc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-herb transition-colors flex-shrink-0" />
          </button>
        </div>

        {selecting && (
          <p className="text-center text-sm text-slate-500 mt-5">{t('settingUpAccount')}</p>
        )}
      </div>
    </div>
  )
}
