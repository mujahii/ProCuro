import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('procuro_cookie_consent')) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem('procuro_cookie_consent', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-gray-900 text-white rounded-xl p-4 shadow-2xl z-50">
      <p className="text-sm leading-relaxed">
        We use essential cookies for authentication and session management. No tracking cookies.
      </p>
      <button onClick={accept} className="mt-3 btn-primary text-xs py-2 w-full">
        Accept & Continue
      </button>
    </div>
  )
}
