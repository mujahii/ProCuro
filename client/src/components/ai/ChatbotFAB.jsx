import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import ChatbotDrawer from './ChatbotDrawer'

export default function ChatbotFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ChatbotDrawer open={open} onClose={() => setOpen(false)} />
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-40 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}
