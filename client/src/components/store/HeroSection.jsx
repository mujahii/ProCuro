import { ArrowRight, ChevronDown } from 'lucide-react'

const BG_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1920&q=80'

export default function HeroSection({ onBrowse }) {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
      />
      {/* Dark green overlay for readability */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(27, 67, 50, 0.78)' }} />

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
          <div className="mt-8">
            <button
              onClick={onBrowse}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-bold px-6 py-3.5 rounded-xl transition-colors duration-200 shadow-lg"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </button>
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

      <div className="relative flex justify-center pb-6">
        <ChevronDown className="w-6 h-6 text-white/40 animate-bounce" />
      </div>
    </section>
  )
}
