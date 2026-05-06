import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChatbotDrawer from './ChatbotDrawer'

export default function ChatbotFAB() {
  const { role } = useAuth()
  const [open, setOpen] = useState(false)

  if (role !== 'restaurant_owner') return null

  return (
    <>
      <ChatbotDrawer open={open} onClose={() => setOpen(false)} />
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40 w-14 h-14 bg-primary hover:bg-primary-light text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}
