import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'

const STORAGE_KEY = 'procuro_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-midnight border-t border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ShieldCheck className="w-5 h-5 text-marigold flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-celeste leading-relaxed">
            We use essential cookies for authentication and session management — no tracking or advertising cookies.
            By continuing you agree to our{' '}
            <Link to="/privacy" onClick={accept} className="text-marigold-light underline underline-offset-2 hover:text-marigold transition-colors">
              Privacy Policy
            </Link>{' '}and{' '}
            <Link to="/terms" onClick={accept} className="text-marigold-light underline underline-offset-2 hover:text-marigold transition-colors">
              Terms of Service
            </Link>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-semibold text-celeste border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2 text-xs sm:text-sm font-bold bg-marigold text-midnight rounded-lg hover:bg-marigold-dark transition-colors"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            className="p-1.5 text-celeste hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
