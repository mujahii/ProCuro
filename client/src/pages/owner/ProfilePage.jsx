import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Camera, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)

  const initials = (profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
      toast.success('Photo updated!')
    } catch (err) {
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 py-4">

      {/* Avatar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-slate-900 to-slate-800" />
        <div className="px-6 pb-6 text-center -mt-10">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-white p-1 shadow-lg mx-auto">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-emerald-400" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-slate-900 text-white p-1.5 rounded-full hover:bg-emerald-600 border-2 border-white transition-colors"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <h2 className="font-bold text-slate-900 text-lg mt-3">{profile?.full_name || 'Restaurant Owner'}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
          >
            {avatarUrl ? 'Change photo' : 'Add profile photo'}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  )
}
