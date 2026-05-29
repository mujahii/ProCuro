import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Newspaper, Mail, Download } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLanguage } from '../../context/LanguageContext'

export default function PressPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const stats = [
    { value: '500+', labelKey: 'pressStatRestaurants' },
    { value: '120+', labelKey: 'pressStatSuppliers' },
    { value: '4.8★', labelKey: 'pressStatRating' },
  ]

  const facts = [
    { labelKey: 'pressFoundedLabel', value: '2024' },
    { labelKey: 'pressHQLabel', value: 'Paderborn, Nordrhein-Westfalen, Germany' },
    { labelKey: 'pressMarketLabel', valueKey: 'pressMarketValue' },
    { labelKey: 'pressPlatformLabel', valueKey: 'pressPlatformValue' },
    { labelKey: 'pressLanguagesLabel', valueKey: 'pressLanguagesValue' },
  ]

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 sm:mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Newspaper className="w-6 h-6 sm:w-7 sm:h-7 text-midnight" />
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">{t('pressTitle')}</h1>
        </div>
        <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8">{t('pressSubtitle')}</p>

        {/* About */}
        <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="font-bold text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">{t('pressAboutTitle')}</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('pressAboutDesc')}</p>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-5">
            {stats.map(stat => (
              <div key={stat.labelKey} className="text-center p-2 sm:p-3 bg-lionsmane rounded-xl">
                <p className="text-lg sm:text-xl font-black text-midnight">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Facts */}
        <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="font-bold text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">{t('pressKeyFacts')}</h2>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
            {facts.map(f => (
              <li key={f.labelKey} className="flex gap-3">
                <span className="font-semibold text-slate-400 w-20 sm:w-24 flex-shrink-0">{t(f.labelKey)}</span>
                {f.value || t(f.valueKey)}
              </li>
            ))}
          </ul>
        </div>

        {/* Press Contact */}
        <div className="bg-lionsmane border border-celeste rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="font-bold text-midnight mb-2 text-sm sm:text-base">{t('pressContactTitle')}</h2>
          <p className="text-xs sm:text-sm text-midnight mb-3">{t('pressContactDesc')}</p>
          <a
            href="mailto:support@procuro.com?subject=Press Inquiry"
            className="inline-flex items-center gap-2 bg-midnight text-white text-xs sm:text-sm font-bold px-4 py-2 sm:py-2.5 rounded-xl hover:bg-midnight-dark transition-colors"
          >
            <Mail className="w-4 h-4" /> {t('pressContactButton')}
          </a>
        </div>

        {/* Brand Assets Note */}
        <div className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs sm:text-sm">{t('pressBrandAssetsTitle')}</p>
            <p className="text-[11px] sm:text-xs text-slate-400">{t('pressBrandAssetsDesc')}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
