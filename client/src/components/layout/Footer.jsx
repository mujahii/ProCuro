import { Link } from 'react-router-dom'
import { ShoppingCart, Mail, Phone, Globe } from 'lucide-react'
import { useLanguage, LANGS } from '../../context/LanguageContext'

export default function Footer() {
  const { lang, setLanguage } = useLanguage()
  return (
    <footer className="bg-midnight text-celeste py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-herb-light" /> ProCuro
          </h3>
          <p className="text-sm opacity-70 leading-relaxed">
            Empowering Halal businesses with seamless procurement and inventory solutions across Germany.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link to="/press" className="hover:text-white transition-colors">Press</Link></li>
          </ul>
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-2">Language / Sprache</p>
            <div className="inline-flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-colors ${
                    lang === l ? 'bg-white text-midnight shadow-sm' : 'text-celeste hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-herb-light flex-shrink-0" />
              <a href="mailto:support@procuro.com" className="hover:text-white transition-colors">support@procuro.com</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-herb-light flex-shrink-0" />
              <a href="tel:+4915560608671" className="hover:text-white transition-colors">+49 155 6060 8671</a>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-herb-light flex-shrink-0" />
              <span>Paderborn, Germany</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
        © 2026 ProCuro GmbH. All rights reserved.
      </div>
    </footer>
  )
}
