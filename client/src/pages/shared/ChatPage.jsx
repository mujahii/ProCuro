import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Send, MessageSquare, ArrowLeft, Package, Shield, Paperclip, FileText, MoreVertical, Pin, Trash2, Loader2, X, MapPin, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
  const [uploading, setUploading] = useState(false)
  const [unreadMap, setUnreadMap] = useState({})
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false)
  const [deleteListConvId, setDeleteListConvId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [deleteModalConvId, setDeleteModalConvId] = useState(null)
  const menuRef = useRef(null)
  const [ownerProfileModal, setOwnerProfileModal] = useState(null)
  const [adminConv, setAdminConv] = useState(null)
  const [adminMessages, setAdminMessages] = useState([])
  const [showingAdmin, setShowingAdmin] = useState(false)
  const [adminUnread, setAdminUnread] = useState(0)
  const autoSentRef = useRef(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      // Don't close if click was inside any conv menu (dropdown or trigger button)
      if (e.target.closest('[data-conv-menu]')) return
      setMenuOpenId(null)
      setHeaderMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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

  useEffect(() => {
    if (!initSupplierId || role !== 'restaurant_owner' || !user) return
    startOrOpen(initSupplierId)
  }, [initSupplierId, user, role])

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
    setConfirmDeleteConv(false)
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

  async function loadConversations() {
    if (role === 'restaurant_owner') {
      const { data } = await supabase
        .from('conversations')
        .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
        .eq('owner_id', user.id)
        .is('deleted_for_owner_at', null)
        .order('last_message_at', { ascending: false })
      const convIds = (data || []).map(c => c.id)
      if (convIds.length > 0) {
        const { data: unreads } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
        const map = {}
        ;(unreads || []).forEach(m => { map[m.conversation_id] = (map[m.conversation_id] || 0) + 1 })
        setUnreadMap(map)
      }
      setConversations(data || [])
    } else if (role === 'supplier' && supplierId) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .eq('supplier_id', supplierId)
        .is('deleted_for_supplier_at', null)
        .order('created_at', { ascending: false })
      const convIds = (convs || []).map(c => c.id)
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
      if (convIds.length > 0) {
        const { data: unreads } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
        const map = {}
        ;(unreads || []).forEach(m => { map[m.conversation_id] = (map[m.conversation_id] || 0) + 1 })
        setUnreadMap(map)
      }
      setConversations((convs || []).map(c => ({ ...c, owner: ownerMap[c.owner_id] || null })))
    }
    setLoading(false)
  }

  function handleSelectConv(conv) {
    setSelectedConv(conv)
    setShowingAdmin(false)
    setConfirmDeleteConv(false)
    setUnreadMap(prev => ({ ...prev, [conv.id]: 0 }))
  }

  async function startOrOpen(targetSupplierId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
      .eq('owner_id', user.id)
      .eq('supplier_id', targetSupplierId)
      .maybeSingle()

    if (existing) {
      handleSelectConv(existing)
      setConversations(prev => prev.find(c => c.id === existing.id) ? prev : [existing, ...prev])
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ owner_id: user.id, supplier_id: targetSupplierId })
        .select('*, supplier:supplier_profiles(id, business_name, avatar_url, city)')
        .single()
      if (newConv) {
        setConversations(prev => [newConv, ...prev])
        handleSelectConv(newConv)
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
      handleSelectConv(enriched)
    }
  }

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
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        if (payload.new.sender_id !== user.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
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
    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', convId).neq('sender_id', user.id)
  }

  async function uploadFile(file, isAdmin) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed')
      return null
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File must be under 5MB')
      return null
    }
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const convId = isAdmin ? adminConv?.id : selectedConv?.id
    const safeName = `${convId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('chat-attachments').upload(safeName, file)
    if (error) { toast.error('Upload failed: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(safeName)
    return { url: publicUrl, type: file.type }
  }

  async function sendMessage(attachmentUrl, attachmentType) {
    const text = input.trim()
    if (!text && !attachmentUrl) return
    if (!selectedConv || sending) return
    setInput('')
    setSending(true)
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: text,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      is_read: false,
      created_at: new Date().toISOString(),
    }])
    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: text,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
    }).select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    setSending(false)
  }

  async function sendAdminMessage(attachmentUrl, attachmentType) {
    const text = input.trim()
    if (!text && !attachmentUrl) return
    if (!adminConv || sending) return
    setInput('')
    setSending(true)
    const tempId = `temp-${Date.now()}`
    setAdminMessages(prev => [...prev, {
      id: tempId,
      conversation_id: adminConv.id,
      sender_id: user.id,
      content: text,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      is_read: false,
      created_at: new Date().toISOString(),
    }])
    const { data: inserted } = await supabase.from('admin_messages')
      .insert({
        conversation_id: adminConv.id,
        sender_id: user.id,
        content: text,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      })
      .select().single()
    if (inserted) setAdminMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    setSending(false)
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const result = await uploadFile(file, showingAdmin)
    if (result) {
      if (showingAdmin) await sendAdminMessage(result.url, result.type)
      else await sendMessage(result.url, result.type)
    }
    setUploading(false)
  }

  async function deleteConversation(convId) {
    const id = convId || selectedConv?.id
    if (!id) return
    const col = role === 'restaurant_owner' ? 'deleted_for_owner_at' : 'deleted_for_supplier_at'
    const { error } = await supabase.from('conversations').update({ [col]: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Failed to delete chat'); return }
    setConversations(prev => prev.filter(c => c.id !== id))
    if (selectedConv?.id === id) { setSelectedConv(null); setMessages([]) }
    setConfirmDeleteConv(false)
    setDeleteListConvId(null)
    setDeleteModalConvId(null)
    setMenuOpenId(null)
    toast.success('Chat removed from your inbox')
  }

  async function togglePin(convId) {
    const conv = conversations.find(c => c.id === convId)
    if (!conv) return
    const col = role === 'restaurant_owner' ? 'pinned_by_owner' : 'pinned_by_supplier'
    const newVal = !conv[col]
    await supabase.from('conversations').update({ [col]: newVal }).eq('id', convId)
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, [col]: newVal } : c))
    setMenuOpenId(null)
    toast.success(newVal ? 'Chat pinned' : 'Chat unpinned')
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

  function renderAttachment(msg, isMine) {
    if (!msg.attachment_url) return null
    if (msg.attachment_type?.startsWith('image/')) {
      return (
        <img
          src={msg.attachment_url}
          alt="attachment"
          className="rounded-xl max-h-48 max-w-full object-contain cursor-pointer block"
          onClick={() => window.open(msg.attachment_url, '_blank')}
        />
      )
    }
    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${isMine ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}
      >
        <FileText className="w-4 h-4 flex-shrink-0" /> View PDF
      </a>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileSelect}
      />
      <h1 className="text-2xl font-black text-slate-900 mb-4 flex-shrink-0">Messages</h1>
      <div className="flex-1 min-h-0 flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Conversation list */}
        <div className={`${selectedConv || showingAdmin ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-slate-100 flex-shrink-0`}>
          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            <p className="text-sm font-semibold text-slate-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* ProCuro Support always at top */}
            <button
              onClick={openAdminSupport}
              className={`w-full p-4 flex items-center gap-3 hover:bg-lionsmane transition-colors text-left border-b border-slate-100 ${showingAdmin ? 'bg-lionsmane' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-midnight flex-shrink-0 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">ProCuro Support</p>
                <p className="text-xs text-slate-400">Admin team</p>
              </div>
              {adminUnread > 0 && (
                <span className="bg-herb text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {adminUnread > 9 ? '9+' : adminUnread}
                </span>
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
            ) : conversations.map(conv => {
              const unread = unreadMap[conv.id] || 0
              const isPinned = role === 'restaurant_owner' ? conv.pinned_by_owner : conv.pinned_by_supplier
              const menuOpen = menuOpenId === conv.id
              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center border-b border-slate-50 ${selectedConv?.id === conv.id && !showingAdmin ? 'bg-lionsmane' : 'hover:bg-lionsmane'} transition-colors`}
                >
                  <button
                    onClick={() => handleSelectConv(conv)}
                    className="flex-1 p-4 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="relative w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {getConvAvatar(conv)
                        ? <img src={getConvAvatar(conv)} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-slate-500">{getConvName(conv)?.[0]?.toUpperCase()}</span>
                      }
                      {isPinned && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-marigold rounded-full flex items-center justify-center shadow-sm">
                          <Pin className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${unread > 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-900'}`}>{getConvName(conv)}</p>
                      {role === 'restaurant_owner' && conv.supplier?.city && (
                        <p className="text-xs text-slate-400 truncate">{conv.supplier.city}</p>
                      )}
                      {conv.last_message_at && (
                        <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}</p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="bg-herb text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {/* Three-dot menu */}
                  <div className="relative flex-shrink-0 pr-2" data-conv-menu>
                    <button
                      onClick={() => setMenuOpenId(menuOpen ? null : conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 rounded-lg transition-all"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => togglePin(conv.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-lionsmane transition-colors"
                        >
                          <Pin className="w-3.5 h-3.5 text-marigold" />
                          {isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <div className="border-t border-slate-100 my-0.5" />
                        <button
                          onClick={() => { setDeleteModalConvId(conv.id); setMenuOpenId(null) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Admin support thread */}
        {showingAdmin && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowingAdmin(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-9 h-9 rounded-full bg-midnight flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-sm">ProCuro Support</p>
                <p className="text-xs text-slate-400">Admin team · Usually responds within 24h</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-lionsmane">
              {adminMessages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. How can we help?</div>
              )}
              {adminMessages.map(msg => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] space-y-1">
                      {renderAttachment(msg, isMine)}
                      {msg.content && (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine ? 'bg-midnight text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-[10px] mt-1 opacity-60">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                        </div>
                      )}
                      {msg.attachment_url && !msg.content && (
                        <p className={`text-[10px] px-1 opacity-60 text-slate-400 ${isMine ? 'text-right' : ''}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0 items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="p-2 text-slate-400 hover:text-midnight hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
                title="Attach image or PDF (max 5MB)"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-herb" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAdminMessage()}
                placeholder={uploading ? 'Uploading...' : 'Message ProCuro Support...'}
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-herb focus:bg-white transition-colors"
                disabled={sending || uploading}
              />
              <button
                onClick={() => sendAdminMessage()}
                disabled={sending || uploading || !input.trim()}
                className="p-2.5 bg-midnight rounded-full text-white hover:bg-midnight-dark disabled:opacity-40 flex-shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Owner-supplier thread */}
        {!showingAdmin && selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => {
                  if (role === 'restaurant_owner' && selectedConv.supplier?.id) navigate(`/supplier/${selectedConv.supplier.id}`)
                  else if (role === 'supplier' && selectedConv.owner) setOwnerProfileModal(selectedConv.owner)
                }}
                className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-herb-light transition-all"
              >
                {getConvAvatar(selectedConv)
                  ? <img src={getConvAvatar(selectedConv)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-slate-500">{getConvName(selectedConv)?.[0]?.toUpperCase()}</span>
                }
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (role === 'restaurant_owner' && selectedConv.supplier?.id) navigate(`/supplier/${selectedConv.supplier.id}`)
                    else if (role === 'supplier' && selectedConv.owner) setOwnerProfileModal(selectedConv.owner)
                  }}
                  className="font-bold text-slate-900 text-sm hover:text-midnight transition-colors"
                >
                  {getConvName(selectedConv)}
                </button>
                {role === 'restaurant_owner' && selectedConv.supplier?.city && (
                  <p className="text-xs text-slate-400">{selectedConv.supplier.city}</p>
                )}
                {role === 'supplier' && selectedConv.owner?.city && (
                  <p className="text-xs text-slate-400">{selectedConv.owner.city}</p>
                )}
              </div>

              <div className="relative flex-shrink-0" data-conv-menu>
                <button
                  onClick={() => setHeaderMenuOpen(o => !o)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </button>
                {headerMenuOpen && (
                  <div className="absolute right-0 top-9 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => { togglePin(selectedConv.id); setHeaderMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-lionsmane transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5 text-marigold" />
                      {(role === 'restaurant_owner' ? selectedConv.pinned_by_owner : selectedConv.pinned_by_supplier) ? 'Unpin' : 'Pin'}
                    </button>
                    <div className="border-t border-slate-100 my-0.5" />
                    <button
                      onClick={() => { setDeleteModalConvId(selectedConv.id); setHeaderMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-lionsmane">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id
                const orderLink = msg.order_id
                  ? (role === 'restaurant_owner' ? '/owner/orders' : '/supplier/orders')
                  : null
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] space-y-1">
                      {orderLink && (
                        <button
                          onClick={() => navigate(orderLink)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors w-full ${
                            isMine ? 'bg-slate-800 text-celeste-dark border-slate-700 hover:bg-slate-700' : 'bg-lionsmane text-midnight-dark border-celeste hover:bg-celeste'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5 flex-shrink-0" /> View Order Details →
                        </button>
                      )}
                      {renderAttachment(msg, isMine)}
                      {msg.content && (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine ? 'bg-midnight text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-[10px] mt-1 opacity-60">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                        </div>
                      )}
                      {msg.attachment_url && !msg.content && (
                        <p className={`text-[10px] px-1 opacity-60 text-slate-400 ${isMine ? 'text-right' : ''}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0 items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="p-2 text-slate-400 hover:text-midnight hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
                title="Attach image or PDF (max 5MB)"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-herb" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={uploading ? 'Uploading...' : 'Type a message...'}
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-herb focus:bg-white transition-colors"
                disabled={sending || uploading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || uploading || !input.trim()}
                className="p-2.5 bg-midnight rounded-full text-white hover:bg-midnight-dark disabled:opacity-40 flex-shrink-0 transition-colors"
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

      {/* Delete confirmation modal */}
      {deleteModalConvId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModalConvId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete conversation?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This will remove the chat from your inbox. The other person can still see it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalConvId(null)}
                className="flex-1 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-lionsmane transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConversation(deleteModalConvId)}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner profile modal (for supplier view) */}
      {ownerProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOwnerProfileModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Restaurant Owner</h2>
              <button onClick={() => setOwnerProfileModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {ownerProfileModal.avatar_url
                  ? <img src={ownerProfileModal.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User className="w-10 h-10 text-slate-400" />
                }
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900 text-lg">{ownerProfileModal.restaurant_name || ownerProfileModal.full_name || 'Restaurant Owner'}</p>
                {ownerProfileModal.full_name && ownerProfileModal.restaurant_name && (
                  <p className="text-sm text-slate-500 mt-0.5">{ownerProfileModal.full_name}</p>
                )}
                {ownerProfileModal.city && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 justify-center mt-1">
                    <MapPin className="w-3.5 h-3.5" />{ownerProfileModal.city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
