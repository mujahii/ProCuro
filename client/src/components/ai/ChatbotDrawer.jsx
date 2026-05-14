import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { askGemini } from '../../lib/gemini'

const SUGGESTIONS = {
  restaurant_owner: [
    'What did I spend last month?',
    'Show my recent orders',
    'Which supplier do I order from most?',
    'Any pending deliveries?',
  ],
  supplier: [
    'How are my sales this month?',
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
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, order_splits(supplier:supplier_profiles(business_name), order_items(quantity, unit_price, product:products(name, category)))')
      .eq('restaurant_owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
    return { recentOrders: orders || [] }
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
        .select('id, status, total_amount, created_at, order_items(quantity, unit_price, product:products(name, category))')
        .eq('supplier_id', sp.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('products')
        .select('name, category, price, stock_quantity, is_active')
        .eq('supplier_id', sp.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    return { businessName: sp.business_name, recentOrders: orders || [], products: products || [] }
  }

  return {}
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n')
    .map((line, i) => `<span key=${i}>${line}</span>`)
    .join('<br/>')
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
    <div
      className={`fixed bottom-36 lg:bottom-24 right-4 lg:right-6 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-200 ${
        open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}
      style={{ height: 440 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-4 flex justify-between items-center text-white flex-shrink-0">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          ProCuro AI Assistant
        </h3>
        <button onClick={onClose} className="hover:opacity-75 transition-opacity">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mb-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
            />
          </div>
        ))}

        {/* Suggestion chips — only shown before first user message */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 hover:bg-emerald-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
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
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 disabled:opacity-40 flex-shrink-0 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
