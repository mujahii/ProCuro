import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { Upload, CheckCircle, Loader2, Award, ExternalLink, Pencil, Trash2, X, FileText } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ModalPortal from '../../components/ui/ModalPortal'

function Modal({ title, onClose, children }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function SupplierCertificatesPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editingCert, setEditingCert] = useState(null)
  const [confirmDeleteCert, setConfirmDeleteCert] = useState(null)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) {
      loadCerts(sp.id)
    } else {
      setLoading(false)
    }
  }

  async function loadCerts(supplierId) {
    const { data } = await supabase.from('halal_certificates').select('*').eq('supplier_id', supplierId).order('uploaded_at', { ascending: false })
    setCerts(data || [])
    setLoading(false)
  }

  async function handleDelete(cert) {
    try {
      await supabase.storage.from('halal-certificates').remove([cert.file_url])
      await supabase.from('halal_certificates').delete().eq('id', cert.id)
      const remaining = certs.filter(c => c.id !== cert.id)
      setCerts(remaining)
      if (remaining.filter(c => c.status === 'approved').length === 0 && supplierProfile) {
        await supabase.from('supplier_profiles').update({ is_verified: false }).eq('id', supplierProfile.id)
      }
      toast.success('Certificate deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function viewCert(cert) {
    const win = window.open('about:blank', '_blank')
    const { data, error } = await supabase.storage.from('halal-certificates').createSignedUrl(cert.file_url, 300)
    if (data?.signedUrl) {
      win.location.href = data.signedUrl
    } else {
      win?.close()
      toast.error(error?.message || 'Could not open certificate')
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Halal Certificates</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4" /> Add Certificate
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : certs.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-4">No certificates uploaded yet</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 mx-auto">
            <Upload className="w-4 h-4" /> Upload your first certificate
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map(cert => {
            const displayName = cert.file_name || cert.file_url?.split('/').pop() || 'Certificate'
            return (
              <div key={cert.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="w-8 h-8 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge status={cert.status} />
                        <p className="text-xs text-gray-500">Uploaded {format(new Date(cert.uploaded_at), 'dd MMM yyyy')}</p>
                      </div>
                      {cert.status === 'rejected' && cert.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">Reason: {cert.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => viewCert(cert)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="View">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingCert(cert)} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDeleteCert(cert)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && supplierProfile && (
        <UploadModal
          supplierProfile={supplierProfile}
          onClose={() => setShowUpload(false)}
          onUploaded={cert => {
            setCerts(prev => [cert, ...prev])
            setShowUpload(false)
          }}
        />
      )}

      {editingCert && supplierProfile && (
        <EditModal
          cert={editingCert}
          supplierProfileId={supplierProfile.id}
          onClose={() => setEditingCert(null)}
          onSaved={updated => {
            setCerts(prev => prev.map(c => c.id === updated.id ? updated : c))
            setEditingCert(null)
          }}
        />
      )}

      {confirmDeleteCert && (
        <Modal title="Delete Certificate" onClose={() => setConfirmDeleteCert(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Are you sure?</p>
              <p className="text-sm text-red-600">
                "<span className="font-semibold">{confirmDeleteCert.file_name || 'This certificate'}</span>" will be permanently deleted and cannot be recovered.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteCert(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleDelete(confirmDeleteCert); setConfirmDeleteCert(null) }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function UploadModal({ supplierProfile, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  async function handleUpload() {
    if (!label.trim()) { toast.error('Please enter a certificate name'); return }
    if (!file) { toast.error('Please select a file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${supplierProfile.id}/${Date.now()}.${ext}`
      const { data: upload, error: uploadErr } = await supabase.storage.from('halal-certificates').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: cert } = await supabase.from('halal_certificates').insert({
        supplier_id: supplierProfile.id,
        file_url: upload.path,
        file_name: label.trim(),
        status: 'pending',
      }).select().single()
      await supabase.from('supplier_profiles').update({ is_verified: false }).eq('id', supplierProfile.id)
      onUploaded(cert)
      toast.success('Certificate uploaded! Our team will review it shortly.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title="Upload Certificate" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Certificate Name <span className="text-red-500">*</span>
          </label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Chicken Halal Certificate"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">File</label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50 p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-emerald-100 transition-colors"
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <>
                <CheckCircle className="w-7 h-7 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-700 text-center truncate max-w-full px-2">{file.name}</p>
              </>
            ) : (
              <>
                <Upload className="w-7 h-7 text-emerald-400" />
                <p className="text-sm text-slate-500">PDF, JPG, PNG · Max 5MB</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !file || !label.trim()} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EditModal({ cert, supplierProfileId, onClose, onSaved }) {
  const [label, setLabel] = useState(cert.file_name || '')
  const [newFile, setNewFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  async function handleSave() {
    if (!label.trim()) { toast.error('Certificate name is required'); return }
    setSaving(true)
    try {
      if (newFile) {
        if (newFile.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB')
        // Upload new file
        const ext = newFile.name.split('.').pop()
        const path = `${supplierProfileId}/${Date.now()}.${ext}`
        const { data: upload, error: uploadErr } = await supabase.storage.from('halal-certificates').upload(path, newFile)
        if (uploadErr) throw uploadErr

        if (cert.status === 'approved') {
          // Delete old cert + insert new one (RLS prevents updating approved→pending)
          await supabase.storage.from('halal-certificates').remove([cert.file_url])
          await supabase.from('halal_certificates').delete().eq('id', cert.id)
          const { data: newCert, error: insertErr } = await supabase.from('halal_certificates').insert({
            supplier_id: supplierProfileId,
            file_url: upload.path,
            file_name: label.trim(),
            status: 'pending',
          }).select().single()
          if (insertErr) throw insertErr
          await supabase.from('supplier_profiles').update({ is_verified: false }).eq('id', supplierProfileId)
          onSaved(newCert)
        } else {
          // Cert is already pending — update in place
          await supabase.storage.from('halal-certificates').remove([cert.file_url])
          const { data: updated, error: updateErr } = await supabase.from('halal_certificates')
            .update({ file_name: label.trim(), file_url: upload.path, status: 'pending' })
            .eq('id', cert.id)
            .select().single()
          if (updateErr) throw updateErr
          onSaved(updated)
        }
        toast.success('File replaced — pending review by admin.')
      } else {
        // Name-only change — keep existing status
        const { data: updated, error: updateErr } = await supabase.from('halal_certificates')
          .update({ file_name: label.trim() })
          .eq('id', cert.id)
          .select().single()
        if (updateErr) throw updateErr
        onSaved(updated)
        toast.success('Certificate updated!')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Certificate" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certificate Name</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Meat Halal Certificate"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Replace File (optional)</label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setNewFile(e.target.files[0])} />
            {newFile ? (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-700 truncate max-w-full px-2">{newFile.name}</p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-400" />
                <p className="text-xs text-slate-400">Click to choose a new file</p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}
