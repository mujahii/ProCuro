import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import ModalPortal from '../../components/ui/ModalPortal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function CertModal({ cert, onApprove, onReject, onClose }) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signedUrl, setSignedUrl] = useState(null)

  useEffect(() => {
    async function fetchUrl() {
      const { data } = await supabase.storage.from('halal-certificates').createSignedUrl(cert.file_url, 600)
      setSignedUrl(data?.signedUrl)
    }
    if (cert.file_url) fetchUrl()
  }, [cert])

  async function handleApprove() {
    setLoading(true)
    await onApprove(cert.id)
    setLoading(false)
  }

  async function handleReject() {
    if (!rejectionReason.trim()) return toast.error('Please provide a rejection reason')
    setLoading(true)
    await onReject(cert.id, rejectionReason)
    setLoading(false)
  }

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Review Certificate</h3>

        <div className="space-y-2 mb-4">
          <p className="text-sm"><span className="text-gray-500">Supplier:</span> {cert.supplier?.business_name}</p>
          <p className="text-sm"><span className="text-gray-500">Uploaded:</span> {format(new Date(cert.uploaded_at), 'dd MMM yyyy')}</p>
          <p className="text-sm"><span className="text-gray-500">Status:</span> <Badge status={cert.status} /></p>
        </div>

        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline mb-4">
            <ExternalLink className="w-4 h-4" /> View Certificate File
          </a>
        )}

        {cert.status === 'pending' && (
          <div className="space-y-3">
            {!showReject ? (
              <div className="flex gap-3">
                <button onClick={() => setShowReject(true)} className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold py-2.5 rounded-lg hover:bg-red-50 text-sm">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={handleApprove} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-light text-sm disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                </button>
              </div>
            ) : (
              <div>
                <label className="label">Rejection Reason *</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="input h-20 resize-none mb-3" placeholder="Certificate is expired, invalid authority, etc." />
                <div className="flex gap-3">
                  <button onClick={() => setShowReject(false)} className="flex-1 btn-secondary text-sm">Back</button>
                  <button onClick={handleReject} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {cert.status === 'approved' && (
          <div className="space-y-3">
            {!showReject ? (
              <button
                onClick={() => setShowReject(true)}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold py-2.5 rounded-lg hover:bg-red-50 text-sm"
              >
                <XCircle className="w-4 h-4" /> Revoke Certificate
              </button>
            ) : (
              <div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-red-700">Revoking will deactivate the supplier and notify them to re-upload.</p>
                </div>
                <label className="label">Reason for Revocation *</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="input h-20 resize-none mb-3" placeholder="Certificate expired, falsified document, etc." />
                <div className="flex gap-3">
                  <button onClick={() => setShowReject(false)} className="flex-1 btn-secondary text-sm">Back</button>
                  <button onClick={handleReject} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Revoke
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700">Close</button>
      </div>
    </div></ModalPortal>
  )
}

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadCerts() }, [])

  async function loadCerts() {
    const { data } = await supabase
      .from('halal_certificates')
      .select('*, supplier:supplier_profiles(business_name, city, user_id)')
      .order('uploaded_at', { ascending: false })
    setCerts(data || [])
    setLoading(false)
  }

  async function handleApprove(certId) {
    const cert = certs.find(c => c.id === certId)
    try {
      const { error: certErr } = await supabase
        .from('halal_certificates')
        .update({ status: 'approved' })
        .eq('id', certId)
      if (certErr) throw certErr

      const { error: spErr } = await supabase
        .from('supplier_profiles')
        .update({ is_verified: true, is_active: true })
        .eq('id', cert.supplier_id)
      if (spErr) throw spErr

      if (cert.supplier?.user_id) {
        await supabase.from('notifications').insert({
          user_id: cert.supplier.user_id,
          title: 'Halal Certificate Approved',
          message: 'Your Halal certificate has been approved. Your profile and products are now visible to restaurant owners.',
          type: 'certificate_reviewed',
          link: '/supplier/profile',
        })
      }

      setCerts(prev => prev.map(c => c.id === certId ? { ...c, status: 'approved' } : c))
      toast.success('Certificate approved! Supplier is now active.')
      setSelected(null)
    } catch (err) {
      toast.error(err.message || 'Failed to approve certificate')
    }
  }

  async function handleReject(certId, reason) {
    const cert = certs.find(c => c.id === certId)
    try {
      const { error: certErr } = await supabase
        .from('halal_certificates')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', certId)
      if (certErr) throw certErr

      // Only un-verify the supplier if no OTHER approved cert remains.
      // A supplier with at least one approved cert stays verified + active.
      const { count: remainingApproved } = await supabase
        .from('halal_certificates')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', cert.supplier_id)
        .eq('status', 'approved')
        .neq('id', certId)

      const stillVerified = (remainingApproved || 0) > 0
      const { error: spErr } = await supabase
        .from('supplier_profiles')
        .update({ is_verified: stillVerified, is_active: stillVerified })
        .eq('id', cert.supplier_id)
      if (spErr) throw spErr

      if (cert.supplier?.user_id) {
        const message = stillVerified
          ? `One of your Halal certificates was rejected. Reason: ${reason}. Your account remains verified via your other approved certificate.`
          : `Your Halal certificate has been rejected. Reason: ${reason}. Please upload a new valid certificate to restore your profile visibility.`
        await supabase.from('notifications').insert({
          user_id: cert.supplier.user_id,
          title: 'Halal Certificate Rejected',
          message,
          type: 'certificate_reviewed',
          link: '/supplier/profile',
        })
      }

      setCerts(prev => prev.map(c => c.id === certId ? { ...c, status: 'rejected', rejection_reason: reason } : c))
      toast.success(stillVerified
        ? 'Certificate rejected. Supplier remains verified via another approved certificate.'
        : 'Certificate rejected. Supplier has been notified.')
      setSelected(null)
    } catch (err) {
      toast.error(err.message || 'Failed to reject certificate')
    }
  }

  const filtered = filter === 'all' ? certs : certs.filter(c => c.status === filter)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-black text-gray-900">Halal Certificates</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto overflow-x-auto">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f} {f !== 'all' && `(${certs.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonTable rows={5} /> : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(cert => (
              <button key={cert.id} onClick={() => setSelected(cert)} className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900">{cert.supplier?.business_name || '—'}</p>
                  <Badge status={cert.status} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{cert.supplier?.city || '—'} · {format(new Date(cert.uploaded_at), 'dd MMM yyyy')}</p>
                  <span className="text-xs text-primary font-medium">Review →</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No certificates</p>}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-lionsmane border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Uploaded</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(cert => (
                  <tr key={cert.id} className="hover:bg-lionsmane cursor-pointer" onClick={() => setSelected(cert)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cert.supplier?.business_name || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-500">{cert.supplier?.city || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{format(new Date(cert.uploaded_at), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3"><Badge status={cert.status} /></td>
                    <td className="px-4 py-3 text-xs text-primary font-medium">Review →</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No certificates</p>}
          </div>
        </>
      )}

      {selected && (
        <CertModal
          cert={selected}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
