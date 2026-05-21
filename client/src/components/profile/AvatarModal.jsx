import { useState, useRef } from 'react'
import { Loader2, Wand2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import Modal from './Modal'

const DICEBEAR_STYLES = ['adventurer', 'personas', 'avataaars', 'bottts', 'micah']

export default function AvatarModal({ userId, role, userName, onClose, onSaved }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [selectedStyle, setSelectedStyle] = useState('adventurer')
  const inputRef = useRef(null)

  const seed = encodeURIComponent(userName || userId || 'user')

  function previewGenerated(style) {
    setSelectedStyle(style)
    setGeneratedUrl(`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=e8f4f8`)
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSaveUpload() {
    if (!file) { toast.error('Please select an image'); return }
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)
      if (role === 'supplier') {
        await supabase.from('supplier_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)
      }
      onSaved(publicUrl)
      onClose()
      toast.success('Profile photo updated!')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGenerated() {
    if (!generatedUrl) { toast.error('Please select a style first'); return }
    setSaving(true)
    try {
      const res = await fetch(generatedUrl)
      const blob = await res.blob()
      const path = `${userId}/avatar.svg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/svg+xml' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)
      if (role === 'supplier') {
        await supabase.from('supplier_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)
      }
      onSaved(publicUrl)
      onClose()
      toast.success('Avatar generated and saved!')
    } catch {
      toast.error('Failed to save generated avatar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('updateProfilePicTitle')} onClose={onClose}>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-lionsmane rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'upload' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Upload className="w-4 h-4" /> {t('choosePhoto')}
        </button>
        <button
          onClick={() => { setTab('generate'); if (!generatedUrl) previewGenerated(selectedStyle) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'generate' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Wand2 className="w-4 h-4" /> {t('autoGenerateAvatar')}
        </button>
      </div>

      {tab === 'upload' ? (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-celeste-dark rounded-xl bg-lionsmane p-10 flex items-center justify-center cursor-pointer hover:bg-celeste transition-colors mb-4"
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <span className="text-4xl text-herb-light font-light leading-none">+</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
              {t('cancel')}
            </button>
            <button onClick={handleSaveUpload} disabled={saving || !file} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('save')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">{t('autoGenerateAvatarDesc')}</p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {DICEBEAR_STYLES.map(style => (
              <button
                key={style}
                onClick={() => previewGenerated(style)}
                className={`rounded-xl p-1 border-2 transition-all ${selectedStyle === style ? 'border-midnight' : 'border-transparent hover:border-slate-200'}`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=e8f4f8`}
                  alt={style}
                  className="w-full aspect-square rounded-lg"
                />
              </button>
            ))}
          </div>
          {generatedUrl && (
            <div className="flex justify-center mb-4">
              <img src={generatedUrl} alt="Generated avatar" className="w-24 h-24 rounded-full border-4 border-celeste shadow-md" />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
              {t('cancel')}
            </button>
            <button onClick={handleSaveGenerated} disabled={saving || !generatedUrl} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('generating')}</> : t('save')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
