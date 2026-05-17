import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from './Modal'

export default function DeleteAccountModal({ message, onClose, onDeleted }) {
  const [input, setInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (input !== 'delete') return
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      onDeleted()
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <Modal title="Delete Account" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">This action is permanent</p>
          <p className="text-sm text-red-600">{message}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Type <span className="font-mono text-red-600">delete</span> to confirm
          </label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="delete"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-lionsmane transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={input !== 'delete' || deleting}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Account
          </button>
        </div>
      </div>
    </Modal>
  )
}
