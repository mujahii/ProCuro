import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageSquare, ArrowLeft, Shield, Search, X, Paperclip, Trash2, FileText, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [userProfiles, setUserProfiles] = useState({})
  const [profileModal, setProfileModal] = useState(null)
  const [unreadMap, setUnreadMap] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteListConvId, setDeleteListConvId] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

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
    setConfirmDelete(false)

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

  async function fetchProfile(userId) {
    const [{ data: u }, { data: op }, { data: sp }] = await Promise.all([
      supabase.from('users').select('id, full_name, email, role, avatar_url, phone, created_at, is_banned').eq('id', userId).single(),
      supabase.from('owner_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('supplier_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (!u) return null
    return { ...u, owner_profile: op || null, supplier_profile: sp || null }
  }

  async function loadConversations() {
    const { data: convs } = await supabase
      .from('admin_conversations')
      .select('*')
      .order('created_at', { ascending: false })

    const userIds = [...new Set((convs || []).map(c => c.user_id).filter(Boolean))]
    const convIds = (convs || []).map(c => c.id)

    let profileMap = {}
    if (userIds.length > 0) {
      const [{ data: usersData }, { data: ownerData }, { data: supplierData }] = await Promise.all([
        supabase.from('users').select('id, full_name, email, role, avatar_url, is_banned').in('id', userIds),
        supabase.from('owner_profiles').select('user_id, restaurant_name, city').in('user_id', userIds),
        supabase.from('supplier_profiles').select('user_id, business_name, city, avatar_url').in('user_id', userIds),
      ])
      ;(usersData || []).forEach(u => { profileMap[u.id] = { ...u } })
      ;(ownerData || []).forEach(op => {
        if (profileMap[op.user_id]) {
          profileMap[op.user_id].restaurant_name = op.restaurant_name
          profileMap[op.user_id].city = op.city
        }
      })
      ;(supplierData || []).forEach(sp => {
        if (profileMap[sp.user_id]) {
          profileMap[sp.user_id].business_name = sp.business_name
          profileMap[sp.user_id].city = profileMap[sp.user_id].city || sp.city
          profileMap[sp.user_id].avatar_url = sp.avatar_url || profileMap[sp.user_id].avatar_url
        }
      })
    }

    // Batch-fetch unread counts per conversation
    if (convIds.length > 0 && user) {
      const { data: unreads } = await supabase
        .from('admin_messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', user.id)
      const map = {}
      ;(unreads || []).forEach(m => { map[m.conversation_id] = (map[m.conversation_id] || 0) + 1 })
      setUnreadMap(map)
    }

    setUserProfiles(profileMap)
    setConversations(convs || [])
    setLoading(false)
  }

  function handleSelectConv(conv) {
    setSelectedConv(conv)
    setConfirmDelete(false)
    setUnreadMap(prev => ({ ...prev, [conv.id]: 0 }))
  }

  async function openOrCreateConv(targetUserId) {
    let { data: conv } = await supabase
      .from('admin_conversations')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (!conv) {
      const { data: newConv, error } = await supabase
        .from('admin_conversations')
        .insert({ user_id: targetUserId })
        .select()
        .single()
      if (error) {
        const { data: retry } = await supabase
          .from('admin_conversations')
          .select('*')
          .eq('user_id', targetUserId)
          .maybeSingle()
        conv = retry
      } else {
        conv = newConv
      }
    }

    if (!conv) return

    if (!userProfiles[targetUserId]) {
      const [{ data: u }, { data: op }, { data: sp }] = await Promise.all([
        supabase.from('users').select('id, full_name, email, role, avatar_url, is_banned').eq('id', targetUserId).single(),
        supabase.from('owner_profiles').select('user_id, restaurant_name, city').eq('user_id', targetUserId).maybeSingle(),
        supabase.from('supplier_profiles').select('user_id, business_name, city, avatar_url').eq('user_id', targetUserId).maybeSingle(),
      ])
      if (u) {
        setUserProfiles(prev => ({
          ...prev,
          [targetUserId]: {
            ...u,
            restaurant_name: op?.restaurant_name,
            city: op?.city || sp?.city,
            business_name: sp?.business_name,
            avatar_url: sp?.avatar_url || u.avatar_url,
          },
        }))
      }
    }

    setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev])
    handleSelectConv(conv)
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

  async function uploadFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed')
      return null
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File must be under 5MB')
      return null
    }
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const safeName = `${selectedConv.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
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
    const { data: inserted } = await supabase.from('admin_messages')
      .insert({
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content: text,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      })
      .select().single()
    if (inserted) setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    setSending(false)
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedConv) return
    setUploading(true)
    const result = await uploadFile(file)
    if (result) await sendMessage(result.url, result.type)
    setUploading(false)
  }

  async function deleteConversation(convId) {
    const id = convId || selectedConv?.id
    if (!id) return
    const { error } = await supabase.from('admin_conversations').delete().eq('id', id)
    if (error) { toast.error('Failed to delete chat'); return }
    setConversations(prev => prev.filter(c => c.id !== id))
    if (selectedConv?.id === id) { setSelectedConv(null); setMessages([]) }
    setConfirmDelete(false)
    setDeleteListConvId(null)
    toast.success('Chat deleted')
  }

  async function openProfile(conv) {
    const p = await fetchProfile(conv.user_id)
    if (p) setProfileModal(p)
  }

  function getDisplayName(conv) {
    const p = userProfiles[conv.user_id]
    if (!p) return '...'
    if (p.role === 'restaurant_owner') return p.restaurant_name || p.full_name || p.email || 'Owner'
    if (p.role === 'supplier') return p.business_name || p.full_name || p.email || 'Supplier'
    return p.full_name || p.email || 'User'
  }

  function getRoleLabel(userId) {
    const p = userProfiles[userId]
    if (!p) return ''
    return { restaurant_owner: 'Restaurant Owner', supplier: 'Supplier', admin: 'Admin' }[p.role] || p.role
  }

  function getRoleBadgeClass(role) {
    return { supplier: 'bg-purple-50 text-purple-700', restaurant_owner: 'bg-blue-50 text-blue-700', admin: 'bg-red-50 text-red-700' }[role] || 'bg-gray-100 text-gray-600'
  }

  const filtered = conversations.filter(c =>
    !search || getDisplayName(c).toLowerCase().includes(search.toLowerCase())
  )
  const selectedProfile = selectedConv ? userProfiles[selectedConv.user_id] : null

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileSelect}
      />
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-lionsmane rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-herb"
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
                <p className="text-xs text-gray-300 mt-1">Click Chat on a user to start</p>
              </div>
            ) : filtered.map(conv => {
              const p = userProfiles[conv.user_id]
              const unread = unreadMap[conv.id] || 0
              const isDeleting = deleteListConvId === conv.id
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center border-b border-gray-50 ${selectedConv?.id === conv.id ? 'bg-lionsmane' : 'hover:bg-lionsmane'} transition-colors`}
                >
                  <button
                    onClick={() => handleSelectConv(conv)}
                    className="flex-1 p-4 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {p?.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-slate-500">{getDisplayName(conv)?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${unread > 0 ? 'font-black text-gray-900' : 'font-semibold text-gray-900'}`}>{getDisplayName(conv)}</p>
                      <p className="text-xs text-gray-400">{getRoleLabel(conv.user_id)}{p?.city ? ` · ${p.city}` : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {unread > 0 && (
                        <span className="bg-herb text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                      {p?.is_banned && (
                        <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Banned</span>
                      )}
                    </div>
                  </button>
                  {isDeleting ? (
                    <div className="flex items-center gap-1 pr-2 flex-shrink-0">
                      <button onClick={() => deleteConversation(conv.id)} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded font-semibold hover:bg-red-700">Del</button>
                      <button onClick={() => setDeleteListConvId(null)} className="px-2 py-1 text-[10px] bg-gray-100 text-gray-700 rounded font-semibold">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteListConvId(conv.id) }}
                      className="opacity-0 group-hover:opacity-100 p-2 mr-1 hover:bg-red-50 rounded-lg flex-shrink-0 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Message thread */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => openProfile(selectedConv)}
                className="flex items-center gap-3 hover:bg-lionsmane rounded-xl px-2 py-1 -ml-2 transition-colors flex-1 min-w-0 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedProfile?.avatar_url
                    ? <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-slate-500">{getDisplayName(selectedConv)?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{getDisplayName(selectedConv)}</p>
                  <p className="text-xs text-gray-400">
                    {getRoleLabel(selectedConv.user_id)}{selectedProfile?.city ? ` · ${selectedProfile.city}` : ''}
                    <span className="text-midnight font-medium"> · tap to view profile</span>
                  </p>
                </div>
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 hidden sm:block">Delete chat?</span>
                  <button onClick={deleteConversation} className="px-2.5 py-1 text-xs bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 group" title="Delete conversation">
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-lionsmane">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mr-2 self-end mb-1 overflow-hidden">
                        {selectedProfile?.avatar_url
                          ? <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-slate-500">{getDisplayName(selectedConv)?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                    )}
                    <div className="max-w-[75%] space-y-1">
                      {msg.attachment_url && (
                        msg.attachment_type?.startsWith('image/') ? (
                          <img
                            src={msg.attachment_url}
                            alt="attachment"
                            className="rounded-xl max-h-48 max-w-full object-contain cursor-pointer block"
                            onClick={() => window.open(msg.attachment_url, '_blank')}
                          />
                        ) : (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${isMine ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" /> View PDF
                          </a>
                        )
                      )}
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

            <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0 items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="p-2 text-gray-400 hover:text-midnight hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-40"
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
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center text-gray-400">
            <div>
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Select a conversation to reply</p>
              <p className="text-xs mt-1 text-gray-300">Or click Chat on any user in the Users page</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile modal */}
      {profileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {profileModal.role === 'supplier' ? 'Supplier' : profileModal.role === 'restaurant_owner' ? 'Restaurant Owner' : 'User'} Profile
              </h2>
              <button onClick={() => setProfileModal(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {profileModal.avatar_url || profileModal.supplier_profile?.avatar_url ? (
                    <img src={profileModal.avatar_url || profileModal.supplier_profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-slate-500">{(profileModal.full_name || profileModal.email || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{profileModal.full_name || '—'}</p>
                  <p className="text-sm text-gray-500">{profileModal.email}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRoleBadgeClass(profileModal.role)}`}>
                      {profileModal.role === 'restaurant_owner' ? 'Owner' : profileModal.role === 'supplier' ? 'Supplier' : 'Admin'}
                    </span>
                    {profileModal.is_banned && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Banned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-2 text-sm">
              {[
                ['Phone', profileModal.phone],
                ['Joined', profileModal.created_at ? format(new Date(profileModal.created_at), 'dd MMM yyyy') : null],
              ].map(([label, val]) => val && (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val}</span>
                </div>
              ))}

              {profileModal.role === 'supplier' && profileModal.supplier_profile && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Supplier Info</p>
                  {[
                    ['Business', profileModal.supplier_profile.business_name],
                    ['City', profileModal.supplier_profile.city],
                    ['Phone', profileModal.supplier_profile.phone || profileModal.phone],
                    ['Category', Array.isArray(profileModal.supplier_profile.category) ? profileModal.supplier_profile.category.join(', ') : profileModal.supplier_profile.category],
                    ['Rating', profileModal.supplier_profile.rating != null ? `${Number(profileModal.supplier_profile.rating).toFixed(1)} ★` : null],
                    ['Verified', profileModal.supplier_profile.is_verified ? 'Yes' : 'No'],
                    ['Listed', profileModal.supplier_profile.is_active ? 'Yes' : 'No'],
                    ['Website', profileModal.supplier_profile.website],
                  ].map(([label, val]) => val && (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%]">{val}</span>
                    </div>
                  ))}
                  {profileModal.supplier_profile.description && (
                    <div className="bg-lionsmane rounded-lg p-3 text-xs text-gray-600 leading-relaxed">{profileModal.supplier_profile.description}</div>
                  )}
                </>
              )}

              {profileModal.role === 'restaurant_owner' && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Restaurant Info</p>
                  {profileModal.owner_profile ? [
                    ['Restaurant', profileModal.owner_profile.restaurant_name],
                    ['City', profileModal.owner_profile.city],
                    ['Tax ID', profileModal.owner_profile.tax_id],
                    ['Cuisine', Array.isArray(profileModal.owner_profile.cuisine) ? profileModal.owner_profile.cuisine.join(', ') : profileModal.owner_profile.cuisine],
                    ['Website', profileModal.owner_profile.website],
                    ['Listed', profileModal.owner_profile.is_active !== false ? 'Yes' : 'No'],
                  ].map(([label, val]) => val && (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%]">{val}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400 italic">No profile set up yet</p>
                  )}
                </>
              )}
            </div>

            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => setProfileModal(null)}
                className="w-full py-2.5 bg-midnight text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
