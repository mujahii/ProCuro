import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Mail, CheckCircle, ChevronDown } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import toast from 'react-hot-toast'
import { useLanguage } from '../../context/LanguageContext'

const TOPIC_KEYS = [
  'helpTopicAccount',
  'helpTopicOrders',
  'helpTopicPayments',
  'helpTopicHalal',
  'helpTopicTechnical',
  'helpTopicOther',
]

const FAQ_KEYS = [
  ['faq1Q', 'faq1A'],
  ['faq2Q', 'faq2A'],
  ['faq3Q', 'faq3A'],
  ['faq4Q', 'faq4A'],
  ['faq5Q', 'faq5A'],
  ['faq6Q', 'faq6A'],
  ['faq7Q', 'faq7A'],
  ['faq8Q', 'faq8A'],
  ['faq9Q', 'faq9A'],
  ['faq10Q', 'faq10A'],
]

export default function HelpCenterPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topicKey, setTopicKey] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return toast.error(t('helpRequiredError'))
    const topicLabel = topicKey ? t(topicKey) : 'Not specified'
    const body = `Name: ${name}\nEmail: ${email}\nTopic: ${topicLabel}\n\nMessage:\n${message}`
    window.location.href = `mailto:support@procuro.com?subject=${encodeURIComponent(`ProCuro Help: ${topicLabel}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 sm:mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-midnight" />
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">{t('helpTitle')}</h1>
        </div>
        <p className="text-sm sm:text-base text-slate-500 mb-8 sm:mb-10">{t('helpSubtitle')}</p>

        {/* FAQ accordion */}
        <h2 className="font-display text-lg font-black text-slate-900 mb-4">{t('faqTitle')}</h2>
        <div className="space-y-2 mb-10">
          {FAQ_KEYS.map(([qKey, aKey], i) => (
            <div key={qKey} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
              >
                <span className="text-sm font-semibold text-slate-800">{t(qKey)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{t(aKey)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="mb-2">
          <h2 className="text-lg font-black text-slate-900 mb-1">{t('faqContactTitle')}</h2>
          <p className="text-sm text-slate-500 mb-6">{t('faqContactSubtitle')}</p>
        </div>

        {sent ? (
          <div className="bg-lionsmane border border-celeste rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-herb mx-auto mb-3" />
            <h2 className="font-bold text-midnight text-lg mb-1">{t('helpSentTitle')}</h2>
            <p className="text-sm text-midnight-dark">{t('helpSentDesc')} <strong>support@procuro.com</strong></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('helpNameLabel')}</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('helpNamePlaceholder')}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('email')} *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('helpEmailPlaceholder')}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('helpTopicLabel')}</label>
              <select
                value={topicKey}
                onChange={e => setTopicKey(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb bg-white"
              >
                <option value="">{t('helpTopicPlaceholder')}</option>
                {TOPIC_KEYS.map(key => <option key={key} value={key}>{t(key)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">{t('helpMessageLabel')}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('helpMessagePlaceholder')}
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
                {t('helpSendMessage')}
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              {t('helpEmailDirect')} <a href="mailto:support@procuro.com" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark">support@procuro.com</a>
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  )
}
