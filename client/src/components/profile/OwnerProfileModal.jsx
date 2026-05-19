import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, Store, X, ExternalLink, MessageSquare, Flag, Loader2, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fmtPhone } from '../../lib/formatPhone'
import { useLanguage } from '../../context/LanguageContext'
import ModalPortal from '../ui/ModalPortal'
import ReportModal from '../ui/ReportModal'

export default function OwnerProfileModal({
  ownerId,
  ownerInfo: initialOwnerInfo,
  deliveryAddress,
  onClose,
  showMessageButton = true,
}) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [showReport, setShowReport] = useState(false)
  const [ownerInfo, setOwnerInfo] = useState(initialOwnerInfo || null)
  const [loading, setLoading] = useState(!initialOwnerInfo)
  const [isBanned, setIsBanned] = useState(initialOwnerInfo?.is_banned === true)

  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    // Always re-fetch is_banned even when initialOwnerInfo was passed,
    // because the parent may not have included that field.
    if (initialOwnerInfo) {
      supabase.from('users').select('is_banned').eq('id', ownerId).maybeSingle()
        .then(({ data }) => { if (!cancelled) setIsBanned(data?.is_banned === true) })
      return () => { cancelled = true }
    }
    Promise.all([
      supabase.from('users').select('full_name, email, avatar_url, phone, is_banned').eq('id', ownerId).single(),
      supabase.from('owner_profiles').select('restaurant_name, bio, city').eq('user_id', ownerId).maybeSingle(),
    ]).then(([{ data: u }, { data: op }]) => {
      if (cancelled) return
      setOwnerInfo({
        full_name: u?.full_name,
        email: u?.email,
        avatar_url: u?.avatar_url,
        phone: u?.phone,
        restaurant_name: op?.restaurant_name,
        bio: op?.bio,
        city: op?.city,
      })
      setIsBanned(u?.is_banned === true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [ownerId, initialOwnerInfo])

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-midnight px-5 py-5 flex items-center gap-4 relative flex-shrink-0">
            <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white/25">
              {ownerInfo?.avatar_url ? (
                <img src={ownerInfo.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h2 className="text-lg font-bold text-white truncate">
                {ownerInfo?.restaurant_name || ownerInfo?.full_name || 'Restaurant'}
              </h2>
              {ownerInfo?.restaurant_name && ownerInfo?.full_name && (
                <p className="text-celeste text-xs truncate">{ownerInfo.full_name}</p>
              )}
              {isBanned && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white px-2 py-0.5 rounded-full">
                  <Ban className="w-3 h-3" /> {t('ownerBannedShort')}
                </span>
              )}
            </div>
          </div>

          {isBanned && (
            <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex items-start gap-2">
              <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{t('ownerBannedBanner')}</p>
            </div>
          )}

          <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-slate-400 text-sm justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
              </div>
            ) : (
              <>
                {ownerInfo?.bio && (
                  <div className="p-3 bg-lionsmane rounded-xl">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">About</p>
                    <p className="text-sm text-slate-700">{ownerInfo.bio}</p>
                  </div>
                )}
                {ownerInfo?.phone && (
                  <div className="flex items-center gap-3 p-3 bg-lionsmane rounded-xl">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">Phone</p>
                      <a href={`tel:${ownerInfo.phone}`} className="text-sm font-medium text-herb hover:text-herb-dark hover:underline">
                        {fmtPhone(ownerInfo.phone)}
                      </a>
                    </div>
                  </div>
                )}
                {ownerInfo?.city && (
                  <div className="flex items-start gap-3 p-3 bg-lionsmane rounded-xl">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Business Locations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ownerInfo.city.split(',').map(c => c.trim()).filter(Boolean).map((c, i) => (
                          <span key={`${c}-${i}`} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-celeste text-midnight-dark">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {deliveryAddress && (
                  <div className="flex items-start gap-3 p-3 bg-lionsmane rounded-xl">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
                        Delivery Address{deliveryAddress.label ? ` · ${deliveryAddress.label}` : ''}
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {[
                          deliveryAddress.street,
                          [deliveryAddress.postal_code, deliveryAddress.city].filter(Boolean).join(' '),
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${deliveryAddress.latitude ? `${deliveryAddress.latitude},${deliveryAddress.longitude}` : encodeURIComponent([deliveryAddress.street, deliveryAddress.city].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-herb hover:text-herb-dark flex-shrink-0 mt-0.5 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                {!ownerInfo?.bio && !ownerInfo?.phone && !ownerInfo?.city && !deliveryAddress && (
                  <p className="text-sm text-slate-400 text-center py-2">No additional contact details available.</p>
                )}
              </>
            )}
          </div>

          <div className="px-4 pb-4 pt-2 space-y-2 flex-shrink-0 border-t border-slate-100 bg-white">
            {showMessageButton && ownerId && (
              <button
                onClick={() => { onClose(); navigate(`/supplier/chat?owner_id=${ownerId}`) }}
                className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-midnight-dark transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Message Owner
              </button>
            )}
            {ownerId && (
              <button
                onClick={() => setShowReport(true)}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
              >
                <Flag className="w-3.5 h-3.5" /> Report Restaurant Owner
              </button>
            )}
          </div>
        </div>
        {showReport && ownerId && (
          <ReportModal
            type="user"
            targetId={ownerId}
            targetName={ownerInfo?.restaurant_name || ownerInfo?.full_name || 'Restaurant Owner'}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </ModalPortal>
  )
}
