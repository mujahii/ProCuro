import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Newspaper, Mail, Download } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

export default function PressPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Newspaper className="w-7 h-7 text-midnight" />
          <h1 className="text-2xl font-black text-slate-900">Press & Media</h1>
        </div>
        <p className="text-slate-500 mb-8">Information and resources for journalists and media professionals.</p>

        {/* About */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-3">About ProCuro</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            ProCuro is Germany's leading B2B Halal procurement platform, connecting verified Halal suppliers with restaurant owners and caterers. Founded in Paderborn, NRW, ProCuro brings transparency, trust, and efficiency to Halal supply chains across Germany.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-5">
            {[
              { value: '500+', label: 'Restaurants' },
              { value: '120+', label: 'Suppliers' },
              { value: '4.8★', label: 'Platform Rating' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 bg-lionsmane rounded-xl">
                <p className="text-xl font-black text-midnight">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Facts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-3">Key Facts</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-3"><span className="font-semibold text-slate-400 w-24 flex-shrink-0">Founded</span> 2024</li>
            <li className="flex gap-3"><span className="font-semibold text-slate-400 w-24 flex-shrink-0">HQ</span> Paderborn, Nordrhein-Westfalen, Germany</li>
            <li className="flex gap-3"><span className="font-semibold text-slate-400 w-24 flex-shrink-0">Market</span> B2B Halal food procurement, Germany</li>
            <li className="flex gap-3"><span className="font-semibold text-slate-400 w-24 flex-shrink-0">Platform</span> Web-based SaaS (React / Supabase)</li>
            <li className="flex gap-3"><span className="font-semibold text-slate-400 w-24 flex-shrink-0">Languages</span> German, English, Arabic (planned)</li>
          </ul>
        </div>

        {/* Press Contact */}
        <div className="bg-lionsmane border border-celeste rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-midnight mb-2">Press Contact</h2>
          <p className="text-sm text-midnight mb-3">For press inquiries, interview requests, or media assets, please reach out to our team.</p>
          <a
            href="mailto:support@procuro.com?subject=Press Inquiry"
            className="inline-flex items-center gap-2 bg-midnight text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-midnight-dark transition-colors"
          >
            <Mail className="w-4 h-4" /> Contact Press Team
          </a>
        </div>

        {/* Brand Assets Note */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Brand Assets</p>
            <p className="text-xs text-slate-400">Logo files, brand guidelines, and high-res images available on request. Email us at support@procuro.com.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
