import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { askGemini } from '../../lib/gemini'

const SUGGESTIONS = {
  restaurant_owner: [
    'Which suppliers are near me?',
    'What did I spend last month?',
    'Suggest a product I need',
    'Any pending deliveries?',
  ],
  supplier: [
    'Who ordered from me this month?',
    'Which products sell best?',
    'Show my pending orders',
    'How can I grow my business?',
  ],
  admin: [
    'Platform overview',
    'Any issues to flag?',
    'How many active users?',
    'Top performing suppliers',
  ],
}

const WELCOME = {
  restaurant_owner: "Hi! I'm your ProCuro AI assistant. I can help you track orders, analyse spending, and find the best Halal suppliers. What would you like to know?",
  supplier: "Hi! I'm your ProCuro AI assistant. I can help you manage orders, understand your sales, and grow your business. What would you like to know?",
  admin: "Hi! I'm your ProCuro AI assistant. I can give you platform insights, flag issues, and help you manage the marketplace. What would you like to know?",
  default: "Hi! I'm your ProCuro AI assistant. How can I help you today?",
}

async function fetchContext(user) {
  if (!user) return {}

  if (user.role === 'restaurant_owner') {
    const [{ data: orders }, { data: ownerProfile }, { data: suppliers }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, total_amount, created_at, order_splits(supplier:supplier_profiles(id, business_name, city), order_items(quantity, unit_price, product:products(name, category)))')
        .eq('restaurant_owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('owner_profiles').select('restaurant_name, city').eq('user_id', user.id).maybeSingle(),
      supabase.from('supplier_profiles').select('id, business_name, city, category, is_active').eq('is_active', true).limit(20),
    ])
    return {
      ownerCity: ownerProfile?.city || null,
      restaurantName: ownerProfile?.restaurant_name || null,
      recentOrders: orders || [],
      availableSuppliers: (suppliers || []).map(s => ({
        id: s.id,
        name: s.business_name,
        city: s.city,
        categories: s.category,
        link: `/supplier/${s.id}`,
      })),
    }
  }

  if (user.role === 'supplier') {
    const { data: sp } = await supabase
      .from('supplier_profiles')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single()
    if (!sp) return {}
    const [{ data: orders }, { data: products }] = await Promise.all([
      supabase
        .from('order_splits')
        .select('id, status, total_amount, created_at, restaurant_owner_id, order_items(quantity, unit_price, product:products(name, category))')
        .eq('supplier_id', sp.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('products')
        .select('id, name, category, price, stock_quantity, is_active')
        .eq('supplier_id', sp.id)
        .order('created_at', { ascending: false })
        .limit(15),
    ])
    const ownerIds = [...new Set((orders || []).map(o => o.restaurant_owner_id).filter(Boolean))]
    let ownerMap = {}
    if (ownerIds.length > 0) {
      const [{ data: ownerUsers }, { data: ownerProfiles }] = await Promise.all([
        supabase.from('users').select('id, full_name').in('id', ownerIds),
        supabase.from('owner_profiles').select('user_id, restaurant_name').in('user_id', ownerIds),
      ])
      ;(ownerUsers || []).forEach(u => { ownerMap[u.id] = { name: u.full_name } })
      ;(ownerProfiles || []).forEach(op => { if (ownerMap[op.user_id]) ownerMap[op.user_id].restaurant = op.restaurant_name })
    }
    return {
      businessName: sp.business_name,
      recentOrders: (orders || []).map(o => ({
        ...o,
        ownerName: ownerMap[o.restaurant_owner_id]?.restaurant || ownerMap[o.restaurant_owner_id]?.name || 'Unknown',
      })),
      products: (products || []).map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock_quantity, active: p.is_active })),
    }
  }

  if (user.role === 'admin') {
    const [
      { count: totalUsers },
      { count: pendingReports },
      { count: pendingCerts },
      { data: recentReports },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('halal_certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('id, type, status, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    ])
    return { totalUsers, pendingReports, pendingCerts, recentReports: recentReports || [] }
  }

  return {}
}

function parseSegment(seg, key) {
  if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={key}>{seg.slice(2, -2)}</strong>
  if (seg.startsWith('*') && seg.endsWith('*')) return <em key={key}>{seg.slice(1, -1)}</em>
  // Parse markdown links [text](url)
  const linkParts = seg.split(/(\[[^\]]+\]\([^)]+\))/g)
  if (linkParts.length > 1) {
    return linkParts.map((p, pi) => {
      const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (m) {
        const [, label, href] = m
        const isInternal = href.startsWith('/')
        if (isInternal) return <Link key={`${key}-${pi}`} to={href} className="text-herb font-semibold underline hover:text-herb-dark transition-colors">{label}</Link>
        return <a key={`${key}-${pi}`} href={href} target="_blank" rel="noopener noreferrer" className="text-herb font-semibold underline hover:text-herb-dark transition-colors">{label}</a>
      }
      return p
    })
  }
  return seg
}

function FormattedMessage({ text }) {
  return (
    <span>
      {text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g)
        return (
          <span key={i}>
            {i > 0 && <br />}
            {parts.map((seg, j) => parseSegment(seg, j))}
          </span>
        )
      })}
    </span>
  )
}

export default function ChatbotDrawer({ open, onClose }) {
  const { user, role } = useAuth()
  const welcome = WELCOME[role] || WELCOME.default
  const suggestions = SUGGESTIONS[role] || []

  const [messages, setMessages] = useState([{ role: 'assistant', content: welcome }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setMessages([{ role: 'assistant', content: welcome }])
      setShowSuggestions(true)
    }
  }, [open, role])

  async function send(text) {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return
    setInput('')
    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const context = await fetchContext(user)
      const response = await askGemini(trimmed, context, session?.access_token ?? '')
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
    <div
      className={`fixed z-50 bg-white flex flex-col overflow-hidden shadow-2xl transition-all duration-200
        inset-y-0 right-0 w-full sm:w-96
        lg:inset-auto lg:bottom-24 lg:right-6 lg:w-80 lg:h-[440px] lg:rounded-2xl lg:border lg:border-slate-100
        ${open
          ? 'translate-x-0 lg:opacity-100 lg:scale-100'
          : 'translate-x-full lg:translate-x-0 lg:opacity-0 lg:scale-95 lg:pointer-events-none'
        }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-midnight to-herb p-4 flex justify-between items-center text-white flex-shrink-0">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          ProCuro AI Assistant
        </h3>
        <button onClick={onClose} className="hover:opacity-75 transition-opacity">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-lionsmane">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-midnight flex items-center justify-center flex-shrink-0 mb-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-midnight text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
              }`}
            >
              <FormattedMessage text={msg.content} />
            </div>
          </div>
        ))}

        {/* Suggestion chips — only shown before first user message */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs bg-lionsmane border border-celeste text-midnight-dark rounded-full px-3 py-1 hover:bg-celeste transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-midnight flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask me anything..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-herb focus:bg-white transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="p-2 bg-midnight rounded-full text-white hover:bg-midnight-dark disabled:opacity-40 flex-shrink-0 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
    </>
  )
}
