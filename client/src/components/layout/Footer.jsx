import { Link } from 'react-router-dom'
import { ShoppingCart, Mail, Phone, Globe } from 'lucide-react'
import { useLanguage, LANGS } from '../../context/LanguageContext'

export default function Footer() {
  const { lang, setLanguage } = useLanguage()
  return (
    <footer className="bg-midnight text-celeste py-8 sm:py-12 mt-8 sm:mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
        <div className="col-span-2 sm:col-span-1">
          <h3 className="text-white text-base sm:text-lg font-bold mb-2 sm:mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-herb-light" /> ProCuro
          </h3>
          <p className="text-xs sm:text-sm opacity-70 leading-relaxed">
            Empowering Halal businesses with seamless procurement and inventory solutions across Germany.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">Company</h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link to="/press" className="hover:text-white transition-colors">Press</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">Resources</h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">Contact</h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-herb-light flex-shrink-0" />
              <a href="mailto:support@procuro.com" className="hover:text-white transition-colors break-all">support@procuro.com</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-herb-light flex-shrink-0" />
              <a href="tel:+4915560608671" className="hover:text-white transition-colors">+49 155 6060 8671</a>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-herb-light flex-shrink-0" />
              <span>Paderborn, Germany</span>
            </li>
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <h4 className="text-white font-bold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">Language / Sprache</h4>
          <div className="inline-flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${
                  lang === l ? 'bg-white text-midnight shadow-sm' : 'text-celeste hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-slate-800 text-center text-[11px] sm:text-xs opacity-50">
        © 2026 ProCuro GmbH. All rights reserved.
      </div>
    </footer>
  )
}
