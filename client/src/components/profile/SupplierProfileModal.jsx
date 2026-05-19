import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Store, X, CheckCircle, ArrowUpRight, Flag, Loader2, Globe, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import ModalPortal from '../ui/ModalPortal'
import ReportModal from '../ui/ReportModal'

function resolveAvatar(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return supabase.storage.from('avatars').getPublicUrl(path).data?.publicUrl || null
}

export default function SupplierProfileModal({ supplierId, businessName, onClose }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [sp, setSp] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const isBanned = sp?.users?.is_banned === true

  useEffect(() => {
    if (!supplierId) return
    let cancelled = false
    supabase
      .from('supplier_profiles')
      .select('business_name, description, category, city, website, avatar_url, is_verified, users:user_id(is_banned)')
      .eq('id', supplierId)
      .single()
      .then(({ data }) => { if (!cancelled) setSp(data) })
    return () => { cancelled = true }
  }, [supplierId])

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-midnight px-6 py-10 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            {sp?.avatar_url ? (
              <img src={resolveAvatar(sp.avatar_url)} alt={sp.business_name} className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-white/20 shadow-xl" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Store className="w-14 h-14 text-white" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">{sp?.business_name || businessName || 'Supplier'}</h2>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {sp?.category && <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full">{Array.isArray(sp.category) ? sp.category.join(', ') : sp.category}</span>}
              {sp?.is_verified && (
                <span className="flex items-center gap-1 text-xs text-herb-light bg-herb-light/10 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
              {isBanned && (
                <span className="flex items-center gap-1 text-xs text-white bg-red-600 px-2.5 py-1 rounded-full font-semibold">
                  <Ban className="w-3 h-3" /> {t('supplierBannedShort')}
                </span>
              )}
            </div>
          </div>

          {isBanned && (
            <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2">
              <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{t('supplierBannedBanner')}</p>
            </div>
          )}

          <div className="p-5 space-y-3">
            {!sp && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
            {sp?.description && <p className="text-sm text-slate-600 leading-relaxed">{sp.description}</p>}
            {sp?.city && (
              <div className="flex items-center gap-3 p-3 bg-lionsmane rounded-xl">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <p className="text-sm font-medium text-slate-700">{sp.city}</p>
              </div>
            )}
            {sp?.website && (
              <div className="flex items-center gap-3 p-3 bg-lionsmane rounded-xl">
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a href={sp.website.startsWith('http') ? sp.website : `https://${sp.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-midnight font-medium hover:underline truncate">
                  {sp.website}
                </a>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 space-y-2">
            <button
              onClick={() => { onClose(); navigate(`/supplier/${supplierId}`) }}
              className="w-full py-3 bg-midnight hover:bg-midnight-dark text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" /> View Products & Certificates
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
              <Flag className="w-3.5 h-3.5" /> Report Supplier
            </button>
          </div>
        </div>
        {showReport && supplierId && (
          <ReportModal
            type="supplier"
            targetId={supplierId}
            targetName={sp?.business_name || businessName || 'Supplier'}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </ModalPortal>
  )
}
