import { useNavigate } from 'react-router-dom'
import { useLanguage, LANGS } from '../../context/LanguageContext'

export default function AccountDeletedPage() {
  const navigate = useNavigate()
  const { t, lang, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1f3d] via-[#162847] to-[#0f1f3d] flex flex-col items-center justify-center px-6 py-16">

      {/* Language toggle */}
      <div className="absolute top-6 right-6 flex gap-2">
        {LANGS.map(l => (
          <button
            key={l}
            onClick={() => setLanguage(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              lang === l
                ? 'bg-[#f4a623] text-[#0f1f3d]'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {l === 'en' ? 'EN' : 'DE'}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl px-10 py-14 max-w-lg w-full text-center shadow-2xl">

        {/* Emoji */}
        <div className="text-6xl mb-6 leading-none">💙</div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('accountDeletedTitle')}
        </h1>

        {/* Subtitle */}
        <p className="text-[#f4a623] font-semibold text-sm uppercase tracking-widest mb-8">
          {t('accountDeletedSubtitle')}
        </p>

        {/* Divider */}
        <div className="w-12 h-px bg-white/20 mx-auto mb-8" />

        {/* Message */}
        <p className="text-white/75 text-base leading-relaxed mb-6">
          {t('accountDeletedMessage')}
        </p>

        {/* Thank you */}
        <p className="text-white/50 text-sm leading-relaxed mb-10">
          {t('accountDeletedThanks')}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 rounded-2xl bg-[#f4a623] text-[#0f1f3d] font-bold text-base hover:bg-[#e09510] transition-colors shadow-lg"
        >
          {t('accountDeletedCta')}
        </button>
      </div>

      {/* ProCuro wordmark */}
      <p className="mt-10 text-white/20 text-sm font-semibold tracking-widest uppercase">
        ProCuro
      </p>
    </div>
  )
}
