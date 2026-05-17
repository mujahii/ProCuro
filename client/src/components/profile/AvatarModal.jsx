import { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

export default function AvatarModal({ userId, role, onClose, onSaved }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
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

  return (
    <Modal title="Update Profile Picture" onClose={onClose}>
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
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-midnight text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
      </div>
    </Modal>
  )
}
