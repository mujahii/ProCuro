import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Camera, Loader2, User, FileText, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const CERT_STATUS = {
  pending:  { label: 'Pending Review', icon: Clock,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
  approved: { label: 'Approved',       icon: CheckCircle,   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  rejected: { label: 'Rejected',       icon: XCircle,       color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function SupplierProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [certs, setCerts] = useState([])
  const [certsLoading, setCertsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data: sp }) => {
        if (!sp) { setCertsLoading(false); return }
        supabase
          .from('halal_certificates')
          .select('*')
          .eq('supplier_id', sp.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => { setCerts(data || []); setCertsLoading(false) })
      })
  }, [user])

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
      await supabase.from('supplier_profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id)
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
          <h2 className="font-bold text-slate-900 text-lg mt-3">{profile?.full_name || 'Supplier'}</h2>
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

      {/* Halal Certificates */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> Halal Certificates
        </h3>
        {certsLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : certs.length === 0 ? (
          <p className="text-sm text-slate-400">No certificates uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {certs.map(cert => {
              const status = CERT_STATUS[cert.status] || CERT_STATUS.pending
              const Icon = status.icon
              return (
                <div key={cert.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-8 h-8 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{cert.file_name}</p>
                      <p className="text-xs text-slate-400">{new Date(cert.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                      <Icon className="w-3 h-3" /> {status.label}
                    </span>
                    <a href={cert.file_url} target="_blank" rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
