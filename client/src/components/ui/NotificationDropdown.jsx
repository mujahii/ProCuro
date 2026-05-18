import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationDropdown({ onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15)
    setNotifications(data || [])
    setLoading(false)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    onClose()
  }

  const typeColor = (type) => {
    if (type === 'warning') return 'bg-lionsmane border-l-2 border-marigold-light'
    if (type === 'certificate_reviewed') return 'bg-blue-50 border-l-2 border-blue-400'
    return ''
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-[72px] left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[360px] sm:left-auto sm:right-4 sm:translate-x-0 sm:w-80 sm:max-w-none bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">{t('notifications')}</h3>
          <button onClick={markAllRead} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium">
            <CheckCheck className="w-3.5 h-3.5" /> {t('markAllRead')}
          </button>
        </div>
        <div className="max-h-[60vh] sm:max-h-72 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-sm">{t('loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t('noNotificationsYet')}</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={async () => {
                  await markRead(n.id)
                  if (n.link) { onClose(); navigate(n.link) }
                  else onClose()
                }}
                className={`w-full text-left px-4 py-3 hover:bg-lionsmane transition-colors ${!n.is_read ? typeColor(n.type) || 'bg-lionsmane/80' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <div className="w-2 h-2 bg-herb rounded-full mt-1.5 flex-shrink-0" />}
                  <div className={`flex-1 min-w-0 ${n.is_read ? 'pl-5' : ''}`}>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
