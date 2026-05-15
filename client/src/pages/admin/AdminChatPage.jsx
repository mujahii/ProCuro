import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageSquare, ArrowLeft, Shield, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AdminChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initUserId = searchParams.get('user_id')

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [userProfiles, setUserProfiles] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

  // Auto-open conversation from query param
  useEffect(() => {
    if (!initUserId || !user) return
    openOrCreateConv(initUserId)
  }, [initUserId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedConv) return
    loadMessages(selectedConv.id)

    const channel = supabase
      .channel(`admin-conv-${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'admin_messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        if (payload.new.sender_id !== user.id) {
          supabase.from('admin_messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedConv?.id])

  async function loadConversations() {
    const { data: convs } = await supabase
      .from('admin_conversations')
      .select('*')
      .order('created_at', { ascending: false })

    const userIds = [...new Set((convs || []).map(c => c.user_id).filter(Boolean))]
    let profileMap = {}
    if (userIds.length > 0) {
      const [{ data: usersData }, { data: ownerData }, { data: supplierData }] = await Promise.all([
        supabase.from('users').select('id, full_name, email, role, avatar_url').in('id', userIds),
        supabase.from('owner_profiles').select('user_id, restaurant_name').in('user_id', userIds),
        supabase.from('supplier_profiles').select('user_id, business_name').in('user_id', userIds),
      ])
      ;(usersData || []).forEach(u => { profileMap[u.id] = { ...u } })
      ;(ownerData || []).forEach(op => {
        if (profileMap[op.user_id]) profileMap[op.user_id].restaurant_name = op.restaurant_name
      })
      ;(supplierData || []).forEach(sp => {
        if (profileMap[sp.user_id]) profileMap[sp.user_id].business_name = sp.business_name
      })
    }
    setUserProfiles(profileMap)
    setConversations(convs || [])
    setLoading(false)
  }

  async function openOrCreateConv(targetUserId) {
    const { data: existing } = await supabase
      .from('admin_conversations')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    let conv = existing
    if (!conv) {
      const { data: newConv } = await supabase
        .from('admin_conversations')
        .insert({ user_id: targetUserId })
        .select()
        .single()
      conv = newConv
    }
    if (!conv) return

    // Enrich profile if not loaded yet
    if (!userProfiles[targetUserId]) {
      const [{ data: u }, { data: op }, { data: sp }] = await Promise.all([
        supabase.from('users').select('id, full_name, email, role, avatar_url').eq('id', targetUserId).single(),
        supabase.from('owner_profiles').select('user_id, restaurant_name').eq('user_id', targetUserId).maybeSingle(),
        supabase.from('supplier_profiles').select('user_id, business_name').eq('user_id', targetUserId).maybeSingle(),
      ])
      if (u) {
        setUserProfiles(prev => ({
          ...prev,
          [targetUserId]: { ...u, restaurant_name: op?.restaurant_name, business_name: sp?.business_name },
        }))
      }
    }

    setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev])
    setSelectedConv(conv)
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    await supabase.from('admin_messages').update({ is_read: true })
      .eq('conversation_id', convId).neq('sender_id', user.id)
  }

  async function sendMessage() {
    if (!input.trim() || !selectedConv || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic = { id: tempId, conversation_id: selectedConv.id, sender_id: user.id, content: text, is_read: false, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    const { data: inserted } = await supabase.from('admin_messages')
      .insert({ conversation_id: selectedConv.id, sender_id: user.id, content: text })
      .select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    setSending(false)
  }

  function getDisplayName(conv) {
    const p = userProfiles[conv.user_id]
    if (!p) return conv.user_id?.slice(0, 8) + '...'
    if (p.role === 'restaurant_owner') return p.restaurant_name || p.full_name || p.email || 'Owner'
    if (p.role === 'supplier') return p.business_name || p.full_name || p.email || 'Supplier'
    return p.full_name || p.email || 'User'
  }

  function getRoleLabel(conv) {
    const p = userProfiles[conv.user_id]
    if (!p) return ''
    const map = { restaurant_owner: 'Restaurant Owner', supplier: 'Supplier', admin: 'Admin' }
    return map[p.role] || p.role
  }

  const filtered = conversations.filter(c => {
    if (!search) return true
    const name = getDisplayName(c).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <h1 className="text-2xl font-black text-gray-900 mb-4 flex-shrink-0">Support Chat</h1>
      <div className="flex-1 min-h-0 flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Conversation list */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-gray-100 flex-shrink-0`}>
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Click Chat on a user to start</p>
              </div>
            ) : filtered.map(conv => {
              const p = userProfiles[conv.user_id]
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedConv?.id === conv.id ? 'bg-emerald-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-slate-500">{getDisplayName(conv)?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{getDisplayName(conv)}</p>
                    <p className="text-xs text-gray-400">{getRoleLabel(conv)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Message thread */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {userProfiles[selectedConv.user_id]?.avatar_url ? (
                  <img src={userProfiles[selectedConv.user_id].avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">{getDisplayName(selectedConv)?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{getDisplayName(selectedConv)}</p>
                <p className="text-xs text-gray-400">{getRoleLabel(selectedConv)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mr-2 self-end mb-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                    }`}>
                      <p>{msg.content}</p>
                      <p className="text-[10px] mt-1 opacity-60">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="p-2.5 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 disabled:opacity-40 flex-shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center text-gray-400">
            <div>
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select a conversation to reply</p>
              <p className="text-xs mt-1 text-gray-300">Or click Chat on any user in Users page</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
