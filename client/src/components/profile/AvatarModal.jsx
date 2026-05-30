import { useState, useRef } from 'react'
import { Loader2, Wand2, Upload, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import Modal from './Modal'

// 30 preset avatars in three groups:
// • adventurer + micah + lorelei → human faces for Muslim names, chefs, business owners
// • bottts → colorful robots for German cities (visually distinct from all face styles)
const PRESET_AVATARS = [
  // adventurer — warm cartoon faces (Muslim names + chef)
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Maryam&backgroundColor=e0e7ff',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bilal&backgroundColor=fef9c3',
  // micah — minimalist human faces (Muslim names + business)
  'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
  'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
  'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
  'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
  'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/micah/svg?seed=Hassan&backgroundColor=fef2f2',
  'https://api.dicebear.com/7.x/micah/svg?seed=Nour&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/micah/svg?seed=Amira&backgroundColor=fdf4ff',
  // lorelei — elegant professional portraits (Muslim names + business owners)
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
  // bottts — colorful robots representing 10 major German cities
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

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function AvatarModal({ userId, currentName, onClose, onSaved }) {
  const { t } = useLanguage()
  const [name, setName] = useState(currentName || '')
  const [tab, setTab] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const inputRef = useRef(null)
  const deckRef = useRef(shuffle(PRESET_AVATARS))
  const indexRef = useRef(0)

  async function saveName() {
    if (!name.trim()) return
    await supabase.from('users').update({ full_name: name.trim() }).eq('id', userId)
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error(t('toastImageTooLarge')); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleGenerate() {
    if (indexRef.current >= deckRef.current.length) {
      deckRef.current = shuffle(PRESET_AVATARS)
      indexRef.current = 0
    }
    setGeneratedUrl(deckRef.current[indexRef.current++])
  }

  async function handleSaveUpload() {
    if (!file) { toast.error(t('toastSelectImage')); return }
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: rpcError } = await supabase.rpc('update_own_avatar', { p_url: publicUrl })
      if (rpcError) throw rpcError
      await saveName()
      onSaved(publicUrl, name.trim())
      onClose()
      toast.success(t('toastPhotoUpdated'))
    } catch (err) {
      toast.error(t('toastFailedUploadPhoto'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGenerated() {
    if (!generatedUrl) { toast.error(t('toastGenerateAvatarFirst')); return }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_own_avatar', { p_url: generatedUrl })
      if (error) throw error
      await saveName()
      onSaved(generatedUrl, name.trim())
      onClose()
      toast.success(t('toastAvatarSaved'))
    } catch (err) {
      toast.error(t('toastFailedSaveAvatar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('updateProfilePicTitle')} onClose={onClose}>
      {/* Name field */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('yourName')}</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
          placeholder="e.g. Ahmed Hassan"
        />
      </div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-lionsmane rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'upload' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-midnight'}`}
        >
          <Upload className="w-4 h-4" /> {t('choosePhoto')}
        </button>
        <button
          onClick={() => { setTab('generate'); if (!generatedUrl) handleGenerate() }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'generate' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-midnight'}`}
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
            <button onClick={handleSaveUpload} disabled={saving || !file} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
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
            <button onClick={handleSaveGenerated} disabled={saving || !generatedUrl} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('generating')}</> : t('save')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
