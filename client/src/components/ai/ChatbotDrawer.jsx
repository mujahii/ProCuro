import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { askGemini } from '../../lib/gemini'

export default function ChatbotDrawer({ open, onClose }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your ProCuro AI assistant. I can help you with orders, spending analysis, and supplier recommendations. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function getContext() {
    if (!user) return {}
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_splits(*, supplier:supplier_profiles(business_name), order_items(*, product:products(name, category)))')
      .eq('restaurant_owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    return { recentOrders: orders || [] }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const context = await getContext()
      const response = await askGemini(text, context, session?.access_token ?? '')
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI assistant is temporarily unavailable. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`fixed bottom-36 lg:bottom-24 right-4 lg:right-6 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-200 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      style={{ height: 384 }}
    >
      {/* Header */}
      <div className="bg-emerald-600 p-4 flex justify-between items-center text-white flex-shrink-0">
        <h3 className="font-bold flex items-center gap-2">
          <Bot className="w-5 h-5" /> ProCuro AI
        </h3>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-none'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl rounded-bl-none flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask something..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
