import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageSquare, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ChatPage() {
  const { user, role } = useAuth()
  const [searchParams] = useSearchParams()
  const initSupplierId = searchParams.get('supplier_id')

  const [supplierId, setSupplierId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (role !== 'supplier' || !user) return
    supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { if (data) setSupplierId(data.id) })
  }, [role, user])

  useEffect(() => {
    if (!user) return
    if (role === 'supplier' && !supplierId) return
    loadConversations()
  }, [user, role, supplierId])

  useEffect(() => {
    if (!initSupplierId || role !== 'restaurant_owner' || !user) return
    startOrOpen(initSupplierId)
  }, [initSupplierId, user, role])

  async function loadConversations() {
    if (role === 'restaurant_owner') {
      const { data } = await supabase
        .from('conversations')
        .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
        .eq('owner_id', user.id)
        .order('last_message_at', { ascending: false })
      setConversations(data || [])
    } else if (role === 'supplier' && supplierId) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('last_message_at', { ascending: false })
      const ownerIds = [...new Set((convs || []).map(c => c.owner_id))]
      let ownerMap = {}
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', ownerIds)
        ;(owners || []).forEach(o => { ownerMap[o.id] = o })
      }
      setConversations((convs || []).map(c => ({ ...c, owner: ownerMap[c.owner_id] || null })))
    }
    setLoading(false)
  }

  async function startOrOpen(targetSupplierId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
      .eq('owner_id', user.id)
      .eq('supplier_id', targetSupplierId)
      .maybeSingle()

    if (existing) {
      setSelectedConv(existing)
      setConversations(prev => prev.find(c => c.id === existing.id) ? prev : [existing, ...prev])
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ owner_id: user.id, supplier_id: targetSupplierId })
        .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
        .single()
      if (newConv) {
        setConversations(prev => [newConv, ...prev])
        setSelectedConv(newConv)
      }
    }
  }

  useEffect(() => {
    if (!selectedConv) return
    loadMessages(selectedConv.id)

    const channel = supabase
      .channel(`conv-${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        if (payload.new.sender_id !== user.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedConv?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', user.id)
  }

  async function sendMessage() {
    if (!input.trim() || !selectedConv || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: text,
    })
    setSending(false)
  }

  function getConvName(conv) {
    if (!conv) return ''
    if (role === 'restaurant_owner') return conv.supplier?.business_name || 'Supplier'
    return conv.owner?.full_name || conv.owner?.email || 'Restaurant Owner'
  }

  function getConvAvatar(conv) {
    if (!conv) return null
    if (role === 'restaurant_owner') return conv.supplier?.avatar_url || null
    return null
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <h1 className="text-2xl font-black text-slate-900 mb-4 flex-shrink-0">Messages</h1>
      <div className="flex-1 min-h-0 flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Conversation list */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-slate-100 flex-shrink-0`}>
          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            <p className="text-sm font-semibold text-slate-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No conversations yet</p>
                {role === 'restaurant_owner' && (
                  <p className="text-xs text-slate-400 mt-1">Visit a supplier profile to start a conversation</p>
                )}
              </div>
            ) : conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${selectedConv?.id === conv.id ? 'bg-emerald-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {getConvAvatar(conv) ? (
                    <img src={getConvAvatar(conv)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{getConvName(conv)?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{getConvName(conv)}</p>
                  {role === 'restaurant_owner' && conv.supplier?.city && (
                    <p className="text-xs text-slate-400 truncate">{conv.supplier.city}</p>
                  )}
                  {conv.last_message_at && (
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message thread */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSelectedConv(null)}
                className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {getConvAvatar(selectedConv) ? (
                  <img src={getConvAvatar(selectedConv)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">{getConvName(selectedConv)?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{getConvName(selectedConv)}</p>
                {role === 'restaurant_owner' && selectedConv.supplier?.city && (
                  <p className="text-xs text-slate-400">{selectedConv.supplier.city}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender_id === user.id
                      ? 'bg-slate-900 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] mt-1 opacity-60">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0">
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
          <div className="hidden md:flex flex-1 items-center justify-center text-center text-slate-400">
            <div>
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
