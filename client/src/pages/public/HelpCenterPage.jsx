import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Mail, CheckCircle } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import toast from 'react-hot-toast'

const TOPICS = [
  'Account & Registration',
  'Orders & Delivery',
  'Payments & Invoicing',
  'Halal Certification',
  'Technical Issue',
  'Other',
]

export default function HelpCenterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return toast.error('Please fill in all required fields')
    const body = `Name: ${name}\nEmail: ${email}\nTopic: ${topic || 'Not specified'}\n\nMessage:\n${message}`
    window.location.href = `mailto:support@procuro.com?subject=${encodeURIComponent(`ProCuro Help: ${topic || 'General'}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-midnight" />
          <h1 className="text-2xl font-black text-slate-900">Help Center</h1>
        </div>
        <p className="text-slate-500 mb-8">Have a question or issue? Fill out the form below and we'll get back to you within 24 hours.</p>

        {sent ? (
          <div className="bg-lionsmane border border-celeste rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-herb mx-auto mb-3" />
            <h2 className="font-bold text-midnight text-lg mb-1">Message sent!</h2>
            <p className="text-sm text-midnight-dark">Your email client should have opened. If not, email us directly at <strong>support@procuro.com</strong></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Topic</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb bg-white"
              >
                <option value="">Select a topic...</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Message *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb resize-none"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={sent}
                className="flex-1 py-3 bg-midnight text-white rounded-xl font-semibold text-sm hover:bg-midnight-dark disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send Message
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Or email us directly at <a href="mailto:support@procuro.com" className="text-midnight font-semibold hover:underline">support@procuro.com</a>
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  )
}
