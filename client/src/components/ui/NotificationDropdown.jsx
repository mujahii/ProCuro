import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationDropdown({ onClose }) {
  const { user } = useAuth()
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

  return (
    <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Notifications</h3>
        <button onClick={markAllRead} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={async () => {
                await markRead(n.id)
                if (n.link) { onClose(); navigate(n.link) }
              }}
              className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-emerald-50/50' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />}
                <div className={!n.is_read ? '' : 'pl-4'}>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
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
  )
}
