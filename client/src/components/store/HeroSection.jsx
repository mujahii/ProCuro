import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

export default function HeroSection({ onBrowse }) {
  return (
    <section className="relative bg-primary overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="text-accent text-sm font-semibold">🕌 100% Halal Verified</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            Your Halal
            <br />
            Supply Chain,
            <br />
            <span className="text-accent">Simplified.</span>
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-lg leading-relaxed">
            Order from verified Halal suppliers across Germany — all in one place. Streamline your procurement, track orders in real-time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onBrowse}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-bold px-6 py-3.5 rounded-xl transition-colors duration-200"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/register/supplier"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors duration-200 border border-white/20"
            >
              Become a Supplier
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-sm">
            {[
              { value: '100%', label: 'Halal Certified' },
              { value: '48h', label: 'Cert Verification' },
              { value: '🇩🇪', label: 'Germany-wide' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs text-white/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center pb-6">
        <ChevronDown className="w-6 h-6 text-white/40 animate-bounce" />
      </div>
    </section>
  )
}
