import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, Mail } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const OPENINGS = [
  {
    title: 'Full-Stack Developer (React / Node.js)',
    type: 'Full-Time',
    location: 'Paderborn, NRW (Remote-friendly)',
    desc: 'Help build and scale our procurement platform. Experience with React, Supabase, and TypeScript preferred.',
  },
  {
    title: 'Business Development Manager',
    type: 'Full-Time',
    location: 'Paderborn, NRW',
    desc: 'Drive partnerships with Halal suppliers and restaurant chains across Germany. German and English required.',
  },
  {
    title: 'Customer Success Specialist',
    type: 'Part-Time / Full-Time',
    location: 'Remote (Germany)',
    desc: 'Support our growing supplier and restaurant owner community. Fluent German required.',
  },
]

export default function CareersPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-7 h-7 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900">Careers at ProCuro</h1>
        </div>
        <p className="text-slate-500 mb-8">Join us in building the future of Halal procurement in Germany.</p>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-emerald-900 mb-1">Why ProCuro?</h2>
          <p className="text-sm text-emerald-800 leading-relaxed">
            We're a mission-driven startup based in Paderborn, NRW, solving a real problem for the Halal business community. We offer a collaborative environment, competitive salaries, flexible working arrangements, and the chance to make a meaningful impact.
          </p>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">Open Positions</h2>
        <div className="space-y-4 mb-10">
          {OPENINGS.map(job => (
            <div key={job.title} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900">{job.title}</h3>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{job.type}</span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <MapPin className="w-3.5 h-3.5" /> {job.location}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">{job.desc}</p>
              <a
                href="mailto:support@procuro.com?subject=Job Application"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Mail className="w-4 h-4" /> Apply via Email
              </a>
            </div>
          ))}
        </div>

        <div className="bg-slate-100 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-600 mb-1">Don't see your role? We'd still love to hear from you.</p>
          <a href="mailto:support@procuro.com?subject=Spontaneous Application" className="text-emerald-600 font-semibold hover:underline text-sm">
            Send a spontaneous application →
          </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
