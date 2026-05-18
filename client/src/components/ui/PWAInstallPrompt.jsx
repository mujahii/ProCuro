import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) { setDismissed(true); return }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
    setIsIOS(ios)

    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
    dismiss()
  }

  if (dismissed || (!installPrompt && !isIOS)) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] bg-midnight text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-white/10">
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
        <img src="/ProCuroIcon.png" alt="ProCuro" className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white">Install ProCuro</p>
        {isIOS ? (
          <p className="text-xs text-celeste mt-0.5 leading-relaxed">
            Tap <Share className="w-3 h-3 inline mx-0.5" /> <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
          </p>
        ) : (
          <p className="text-xs text-celeste mt-0.5">Add to your home screen for the best experience</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIOS && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 bg-marigold text-midnight font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-marigold-dark transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
        )}
        <button onClick={dismiss} className="text-celeste hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
