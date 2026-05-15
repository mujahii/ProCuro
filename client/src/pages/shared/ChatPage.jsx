import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Send, MessageSquare, ArrowLeft, Package, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ChatPage() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initSupplierId = searchParams.get('supplier_id')
  const initOwnerId = searchParams.get('owner_id')
  const autoMessage = searchParams.get('auto_message') ? decodeURIComponent(searchParams.get('auto_message')) : ''
  const orderRef = searchParams.get('order_ref')

  const [supplierId, setSupplierId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [adminConv, setAdminConv] = useState(null)
  const [adminMessages, setAdminMessages] = useState([])
  const [showingAdmin, setShowingAdmin] = useState(false)
  const [adminUnread, setAdminUnread] = useState(0)
  const autoSentRef = useRef(false)
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
    loadAdminConv()
  }, [user, role, supplierId])

  // Owner: open conv with supplier from order link
  useEffect(() => {
    if (!initSupplierId || role !== 'restaurant_owner' || !user) return
    startOrOpen(initSupplierId)
  }, [initSupplierId, user, role])

  // Supplier: open conv with owner from order link
  useEffect(() => {
    if (!initOwnerId || role !== 'supplier' || !supplierId) return
    startOrOpenForSupplier(initOwnerId)
  }, [initOwnerId, supplierId, role])

  async function loadAdminConv() {
    const { data } = await supabase
      .from('admin_conversations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      setAdminConv(data)
      const { count } = await supabase
        .from('admin_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', data.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)
      setAdminUnread(count || 0)
    }
  }

  async function openAdminSupport() {
    let conv = adminConv
    if (!conv) {
      const { data } = await supabase
        .from('admin_conversations')
        .insert({ user_id: user.id })
        .select()
        .single()
      conv = data
      setAdminConv(conv)
    }
    if (!conv) return
    setShowingAdmin(true)
    setSelectedConv(null)
    const { data: msgs } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setAdminMessages(msgs || [])
    await supabase.from('admin_messages').update({ is_read: true })
      .eq('conversation_id', conv.id).neq('sender_id', user.id)
    setAdminUnread(0)
  }

  async function sendAdminMessage() {
    if (!input.trim() || !adminConv || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic = { id: tempId, conversation_id: adminConv.id, sender_id: user.id, content: text, is_read: false, created_at: new Date().toISOString() }
    setAdminMessages(prev => [...prev, optimistic])
    const { data: inserted } = await supabase.from('admin_messages')
      .insert({ conversation_id: adminConv.id, sender_id: user.id, content: text })
      .select().single()
    if (inserted) setAdminMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    setSending(false)
  }

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
        .order('created_at', { ascending: false })
      const ownerIds = [...new Set((convs || []).map(c => c.owner_id).filter(Boolean))]
      let ownerMap = {}
      if (ownerIds.length > 0) {
        const [{ data: ownerUsers }, { data: ownerProfiles }] = await Promise.all([
          supabase.from('users').select('id, full_name, email, avatar_url').in('id', ownerIds),
          supabase.from('owner_profiles').select('user_id, restaurant_name, city').in('user_id', ownerIds),
        ])
        ;(ownerUsers || []).forEach(u => { ownerMap[u.id] = { ...ownerMap[u.id], id: u.id, full_name: u.full_name, email: u.email, avatar_url: u.avatar_url } })
        ;(ownerProfiles || []).forEach(op => { ownerMap[op.user_id] = { ...ownerMap[op.user_id], restaurant_name: op.restaurant_name, city: op.city } })
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

  async function startOrOpenForSupplier(targetOwnerId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('owner_id', targetOwnerId)
      .maybeSingle()

    let conv = existing
    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ supplier_id: supplierId, owner_id: targetOwnerId })
        .select()
        .single()
      conv = newConv
    }
    if (conv) {
      const [{ data: ownerUser }, { data: ownerProfile }] = await Promise.all([
        supabase.from('users').select('id, full_name, email, avatar_url').eq('id', targetOwnerId).single(),
        supabase.from('owner_profiles').select('restaurant_name, city').eq('user_id', targetOwnerId).maybeSingle(),
      ])
      const owner = ownerUser ? { ...ownerUser, restaurant_name: ownerProfile?.restaurant_name || null, city: ownerProfile?.city || null } : null
      const enriched = { ...conv, owner }
      setConversations(prev => prev.find(c => c.id === enriched.id) ? prev : [enriched, ...prev])
      setSelectedConv(enriched)
    }
  }

  // Auto-send message when opening from order link
  useEffect(() => {
    if (!selectedConv || !autoMessage || autoSentRef.current) return
    autoSentRef.current = true
    setTimeout(() => {
      supabase.from('messages').insert({
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content: autoMessage,
        order_id: orderRef || null,
        is_system: false,
      }).select().single().then(({ data }) => {
        if (data) setMessages(prev => [...prev, data])
      })
    }, 500)
  }, [selectedConv])

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
    if (!adminConv || !showingAdmin) return
    const channel = supabase
      .channel(`admin-conv-${adminConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'admin_messages',
        filter: `conversation_id=eq.${adminConv.id}`,
      }, (payload) => {
        setAdminMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        if (payload.new.sender_id !== user.id) {
          supabase.from('admin_messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [adminConv?.id, showingAdmin])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, adminMessages])

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
    // Optimistic update — show message immediately
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: text,
    }).select().single()
    // Replace temp with real row
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    }
    setSending(false)
  }

  function getConvName(conv) {
    if (!conv) return ''
    if (role === 'restaurant_owner') return conv.supplier?.business_name || 'Supplier'
    return conv.owner?.restaurant_name || conv.owner?.full_name || conv.owner?.email || 'Restaurant Owner'
  }

  function getConvAvatar(conv) {
    if (!conv) return null
    if (role === 'restaurant_owner') return conv.supplier?.avatar_url || null
    return conv.owner?.avatar_url || null
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <h1 className="text-2xl font-black text-slate-900 mb-4 flex-shrink-0">Messages</h1>
      <div className="flex-1 min-h-0 flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Conversation list */}
        <div className={`${selectedConv || showingAdmin ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-slate-100 flex-shrink-0`}>
          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            <p className="text-sm font-semibold text-slate-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* ProCuro Support entry always at top */}
            <button
              onClick={openAdminSupport}
              className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 ${showingAdmin ? 'bg-emerald-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">ProCuro Support</p>
                <p className="text-xs text-slate-400">Admin team</p>
              </div>
              {adminUnread > 0 && (
                <span className="bg-emerald-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{adminUnread}</span>
              )}
            </button>

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
                onClick={() => { setSelectedConv(conv); setShowingAdmin(false) }}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${selectedConv?.id === conv.id && !showingAdmin ? 'bg-emerald-50' : ''}`}
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

        {/* Admin support message thread */}
        {showingAdmin && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowingAdmin(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">ProCuro Support</p>
                <p className="text-xs text-slate-400">Admin team · Usually responds within 24h</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {adminMessages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. How can we help?</div>
              )}
              {adminMessages.map(msg => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAdminMessage()}
                placeholder="Message ProCuro Support..."
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                disabled={sending}
              />
              <button
                onClick={sendAdminMessage}
                disabled={sending || !input.trim()}
                className="p-2.5 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 disabled:opacity-40 flex-shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Message thread */}
        {!showingAdmin && selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSelectedConv(null)}
                className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => role === 'restaurant_owner' && selectedConv.supplier?.id && navigate(`/supplier/${selectedConv.supplier.id}`)}
                className={`w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 ${role === 'restaurant_owner' && selectedConv.supplier?.id ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all' : 'cursor-default'}`}
              >
                {getConvAvatar(selectedConv) ? (
                  <img src={getConvAvatar(selectedConv)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">{getConvName(selectedConv)?.[0]?.toUpperCase()}</span>
                )}
              </button>
              <div>
                <button
                  onClick={() => role === 'restaurant_owner' && selectedConv.supplier?.id && navigate(`/supplier/${selectedConv.supplier.id}`)}
                  className={`font-bold text-slate-900 text-sm ${role === 'restaurant_owner' && selectedConv.supplier?.id ? 'hover:text-emerald-600 transition-colors' : ''}`}
                >
                  {getConvName(selectedConv)}
                </button>
                {role === 'restaurant_owner' && selectedConv.supplier?.city && (
                  <p className="text-xs text-slate-400">{selectedConv.supplier.city}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id
                const orderLink = msg.order_id
                  ? (role === 'restaurant_owner' ? `/owner/orders` : `/supplier/orders`)
                  : null
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] space-y-1`}>
                      {orderLink && (
                        <button
                          onClick={() => navigate(orderLink)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors w-full ${
                            isMine
                              ? 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5 flex-shrink-0" /> View Order Details →
                        </button>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-slate-900 text-white rounded-br-none'
                          : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                      }`}>
                        <p>{msg.content}</p>
                        <p className="text-[10px] mt-1 opacity-60">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
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
        ) : !showingAdmin && (
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
