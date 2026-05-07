import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { Upload, CheckCircle, Loader2, Award, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function SupplierCertificatesPage() {
  const { user } = useAuth()
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [certFile, setCertFile] = useState(null)

  useEffect(() => {
    if (user) init()
  }, [user])

  async function init() {
    const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('user_id', user.id).single()
    setSupplierProfile(sp)
    if (sp) loadCerts(sp.id)
  }

  async function loadCerts(supplierId) {
    const { data } = await supabase.from('halal_certificates').select('*').eq('supplier_id', supplierId).order('uploaded_at', { ascending: false })
    setCerts(data || [])
    setLoading(false)
  }

  async function handleUpload() {
    if (!certFile || !supplierProfile) return
    if (certFile.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
    setUploading(true)
    try {
      const ext = certFile.name.split('.').pop()
      const path = `${supplierProfile.id}/${Date.now()}.${ext}`
      const { data: upload, error: uploadErr } = await supabase.storage.from('halal-certificates').upload(path, certFile)
      if (uploadErr) throw uploadErr
      const { data: cert } = await supabase.from('halal_certificates').insert({
        supplier_id: supplierProfile.id,
        file_url: upload.path,
        file_name: certFile.name,
        status: 'approved',
      }).select().single()
      await supabase.from('supplier_profiles').update({ is_verified: true }).eq('id', supplierProfile.id)
      setCerts(prev => [cert, ...prev])
      setCertFile(null)
      toast.success('Certificate uploaded — you are now Halal Certified!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function viewCert(cert) {
    const { data } = await supabase.storage.from('halal-certificates').createSignedUrl(cert.file_url, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Halal Certificates</h1>

      {/* Upload new cert */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-3">Upload New Certificate</h2>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-primary transition-colors mb-3">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="cert-upload" onChange={e => setCertFile(e.target.files[0])} />
          <label htmlFor="cert-upload" className="cursor-pointer">
            {certFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-primary" />
                <p className="text-sm font-medium text-primary">{certFile.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500">PDF, JPG, PNG · Max 5MB</p>
              </div>
            )}
          </label>
        </div>
        <button onClick={handleUpload} disabled={!certFile || uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Submit for Review'}
        </button>
      </div>

      {/* Certificates list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
        ) : certs.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No certificates uploaded yet</p>
          </div>
        ) : (
          certs.map(cert => (
            <div key={cert.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={cert.status} />
                </div>
                <p className="text-xs text-gray-500">Uploaded {format(new Date(cert.uploaded_at), 'dd MMM yyyy')}</p>
                {cert.status === 'rejected' && cert.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">Reason: {cert.rejection_reason}</p>
                )}
                {cert.status === 'pending' && (
                  <p className="text-xs text-yellow-600 mt-1">Under review · usually within 48 hours</p>
                )}
              </div>
              <button onClick={() => viewCert(cert)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> View
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
