import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Users, Shield, Globe } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLanguage } from '../../context/LanguageContext'

export default function AboutPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const cards = [
    { icon: Shield, titleKey: 'aboutCard1Title', descKey: 'aboutCard1Desc' },
    { icon: Users, titleKey: 'aboutCard2Title', descKey: 'aboutCard2Desc' },
    { icon: Globe, titleKey: 'aboutCard3Title', descKey: 'aboutCard3Desc' },
  ]

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="w-8 h-8 text-midnight" />
          <h1 className="text-3xl font-black text-slate-900">{t('aboutTitle')}</h1>
        </div>

        <p className="text-lg text-slate-600 leading-relaxed mb-8">
          {t('aboutIntro')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {cards.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <Icon className="w-6 h-6 text-midnight mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">{t(titleKey)}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-3">{t('aboutOurStory')}</h2>
        <p className="text-slate-600 leading-relaxed mb-4">{t('aboutStoryP1')}</p>
        <p className="text-slate-600 leading-relaxed mb-8">{t('aboutStoryP2')}</p>

        <h2 className="text-xl font-bold text-slate-900 mb-3">{t('contactUs')}</h2>
        <p className="text-slate-600">
          Email: <a href="mailto:support@procuro.com" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark">support@procuro.com</a><br />
          Phone: <a href="tel:+4915560608671" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark">+49 155 6060 8671</a><br />
          {t('aboutLocation')}
        </p>
      </main>
      <Footer />
    </div>
  )
}
