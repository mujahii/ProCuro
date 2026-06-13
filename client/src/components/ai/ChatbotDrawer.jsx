import { useState, useRef, useEffect } from 'react'
import { Send, X, Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { supabase } from '../../lib/supabase'
import { askGemini } from '../../lib/gemini'

const SUGGESTIONS = {
  en: {
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
  },
  de: {
    restaurant_owner: [
      'Welche Lieferanten sind in meiner Nähe?',
      'Was habe ich letzten Monat ausgegeben?',
      'Schlage ein Produkt vor, das ich brauche',
      'Gibt es ausstehende Lieferungen?',
    ],
    supplier: [
      'Wer hat diesen Monat bei mir bestellt?',
      'Welche Produkte verkaufen sich am besten?',
      'Zeige meine offenen Bestellungen',
      'Wie kann ich mein Geschäft ausbauen?',
    ],
    admin: [
      'Plattformübersicht',
      'Gibt es Probleme zu melden?',
      'Wie viele aktive Nutzer gibt es?',
      'Top-Lieferanten anzeigen',
    ],
  },
}

const WELCOME = {
  en: {
    restaurant_owner: "Hi! I'm your ProCuro AI assistant. I can help you track orders, analyse spending, and find the best Halal suppliers. What would you like to know?",
    supplier: "Hi! I'm your ProCuro AI assistant. I can help you manage orders, understand your sales, and grow your business. What would you like to know?",
    admin: "Hi! I'm your ProCuro AI assistant. I can give you platform insights, flag issues, and help you manage the marketplace. What would you like to know?",
    default: "Hi! I'm your ProCuro AI assistant. How can I help you today?",
  },
  de: {
    restaurant_owner: "Hallo! Ich bin Ihr ProCuro KI-Assistent. Ich helfe Ihnen bei Bestellungen, Ausgabenanalysen und der Suche nach den besten Halal-Lieferanten. Was möchten Sie wissen?",
    supplier: "Hallo! Ich bin Ihr ProCuro KI-Assistent. Ich helfe Ihnen bei der Verwaltung von Bestellungen, dem Verständnis Ihrer Umsätze und dem Wachstum Ihres Unternehmens. Was möchten Sie wissen?",
    admin: "Hallo! Ich bin Ihr ProCuro KI-Assistent. Ich kann Ihnen Plattformeinblicke geben, Probleme melden und bei der Verwaltung des Marktplatzes helfen. Was möchten Sie wissen?",
    default: "Hallo! Ich bin Ihr ProCuro KI-Assistent. Wie kann ich Ihnen heute helfen?",
  },
}

function needsAddressContext(text) {
  return /near(est|by)?\s*(me|supplier|to\s*me)|closest.*supplier|in\s+my\s+(city|area|vicinity|neighbourhood|neighborhood)|around\s+me|in\s+meiner\s+(nähe|umgebung|stadt)|nächste[rn]?\s+lieferant/i.test(text)
}

function needsOrderContext(text) {
  return /when\s+(will|am|do|is).*?(receiv|arriv|get|deliver)|my\s+order.*?(status|when|where|arriv|track)|track.*?order|order.*?(arriv|deliver|status|when|track)|wann\s+(erhalte|kommt|bekomme)|meine\s+bestellung|bestellung.*?(status|wann|verfolg)/i.test(text)
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
  // Collapse line breaks that split a markdown link (AI sometimes wraps [text]\n(url))
  const normalized = text.replace(/\]\s*\n+\s*\(/g, '](')
  return (
    <span>
      {normalized.split('\n').map((line, i) => {
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
  const { lang: language, t } = useLanguage()

  const lang = WELCOME[language] ? language : 'en'
  const welcome = WELCOME[lang][role] || WELCOME[lang].default
  const suggestions = SUGGESTIONS[lang][role] || []

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
      const w = WELCOME[language] ? WELCOME[language][role] || WELCOME[language].default : WELCOME.en[role] || WELCOME.en.default
      setMessages([{ role: 'assistant', content: w }])
      setShowSuggestions(true)
    }
  }, [open, role, language])

  async function sendToAI(trimmed, extraContext = {}) {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const context = await fetchContext(user)
      const response = await askGemini(trimmed, { ...context, ...extraContext }, session?.access_token ?? '', { language })
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: language === 'de'
          ? 'Entschuldigung, es gibt gerade ein Verbindungsproblem. Bitte versuche es erneut.'
          : 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function send(text, extraContext = null) {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return
    setInput('')
    setShowSuggestions(false)

    // If extraContext is already resolved (user picked from a choice), skip detection
    if (extraContext !== null) {
      setMessages(prev => [...prev, { role: 'user', content: trimmed }])
      await sendToAI(trimmed, extraContext)
      return
    }

    // Detect if the query needs address or order disambiguation for restaurant owners
    if (role === 'restaurant_owner' && user?.id) {
      if (needsAddressContext(trimmed)) {
        const { data: addresses } = await supabase.from('addresses').select('id, label, street, house_number, postal_code, city, latitude, longitude').eq('user_id', user.id)
        if (addresses && addresses.length > 1) {
          setMessages(prev => [...prev,
            { role: 'user', content: trimmed },
            { role: 'choice', kind: 'address', question: t('chatbotWhichAddress'), choices: addresses, originalQuery: trimmed },
          ])
          return
        }
        if (addresses?.length === 1) {
          setMessages(prev => [...prev, { role: 'user', content: trimmed }])
          await sendToAI(trimmed, { selectedAddress: addresses[0] })
          return
        }
      }

      if (needsOrderContext(trimmed)) {
        const { data: splits } = await supabase
          .from('order_splits')
          .select('id, status, subtotal, created_at, estimated_delivery_at, supplier:supplier_profiles(business_name)')
          .eq('restaurant_owner_id', user.id)
          .not('status', 'in', '("delivered","completed","cancelled")')
          .order('created_at', { ascending: false })
          .limit(8)
        const orders = splits && splits.length > 0 ? splits : null
        // Fall back to recent orders if no ongoing ones
        const { data: fallback } = orders ? { data: null } : await supabase
          .from('order_splits')
          .select('id, status, subtotal, created_at, estimated_delivery_at, supplier:supplier_profiles(business_name)')
          .eq('restaurant_owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
        const orderChoices = orders || fallback
        if (orderChoices && orderChoices.length > 1) {
          setMessages(prev => [...prev,
            { role: 'user', content: trimmed },
            { role: 'choice', kind: 'order', question: t('chatbotWhichOrder'), choices: orderChoices, originalQuery: trimmed },
          ])
          return
        }
        if (orderChoices?.length === 1) {
          setMessages(prev => [...prev, { role: 'user', content: trimmed }])
          await sendToAI(trimmed, { focusedOrder: orderChoices[0] })
          return
        }
      }
    }

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    await sendToAI(trimmed)
  }

  function pickChoice(msg, choice) {
    const label = msg.kind === 'address'
      ? [choice.street, choice.house_number].filter(Boolean).join(' ') + (choice.city ? `, ${choice.city}` : '')
      : `${choice.supplier?.business_name} — €${Number(choice.subtotal).toFixed(2)}`
    const extra = msg.kind === 'address' ? { selectedAddress: choice } : { focusedOrder: choice }
    // Replace the choice bubble with a user selection bubble, then answer
    setMessages(prev => prev.filter(m => m !== msg).concat([{ role: 'user', content: label }]))
    sendToAI(msg.originalQuery, extra)
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
      {/* Header — paddingTop accounts for status bar on full-screen mobile */}
      <div
        className="bg-gradient-to-r from-midnight to-herb px-4 pb-4 flex justify-between items-center text-white flex-shrink-0 lg:pt-4"
        style={{ paddingTop: 'calc(1rem + var(--sat))' }}
      >
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          ProCuro AI Assistant
        </h3>
        <button onClick={onClose} className="p-1 hover:opacity-75 transition-opacity">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-lionsmane">
        {messages.map((msg, i) => {
          if (msg.role === 'choice') {
            return (
              <div key={i} className="flex items-end gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-midnight flex items-center justify-center flex-shrink-0 mb-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[84%] bg-white border border-slate-200 rounded-2xl rounded-bl-none shadow-sm p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">{msg.question}</p>
                  <div className="flex flex-col gap-1.5">
                    {msg.choices.map((choice, ci) => {
                      const label = msg.kind === 'address'
                        ? [choice.street, choice.house_number].filter(Boolean).join(' ') || choice.label || choice.city
                        : choice.supplier?.business_name || `Order ${choice.id.slice(0, 6)}`
                      const sub = msg.kind === 'address'
                        ? [choice.postal_code, choice.city].filter(Boolean).join(', ')
                        : `€${Number(choice.subtotal).toFixed(2)} · ${new Date(choice.created_at).toLocaleDateString()}`
                      return (
                        <button
                          key={ci}
                          onClick={() => pickChoice(msg, choice)}
                          className="text-left px-3 py-2 rounded-xl border border-slate-200 bg-lionsmane hover:bg-celeste hover:border-celeste-dark transition-colors"
                        >
                          <p className="text-xs font-semibold text-midnight leading-snug">{label}</p>
                          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }
          return (
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
          )
        })}

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
      <div className="px-3 pt-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0" style={{ paddingBottom: 'calc(0.75rem + var(--sab))' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={t('chatbotAskPlaceholder')}
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-herb focus:bg-white transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-midnight rounded-full text-white hover:bg-midnight-dark disabled:opacity-40 flex-shrink-0 transition-colors flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="text-xs font-semibold hidden xs:inline sm:hidden lg:hidden">Senden</span>
        </button>
      </div>
    </div>
    </>
  )
}
