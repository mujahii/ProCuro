import { useState, useRef } from 'react'
import { Loader2, Wand2, Upload, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import Modal from './Modal'

// 15 hand-picked preset avatars — Muslim/German names and chef-related
// German words (Koch = cook, Küche = kitchen) across human-face styles.
const PRESET_AVATARS = [
  // adventurer — warm cartoon faces
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
  // micah — minimalist human faces
  'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
  'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
  'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
  'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
  'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
  // lorelei — elegant professional portraits
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
]

function pickRandom(exclude) {
  const pool = exclude ? PRESET_AVATARS.filter(u => u !== exclude) : PRESET_AVATARS
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function AvatarModal({ userId, role, onClose, onSaved }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const inputRef = useRef(null)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleGenerate() {
    setGeneratedUrl(prev => pickRandom(prev))
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
      const { error: rpcError } = await supabase.rpc('update_own_avatar', { p_url: publicUrl })
      if (rpcError) throw rpcError
      onSaved(publicUrl)
      onClose()
      toast.success('Profile photo updated!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      toast.error('Failed to upload photo')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGenerated() {
    if (!generatedUrl) { toast.error('Generate an avatar first'); return }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_own_avatar', { p_url: generatedUrl })
      if (error) throw error
      onSaved(generatedUrl)
      onClose()
      toast.success('Avatar saved!')
    } catch (err) {
      console.error('Avatar save error:', err)
      toast.error('Failed to save avatar')
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
          onClick={() => { setTab('generate'); if (!generatedUrl) handleGenerate() }}
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
          <p className="text-xs text-slate-500 mb-4 text-center">{t('autoGenerateAvatarDesc')}</p>

          {/* Avatar preview */}
          <div className="flex justify-center mb-5">
            {generatedUrl ? (
              <img src={generatedUrl} alt="Generated avatar" className="w-28 h-28 rounded-full border-4 border-celeste shadow-md bg-white" />
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-dashed border-slate-200 bg-lionsmane flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-slate-300" />
              </div>
            )}
          </div>

          {/* Single generate button */}
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-midnight text-midnight font-semibold hover:bg-midnight hover:text-white transition-colors mb-3 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            {generatedUrl ? t('generateAnother') : t('generateAvatar')}
          </button>

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
