import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, Mail } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLanguage } from '../../context/LanguageContext'

export default function CareersPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const openings = [
    {
      titleKey: 'careersJob1Title',
      typeKey: 'careersJob1Type',
      locationKey: 'careersJob1Location',
      descKey: 'careersJob1Desc',
    },
    {
      titleKey: 'careersJob2Title',
      typeKey: 'careersJob2Type',
      locationKey: 'careersJob2Location',
      descKey: 'careersJob2Desc',
    },
    {
      titleKey: 'careersJob3Title',
      typeKey: 'careersJob3Type',
      locationKey: 'careersJob3Location',
      descKey: 'careersJob3Desc',
    },
  ]

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 sm:mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-midnight" />
          <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900">{t('careersTitle')}</h1>
        </div>
        <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8">{t('careersSubtitle')}</p>

        <div className="bg-lionsmane border border-celeste rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="font-bold text-midnight mb-1 text-sm sm:text-base">{t('careersWhyTitle')}</h2>
          <p className="text-xs sm:text-sm text-midnight leading-relaxed">{t('careersWhyDesc')}</p>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">{t('careersOpenPositions')}</h2>
        <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
          {openings.map(job => (
            <div key={job.titleKey} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t(job.titleKey)}</h3>
                <span className="text-[10px] sm:text-xs font-semibold bg-celeste text-midnight-dark px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">{t(job.typeKey)}</span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <MapPin className="w-3.5 h-3.5" /> {t(job.locationKey)}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t(job.descKey)}</p>
              <a
                href="mailto:support@procuro.com?subject=Job Application"
                className="mt-3 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-midnight hover:text-midnight-dark transition-colors"
              >
                <Mail className="w-4 h-4" /> {t('careersApplyEmail')}
              </a>
            </div>
          ))}
        </div>

        <div className="bg-slate-100 rounded-xl p-4 sm:p-5 text-center">
          <p className="text-xs sm:text-sm text-slate-600 mb-1">{t('careersNoRole')}</p>
          <a href="mailto:support@procuro.com?subject=Spontaneous Application" className="text-herb font-bold underline underline-offset-2 hover:text-herb-dark text-xs sm:text-sm">
            {t('careersSpontaneous')}
          </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
