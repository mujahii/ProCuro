import { Link } from 'react-router-dom'
import { ShoppingCart, Mail, Phone, Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" /> ProCuro
          </h3>
          <p className="text-sm opacity-70 leading-relaxed">
            Empowering Halal businesses with seamless procurement and inventory solutions across Germany.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="hover:text-white cursor-pointer transition-colors">About Us</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">Careers</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">Press</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="hover:text-white cursor-pointer transition-colors">Help Center</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" /> support@procuro.com</li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" /> +49 30 12345678</li>
            <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Berlin, Germany</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
        © 2025 ProCuro GmbH. All rights reserved.
      </div>
    </footer>
  )
}
