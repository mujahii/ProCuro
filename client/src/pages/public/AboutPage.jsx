import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Shield, Globe } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

export default function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <img src="/image.png" alt="ProCuro" className="w-8 h-8 object-contain" />
          <h1 className="text-3xl font-black text-slate-900">About ProCuro</h1>
        </div>

        <p className="text-lg text-slate-600 leading-relaxed mb-8">
          ProCuro is a B2B Halal procurement platform connecting verified Halal suppliers with restaurant owners across Germany. Our mission is to make Halal supply chains transparent, efficient, and trustworthy.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { icon: Shield, title: 'Verified Halal', desc: 'Every supplier on ProCuro holds a valid Halal certification reviewed by our admin team.' },
            { icon: Users, title: 'Community First', desc: 'Built for the Halal business community in Germany — suppliers, restaurant owners, and caterers.' },
            { icon: Globe, title: 'Made in Germany', desc: 'Headquartered in Paderborn, NRW. Fully compliant with German and EU regulations.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <Icon className="w-6 h-6 text-midnight mb-3" />
              <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-3">Our Story</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          ProCuro was founded to solve a real problem: restaurant owners in Germany struggled to find reliable, certified Halal suppliers — and suppliers had no easy way to reach their customers. We built a platform that bridges this gap with a seamless ordering system, real-time communication, and transparent certification verification.
        </p>
        <p className="text-slate-600 leading-relaxed mb-8">
          Today, ProCuro serves dozens of verified suppliers and hundreds of restaurants across Germany, with a focus on quality, trust, and community.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mb-3">Contact Us</h2>
        <p className="text-slate-600">
          Email: <a href="mailto:support@procuro.com" className="text-midnight font-semibold hover:underline">support@procuro.com</a><br />
          Phone: <a href="tel:+4915560608671" className="text-midnight font-semibold hover:underline">+49 155 6060 8671</a><br />
          Location: Paderborn, North Rhine-Westphalia, Germany
        </p>
      </main>
      <Footer />
    </div>
  )
}
