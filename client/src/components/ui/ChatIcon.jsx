import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ChatIcon() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user || (role !== 'restaurant_owner' && role !== 'supplier')) return
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user, role])

  async function fetchUnread() {
    if (!user) return
    let convIds = []

    if (role === 'restaurant_owner') {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('owner_id', user.id)
      convIds = (data || []).map(c => c.id)
    } else if (role === 'supplier') {
      const { data: sp } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (sp) {
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .eq('supplier_id', sp.id)
        convIds = (data || []).map(c => c.id)
      }
    }

    if (convIds.length === 0) { setUnreadCount(0); return }

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }

  if (!user || (role !== 'restaurant_owner' && role !== 'supplier')) return null

  const chatPath = role === 'restaurant_owner' ? '/owner/chat' : '/supplier/chat'

  return (
    <button
      onClick={() => navigate(chatPath)}
      className="relative p-2 rounded-lg hover:bg-lionsmane transition-colors"
      aria-label="Messages"
    >
      <MessageSquare className="w-5 h-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-herb text-white text-xs rounded-full flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
